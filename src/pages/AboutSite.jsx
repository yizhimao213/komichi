import { useMemo } from "react";
import { marked } from "marked";
import { aboutSitePage } from "../content.js";
import { markdownImage } from "../lazyImages.js";

export default function AboutSite() {
  const html = useMemo(() => {
    const renderer = new marked.Renderer();
    renderer.image = markdownImage;
    return marked.parse(aboutSitePage.body || "待补充", { renderer, gfm: true, breaks: false });
  }, []);

  return (
    <main className="wrap">
      <header className="page-head">
        {aboutSitePage.kicker ? <p className="kicker">{aboutSitePage.kicker}</p> : null}
        <h1>{aboutSitePage.title || "关于本站"}</h1>
      </header>
      <article className="prose" style={{ paddingBottom: 80 }} dangerouslySetInnerHTML={{ __html: html }} />
    </main>
  );
}
