import { aboutSitePage } from "../content.js";
import HaklexContent from "../haklex/HaklexContent.jsx";

export default function AboutSite() {
  return (
    <main className="wrap">
      <header className="page-head">
        {aboutSitePage.kicker ? <p className="kicker">{aboutSitePage.kicker}</p> : null}
        <h1>{aboutSitePage.title || "关于本站"}</h1>
      </header>
      <article style={{ paddingBottom: 80 }}>
        <HaklexContent markdown={aboutSitePage.body || "待补充"} variant="article" />
      </article>
    </main>
  );
}
