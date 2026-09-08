import { useMemo } from "react";
import { marked } from "marked";
import { aboutPage } from "../content.js";
import { markdownImage } from "../lazyImages.js";

export default function About() {
  const html = useMemo(() => {
    const renderer = new marked.Renderer();
    renderer.image = markdownImage;
    return marked.parse(aboutPage.body || "待补充", { renderer, gfm: true, breaks: false });
  }, []);

  return (
    <main className="wrap">
      <header className="page-head">
        {aboutPage.kicker ? <p className="kicker">{aboutPage.kicker}</p> : null}
        <h1>{aboutPage.title || "关于我"}</h1>
      </header>
      <article className="prose" style={{ paddingBottom: 80 }} dangerouslySetInnerHTML={{ __html: html }} />
    </main>
  );
}
