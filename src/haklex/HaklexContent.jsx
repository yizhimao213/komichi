import { useMemo } from "react";
import { composeRenderer } from "@haklex/rich-compose";
import { allRendererModules } from "@haklex/rich-compose/renderer";
import { PollDataProvider } from "@haklex/rich-ext-poll";
import { markdownToLexical } from "./markdown.js";
import { pollAdapter } from "./poll.js";
import { useSiteTheme } from "./theme.js";
import "@haklex/rich-compose/style.css";
import "katex/dist/katex.min.css";

const RichContent = composeRenderer({ modules: allRendererModules });

export default function HaklexContent({ markdown, value, variant = "article", className = "" }) {
  const theme = useSiteTheme();
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
