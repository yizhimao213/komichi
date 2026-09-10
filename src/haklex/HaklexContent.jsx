import { useEffect, useMemo } from "react";
import { composeRenderer } from "@haklex/rich-compose";
import {
  allRendererModules,
  dynamicModule,
  excalidrawModule,
  galleryModule,
  imageModule,
  nestedDocModule,
} from "@haklex/rich-compose/renderer";
import { MentionPlatformProvider } from "@haklex/rich-renderer-mention/static";
import { PollDataProvider } from "@haklex/rich-ext-poll";
import { markdownToLexical } from "./markdown.js";
import { mentionPlatforms } from "./mentions.js";
import { pollAdapter } from "./poll.js";
import { useSiteTheme } from "./theme.js";
import { useImageLightbox } from "./ImageLightbox.jsx";
import { useNodeExpand } from "./NodeExpand.jsx";
import "@haklex/rich-compose/style.css";
import "katex/dist/katex.min.css";

const hooks = {
  openImage: () => {},
  expandNested: () => {},
  expandDraw: () => {},
};

function isHttpsUrl(url) {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

const rendererModules = allRendererModules.map((mod) => {
  if (mod.name === "image") {
    return imageModule.setup({ onImageClick: (payload) => hooks.openImage(payload) });
  }
  if (mod.name === "gallery") {
    return galleryModule.setup({ onImageClick: (payload) => hooks.openImage(payload) });
  }
  if (mod.name === "nested-doc") {
    return nestedDocModule.setup({ onExpand: (payload) => hooks.expandNested(payload) });
  }
  if (mod.name === "excalidraw") {
    return excalidrawModule.setup({ onExpand: (payload) => hooks.expandDraw(payload) });
  }
  if (mod.name === "dynamic") {
    return dynamicModule.setup({ validateUrl: isHttpsUrl });
  }
  return mod;
});
const RichContent = composeRenderer({ modules: rendererModules });

export default function HaklexContent({ markdown, value, variant = "article", className = "" }) {
  const theme = useSiteTheme();
  const { open } = useImageLightbox();
  const { expandNested, expandDraw } = useNodeExpand();
  useEffect(() => {
    hooks.openImage = open;
    hooks.expandNested = expandNested;
    hooks.expandDraw = expandDraw;
  }, [open, expandNested, expandDraw]);
  const fromMarkdown = useMemo(
    () => (value ? null : markdownToLexical(markdown)),
    [markdown, value]
  );
  const resolved = value ?? fromMarkdown;
  if (!resolved) return null;
  return (
    <MentionPlatformProvider platforms={mentionPlatforms}>
      <PollDataProvider adapter={pollAdapter}>
        <RichContent
          value={resolved}
          variant={variant}
          theme={theme}
          className={["haklex-body", className].filter(Boolean).join(" ")}
        />
      </PollDataProvider>
    </MentionPlatformProvider>
  );
}
