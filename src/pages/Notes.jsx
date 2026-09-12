import { Link } from "react-router-dom";
import { notes, seriesSlug } from "../content.js";

const WEEK = ["日", "一", "二", "三", "四", "五", "六"];
const WEEK_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];

function parseDate(iso) {
  const d = new Date(`${String(iso).replaceAll(".", "-")}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function featuredWhen(iso) {
  const d = parseDate(iso);
  if (!d) return "";
  return `${WEEK_EN[d.getDay()]}, ${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function dayBits(iso) {
  const d = parseDate(iso);
  if (!d) return { day: "", month: "", week: "", full: "" };
  return {
    day: String(d.getDate()).padStart(2, "0"),
    month: MONTHS[d.getMonth()],
    week: WEEK_EN[d.getDay()],
    full: `周${WEEK[d.getDay()]}，${d.getMonth() + 1}月${d.getDate()}日`,
  };
}

function firstParas(note, n = 4) {
  const parts = String(note.body || "")
    .split(/\n{2,}/)
    .map((p) => p.replace(/^#+\s+.+$/gm, "").replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 12);
  return parts.slice(0, n);
}

function oneLine(note) {
  return String(note.summary || note.body || "")
    .replace(/^#+\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function hrefOf(note) {
  return `/notes/${note.nid || note.slug}`;
}

function seriesHue(name) {
  let n = 0;
  for (const ch of String(name || "")) n = (n + ch.charCodeAt(0) * 17) % 360;
  return n;
}

function groupByYear(list) {
  const map = new Map();
  for (const note of list) {
    const year = String(note.date || "").slice(0, 4) || "—";
    if (!map.has(year)) map.set(year, []);
    map.get(year).push(note);
  }
  return [...map.entries()].sort((a, b) => String(b[0]).localeCompare(String(a[0])));
}

function Deckle() {
  return <div className="ni-deckle" aria-hidden="true" />;
}

export default function Notes() {
  const [latest, ...rest] = notes;
  const years = groupByYear(rest);

  return (
    <main className="ni-page">
      {latest ? <Featured note={latest} /> : <p className="empty">还没有手记。</p>}

      {years.length ? (
        <>
          <div className="ni-split">
            <i />
            <span>更早的手记</span>
            <i />
          </div>
          <div className="ni-years">
            {years.map(([year, list]) => (
              <section className="ni-anno" key={year}>
                <header className="ni-anno-head">
                  <div>
                    <p>Anno</p>
                    <strong>{year}</strong>
                  </div>
                  <em>
                    {list.length} 封
                  </em>
                </header>
                <div className="ni-list">
                  <i className="ni-rail" />
                  {list.map((note) => (
                    <OlderNote note={note} key={note.slug} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      ) : null}
    </main>
  );
}

function Featured({ note }) {
  const href = hrefOf(note);
  const hue = seriesHue(note.series);
  const paras = firstParas(note, 4);

  return (
    <article className="ni-sheet" style={{ "--series-h": hue }}>
      <Deckle />
      <div className="ni-sheet-inner">
        {note.series ? (
          <Link className="ni-ribbon" to={`/notes/series/${seriesSlug(note.series)}`} viewTransition>
            <span className="ni-ribbon-row">
              <span className="ni-ribbon-bar" />
              <span className="ni-ribbon-face">{note.series}</span>
            </span>
            <span className="ni-ribbon-tail" />
          </Link>
        ) : null}
        <Link className="ni-cover" to={href} viewTransition>
          {note.cover ? <img src={note.cover} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" /> : null}
          <div className="ni-cover-wash" />
          <div className="ni-cover-copy">
            <p>
              {note.mood ? (
                <span>
                  <i />
                  {note.mood}
                </span>
              ) : null}
              {note.mood ? <b /> : null}
              <span>{featuredWhen(note.date)}</span>
            </p>
            <h1>{note.title}</h1>
          </div>
        </Link>
        <div className="ni-body">
          {paras.map((p) => (
            <p key={p.slice(0, 24)}>{p}</p>
          ))}
        </div>
        <footer className="ni-foot">
          <span>
            四季折 · 第 {note.nid || note.slug} 封
          </span>
          <Link to={href} viewTransition>
            阅读全文 →
          </Link>
        </footer>
      </div>
    </article>
  );
}

function OlderNote({ note }) {
  const href = hrefOf(note);
  const when = dayBits(note.date);
  const hue = seriesHue(note.series);

  return (
    <article className="ni-row" style={{ "--series-h": hue }}>
      <div className="ni-when">
        <strong>{when.day}</strong>
        <span>{when.month}</span>
        <em>{when.week}</em>
      </div>
      <i className="ni-dot" />
      <div className="ni-row-main">
        <p className="ni-when-mobile">{when.full}</p>
        <Link className="ni-card" to={href} viewTransition>
          <Deckle />
          <div className="ni-card-inner">
            {note.cover ? (
              <div className="ni-card-cover">
                <img src={note.cover} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
              </div>
            ) : null}
            <div className="ni-card-body">
              <p className="ni-card-meta">
                {note.series ? <span className="ni-tag">{note.series}</span> : null}
                {note.mood ? <span>{note.mood}</span> : null}
              </p>
              <h3>{note.title}</h3>
              <p className="ni-card-ex">{oneLine(note)}</p>
              <div className="ni-card-foot">
                <span>第 {note.nid || note.slug} 封</span>
                <em>阅读全文 →</em>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </article>
  );
}
