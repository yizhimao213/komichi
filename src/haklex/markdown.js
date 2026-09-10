import { createHeadlessEditor } from "@lexical/headless";
import { $convertFromMarkdownString } from "@lexical/markdown";
import {
  allEditNodes,
  FootnoteSectionEditNode,
  FootnoteSectionNode,
} from "@haklex/rich-editor/nodes";
import { ALL_TRANSFORMERS } from "@haklex/rich-editor/plugins";
import {
  createDefaultRegistry,
  deserializeFromXml,
} from "@haklex/rich-litexml";
import {
  IMAGE_IMPORT_TRANSFORMER,
  MERMAID_IMPORT_TRANSFORMER,
  TAG_IMPORT_TRANSFORMER,
} from "./transformers.js";

const cache = new Map();
const litexmlRegistry = createDefaultRegistry();

const BLOCK_TAGS = new Set([
  "alert",
  "attachment",
  "banner",
  "chat",
  "code-snippet",
  "codeblock",
  "details",
  "dynamic",
  "embed",
  "excalidraw",
  "footnote-section",
  "gallery",
  "grid",
  "img",
  "link-card",
  "math",
  "mermaid",
  "nested-doc",
  "poll",
  "video",
]);

const SITE_TRANSFORMERS = [
  MERMAID_IMPORT_TRANSFORMER,
  IMAGE_IMPORT_TRANSFORMER,
  TAG_IMPORT_TRANSFORMER,
  ...ALL_TRANSFORMERS,
];

const ALERT_TYPE_MAP = {
  NOTE: "note",
  TIP: "tip",
  IMPORTANT: "important",
  WARNING: "warning",
  CAUTION: "caution",
};

const BANNER_TYPE_MAP = {
  note: "note",
  info: "note",
  tip: "tip",
  success: "tip",
  important: "important",
  warning: "warning",
  warn: "warning",
  error: "caution",
  danger: "caution",
  caution: "caution",
};

const importNodes = allEditNodes.map((entry) =>
  entry === FootnoteSectionEditNode ? FootnoteSectionNode : entry
);

const emptyRoot = {
  root: {
    children: [
      {
        children: [],
        direction: null,
        format: "",
        indent: 0,
        type: "paragraph",
        version: 1,
      },
    ],
    direction: null,
    format: "",
    indent: 0,
    type: "root",
    version: 1,
  },
};

export function headingSlug(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replaceAll(/[^\s\w\u3000-\u9FFF\uAC00-\uD7AF\uFF00-\uFFEF-]/g, "")
    .replaceAll(/[\s_]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");
}

export function extractToc(markdown) {
  const slugs = new Map();
  const items = [];
  let fence = 0;
  for (const line of String(markdown || "").split("\n")) {
    const mark = line.match(/^(\s*)(`{3,}|~{3,})/);
    if (mark) {
      const n = mark[2].length;
      if (!fence) fence = n;
      else if (n >= fence) fence = 0;
      continue;
    }
    if (fence) continue;
    const heading = line.match(/^(#{2,3}) (.+)/);
    if (!heading) continue;
    const level = heading[1].length;
    const text = heading[2].trim();
    const base = headingSlug(text);
    let id = base;
    if (base) {
      const count = slugs.get(base);
      if (count !== undefined) {
        id = `${base}-${count}`;
        slugs.set(base, count + 1);
      } else {
        slugs.set(base, 1);
      }
    }
    items.push({ level, text, id });
  }
  return items;
}

function findTagEnd(source, start, tag) {
  const afterOpen = source.indexOf(">", start);
  if (afterOpen === -1) return -1;
  const openSlice = source.slice(start, afterOpen + 1);
  if (/\/>\s*$/.test(openSlice)) return afterOpen + 1;
  const close = `</${tag}>`;
  let pos = afterOpen + 1;
  while (pos < source.length) {
    const cdata = source.indexOf("<![CDATA[", pos);
    const closeAt = source.indexOf(close, pos);
    if (closeAt === -1) return -1;
    if (cdata !== -1 && cdata < closeAt) {
      const cend = source.indexOf("]]>", cdata + 9);
      pos = cend === -1 ? source.length : cend + 3;
      continue;
    }
    return closeAt + close.length;
  }
  return -1;
}

function splitMarkdownAndLitexml(source) {
  const segments = [];
  const n = source.length;
  let i = 0;
  let mdStart = 0;
  let inFence = false;

  while (i < n) {
    const atLine = i === 0 || source[i - 1] === "\n";
    if (atLine && source.startsWith("```", i)) {
      inFence = !inFence;
      i += 3;
      continue;
    }
    if (!inFence && atLine && source[i] === "<") {
      const open = source.slice(i).match(/^<([a-z][\w-]*)\b/i);
      const tag = open?.[1]?.toLowerCase();
      if (tag && BLOCK_TAGS.has(tag)) {
        const end = findTagEnd(source, i, tag);
        if (end > i) {
          if (i > mdStart) {
            segments.push({ type: "md", value: source.slice(mdStart, i) });
          }
          segments.push({ type: "xml", value: source.slice(i, end) });
          i = end;
          if (source[i] === "\n") i += 1;
          mdStart = i;
          continue;
        }
      }
    }
    i += 1;
  }
  if (mdStart < n) segments.push({ type: "md", value: source.slice(mdStart) });
  return segments;
}

function markdownSegmentToLexical(source) {
  const trimmed = String(source || "").trim();
  if (!trimmed) return [];

  const editor = createHeadlessEditor({
    namespace: "komichi-md",
    nodes: importNodes,
    onError: (error) => {
      console.error("[haklex markdown]", error);
    },
  });

  editor.update(
    () => {
      $convertFromMarkdownString(trimmed, SITE_TRANSFORMERS);
    },
    { discrete: true }
  );

  return editor.getEditorState().toJSON().root.children || [];
}

function xmlSegmentToLexical(xml) {
  try {
    const state = deserializeFromXml(xml.trim(), litexmlRegistry);
    return state?.root?.children || [];
  } catch (error) {
    console.error("[haklex litexml]", error);
    return markdownSegmentToLexical(xml);
  }
}

function nestedRoot(markdown) {
  const children = markdownSegmentToLexical(markdown);
  return {
    root: {
      children: children.length ? children : emptyRoot.root.children,
      direction: "ltr",
      format: "",
      indent: 0,
      type: "root",
      version: 1,
    },
  };
}

function makeAlertNode(alertType, markdown) {
  return {
    type: "alert-quote",
    alertType,
    content: nestedRoot(markdown),
    version: 1,
  };
}

function makeBannerNode(bannerType, markdown) {
  return {
    type: "banner",
    bannerType,
    content: nestedRoot(markdown),
    version: 1,
  };
}

function makeDetailsNode(summary, markdown) {
  return {
    type: "details",
    summary,
    open: false,
    children: markdownSegmentToLexical(markdown),
    direction: "ltr",
    format: "",
    indent: 0,
    version: 1,
  };
}

function liftMarkdownBlocks(source) {
  const lines = String(source || "").split("\n");
  const segments = [];
  let mdLines = [];
  let i = 0;

  const flushMd = () => {
    if (!mdLines.length) return;
    segments.push({ type: "md", value: mdLines.join("\n") });
    mdLines = [];
  };

  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("```")) {
      mdLines.push(line);
      i += 1;
      while (i < lines.length) {
        mdLines.push(lines[i]);
        if (lines[i].startsWith("```")) {
          i += 1;
          break;
        }
        i += 1;
      }
      continue;
    }

    const alert = line.match(/^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*$/);
    if (alert) {
      flushMd();
      i += 1;
      const body = [];
      while (i < lines.length && /^>/.test(lines[i]) && !/^>\s*\[!/.test(lines[i])) {
        body.push(lines[i].replace(/^>\s?/, ""));
        i += 1;
      }
      segments.push({
        type: "nodes",
        nodes: [makeAlertNode(ALERT_TYPE_MAP[alert[1]], body.join("\n"))],
      });
      continue;
    }

    const container = line.match(/^:::\s*(\w+)(?:\{([^}]*)\})?\s*$/);
    if (container) {
      flushMd();
      const kind = container[1];
      const params = container[2] || "";
      i += 1;
      const body = [];
      while (i < lines.length && !/^:::\s*$/.test(lines[i])) {
        body.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;
      if (kind === "details") {
        const summary = params.match(/summary="([^"]*)"/)?.[1] ?? "Details";
        segments.push({
          type: "nodes",
          nodes: [makeDetailsNode(summary, body.join("\n"))],
        });
        continue;
      }
      if (kind in BANNER_TYPE_MAP) {
        segments.push({
          type: "nodes",
          nodes: [makeBannerNode(BANNER_TYPE_MAP[kind], body.join("\n"))],
        });
        continue;
      }
      mdLines.push(line, ...body);
      if (i > 0 && /^:::\s*$/.test(lines[i - 1])) mdLines.push(":::");
      continue;
    }

    if (/^\$\$\s*$/.test(line)) {
      flushMd();
      i += 1;
      const body = [];
      while (i < lines.length && !/^\$\$\s*$/.test(lines[i])) {
        body.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;
      segments.push({
        type: "nodes",
        nodes: [{ type: "katex-block", equation: body.join("\n").trim(), version: 1 }],
      });
      continue;
    }

    const oneLineMath = line.match(/^\$\$([^$]+)\$\$\s*$/);
    if (oneLineMath) {
      flushMd();
      segments.push({
        type: "nodes",
        nodes: [{ type: "katex-block", equation: oneLineMath[1].trim(), version: 1 }],
      });
      i += 1;
      continue;
    }

    mdLines.push(line);
    i += 1;
  }
  flushMd();
  return segments;
}

export function markdownToLexical(markdown) {
  const source = String(markdown || "").trim();
  if (!source) return emptyRoot;
  const hit = cache.get(source);
  if (hit) return hit;

  const children = splitMarkdownAndLitexml(source).flatMap((segment) => {
    if (!segment.value.trim()) return [];
    if (segment.type === "xml") return xmlSegmentToLexical(segment.value);
    return liftMarkdownBlocks(segment.value).flatMap((part) => {
      if (part.type === "nodes") return part.nodes;
      return markdownSegmentToLexical(part.value);
    });
  });

  const value = {
    root: {
      children: children.length ? children : emptyRoot.root.children,
      direction: null,
      format: "",
      indent: 0,
      type: "root",
      version: 1,
    },
  };
  cache.set(source, value);
  return value;
}
