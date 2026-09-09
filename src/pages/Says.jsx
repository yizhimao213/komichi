import { useEffect, useState } from "react";
import { Rss } from "lucide-react";
import { citeOf, says } from "../content.js";

function formatDate(iso) {
  const d = new Date(`${String(iso).replaceAll(".", "-")}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

function splitColumns(items, n) {
  const cols = Array.from({ length: n }, () => []);
  items.forEach((item, i) => cols[i % n].push({ item, i }));
  return cols;
}

function SayCard({ s, i }) {
  const when = formatDate(s.date);
  const by = citeOf(s);
  return (
    <article className="says-card" style={{ "--say-i": i }} data-say-in>
      <span className="says-mark" aria-hidden="true">
        “
      </span>
      <q>{s.text}</q>
      <div className="says-foot">
        <time dateTime={s.date || undefined}>{when}</time>
        {by ? <cite>{by}</cite> : <span />}
      </div>
    </article>
  );
}

export default function Says() {
  const [cols, setCols] = useState(2);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1100px)");
    const sync = () => setCols(mq.matches ? 1 : 2);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const columns = splitColumns(says, cols);

  return (
    <main className="says-page">
      <header className="says-head">
        <h1>一言</h1>
        <a className="says-rss" href="/feed" target="_blank" rel="noreferrer" aria-label="RSS">
          <Rss size={16} strokeWidth={2.2} />
        </a>
      </header>
      <div className="says-board">
        {columns.map((col, ci) => (
          <div className="says-col" key={ci}>
            {col.map(({ item, i }) => (
              <SayCard key={item.slug} s={item} i={i} />
            ))}
          </div>
        ))}
      </div>
    </main>
  );
}
