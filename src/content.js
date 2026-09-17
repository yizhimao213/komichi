const postFiles = import.meta.glob("../content/posts/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});
const noteFiles = import.meta.glob("../content/notes/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});
const pageFiles = import.meta.glob("../content/pages/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});
const thinkingFiles = import.meta.glob("../content/thinking/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});
const sayFiles = import.meta.glob("../content/says/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});
const siteFiles = import.meta.glob("../content/site.md", {
  query: "?raw",
  import: "default",
  eager: true,
});
const quoteFiles = import.meta.glob("../content/quotes/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});
const seriesFiles = import.meta.glob("../content/series/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});
const friendFiles = import.meta.glob("../content/friends.md", {
  query: "?raw",
  import: "default",
  eager: true,
});
const projectFiles = import.meta.glob("../content/projects.md", {
  query: "?raw",
  import: "default",
  eager: true,
});

function parse(raw, slug) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  const meta = {};
  let body = raw;
  if (match) {
    match[1].split("\n").forEach((line) => {
      const idx = line.indexOf(":");
      if (idx === -1) return;
      const key = line.slice(0, idx).trim();
      let value = line.slice(idx + 1).trim();
      if (value.startsWith("[") && value.endsWith("]")) {
        value = value
          .slice(1, -1)
          .split(",")
          .map((s) => s.trim().replace(/^["']|["']$/g, ""))
          .filter(Boolean);
      } else {
        value = value.replace(/^["']|["']$/g, "");
        if (value === "true") value = true;
        else if (value === "false") value = false;
      }
      meta[key] = value;
    });
    body = match[2];
  }
  return { slug, ...meta, body };
}

function slugFrom(path) {
  return path.split("/").pop().replace(/\.md$/, "");
}

export function seriesSlug(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function categorySlug(name) {
  const raw = String(name || "").trim();
  if (!raw) return "";
  if (CATEGORY_ALIAS[raw]) return CATEGORY_ALIAS[raw];
  return seriesSlug(raw);
}

export function tagSlug(name) {
  return seriesSlug(name);
}

function decodeKey(slug) {
  let key = String(slug || "");
  try {
    key = decodeURIComponent(key);
  } catch {
    /* keep raw */
  }
  return key;
}

export function countWords(text) {
  const body = String(text || "").replace(/```[\s\S]*?```/g, " ");
  const cn = (body.match(/[\u4e00-\u9fff]/g) || []).length;
  const en = (body.match(/[A-Za-z0-9]+/g) || []).length;
  return cn + en;
}

/* ------------------------------- 构建期基线 ------------------------------- */

export const baselinePosts = Object.entries(postFiles)
  .map(([path, raw]) => parse(raw, slugFrom(path)))
  .sort((a, b) => String(b.date).localeCompare(String(a.date)));

export const baselineNotes = Object.entries(noteFiles)
  .map(([path, raw]) => parse(raw, slugFrom(path)))
  .sort((a, b) => Number(b.nid || 0) - Number(a.nid || 0));

export const baselinePages = Object.fromEntries(
  Object.entries(pageFiles).map(([path, raw]) => {
    const page = parse(raw, slugFrom(path));
    return [page.slug, page];
  })
);

const siteRaw = Object.values(siteFiles)[0] || "";
export const baselineSite = parse(siteRaw, "site");

function parseCatalog(raw) {
  const text = String(raw || "").replace(/\r\n/g, "\n").trim();
  if (!text) return [];
  const chunks = text.split(/^##\s+/m).map((chunk) => chunk.trim()).filter(Boolean);
  return chunks.map((chunk) => {
    const lines = chunk.split("\n");
    const name = String(lines.shift() || "").trim();
    const meta = {};
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) {
        i += 1;
        if (Object.keys(meta).length) break;
        continue;
      }
      const idx = line.indexOf(":");
      if (idx === -1) break;
      const key = line.slice(0, idx).trim();
      if (!/^[A-Za-z][\w-]*$/.test(key)) break;
      meta[key] = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      i += 1;
    }
    const desc = lines.slice(i).join("\n").replace(/\s+/g, " ").trim();
    return { name, ...meta, desc };
  }).filter((item) => item.name);
}

export const baselineFriends = parseCatalog(Object.values(friendFiles)[0] || "")
  .map((item) => ({
    slug: seriesSlug(item.name),
    name: item.name,
    url: item.url || item.href || "",
    avatar: mediaSrc(item.avatar || item.icon),
    desc: item.desc,
  }))
  .filter((item) => item.name && item.url);

export const baselineProjects = parseCatalog(Object.values(projectFiles)[0] || "")
  .map((item) => {
    const name = item.name;
    return {
      slug: seriesSlug(name),
      name,
      mark: item.mark || String(name || "").slice(0, 1),
      url: item.url || item.href || "",
      avatar: mediaSrc(item.avatar || item.icon),
      desc: item.desc,
    };
  })
  .filter((item) => item.name && item.url);

export const baselineThoughts = Object.entries(thinkingFiles)
  .map(([path, raw]) => {
    const item = parse(raw, slugFrom(path));
    return { slug: item.slug, date: item.date || item.slug, text: String(item.body || "").trim() };
  })
  .filter((item) => item.text)
  .sort((a, b) => String(b.date).localeCompare(String(a.date)));

export const baselineSays = Object.entries(sayFiles)
  .map(([path, raw]) => {
    const item = parse(raw, slugFrom(path));
    return {
      slug: item.slug,
      date: item.date || "",
      author: item.author || "",
      source: item.source || "",
      text: String(item.body || "").trim(),
    };
  })
  .filter((item) => item.text)
  .sort((a, b) => {
    const byDate = String(b.date).localeCompare(String(a.date));
    return byDate || String(b.slug).localeCompare(String(a.slug));
  });

export const baselineQuotes = Object.entries(quoteFiles)
  .map(([path, raw]) => {
    const item = parse(raw, slugFrom(path));
    return { slug: item.slug, text: String(item.body || "").trim() };
  })
  .filter((item) => item.text)
  .sort((a, b) => String(a.slug).localeCompare(String(b.slug)));

export const baselineSeries = Object.entries(seriesFiles).map(([path, raw]) => {
  const file = parse(raw, slugFrom(path));
  const name = file.name || file.title || slugFrom(path);
  return {
    slug: seriesSlug(file.slug || name),
    name,
    subtitle: file.subtitle || file.tagline || "",
    description: String(file.body || "").trim(),
    letter: file.letter || "",
    color: file.color || "",
    date: file.date || "",
  };
});

/* ------------------------------- 派生计算 ------------------------------- */

function mediaSrc(value) {
  return String(value || "").trim();
}

function daysSince(iso) {
  const start = new Date(`${String(iso).replaceAll(".", "-")}T00:00:00`);
  if (Number.isNaN(start.getTime())) return 0;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.floor((today - start) / 86400000));
}

function seriesLetter(name, letter) {
  const custom = String(letter || "").trim();
  if (custom) return custom.slice(0, 1);
  const ch = String(name || "").trim().slice(0, 1);
  return /[a-z]/.test(ch) ? ch.toUpperCase() : ch || "栏";
}

function seriesHue(name) {
  let n = 0;
  for (const ch of String(name || "")) n = (n + ch.charCodeAt(0) * 17) % 360;
  return n;
}

function makeSeries(partial) {
  const name = String(partial.name || partial.slug || "").trim();
  const slug = seriesSlug(partial.slug || name);
  const label = name || slug;
  return {
    slug,
    name: label,
    subtitle: String(partial.subtitle || "").trim(),
    description: String(partial.description || "").trim(),
    letter: seriesLetter(label, partial.letter),
    color: String(partial.color || "").trim(),
    hue: seriesHue(label),
    date: partial.date || "",
    notes: [],
  };
}

function findSeriesBucket(map, raw) {
  const name = String(raw || "").trim();
  if (!name) return null;
  const slug = seriesSlug(name);
  if (map.has(slug)) return map.get(slug);
  if (map.has(name)) return map.get(name);
  for (const item of map.values()) {
    if (item.slug === name || item.name === name || item.slug === slug) return item;
  }
  return null;
}

let seriesDocs = baselineSeries;

function buildSeriesList() {
  const map = new Map();
  for (const doc of seriesDocs) {
    const item = makeSeries(doc);
    if (!item.slug) continue;
    map.set(item.slug, item);
  }
  for (const note of notes) {
    const raw = String(note.series || "").trim();
    if (!raw) continue;
    let bucket = findSeriesBucket(map, raw);
    if (!bucket) {
      const slug = seriesSlug(raw);
      if (!slug) continue;
      bucket = makeSeries({ slug, name: raw, date: note.date });
      map.set(slug, bucket);
    }
    bucket.notes.push(note);
    if (!bucket.date || String(note.date).localeCompare(String(bucket.date)) < 0) {
      bucket.date = note.date;
    }
  }
  return [...map.values()].sort((a, b) => String(a.date || a.name).localeCompare(String(b.date || b.name)));
}

function buildCategoryList() {
  const map = new Map();
  for (const post of posts) {
    const name = String(post.category || "").trim() || "未分类";
    const slug = categorySlug(name) || "uncategorized";
    const existing = map.get(slug);
    if (!existing) {
      map.set(slug, { slug, name, posts: [post] });
    } else {
      existing.posts.push(post);
    }
  }
  return [...map.values()].sort((a, b) => b.posts.length - a.posts.length || String(a.name).localeCompare(String(b.name), "zh-CN"));
}

function buildTagList() {
  const map = new Map();
  for (const post of posts) {
    const tags = Array.isArray(post.tags) ? post.tags : post.tags ? [post.tags] : [];
    for (const raw of tags) {
      const name = String(raw || "").trim();
      if (!name) continue;
      const slug = tagSlug(name);
      if (!slug) continue;
      const existing = map.get(slug);
      if (!existing) {
        map.set(slug, { slug, name, posts: [post] });
      } else if (!existing.posts.includes(post)) {
        existing.posts.push(post);
      }
    }
  }
  return [...map.values()].sort((a, b) => b.posts.length - a.posts.length || String(a.name).localeCompare(String(b.name), "zh-CN"));
}

const CATEGORY_ALIAS = {
  技术: "tech",
  折腾: "tinkering",
};

const covers = {
  219: "/covers/night.jpg",
  218: "/covers/street.jpg",
};

function applyCovers() {
  posts.forEach((p) => {
    p.cover = p.cover || covers[p.slug];
  });
  notes.forEach((n) => {
    n.cover = n.cover || covers[n.nid] || covers[n.slug];
  });
}

function buildCatalog() {
  return [
    ...posts.map((p) => ({ title: p.title, href: `/posts/${p.slug}`, kind: "文稿" })),
    ...notes.map((n) => ({ title: n.title, href: `/notes/${n.nid || n.slug}`, kind: "手记" })),
    ...seriesList.map((s) => ({ title: s.name, href: `/notes/series/${s.slug}`, kind: "专栏" })),
    { title: "专栏", href: "/notes/series", kind: "页面" },
    ...categoryList.map((c) => ({ title: c.name, href: `/categories/${c.slug}`, kind: "分类" })),
    { title: "分类", href: "/categories", kind: "页面" },
    ...tagList.map((t) => ({ title: `#${t.name}`, href: `/posts/tag/${t.slug}`, kind: "标签" })),
    { title: "关于我", href: "/about", kind: "页面" },
    { title: "关于本站", href: "/about-site", kind: "页面" },
    { title: "友人帐", href: "/friends", kind: "页面" },
    { title: "项目", href: "/projects", kind: "页面" },
    { title: "一言", href: "/says", kind: "页面" },
    { title: "留言", href: "/message", kind: "页面" },
    { title: "时光", href: "/timeline", kind: "页面" },
    { title: "思考", href: "/thinking", kind: "页面" },
  ];
}

/* ----------------------------- 运行时可变内容 ----------------------------- */

export let posts = baselinePosts;
export let notes = baselineNotes;
export let quotes = baselineQuotes.map((item) => item.text);
export let thoughts = baselineThoughts.map((item) => ({ date: item.date || item.slug, text: item.text }));
export let says = baselineSays.map((item) => ({
  slug: item.slug,
  date: item.date,
  author: item.author,
  source: item.source,
  text: item.text,
}));
export let friends = baselineFriends;
export let projects = baselineProjects;
export let aboutPage = baselinePages.about || { title: "关于我", kicker: "", body: "待补充" };
export let aboutSitePage = baselinePages["about-site"] || { title: "关于本站", kicker: "", body: "待补充" };
export let siteSince = baselineSite.since || "2020-09-01";
export let siteLead =
  baselineSite.lead || "误入现世的工程师一只。白天画结界、排术式，夜里把想法炼成能自己走路的小世界。";
export let siteDays = daysSince(siteSince);
export let siteWords = [...posts, ...notes].reduce((sum, item) => sum + countWords(item.body), 0);
export let seriesList = buildSeriesList();
export let categoryList = buildCategoryList();
export let tagList = buildTagList();
export let catalog = buildCatalog();

applyCovers();

/* -------------------------------- 查找接口 -------------------------------- */

export function getPost(slug) {
  return posts.find((p) => p.slug === slug);
}

export function getNote(nid) {
  return notes.find((n) => String(n.nid) === String(nid) || n.slug === String(nid));
}

export function getSeries(slug) {
  const key = decodeKey(slug);
  return seriesList.find((item) => item.slug === key || item.name === key || seriesSlug(item.name) === key);
}

export function getCategory(slug) {
  const key = decodeKey(slug);
  return categoryList.find((item) => item.slug === key || item.name === key);
}

export function getTag(slug) {
  const key = decodeKey(slug);
  return tagList.find((item) => item.slug === key || item.name === key);
}

export function citeOf(s) {
  const source = s.source ? `出自「${s.source}」` : "";
  const author = s.author || "";
  return [source, author].filter(Boolean).join(" · ");
}

/* -------------------------------- 覆盖层合并 -------------------------------- */

const OVERRIDE_META_KEYS = [
  "title",
  "date",
  "summary",
  "cover",
  "category",
  "tags",
  "nid",
  "series",
  "letter",
  "color",
  "subtitle",
  "mood",
  "kicker",
];

const TEXT_META_KEYS = ["date", "author", "source", "mood"];

function parseLexical(raw) {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && parsed.root ? parsed : null;
  } catch {
    return null;
  }
}

function parseJsonArray(raw) {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function sortPosts(list) {
  return [...list].sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function sortNotes(list) {
  return [...list].sort((a, b) => Number(b.nid || 0) - Number(a.nid || 0));
}

function mergeOverride(base, doc) {
  const meta = doc.meta && typeof doc.meta === "object" ? doc.meta : {};
  const merged = { ...(base || {}), slug: base?.slug || doc.slug };
  for (const key of OVERRIDE_META_KEYS) {
    const value = meta[key];
    if (value === undefined || value === null || value === "") continue;
    merged[key] = value;
  }
  const lexical = parseLexical(doc.body);
  if (lexical) {
    merged.lexical = lexical;
  } else if (typeof doc.body === "string" && doc.body.trim()) {
    merged.body = doc.body;
    delete merged.lexical;
  }
  return merged;
}

function mergeText(base, doc) {
  const meta = doc.meta && typeof doc.meta === "object" ? doc.meta : {};
  const merged = { ...(base || {}), slug: base?.slug || doc.slug };
  for (const key of TEXT_META_KEYS) {
    const value = meta[key];
    if (value === undefined || value === null || value === "") continue;
    merged[key] = value;
  }
  const body = typeof doc.body === "string" ? doc.body.trim() : "";
  if (body) merged.text = body;
  return merged;
}

function collectByKind(docs) {
  const byKey = new Map();
  for (const doc of docs || []) {
    if (!doc || !doc.kind || !doc.slug) continue;
    byKey.set(`${doc.kind}:${doc.slug}`, doc);
  }
  return byKey;
}

function resolveList(kind, baseline, byKey, merge) {
  const out = [];
  const used = new Set();
  for (const base of baseline) {
    const doc = byKey.get(`${kind}:${base.slug}`);
    if (!doc) {
      out.push(base);
      continue;
    }
    used.add(base.slug);
    if (doc.deleted) continue;
    out.push(merge(base, doc));
  }
  for (const [key, doc] of byKey) {
    if (doc.kind !== kind || doc.deleted) continue;
    const slug = key.slice(kind.length + 1);
    if (used.has(slug)) continue;
    out.push(merge(null, doc));
  }
  return out;
}

function resolveSeries(byKey) {
  const out = [];
  const used = new Set();
  for (const base of baselineSeries) {
    const doc = byKey.get(`series:${base.slug}`);
    if (!doc) {
      out.push(base);
      continue;
    }
    used.add(base.slug);
    if (doc.deleted) continue;
    out.push(mergeSeries(base, doc));
  }
  for (const [key, doc] of byKey) {
    if (doc.kind !== "series" || doc.deleted) continue;
    if (used.has(doc.slug)) continue;
    out.push(mergeSeries(null, doc));
  }
  return out;
}

function mergeSeries(base, doc) {
  const meta = doc.meta && typeof doc.meta === "object" ? doc.meta : {};
  const name = String(meta.name || base?.name || doc.slug || "").trim();
  const slug = seriesSlug(meta.slug || base?.slug || name);
  const body = typeof doc.body === "string" ? doc.body.trim() : "";
  return {
    slug,
    name,
    subtitle: meta.subtitle ?? base?.subtitle ?? "",
    description: body || base?.description || "",
    letter: meta.letter ?? base?.letter ?? "",
    color: meta.color ?? base?.color ?? "",
    date: meta.date ?? base?.date ?? "",
  };
}

function resolvePage(base, doc) {
  if (!doc || doc.deleted) return base;
  const meta = doc.meta && typeof doc.meta === "object" ? doc.meta : {};
  const lexical = parseLexical(doc.body);
  const rawBody = typeof doc.body === "string" ? doc.body.trim() : "";
  const next = {
    slug: base?.slug || doc.slug,
    title: String(meta.title ?? base?.title ?? "").trim(),
    kicker: String(meta.kicker ?? base?.kicker ?? "").trim(),
    body: base?.body ?? "",
  };
  if (lexical) {
    next.lexical = lexical;
  } else if (rawBody) {
    next.body = rawBody;
  }
  return next;
}

export function rebuildContent() {
  applyCovers();
  seriesList = buildSeriesList();
  categoryList = buildCategoryList();
  tagList = buildTagList();
  siteDays = daysSince(siteSince);
  siteWords = [...posts, ...notes].reduce((sum, item) => sum + countWords(item.body), 0);
  catalog = buildCatalog();
}

export function applyContentOverrides(docs) {
  const byKey = collectByKind(docs);

  posts = sortPosts(resolveList("post", baselinePosts, byKey, mergeOverride));
  notes = sortNotes(resolveList("note", baselineNotes, byKey, mergeOverride));

  thoughts = resolveList("thought", baselineThoughts, byKey, mergeText)
    .map((item) => ({ date: item.date || item.slug, text: String(item.text || "").trim() }))
    .filter((item) => item.text)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));

  says = resolveList("say", baselineSays, byKey, mergeText)
    .map((item) => ({
      slug: item.slug,
      date: item.date || "",
      author: item.author || "",
      source: item.source || "",
      text: String(item.text || "").trim(),
    }))
    .filter((item) => item.text)
    .sort((a, b) => {
      const byDate = String(b.date).localeCompare(String(a.date));
      return byDate || String(b.slug).localeCompare(String(a.slug));
    });

  quotes = resolveList("quote", baselineQuotes, byKey, mergeText)
    .map((item) => String(item.text || "").trim())
    .filter(Boolean);

  aboutPage = resolvePage(baselinePages.about, byKey.get("page:about")) || aboutPage;
  aboutSitePage = resolvePage(baselinePages["about-site"], byKey.get("page:about-site")) || aboutSitePage;

  const friendDoc = byKey.get("friend:index");
  if (friendDoc && !friendDoc.deleted) {
    const parsed = parseJsonArray(friendDoc.body);
    if (parsed) friends = parsed;
  }
  const projectDoc = byKey.get("project:index");
  if (projectDoc && !projectDoc.deleted) {
    const parsed = parseJsonArray(projectDoc.body);
    if (parsed) projects = parsed;
  }

  const siteDoc = byKey.get("site:index");
  if (siteDoc && !siteDoc.deleted) {
    const meta = siteDoc.meta && typeof siteDoc.meta === "object" ? siteDoc.meta : {};
    if (meta.since !== undefined && meta.since !== null && meta.since !== "") siteSince = String(meta.since);
    if (meta.lead !== undefined && meta.lead !== null && meta.lead !== "") siteLead = String(meta.lead);
  }

  seriesDocs = resolveSeries(byKey);
  rebuildContent();
}
