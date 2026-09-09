import { aboutPage } from "../content.js";
import HaklexContent from "../haklex/HaklexContent.jsx";

export default function About() {
  return (
    <main className="wrap">
      <header className="page-head">
        {aboutPage.kicker ? <p className="kicker">{aboutPage.kicker}</p> : null}
        <h1>{aboutPage.title || "关于我"}</h1>
      </header>
      <article style={{ paddingBottom: 80 }}>
        <HaklexContent markdown={aboutPage.body || "待补充"} variant="article" />
      </article>
    </main>
  );
}
