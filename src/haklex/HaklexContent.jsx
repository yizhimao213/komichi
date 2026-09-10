import { useEffect, useMemo } from "react";
import { composeRenderer } from "@haklex/rich-compose";
import { allRendererModules, galleryModule, imageModule } from "@haklex/rich-compose/renderer";
import { PollDataProvider } from "@haklex/rich-ext-poll";
import { markdownToLexical } from "./markdown.js";
import { pollAdapter } from "./poll.js";
import { useSiteTheme } from "./theme.js";
import { useImageLightbox } from "./ImageLightbox.jsx";
import "@haklex/rich-compose/style.css";
import "katex/dist/katex.min.css";

const lightbox = { open: () => {} };
const onImageClick = (payload) => lightbox.open(payload);
const rendererModules = allRendererModules.map((mod) => {
  if (mod.name === "image") return imageModule.setup({ onImageClick });
  if (mod.name === "gallery") return galleryModule.setup({ onImageClick });
  return mod;
});
const RichContent = composeRenderer({ modules: rendererModules });

export default function HaklexContent({ markdown, value, variant = "article", className = "" }) {
  const theme = useSiteTheme();
  const { open } = useImageLightbox();
  useEffect(() => {
    lightbox.open = open;
  }, [open]);
  const fromMarkdown = useMemo(
    () => (value ? null : markdownToLexical(markdown)),
    [markdown, value]
  );
  const resolved = value ?? fromMarkdown;
  if (!resolved) return null;
  return (
    <PollDataProvider adapter={pollAdapter}>
      <RichContent
        value={resolved}
        variant={variant}
        theme={theme}
        className={["haklex-body", className].filter(Boolean).join(" ")}
      />
    </PollDataProvider>
  );
}
