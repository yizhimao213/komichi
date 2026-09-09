import { $isRootNode } from "lexical";
import {
  $createImageNode,
  $createMermaidNode,
  ImageNode,
  MermaidNode,
} from "@haklex/rich-editor/nodes";

export const IMAGE_IMPORT_TRANSFORMER = {
  dependencies: [ImageNode],
  export: () => null,
  regExp: /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)\s*$/,
  replace: (parentNode, _children, match) => {
    parentNode.replace(
      $createImageNode({
        altText: match[1] || "",
        caption: match[3] || undefined,
        src: match[2],
      })
    );
  },
  type: "element",
};

export const MERMAID_IMPORT_TRANSFORMER = {
  dependencies: [MermaidNode],
  export: () => null,
  regExpEnd: {
    optional: true,
    regExp: /[\t ]*```$/,
  },
  regExpStart: /^[\t ]*```mermaid\s*$/,
  replace: (rootNode, _children, _startMatch, _endMatch, linesInBetween, isImport) => {
    const diagram = (linesInBetween || []).join("\n").trim();
    const node = $createMermaidNode(diagram);
    if (isImport || $isRootNode(rootNode)) {
      rootNode.append(node);
    } else {
      rootNode.replace(node);
    }
  },
  type: "multiline-element",
};
