import { Rss } from "lucide-react";
import { says } from "../content.js";

function formatDate(iso) {
  const d = new Date(`${String(iso).replaceAll(".", "-")}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

function citeOf(s) {
  return s.source || s.author || "";
}

export default function Says() {
  return (
    <main className="says-page">
      <header className="says-head">
        <h1>一言</h1>
        <a className="says-rss" href="/feed" target="_blank" rel="noreferrer" aria-label="RSS">
          <Rss size={14} strokeWidth={1.8} />
        </a>
      </header>
      <div className="says-board">
        {says.map((s, i) => {
          const when = formatDate(s.date);
          const by = citeOf(s);
          return (
            <article className="says-card" key={s.slug} style={{ "--say-i": i }} data-say-in>
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
        })}
      </div>
    </main>
  );
}
