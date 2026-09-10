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

export const posts = Object.entries(postFiles)
  .map(([path, raw]) => parse(raw, slugFrom(path)))
  .sort((a, b) => String(b.date).localeCompare(String(a.date)));

export const notes = Object.entries(noteFiles)
  .map(([path, raw]) => parse(raw, slugFrom(path)))
  .sort((a, b) => Number(b.nid || 0) - Number(a.nid || 0));

const pages = Object.fromEntries(
  Object.entries(pageFiles).map(([path, raw]) => {
    const page = parse(raw, slugFrom(path));
    return [page.slug, page];
  })
);

export const aboutPage = pages.about || { title: "关于我", kicker: "", body: "待补充" };
export const aboutSitePage = pages["about-site"] || { title: "关于本站", kicker: "", body: "待补充" };

const siteRaw = Object.values(siteFiles)[0] || "";
const siteMeta = parse(siteRaw, "site");
export const siteSince = siteMeta.since || "2020-09-01";

function daysSince(iso) {
  const start = new Date(`${String(iso).replaceAll(".", "-")}T00:00:00`);
  if (Number.isNaN(start.getTime())) return 0;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.floor((today - start) / 86400000));
}

export const siteDays = daysSince(siteSince);
export const siteLead = siteMeta.lead || "误入现世的工程师一只。白天画结界、排术式，夜里把想法炼成能自己走路的小世界。";

export function countWords(text) {
  const body = String(text || "").replace(/```[\s\S]*?```/g, " ");
  const cn = (body.match(/[\u4e00-\u9fff]/g) || []).length;
  const en = (body.match(/[A-Za-z0-9]+/g) || []).length;
  return cn + en;
}

export const siteWords = [...posts, ...notes].reduce((sum, item) => sum + countWords(item.body), 0);

export const quotes = Object.entries(quoteFiles)
  .map(([path, raw]) => {
    const item = parse(raw, slugFrom(path));
    return { slug: item.slug, text: String(item.body || "").trim() };
  })
  .filter((item) => item.text)
  .sort((a, b) => String(a.slug).localeCompare(String(b.slug)))
  .map((item) => item.text);

function mediaSrc(value) {
  return String(value || "").trim();
}

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

export const friends = parseCatalog(Object.values(friendFiles)[0] || "")
  .map((item) => ({
    slug: seriesSlug(item.name),
    name: item.name,
    url: item.url || item.href || "",
    avatar: mediaSrc(item.avatar || item.icon),
    desc: item.desc,
  }))
  .filter((item) => item.name && item.url);

export const projects = parseCatalog(Object.values(projectFiles)[0] || "")
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

export const thoughts = Object.entries(thinkingFiles)
  .map(([path, raw]) => {
    const item = parse(raw, slugFrom(path));
    return { date: item.date || item.slug, text: String(item.body || "").trim() };
  })
  .filter((item) => item.text)
  .sort((a, b) => String(b.date).localeCompare(String(a.date)));

export const says = Object.entries(sayFiles)
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

export function citeOf(s) {
  const source = s.source ? `出自「${s.source}」` : "";
  const author = s.author || "";
  return [source, author].filter(Boolean).join(" · ");
}

export function getPost(slug) {
  return posts.find((p) => p.slug === slug);
}

export function getNote(nid) {
  return notes.find((n) => String(n.nid) === String(nid) || n.slug === String(nid));
}

export function seriesSlug(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff]+/g, "-")
    .replace(/^-|-$/g, "");
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

export const seriesList = (() => {
  const map = new Map();
  for (const [path, raw] of Object.entries(seriesFiles)) {
    const file = parse(raw, slugFrom(path));
    const item = makeSeries({
      slug: file.slug,
      name: file.name || file.title || slugFrom(path),
      subtitle: file.subtitle || file.tagline || "",
      description: file.body,
      letter: file.letter,
      color: file.color,
      date: file.date,
    });
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
})();

export function getSeries(slug) {
  const key = decodeKey(slug);
  return seriesList.find((item) => item.slug === key || item.name === key || seriesSlug(item.name) === key);
}

const CATEGORY_ALIAS = {
  技术: "tech",
  折腾: "tinkering",
};

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

export const categoryList = (() => {
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
})();

export function getCategory(slug) {
  const key = decodeKey(slug);
  return categoryList.find((item) => item.slug === key || item.name === key);
}

export const tagList = (() => {
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
})();

export function getTag(slug) {
  const key = decodeKey(slug);
  return tagList.find((item) => item.slug === key || item.name === key);
}

const covers = {
  219: "/covers/night.jpg",
  218: "/covers/street.jpg",
};

posts.forEach((p) => {
  p.cover = p.cover || covers[p.slug];
});
notes.forEach((n) => {
  n.cover = n.cover || covers[n.nid] || covers[n.slug];
});

export const catalog = [
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
