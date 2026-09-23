// komichi API on Cloudflare Workers + D1
//
// 公开接口
//   GET    /api/health
//   GET    /api/messages?limit=50
//   POST   /api/messages                 { nickname?, content }
//   GET    /api/comments?kind=&slug=
//   POST   /api/comments                 { kind, slug, nickname?, mail?, url?, parent_id?, content }
//   POST   /api/comment-image            multipart field=file（访客评论配图）
//   GET    /api/playlist
//   GET    /api/tap                      点按页 32 点按音 + 11 底轨
//   GET    /api/documents                覆盖层（仅未删除）
//
// 后台接口（需 ADMIN_TOKEN）
//   POST   /api/admin/session            { token } -> 校验口令
//   GET    /api/admin/documents          含已删除，供后台列表
//   PUT    /api/admin/documents/:kind/:slug
//   DELETE /api/admin/documents/:kind/:slug   软删除，回落到构建期基线
//   GET    /api/admin/folders
//   POST   /api/admin/folders            { name }
//   PATCH  /api/admin/folders/:name      { name }
//   DELETE /api/admin/folders/:name
//   GET    /api/admin/files?folder=&kind=&q=
//   POST   /api/admin/files              multipart field=file, folder
//   PATCH  /api/admin/files/:id          { folder?, name? }
//   DELETE /api/admin/files/:id
//
// 公开文件
//   GET    /files/:id/:filename
//   GET    /api/playlist  侧边播放器歌单
//   GET    /api/admin/tap
//   PATCH  /api/admin/tap/:kind/:slot    kind=hit|bed

const MAX_CONTENT_LEN = 2000;
const MAX_NICKNAME_LEN = 40;
const MAX_MAIL_LEN = 120;
const MAX_URL_LEN = 200;
const MAX_COMMENT_IMAGE = 5 * 1024 * 1024;
const COMMENT_IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const MAX_TRACK_TITLE = 80;
const MAX_TRACK_ARTIST = 80;
const MAX_TRACK_URL = 500;
const MAX_TAP_LABEL = 40;
const TAP_HIT_COUNT = 32;
const TAP_BED_COUNT = 11;
const MAX_BODY_LEN = 512 * 1024;
const COMMENT_KINDS = new Set(["post", "note"]);
const FILE_MIME = {
  image: new Set(["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"]),
  document: new Set(["application/pdf", "text/plain", "text/markdown"]),
  other: new Set([
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/x-wav",
    "audio/ogg",
    "audio/flac",
    "audio/aac",
    "audio/webm",
    "video/mp4",
    "application/zip",
  ]),
};
const FILE_LIMIT = {
  image: 8 * 1024 * 1024,
  document: 16 * 1024 * 1024,
  other: 32 * 1024 * 1024,
};
const KINDS = new Set([
  "post",
  "note",
  "page",
  "thought",
  "say",
  "quote",
  "series",
  "friend",
  "project",
  "site",
]);

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "access-control-allow-headers": "content-type,authorization,x-admin-token",
};

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", ...CORS_HEADERS };

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });

function tokenOf(request) {
  const auth = request.headers.get("authorization") || "";
  if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return (request.headers.get("x-admin-token") || "").trim();
}

function isAdmin(request, env) {
  const expected = String(env.ADMIN_TOKEN || "");
  const given = tokenOf(request);
  if (!expected || !given) return false;
  if (expected.length !== given.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= expected.charCodeAt(i) ^ given.charCodeAt(i);
  }
  return diff === 0;
}

async function requireAdmin(request, env) {
  if (isAdmin(request, env)) return null;
  return json({ ok: false, error: "unauthorized" }, 401);
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/* ---------------------------------- 留言 ---------------------------------- */

async function listMessages(env, url) {
  const raw = Number(url.searchParams.get("limit"));
  const limit = Math.min(Math.max(Number.isFinite(raw) && raw > 0 ? raw : 50, 1), 200);
  const { results } = await env.DB.prepare(
    "SELECT id, nickname, content, created_at FROM messages ORDER BY id DESC LIMIT ?"
  )
    .bind(limit)
    .all();
  return json({ ok: true, messages: results ?? [] });
}

async function createMessage(env, request) {
  const payload = await readJson(request);
  if (!payload) return json({ ok: false, error: "invalid_json" }, 400);

  const content = String(payload?.content ?? "").trim();
  const nickname =
    String(payload?.nickname ?? "")
      .trim()
      .slice(0, MAX_NICKNAME_LEN) || "路人";

  if (!content) return json({ ok: false, error: "empty_content" }, 400);
  if (content.length > MAX_CONTENT_LEN) return json({ ok: false, error: "too_long" }, 400);

  const created_at = new Date().toISOString();
  const res = await env.DB.prepare(
    "INSERT INTO messages (nickname, content, created_at) VALUES (?, ?, ?)"
  )
    .bind(nickname, content, created_at)
    .run();

  return json(
    {
      ok: true,
      message: { id: res.meta?.last_row_id ?? null, nickname, content, created_at },
    },
    201
  );
}

async function deleteAdminMessage(env, id) {
  const res = await env.DB.prepare("DELETE FROM messages WHERE id = ?").bind(id).run();
  if (!res.meta?.changes) return json({ ok: false, error: "not_found" }, 404);
  return json({ ok: true, id });
}

/* ---------------------------------- 评论 ---------------------------------- */

async function migrateStudioSchema(env) {
  const statements = [
    `CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target_kind TEXT NOT NULL,
      target_slug TEXT NOT NULL,
      nickname TEXT NOT NULL DEFAULT '路人',
      content TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`,
    "CREATE INDEX IF NOT EXISTS idx_comments_target ON comments (target_kind, target_slug, id)",
    "ALTER TABLE comments ADD COLUMN parent_id INTEGER",
    "ALTER TABLE comments ADD COLUMN mail TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE comments ADD COLUMN url TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE comments ADD COLUMN is_owner INTEGER NOT NULL DEFAULT 0",
    `CREATE TABLE IF NOT EXISTS tracks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL DEFAULT '',
      artist TEXT NOT NULL DEFAULT '',
      cover TEXT NOT NULL DEFAULT '',
      src TEXT NOT NULL DEFAULT '',
      sort INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    )`,
    "CREATE INDEX IF NOT EXISTS idx_tracks_sort ON tracks (sort, id)",
    `CREATE TABLE IF NOT EXISTS tap_slots (
      kind TEXT NOT NULL,
      slot INTEGER NOT NULL,
      src TEXT NOT NULL DEFAULT '',
      label TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL,
      PRIMARY KEY (kind, slot)
    )`,
  ];
  for (const sql of statements) {
    try {
      await env.DB.prepare(sql).run();
    } catch {
      /* already migrated */
    }
  }
}

function tidySlug(value) {
  return String(value || "")
    .trim()
    .slice(0, 80);
}

function parseCommentRow(row) {
  return {
    id: row.id,
    kind: row.target_kind,
    slug: row.target_slug,
    nickname: row.nickname,
    content: row.content,
    created_at: row.created_at,
    parent_id: row.parent_id ?? null,
    url: row.url || "",
    is_owner: Boolean(row.is_owner),
  };
}

function tidyWebsite(value) {
  const url = String(value || "").trim().slice(0, MAX_URL_LEN);
  if (!url) return "";
  return /^https?:\/\/\S+$/i.test(url) ? url : "";
}

function tidyMail(value) {
  const mail = String(value || "").trim().slice(0, MAX_MAIL_LEN);
  if (!mail) return "";
  return /^[\w.+-]+@[\w-]+(?:\.[\w-]+)+$/.test(mail) ? mail : "";
}

async function listComments(env, url) {
  await migrateStudioSchema(env);
  const kind = String(url.searchParams.get("kind") || "").trim();
  const slug = tidySlug(url.searchParams.get("slug"));
  if (!COMMENT_KINDS.has(kind) || !slug) return json({ ok: false, error: "invalid_target" }, 400);
  const { results } = await env.DB.prepare(
    "SELECT id, target_kind, target_slug, nickname, content, created_at, parent_id, url, is_owner FROM comments WHERE target_kind = ? AND target_slug = ? ORDER BY id ASC LIMIT 200"
  )
    .bind(kind, slug)
    .all();
  return json({ ok: true, comments: (results ?? []).map(parseCommentRow) });
}

async function createComment(env, request) {
  await migrateStudioSchema(env);
  const payload = await readJson(request);
  if (!payload) return json({ ok: false, error: "invalid_json" }, 400);
  const kind = String(payload?.kind ?? "").trim();
  const slug = tidySlug(payload?.slug);
  const content = String(payload?.content ?? "").trim();
  const isOwner = isAdmin(request, env);
  const nickname =
    String(payload?.nickname ?? "")
      .trim()
      .slice(0, MAX_NICKNAME_LEN) || (isOwner ? "站长" : "路人");
  const mail = tidyMail(payload?.mail);
  const url = tidyWebsite(payload?.url);
  const parentRaw = Number(payload?.parent_id);
  const parentId = Number.isInteger(parentRaw) && parentRaw > 0 ? parentRaw : null;
  if (!COMMENT_KINDS.has(kind) || !slug) return json({ ok: false, error: "invalid_target" }, 400);
  if (!content) return json({ ok: false, error: "empty_content" }, 400);
  if (content.length > MAX_CONTENT_LEN) return json({ ok: false, error: "too_long" }, 400);

  if (parentId) {
    const parent = await env.DB.prepare(
      "SELECT id FROM comments WHERE id = ? AND target_kind = ? AND target_slug = ?"
    )
      .bind(parentId, kind, slug)
      .first();
    if (!parent) return json({ ok: false, error: "invalid_parent" }, 400);
  }

  const created_at = new Date().toISOString();
  const res = await env.DB.prepare(
    "INSERT INTO comments (target_kind, target_slug, nickname, content, created_at, parent_id, mail, url, is_owner) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  )
    .bind(kind, slug, nickname, content, created_at, parentId, mail, url, isOwner ? 1 : 0)
    .run();
  return json(
    {
      ok: true,
      comment: {
        id: res.meta?.last_row_id ?? null,
        kind,
        slug,
        nickname,
        content,
        created_at,
        parent_id: parentId,
        url,
        is_owner: isOwner,
      },
    },
    201
  );
}

async function listAdminComments(env, url) {
  await migrateStudioSchema(env);
  const kind = String(url.searchParams.get("kind") || "").trim();
  const slug = tidySlug(url.searchParams.get("slug"));
  const q = String(url.searchParams.get("q") || "")
    .trim()
    .toLowerCase();
  let sql =
    "SELECT id, target_kind, target_slug, nickname, content, created_at, parent_id, mail, url, is_owner FROM comments";
  const binds = [];
  if (COMMENT_KINDS.has(kind) && slug) {
    sql += " WHERE target_kind = ? AND target_slug = ?";
    binds.push(kind, slug);
  } else if (COMMENT_KINDS.has(kind)) {
    sql += " WHERE target_kind = ?";
    binds.push(kind);
  }
  sql += " ORDER BY id DESC LIMIT 300";
  const stmt = binds.length ? env.DB.prepare(sql).bind(...binds) : env.DB.prepare(sql);
  const { results } = await stmt.all();
  let comments = (results ?? []).map(parseCommentRow);
  if (q) {
    comments = comments.filter((item) =>
      `${item.nickname} ${item.content} ${item.kind} ${item.slug}`.toLowerCase().includes(q)
    );
  }
  return json({ ok: true, comments });
}

async function deleteAdminComment(env, id) {
  const res = await env.DB.prepare("DELETE FROM comments WHERE id = ?").bind(id).run();
  if (!res.meta?.changes) return json({ ok: false, error: "not_found" }, 404);
  return json({ ok: true, id });
}

/* ---------------------------------- 歌单 ---------------------------------- */

function tidyTrackUrl(value) {
  const url = String(value || "").trim();
  if (!url || url.length > MAX_TRACK_URL) return "";
  if (url.startsWith("/") || url.startsWith("https://") || url.startsWith("http://")) return url;
  return "";
}

function parseTrackRow(row) {
  return {
    id: row.id,
    title: row.title || "",
    artist: row.artist || "",
    cover: row.cover || "",
    src: row.src || "",
    sort: Number(row.sort) || 0,
    created_at: row.created_at,
  };
}

function readTrackFields(payload) {
  const title = String(payload?.title ?? "")
    .trim()
    .slice(0, MAX_TRACK_TITLE);
  const artist = String(payload?.artist ?? "")
    .trim()
    .slice(0, MAX_TRACK_ARTIST);
  const cover = tidyTrackUrl(payload?.cover);
  const src = tidyTrackUrl(payload?.src);
  return { title, artist, cover, src };
}

async function listTracks(env) {
  await migrateStudioSchema(env);
  const { results } = await env.DB.prepare(
    "SELECT id, title, artist, cover, src, sort, created_at FROM tracks ORDER BY sort ASC, id ASC"
  ).all();
  return json({ ok: true, tracks: (results ?? []).map(parseTrackRow) });
}

async function createTrack(env, request) {
  await migrateStudioSchema(env);
  const payload = await readJson(request);
  if (!payload) return json({ ok: false, error: "invalid_json" }, 400);
  const fields = readTrackFields(payload);
  if (!fields.title) return json({ ok: false, error: "empty_title" }, 400);
  if (!fields.src) return json({ ok: false, error: "empty_src" }, 400);
  const created_at = new Date().toISOString();
  const max = await env.DB.prepare("SELECT COALESCE(MAX(sort), 0) AS sort FROM tracks").first();
  const sort = (Number(max?.sort) || 0) + 1;
  const res = await env.DB.prepare(
    "INSERT INTO tracks (title, artist, cover, src, sort, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  )
    .bind(fields.title, fields.artist, fields.cover, fields.src, sort, created_at)
    .run();
  return json(
    {
      ok: true,
      track: {
        id: res.meta?.last_row_id ?? null,
        ...fields,
        sort,
        created_at,
      },
    },
    201
  );
}

async function patchTrack(env, id, request) {
  await migrateStudioSchema(env);
  const payload = await readJson(request);
  if (!payload) return json({ ok: false, error: "invalid_json" }, 400);
  const row = await env.DB.prepare(
    "SELECT id, title, artist, cover, src, sort, created_at FROM tracks WHERE id = ?"
  )
    .bind(id)
    .first();
  if (!row) return json({ ok: false, error: "not_found" }, 404);
  const next = {
    title: payload.title === undefined ? row.title : String(payload.title).trim().slice(0, MAX_TRACK_TITLE),
    artist: payload.artist === undefined ? row.artist : String(payload.artist).trim().slice(0, MAX_TRACK_ARTIST),
    cover: payload.cover === undefined ? row.cover : tidyTrackUrl(payload.cover),
    src: payload.src === undefined ? row.src : tidyTrackUrl(payload.src),
    sort: payload.sort === undefined ? Number(row.sort) || 0 : Number(payload.sort) || 0,
  };
  if (!next.title) return json({ ok: false, error: "empty_title" }, 400);
  if (!next.src) return json({ ok: false, error: "empty_src" }, 400);
  await env.DB.prepare("UPDATE tracks SET title = ?, artist = ?, cover = ?, src = ?, sort = ? WHERE id = ?")
    .bind(next.title, next.artist, next.cover, next.src, next.sort, id)
    .run();
  return json({ ok: true, track: { id, ...next, created_at: row.created_at } });
}

async function deleteTrack(env, id) {
  const res = await env.DB.prepare("DELETE FROM tracks WHERE id = ?").bind(id).run();
  if (!res.meta?.changes) return json({ ok: false, error: "not_found" }, 404);
  return json({ ok: true, id });
}

/* --------------------------------- 点按槽 --------------------------------- */

function tapSlotCount(kind) {
  if (kind === "hit") return TAP_HIT_COUNT;
  if (kind === "bed") return TAP_BED_COUNT;
  return 0;
}

function emptyTapSlot(kind, slot) {
  return { kind, slot, src: "", label: "" };
}

function fillTapSlots(kind, rows) {
  const count = tapSlotCount(kind);
  const bySlot = new Map();
  for (const row of rows ?? []) {
    const slot = Number(row.slot);
    if (!Number.isInteger(slot) || slot < 0 || slot >= count) continue;
    bySlot.set(slot, {
      kind,
      slot,
      src: row.src || "",
      label: row.label || "",
    });
  }
  const list = [];
  for (let slot = 0; slot < count; slot += 1) {
    list.push(bySlot.get(slot) || emptyTapSlot(kind, slot));
  }
  return list;
}

async function listTapConfig(env) {
  await migrateStudioSchema(env);
  try {
    const { results } = await env.DB.prepare(
      "SELECT kind, slot, src, label FROM tap_slots ORDER BY kind ASC, slot ASC"
    ).all();
    const hits = fillTapSlots(
      "hit",
      (results ?? []).filter((row) => row.kind === "hit")
    );
    const beds = fillTapSlots(
      "bed",
      (results ?? []).filter((row) => row.kind === "bed")
    );
    return json({ ok: true, hits, beds });
  } catch {
    return json({
      ok: true,
      hits: fillTapSlots("hit", []),
      beds: fillTapSlots("bed", []),
    });
  }
}

async function patchTapSlot(env, kind, slotRaw, request) {
  await migrateStudioSchema(env);
  const count = tapSlotCount(kind);
  const slot = Number(slotRaw);
  if (!count || !Number.isInteger(slot) || slot < 0 || slot >= count) {
    return json({ ok: false, error: "invalid_slot" }, 400);
  }
  const payload = await readJson(request);
  if (!payload) return json({ ok: false, error: "invalid_json" }, 400);

  const existing = await env.DB.prepare(
    "SELECT kind, slot, src, label FROM tap_slots WHERE kind = ? AND slot = ?"
  )
    .bind(kind, slot)
    .first();

  let src = existing?.src || "";
  if (payload.src !== undefined) {
    const raw = String(payload.src ?? "").trim();
    if (!raw) {
      src = "";
    } else {
      src = tidyTrackUrl(raw);
      if (!src) return json({ ok: false, error: "invalid_src" }, 400);
    }
  }

  let label = existing?.label || "";
  if (payload.label !== undefined) {
    label = String(payload.label ?? "")
      .trim()
      .slice(0, MAX_TAP_LABEL);
  }

  const updated_at = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO tap_slots (kind, slot, src, label, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(kind, slot) DO UPDATE SET src = excluded.src, label = excluded.label, updated_at = excluded.updated_at`
  )
    .bind(kind, slot, src, label, updated_at)
    .run();

  return json({ ok: true, slot: { kind, slot, src, label } });
}

function parseDocRow(row) {
  let meta = {};
  try {
    meta = JSON.parse(row.meta || "{}");
  } catch {
    meta = {};
  }
  return {
    kind: row.kind,
    slug: row.slug,
    title: row.title || "",
    meta,
    body: row.body || "",
    deleted: Boolean(row.deleted),
    updated_at: row.updated_at,
  };
}

async function listPublicDocuments(env) {
  const { results } = await env.DB.prepare(
    "SELECT kind, slug, title, meta, body, deleted, updated_at FROM documents WHERE deleted = 0 ORDER BY updated_at DESC"
  ).all();
  return json({ ok: true, documents: (results ?? []).map(parseDocRow) });
}

async function listAdminDocuments(env) {
  const { results } = await env.DB.prepare(
    "SELECT kind, slug, title, meta, body, deleted, updated_at FROM documents ORDER BY updated_at DESC"
  ).all();
  return json({ ok: true, documents: (results ?? []).map(parseDocRow) });
}

async function getAdminDocument(env, kind, slug) {
  const row = await env.DB.prepare(
    "SELECT kind, slug, title, meta, body, deleted, updated_at FROM documents WHERE kind = ? AND slug = ?"
  )
    .bind(kind, slug)
    .first();
  if (!row) return json({ ok: false, error: "not_found" }, 404);
  return json({ ok: true, document: parseDocRow(row) });
}

async function upsertDocument(env, kind, slug, request) {
  const payload = await readJson(request);
  if (!payload) return json({ ok: false, error: "invalid_json" }, 400);

  const body = String(payload?.body ?? "");
  if (body.length > MAX_BODY_LEN) return json({ ok: false, error: "too_long" }, 413);

  const title = String(payload?.title ?? "").slice(0, 200);
  let meta = payload?.meta;
  if (typeof meta === "string") {
    try {
      meta = JSON.parse(meta);
    } catch {
      return json({ ok: false, error: "invalid_meta" }, 400);
    }
  }
  if (!meta || typeof meta !== "object") meta = {};

  const deleted = payload?.deleted ? 1 : 0;
  const updated_at = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO documents (kind, slug, title, meta, body, deleted, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (kind, slug)
     DO UPDATE SET title = excluded.title, meta = excluded.meta, body = excluded.body,
                   deleted = excluded.deleted, updated_at = excluded.updated_at`
  )
    .bind(kind, slug, title, JSON.stringify(meta), body, deleted, updated_at)
    .run();

  return json({ ok: true, document: { kind, slug, title, meta, body, deleted: Boolean(deleted), updated_at } });
}

async function deleteDocument(env, kind, slug, hard) {
  if (hard) {
    const res = await env.DB.prepare("DELETE FROM documents WHERE kind = ? AND slug = ?")
      .bind(kind, slug)
      .run();
    if (!res.meta?.changes) return json({ ok: false, error: "not_found" }, 404);
    return json({ ok: true, kind, slug, deleted: true, hard: true });
  }
  const updated_at = new Date().toISOString();
  const res = await env.DB.prepare(
    "UPDATE documents SET deleted = 1, updated_at = ? WHERE kind = ? AND slug = ?"
  )
    .bind(updated_at, kind, slug)
    .run();
  if (!res.meta?.changes) return json({ ok: false, error: "not_found" }, 404);
  return json({ ok: true, kind, slug, deleted: true, updated_at });
}

/* ---------------------------------- 文件库 ---------------------------------- */

function kindOfMime(mime) {
  const value = String(mime || "").toLowerCase();
  if (FILE_MIME.image.has(value)) return "image";
  if (FILE_MIME.document.has(value)) return "document";
  if (FILE_MIME.other.has(value)) return "other";
  return null;
}

function tidyFileName(name) {
  const base = String(name || "file").split(/[/\\]/).pop() || "file";
  return base.replace(/[^\w.\u4e00-\u9fff-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 180) || "file";
}

function tidyFolder(name) {
  const value = String(name || "")
    .trim()
    .replace(/[\\/]+/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 40);
  return value || "";
}

function defaultFolderOf(kind) {
  if (kind === "image") return "图片";
  if (kind === "document") return "文档";
  if (kind === "other") return "其他";
  return "未分类";
}

function objectKeyOf(folder, id) {
  return `${folder}/${id}`;
}

function fileUrl(id, name) {
  return `/files/${id}/${encodeURIComponent(name)}`;
}

function parseFileRow(row) {
  return {
    id: row.id,
    name: row.name,
    mime: row.mime,
    size: Number(row.size) || 0,
    kind: row.kind,
    folder: row.folder || "未分类",
    object_key: row.object_key || row.id,
    created_at: row.created_at,
    url: fileUrl(row.id, row.name),
  };
}

function requireStore(env) {
  if (env.FILES) return null;
  return json({ ok: false, error: "storage_unavailable" }, 503);
}

async function ensureFolder(env, name) {
  const folder = tidyFolder(name) || "未分类";
  const created_at = new Date().toISOString();
  await env.DB.prepare("INSERT OR IGNORE INTO folders (name, created_at) VALUES (?, ?)").bind(folder, created_at).run();
  return folder;
}

async function migrateFilesSchema(env) {
  const statements = [
    "CREATE TABLE IF NOT EXISTS folders (name TEXT PRIMARY KEY, created_at TEXT NOT NULL)",
    "ALTER TABLE files ADD COLUMN folder TEXT NOT NULL DEFAULT '未分类'",
    "ALTER TABLE files ADD COLUMN object_key TEXT NOT NULL DEFAULT ''",
  ];
  for (const sql of statements) {
    try {
      await env.DB.prepare(sql).run();
    } catch {
      /* already migrated */
    }
  }
}

async function seedDefaultFolders(env) {
  await migrateFilesSchema(env);
  const created_at = new Date().toISOString();
  for (const name of ["未分类", "图片", "文档", "其他"]) {
    await env.DB.prepare("INSERT OR IGNORE INTO folders (name, created_at) VALUES (?, ?)").bind(name, created_at).run();
  }
}

async function listAdminFolders(env) {
  await seedDefaultFolders(env);
  const { results: folders } = await env.DB.prepare(
    "SELECT name, created_at FROM folders ORDER BY name COLLATE NOCASE"
  ).all();
  const { results: counts } = await env.DB.prepare(
    "SELECT folder, COUNT(*) AS count FROM files GROUP BY folder"
  ).all();
  const countMap = new Map((counts ?? []).map((row) => [row.folder || "未分类", Number(row.count) || 0]));
  return json({
    ok: true,
    folders: (folders ?? []).map((row) => ({
      name: row.name,
      created_at: row.created_at,
      count: countMap.get(row.name) || 0,
    })),
  });
}

async function createAdminFolder(env, request) {
  const payload = await readJson(request);
  const name = tidyFolder(payload?.name);
  if (!name) return json({ ok: false, error: "invalid_folder" }, 400);
  await ensureFolder(env, name);
  return json({ ok: true, folder: { name, count: 0 } }, 201);
}

async function renameAdminFolder(env, fromName, request) {
  const from = tidyFolder(fromName);
  if (!from) return json({ ok: false, error: "invalid_folder" }, 400);
  const payload = await readJson(request);
  const to = tidyFolder(payload?.name);
  if (!to) return json({ ok: false, error: "invalid_folder" }, 400);
  if (from === to) return json({ ok: true, folder: { name: to } });

  const exists = await env.DB.prepare("SELECT name FROM folders WHERE name = ?").bind(from).first();
  if (!exists) return json({ ok: false, error: "not_found" }, 404);
  const clash = await env.DB.prepare("SELECT name FROM folders WHERE name = ?").bind(to).first();
  if (clash) return json({ ok: false, error: "folder_exists" }, 409);

  const { results } = await env.DB.prepare(
    "SELECT id, name, mime, kind, folder, object_key FROM files WHERE folder = ?"
  )
    .bind(from)
    .all();

  for (const row of results ?? []) {
    const nextKey = objectKeyOf(to, row.id);
    const currentKey = row.object_key || row.id;
    if (env.FILES && currentKey !== nextKey) {
      const object = await env.FILES.get(currentKey);
      if (object) {
        await env.FILES.put(nextKey, object.body, {
          httpMetadata: { contentType: row.mime },
          customMetadata: { name: row.name, kind: row.kind, folder: to },
        });
        await env.FILES.delete(currentKey);
      }
    }
    await env.DB.prepare("UPDATE files SET folder = ?, object_key = ? WHERE id = ?")
      .bind(to, nextKey, row.id)
      .run();
  }

  await env.DB.prepare("UPDATE folders SET name = ? WHERE name = ?").bind(to, from).run();
  return json({ ok: true, folder: { name: to } });
}

async function deleteAdminFolder(env, name) {
  const folder = tidyFolder(name);
  if (!folder) return json({ ok: false, error: "invalid_folder" }, 400);
  const target = await ensureFolder(env, "未分类");
  if (folder === target) return json({ ok: false, error: "protected_folder" }, 400);

  const { results } = await env.DB.prepare(
    "SELECT id, name, mime, kind, object_key FROM files WHERE folder = ?"
  )
    .bind(folder)
    .all();
  for (const row of results ?? []) {
    const nextKey = objectKeyOf(target, row.id);
    const currentKey = row.object_key || row.id;
    if (env.FILES && currentKey !== nextKey) {
      const object = await env.FILES.get(currentKey);
      if (object) {
        await env.FILES.put(nextKey, object.body, {
          httpMetadata: { contentType: row.mime },
          customMetadata: { name: row.name, kind: row.kind, folder: target },
        });
        await env.FILES.delete(currentKey);
      }
    }
    await env.DB.prepare("UPDATE files SET folder = ?, object_key = ? WHERE id = ?")
      .bind(target, nextKey, row.id)
      .run();
  }
  await env.DB.prepare("DELETE FROM folders WHERE name = ?").bind(folder).run();
  return json({ ok: true, folder, moved_to: target });
}

async function listAdminFiles(env, url) {
  await seedDefaultFolders(env);
  const kind = String(url.searchParams.get("kind") || "").trim();
  const folder = tidyFolder(url.searchParams.get("folder") || "");
  const q = String(url.searchParams.get("q") || "").trim();
  if (kind && !FILE_LIMIT[kind]) return json({ ok: false, error: "invalid_kind" }, 400);

  let sql = "SELECT id, name, mime, size, kind, folder, object_key, created_at FROM files";
  const binds = [];
  const where = [];
  if (kind) {
    where.push("kind = ?");
    binds.push(kind);
  }
  if (folder) {
    where.push("folder = ?");
    binds.push(folder);
  }
  if (q) {
    where.push("name LIKE ?");
    binds.push(`%${q.replace(/[%_]/g, "")}%`);
  }
  if (where.length) sql += ` WHERE ${where.join(" AND ")}`;
  sql += " ORDER BY created_at DESC LIMIT 400";

  const stmt = env.DB.prepare(sql);
  const { results } = binds.length ? await stmt.bind(...binds).all() : await stmt.all();
  return json({ ok: true, files: (results ?? []).map(parseFileRow) });
}

async function uploadAdminFile(env, request) {
  const denied = requireStore(env);
  if (denied) return denied;

  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, error: "invalid_form" }, 400);
  }
  const file = form.get("file");
  if (!file || typeof file === "string" || typeof file.arrayBuffer !== "function") {
    return json({ ok: false, error: "missing_file" }, 400);
  }

  const mime = String(file.type || "application/octet-stream").toLowerCase();
  const kind = kindOfMime(mime);
  if (!kind) return json({ ok: false, error: "unsupported_type" }, 415);

  const size = Number(file.size) || 0;
  if (!size) return json({ ok: false, error: "empty_file" }, 400);
  if (size > FILE_LIMIT[kind]) return json({ ok: false, error: "too_large" }, 413);

  const name = tidyFileName(file.name);
  const folder = await ensureFolder(env, tidyFolder(form.get("folder")) || defaultFolderOf(kind));
  const id = crypto.randomUUID();
  const key = objectKeyOf(folder, id);
  const created_at = new Date().toISOString();
  const bytes = await file.arrayBuffer();

  await env.FILES.put(key, bytes, {
    httpMetadata: { contentType: mime },
    customMetadata: { name, kind, folder },
  });

  try {
    await env.DB.prepare(
      "INSERT INTO files (id, name, mime, size, kind, folder, object_key, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
      .bind(id, name, mime, size, kind, folder, key, created_at)
      .run();
  } catch (err) {
    await env.FILES.delete(key);
    throw err;
  }

  return json({ ok: true, file: parseFileRow({ id, name, mime, size, kind, folder, object_key: key, created_at }) }, 201);
}

async function uploadCommentImage(env, request) {
  const denied = requireStore(env);
  if (denied) return denied;

  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, error: "invalid_form" }, 400);
  }
  const file = form.get("file");
  if (!file || typeof file === "string" || typeof file.arrayBuffer !== "function") {
    return json({ ok: false, error: "missing_file" }, 400);
  }

  const mime = String(file.type || "").toLowerCase();
  if (!COMMENT_IMAGE_MIME.has(mime)) return json({ ok: false, error: "unsupported_type" }, 415);

  const size = Number(file.size) || 0;
  if (!size) return json({ ok: false, error: "empty_file" }, 400);
  if (size > MAX_COMMENT_IMAGE) return json({ ok: false, error: "too_large" }, 413);

  const name = tidyFileName(file.name);
  const folder = await ensureFolder(env, "评论");
  const id = crypto.randomUUID();
  const key = objectKeyOf(folder, id);
  const created_at = new Date().toISOString();
  const bytes = await file.arrayBuffer();

  await env.FILES.put(key, bytes, {
    httpMetadata: { contentType: mime },
    customMetadata: { name, kind: "image", folder },
  });

  try {
    await env.DB.prepare(
      "INSERT INTO files (id, name, mime, size, kind, folder, object_key, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
      .bind(id, name, mime, size, "image", folder, key, created_at)
      .run();
  } catch (err) {
    await env.FILES.delete(key);
    throw err;
  }

  return json({ ok: true, url: fileUrl(id, name) }, 201);
}

async function patchAdminFile(env, id, request) {
  const denied = requireStore(env);
  if (denied) return denied;
  if (!id) return json({ ok: false, error: "invalid_id" }, 400);

  const row = await env.DB.prepare(
    "SELECT id, name, mime, size, kind, folder, object_key, created_at FROM files WHERE id = ?"
  )
    .bind(id)
    .first();
  if (!row) return json({ ok: false, error: "not_found" }, 404);

  const payload = await readJson(request);
  const nextName = payload?.name != null ? tidyFileName(payload.name) : row.name;
  const nextFolder = payload?.folder != null
    ? await ensureFolder(env, tidyFolder(payload.folder) || defaultFolderOf(row.kind))
    : row.folder || "未分类";
  const nextKey = objectKeyOf(nextFolder, row.id);
  const currentKey = row.object_key || row.id;

  if (currentKey !== nextKey) {
    const object = await env.FILES.get(currentKey);
    if (object) {
      await env.FILES.put(nextKey, object.body, {
        httpMetadata: { contentType: row.mime },
        customMetadata: { name: nextName, kind: row.kind, folder: nextFolder },
      });
      await env.FILES.delete(currentKey);
    }
  }

  await env.DB.prepare("UPDATE files SET name = ?, folder = ?, object_key = ? WHERE id = ?")
    .bind(nextName, nextFolder, nextKey, row.id)
    .run();

  return json({
    ok: true,
    file: parseFileRow({ ...row, name: nextName, folder: nextFolder, object_key: nextKey }),
  });
}

async function deleteAdminFile(env, id) {
  const denied = requireStore(env);
  if (denied) return denied;
  if (!id) return json({ ok: false, error: "invalid_id" }, 400);

  const row = await env.DB.prepare("SELECT id, object_key FROM files WHERE id = ?").bind(id).first();
  if (!row) return json({ ok: false, error: "not_found" }, 404);

  await env.FILES.delete(row.object_key || row.id);
  if (row.object_key && row.object_key !== row.id) await env.FILES.delete(row.id);
  await env.DB.prepare("DELETE FROM files WHERE id = ?").bind(id).run();
  return json({ ok: true, id, deleted: true });
}

async function servePublicFile(env, id) {
  const denied = requireStore(env);
  if (denied) return denied;
  if (!id) return json({ ok: false, error: "not_found" }, 404);

  const row = await env.DB.prepare(
    "SELECT id, name, mime, object_key FROM files WHERE id = ?"
  )
    .bind(id)
    .first();
  if (!row) return json({ ok: false, error: "not_found" }, 404);

  const object = (await env.FILES.get(row.object_key || row.id)) || (await env.FILES.get(row.id));
  if (!object) return json({ ok: false, error: "not_found" }, 404);

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("content-type", row.mime || "application/octet-stream");
  headers.set("cache-control", "public, max-age=31536000, immutable");
  headers.set("content-disposition", `inline; filename*=UTF-8''${encodeURIComponent(row.name)}`);
  Object.entries(CORS_HEADERS).forEach(([key, value]) => headers.set(key, value));
  return new Response(object.body, { status: 200, headers });
}

/* ---------------------------------- 路由 ---------------------------------- */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (path === "/api/health") {
      return json({ ok: true, service: "komichi-api", admin: Boolean(env.ADMIN_TOKEN) });
    }

    if (path === "/api/messages") {
      if (request.method === "GET") return listMessages(env, url);
      if (request.method === "POST") return createMessage(env, request);
      return json({ ok: false, error: "method_not_allowed" }, 405);
    }

    if (path === "/api/comments") {
      if (request.method === "GET") return listComments(env, url);
      if (request.method === "POST") return createComment(env, request);
      return json({ ok: false, error: "method_not_allowed" }, 405);
    }

    if (path === "/api/comment-image") {
      if (request.method === "POST") return uploadCommentImage(env, request);
      return json({ ok: false, error: "method_not_allowed" }, 405);
    }

    if (path === "/api/playlist") {
      if (request.method === "GET") return listTracks(env);
      return json({ ok: false, error: "method_not_allowed" }, 405);
    }

    if (path === "/api/tap") {
      if (request.method === "GET") return listTapConfig(env);
      return json({ ok: false, error: "method_not_allowed" }, 405);
    }

    if (path === "/api/documents") {
      if (request.method === "GET") return listPublicDocuments(env);
      return json({ ok: false, error: "method_not_allowed" }, 405);
    }

    if (path === "/api/admin/session") {
      if (request.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
      const payload = await readJson(request);
      const token = String(payload?.token ?? "").trim();
      if (!env.ADMIN_TOKEN || token !== String(env.ADMIN_TOKEN)) {
        return json({ ok: false, error: "invalid_token" }, 401);
      }
      return json({ ok: true });
    }

    if (path === "/api/admin/messages") {
      const denied = await requireAdmin(request, env);
      if (denied) return denied;
      if (request.method === "GET") return listMessages(env, url);
      return json({ ok: false, error: "method_not_allowed" }, 405);
    }

    const adminMessage = path.match(/^\/api\/admin\/messages\/(\d+)$/);
    if (adminMessage) {
      const denied = await requireAdmin(request, env);
      if (denied) return denied;
      if (request.method === "DELETE") return deleteAdminMessage(env, Number(adminMessage[1]));
      return json({ ok: false, error: "method_not_allowed" }, 405);
    }

    if (path === "/api/admin/comments") {
      const denied = await requireAdmin(request, env);
      if (denied) return denied;
      if (request.method === "GET") return listAdminComments(env, url);
      return json({ ok: false, error: "method_not_allowed" }, 405);
    }

    const adminComment = path.match(/^\/api\/admin\/comments\/(\d+)$/);
    if (adminComment) {
      const denied = await requireAdmin(request, env);
      if (denied) return denied;
      if (request.method === "DELETE") return deleteAdminComment(env, Number(adminComment[1]));
      return json({ ok: false, error: "method_not_allowed" }, 405);
    }

    if (path === "/api/admin/tracks") {
      const denied = await requireAdmin(request, env);
      if (denied) return denied;
      if (request.method === "GET") return listTracks(env);
      if (request.method === "POST") return createTrack(env, request);
      return json({ ok: false, error: "method_not_allowed" }, 405);
    }

    const adminTrack = path.match(/^\/api\/admin\/tracks\/(\d+)$/);
    if (adminTrack) {
      const denied = await requireAdmin(request, env);
      if (denied) return denied;
      if (request.method === "PATCH") return patchTrack(env, Number(adminTrack[1]), request);
      if (request.method === "DELETE") return deleteTrack(env, Number(adminTrack[1]));
      return json({ ok: false, error: "method_not_allowed" }, 405);
    }

    if (path === "/api/admin/tap") {
      const denied = await requireAdmin(request, env);
      if (denied) return denied;
      if (request.method === "GET") return listTapConfig(env);
      return json({ ok: false, error: "method_not_allowed" }, 405);
    }

    const adminTap = path.match(/^\/api\/admin\/tap\/(hit|bed)\/(\d+)$/);
    if (adminTap) {
      const denied = await requireAdmin(request, env);
      if (denied) return denied;
      if (request.method === "PATCH") return patchTapSlot(env, adminTap[1], adminTap[2], request);
      return json({ ok: false, error: "method_not_allowed" }, 405);
    }

    if (path === "/api/admin/documents") {
      const denied = await requireAdmin(request, env);
      if (denied) return denied;
      if (request.method === "GET") return listAdminDocuments(env);
      return json({ ok: false, error: "method_not_allowed" }, 405);
    }

    const docMatch = path.match(/^\/api\/admin\/documents\/([a-z]+)\/([^/]+)$/);
    if (docMatch) {
      const denied = await requireAdmin(request, env);
      if (denied) return denied;
      const kind = docMatch[1];
      let slug = docMatch[2];
      try {
        slug = decodeURIComponent(slug);
      } catch {
        /* keep raw */
      }
      if (!KINDS.has(kind)) return json({ ok: false, error: "invalid_kind" }, 400);
      if (!slug) return json({ ok: false, error: "invalid_slug" }, 400);

      if (request.method === "GET") return getAdminDocument(env, kind, slug);
      if (request.method === "PUT") return upsertDocument(env, kind, slug, request);
      if (request.method === "DELETE") return deleteDocument(env, kind, slug, url.searchParams.get("hard") === "1");
      return json({ ok: false, error: "method_not_allowed" }, 405);
    }

    if (path === "/api/admin/folders") {
      const denied = await requireAdmin(request, env);
      if (denied) return denied;
      if (request.method === "GET") return listAdminFolders(env);
      if (request.method === "POST") return createAdminFolder(env, request);
      return json({ ok: false, error: "method_not_allowed" }, 405);
    }

    const folderMatch = path.match(/^\/api\/admin\/folders\/([^/]+)$/);
    if (folderMatch) {
      const denied = await requireAdmin(request, env);
      if (denied) return denied;
      let folderName = folderMatch[1];
      try {
        folderName = decodeURIComponent(folderName);
      } catch {
        /* keep raw */
      }
      if (request.method === "PATCH") return renameAdminFolder(env, folderName, request);
      if (request.method === "DELETE") return deleteAdminFolder(env, folderName);
      return json({ ok: false, error: "method_not_allowed" }, 405);
    }

    if (path === "/api/admin/files") {
      const denied = await requireAdmin(request, env);
      if (denied) return denied;
      if (request.method === "GET") return listAdminFiles(env, url);
      if (request.method === "POST") return uploadAdminFile(env, request);
      return json({ ok: false, error: "method_not_allowed" }, 405);
    }

    const fileMatch = path.match(/^\/api\/admin\/files\/([^/]+)$/);
    if (fileMatch) {
      const denied = await requireAdmin(request, env);
      if (denied) return denied;
      if (request.method === "PATCH") return patchAdminFile(env, fileMatch[1], request);
      if (request.method === "DELETE") return deleteAdminFile(env, fileMatch[1]);
      return json({ ok: false, error: "method_not_allowed" }, 405);
    }

    const publicFile = path.match(/^\/files\/([^/]+)\/([^/]+)$/);
    if (publicFile) {
      if (request.method !== "GET" && request.method !== "HEAD") {
        return json({ ok: false, error: "method_not_allowed" }, 405);
      }
      return servePublicFile(env, publicFile[1]);
    }

    if (path === "/api" || path.startsWith("/api/")) {
      return json({ ok: false, error: "not_found" }, 404);
    }

    if (env.ASSETS) return env.ASSETS.fetch(request);

    return json({ ok: false, error: "not_found" }, 404);
  },
};
