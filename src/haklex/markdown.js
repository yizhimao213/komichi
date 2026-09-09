import { createHeadlessEditor } from "@lexical/headless";
import { $convertFromMarkdownString } from "@lexical/markdown";
import { allEditNodes } from "@haklex/rich-editor/nodes";
import { ALL_TRANSFORMERS } from "@haklex/rich-editor/plugins";

const cache = new Map();

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
  return String(markdown || "")
    .split("\n")
    .filter((line) => /^#{2,3} /.test(line))
    .map((line) => {
      const level = line.startsWith("###") ? 3 : 2;
      const text = line.replace(/^#{2,3} /, "").trim();
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
      return { level, text, id };
    });
}

export function markdownToLexical(markdown) {
  const source = String(markdown || "").trim();
  if (!source) {
    return {
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
  }
  const hit = cache.get(source);
  if (hit) return hit;

  const editor = createHeadlessEditor({
    namespace: "komichi-md",
    nodes: allEditNodes,
    onError: (error) => {
      console.error("[haklex markdown]", error);
    },
  });

  editor.update(
    () => {
      $convertFromMarkdownString(source, ALL_TRANSFORMERS);
    },
    { discrete: true }
  );

  const value = editor.getEditorState().toJSON();
  cache.set(source, value);
  return value;
}
