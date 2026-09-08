import { thoughts } from "../content.js";

export default function Thinking() {
  return (
    <main className="wrap">
      <header className="page-head">
        <p className="kicker">还没写成文章的句子</p>
        <h1>思考</h1>
        <p>短一些，也算数。</p>
      </header>
      <section className="card-grid">
        {thoughts.map((t) => (
          <article className="say" key={t.text}>
            <q>{t.text}</q>
            <span>{t.date}</span>
          </article>
        ))}
      </section>
    </main>
  );
}
