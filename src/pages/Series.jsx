import { Link } from "react-router-dom";
import { seriesList } from "../content.js";

export default function Series() {
  return (
    <main className="wrap sx-index">
      <header className="page-head">
        <p className="kicker">手记</p>
        <h1>专栏</h1>
        <p>同一条线上的手记，会聚在同一个名字下面。</p>
      </header>
      <section className="sx-cards">
        {seriesList.length ? (
          seriesList.map((item) => (
            <Link className="sx-card" to={`/notes/series/${item.slug}`} viewTransition key={item.slug}>
              <span
                className="sx-mark"
                style={{
                  "--series-h": String(item.hue),
                  ...(item.color ? { background: item.color } : {}),
                }}
                aria-hidden="true"
              >
                {item.letter}
              </span>
              <div>
                <h3>{item.name}</h3>
                <p>{item.subtitle || `共 ${item.notes.length} 篇`}</p>
              </div>
              <time>{item.notes.length} 篇</time>
            </Link>
          ))
        ) : (
          <p className="empty">还没有专栏。在 content/series/ 新建一份 Markdown，或给手记写上 series。</p>
        )}
      </section>
    </main>
  );
}
