// komichi API on Cloudflare Workers + D1
//
// 公开接口
//   GET    /api/health
//   GET    /api/messages?limit=50
//   POST   /api/messages                 { nickname?, content }
//   GET    /api/documents                覆盖层（仅未删除）
//
// 后台接口（需 ADMIN_TOKEN）
//   POST   /api/admin/session            { token } -> 校验口令
//   GET    /api/admin/documents          含已删除，供后台列表
//   PUT    /api/admin/documents/:kind/:slug
//   DELETE /api/admin/documents/:kind/:slug   软删除，回落到构建期基线

const MAX_CONTENT_LEN = 2000;
const MAX_NICKNAME_LEN = 40;
const MAX_BODY_LEN = 512 * 1024;
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
  "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
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

/* -------------------------------- 内容覆盖层 ------------------------------- */

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

    if (path === "/api" || path.startsWith("/api/")) {
      return json({ ok: false, error: "not_found" }, 404);
    }

    if (env.ASSETS) return env.ASSETS.fetch(request);

    return json({ ok: false, error: "not_found" }, 404);
  },
};
