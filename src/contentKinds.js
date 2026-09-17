import * as content from "./content.js";

const RICH_FIELDS = [
  { key: "title", label: "标题", wide: true },
  { key: "date", label: "日期", placeholder: "2026-01-01" },
  { key: "summary", label: "摘要", wide: true },
  { key: "cover", label: "封面", placeholder: "/covers/xxx.jpg" },
];

export const KIND_LIST = [
  {
    kind: "post",
    label: "文稿",
    group: "内容",
    mode: "collection",
    body: "rich",
    accent: "oklch(0.68 0.15 60)",
    hrefOf: (slug) => `/posts/${slug}`,
    baseline: () => content.baselinePosts,
    titleOf: (item) => item.title || item.slug,
    metaOf: (item) => item.slug,
    fields: [
      ...RICH_FIELDS,
      { key: "category", label: "分类", placeholder: "技术 / 整理" },
      { key: "tags", label: "标签", placeholder: "用逗号分隔", type: "tags" },
    ],
  },
  {
    kind: "note",
    label: "手记",
    group: "内容",
    mode: "collection",
    body: "rich",
    accent: "oklch(0.67 0.15 155)",
    hrefOf: (slug) => `/notes/${slug}`,
    baseline: () => content.baselineNotes,
    titleOf: (item) => item.title || item.slug,
    metaOf: (item) => item.nid || item.slug,
    fields: [
      ...RICH_FIELDS,
      { key: "series", label: "专栏", placeholder: "深夜杂想" },
      { key: "nid", label: "编号 nid", placeholder: "220" },
      { key: "mood", label: "心情", placeholder: "悲哀" },
    ],
  },
  {
    kind: "page",
    label: "页面",
    group: "内容",
    mode: "collection",
    body: "rich",
    accent: "oklch(0.70 0.14 210)",
    hrefOf: (slug) => `/${slug}`,
    baseline: () => Object.values(content.baselinePages),
    titleOf: (item) => item.title || item.slug,
    metaOf: (item) => item.slug,
    fields: [
      { key: "title", label: "标题", wide: true },
      { key: "kicker", label: "小字", wide: true },
    ],
  },
  {
    kind: "thought",
    label: "思考",
    group: "内容",
    mode: "collection",
    body: "text",
    accent: "oklch(0.68 0.22 350)",
    hrefOf: () => "/thinking",
    baseline: () => content.baselineThoughts,
    titleOf: (item) => item.text,
    metaOf: (item) => item.date,
    fields: [{ key: "date", label: "日期", placeholder: "2026.09.15", wide: true }],
    bodyLabel: "内容",
  },
  {
    kind: "say",
    label: "一言",
    group: "内容",
    mode: "collection",
    body: "text",
    accent: "oklch(0.72 0.16 155)",
    hrefOf: () => "/says",
    baseline: () => content.baselineSays,
    titleOf: (item) => item.text,
    metaOf: (item) => [item.author, item.source].filter(Boolean).join(" · ") || item.date,
    fields: [
      { key: "date", label: "日期", placeholder: "2024-04-02" },
      { key: "author", label: "作者", placeholder: "太宰治" },
      { key: "source", label: "出处", placeholder: "人间失格" },
    ],
    bodyLabel: "句子",
  },
  {
    kind: "quote",
    label: "语录",
    group: "内容",
    mode: "collection",
    body: "text",
    accent: "oklch(0.75 0.13 210)",
    baseline: () => content.baselineQuotes,
    titleOf: (item) => item.text,
    metaOf: (item) => item.slug,
    fields: [],
    bodyLabel: "语录",
  },
  {
    kind: "series",
    label: "专栏",
    group: "内容",
    mode: "collection",
    body: "text",
    accent: "oklch(0.73 0.2 350)",
    hrefOf: (slug) => `/notes/series/${slug}`,
    baseline: () => content.baselineSeries,
    titleOf: (item) => item.name || item.slug,
    metaOf: (item) => `${item.notes ? item.notes.length : 0} 篇`,
    fields: [
      { key: "name", label: "名称", wide: true },
      { key: "subtitle", label: "副标题", wide: true },
      { key: "letter", label: "标记字", placeholder: "深" },
      { key: "date", label: "日期", placeholder: "2026-08-12" },
      { key: "color", label: "颜色", placeholder: "oklch(...) 或留空" },
    ],
    bodyLabel: "专栏简介",
  },
  {
    kind: "friend",
    label: "友人帐",
    group: "站点",
    mode: "entries",
    accent: "oklch(0.70 0.14 210)",
    hrefOf: () => "/friends",
    slug: "index",
    baseline: () => content.baselineFriends,
    titleOf: (item) => item.name,
    metaOf: (item) => item.url,
    entryFields: [
      { key: "name", label: "名称" },
      { key: "url", label: "链接", placeholder: "https://" },
      { key: "avatar", label: "头像", placeholder: "/assets/xxx.jpg" },
      { key: "desc", label: "描述", wide: true },
    ],
  },
  {
    kind: "project",
    label: "项目",
    group: "站点",
    mode: "entries",
    accent: "oklch(0.67 0.15 155)",
    hrefOf: () => "/projects",
    slug: "index",
    baseline: () => content.baselineProjects,
    titleOf: (item) => item.name,
    metaOf: (item) => item.url,
    entryFields: [
      { key: "name", label: "名称" },
      { key: "url", label: "链接", placeholder: "https://" },
      { key: "mark", label: "标记字", placeholder: "小" },
      { key: "avatar", label: "图标", placeholder: "/assets/xxx.png" },
      { key: "desc", label: "描述", wide: true },
    ],
  },
  {
    kind: "site",
    label: "站点信息",
    group: "站点",
    mode: "fields",
    accent: "oklch(0.68 0.15 60)",
    hrefOf: () => "/",
    slug: "index",
    baseline: () => [{ slug: "index", since: content.siteSince, lead: content.siteLead }],
    titleOf: () => "站点信息",
    metaOf: (item) => item.since,
    fields: [
      { key: "since", label: "建站日期", placeholder: "2020-09-01", wide: true },
      { key: "lead", label: "站点简介", placeholder: "一句话介绍", wide: true, lines: 3 },
    ],
  },
];

export const KIND_MAP = Object.fromEntries(KIND_LIST.map((item) => [item.kind, item]));

export const KIND_GROUPS = KIND_LIST.reduce((groups, item) => {
  const bucket = groups.find((group) => group.name === item.group);
  if (bucket) bucket.items.push(item);
  else groups.push({ name: item.group, items: [item] });
  return groups;
}, []);

export function tagsToText(tags) {
  if (Array.isArray(tags)) return tags.join(", ");
  return String(tags || "");
}

export function textToTags(text) {
  return String(text || "")
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function slugify(text) {
  return content.seriesSlug(text) || String(text || "").trim();
}
