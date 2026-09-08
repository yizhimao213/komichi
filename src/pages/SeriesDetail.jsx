import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getSeries } from "../content.js";

function noteYear(iso) {
  return String(iso || "").slice(0, 4) || "—";
}

function noteMd(iso) {
  const d = new Date(`${String(iso).replaceAll(".", "-")}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function groupByYear(list) {
  const map = new Map();
  for (const note of list) {
    const year = noteYear(note.date);
    if (!map.has(year)) map.set(year, []);
    map.get(year).push(note);
  }
  return [...map.entries()];
}

function hrefOf(note) {
  return `/notes/${note.nid || note.slug}`;
}

export default function SeriesDetail() {
  const { slug } = useParams();
  const series = getSeries(slug);
  const [newestFirst, setNewestFirst] = useState(true);

  const ordered = useMemo(() => {
    if (!series) return [];
    const list = [...series.notes];
    list.sort((a, b) => {
      const byDate = String(a.date || "").localeCompare(String(b.date || ""));
      const byNid = Number(a.nid || 0) - Number(b.nid || 0);
      const dir = newestFirst ? -1 : 1;
      return (byDate || byNid) * dir;
    });
    return list;
  }, [series, newestFirst]);

  const years = useMemo(() => {
    const groups = groupByYear(ordered);
    return newestFirst
      ? groups.sort((a, b) => String(b[0]).localeCompare(String(a[0])))
      : groups.sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  }, [ordered, newestFirst]);

  if (!series) {
    return (
      <main className="wrap">
        <p className="empty">这个专栏还不存在。</p>
      </main>
    );
  }

  const markStyle = {
    "--series-h": String(series.hue),
    ...(series.color ? { background: series.color } : {}),
  };

  return (
    <main className="wrap sx-page">
      <article className="sx-article">
        <header className="sx-head">
          <div className="sx-mark" style={markStyle} aria-hidden="true">
            {series.letter}
          </div>
          <div className="sx-copy">
            <h1>{series.name}</h1>
            {series.subtitle ? <p className="sx-sub">{series.subtitle}</p> : null}
            {series.description ? <p className="sx-desc">{series.description}</p> : null}
            <div className="sx-meta">
              <span>共 {series.notes.length} 篇</span>
              <button
                type="button"
                className="sx-sort"
                onClick={() => setNewestFirst((v) => !v)}
                aria-label={newestFirst ? "改为最早在前" : "改为最新在前"}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  {newestFirst ? (
                    <path d="M4 6h9M4 12h6M4 18h9M19 4v16m0 0-3.5-3.5M19 20l3.5-3.5" />
                  ) : (
                    <path d="M4 6h9M4 12h6M4 18h9M19 20V4m0 0-3.5 3.5M19 4l3.5 3.5" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </header>
        <div className="sx-rule" />
        <section className="sx-body">
          {years.length ? (
            years.map(([year, list]) => (
              <div className="sx-year" key={year}>
                <h2>{year}</h2>
                <ul>
                  {list.map((note) => (
                    <li key={note.slug}>
                      <Link to={hrefOf(note)} viewTransition>
                        <time>{noteMd(note.date)}</time>
                        <span>{note.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          ) : (
            <p className="empty">这个专栏还没有手记。</p>
          )}
        </section>
      </article>
    </main>
  );
}
