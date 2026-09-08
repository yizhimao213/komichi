import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { notes, seriesList } from "../content.js";

const WEEK = ["日", "一", "二", "三", "四", "五", "六"];
const TONES = ["#c4a574", "#b8a0c8", "#c9b8a8", "#d4c4a8", "#c4a090", "#c08070", "#8aa0b0"];

function toneOf(slug) {
  let n = 0;
  for (const ch of String(slug)) n = (n + ch.charCodeAt(0) * 13) % TONES.length;
  return TONES[n];
}

function formatWhen(iso) {
  const start = new Date(`${String(iso).replaceAll(".", "-")}T00:00:00`);
  if (Number.isNaN(start.getTime())) return "";
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.max(0, Math.floor((today - start) / 86400000));
  if (diff === 0) return "今天";
  if (diff <= 30) return `${diff}天前`;
  return `${start.getFullYear()}年${start.getMonth() + 1}月${start.getDate()}日星期${WEEK[start.getDay()]}`;
}

const recent = notes.slice(0, 4);

export default function NotesMega({ onJump }) {
  return (
    <div className="mega-body">
      <div className="mega-cols">
        <section>
          <p className="mega-kicker">专栏</p>
          <ul className="mega-series">
            {seriesList.map((item) => (
              <li key={item.slug}>
                <Link to={`/notes/series/${item.slug}`} viewTransition onClick={onJump}>
                  <span className="mega-mark" style={{ background: toneOf(item.slug) }} aria-hidden="true">
                    <BookOpen size={12} strokeWidth={1.8} />
                  </span>
                  <span>{item.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <p className="mega-kicker">近期手记</p>
          <div className="mega-notes">
            {recent.map((note) => (
              <Link
                className="mega-note"
                to={`/notes/${note.nid || note.slug}`}
                viewTransition
                key={note.slug}
                onClick={onJump}
              >
                <h3>{note.title}</h3>
                <p>{formatWhen(note.date)}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
      <div className="mega-foot">
        <Link to="/notes" viewTransition onClick={onJump}>查看全部手记</Link>
        <Link to="/notes/series" viewTransition onClick={onJump}>全部专栏</Link>
      </div>
    </div>
  );
}
