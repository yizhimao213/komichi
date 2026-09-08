import { Link } from "react-router-dom";
import { Rss } from "lucide-react";
import { notes, posts, siteDays, siteWords } from "../content.js";

const COL_A = [
  ["/about", "自述"],
  ["/thinking", "思考"],
  ["/timeline", "时光"],
  ["/message", "留言"],
];
const COL_B = [
  ["/about-site", "此站点"],
  ["/projects", "项目"],
  ["/friends", "友人帐"],
  ["/says", "一言"],
];

function formatWan(n) {
  if (n >= 10000) return `${(n / 10000).toFixed(n >= 100000 ? 0 : 1).replace(/\.0$/, "")}`;
  return String(n);
}

const BILI = "https://space.bilibili.com/1512246445";

export default function HomeMega({ onJump }) {
  return (
    <div className="mega-body home-mega">
      <div className="home-mega-grid">
        <section className="home-mega-profile">
          <img className="home-mega-avatar" src="/assets/avatar.jpg" alt="" data-eager loading="eager" decoding="async" />
          <p className="home-mega-name">komichi</p>
          <p className="home-mega-status">
            <span aria-hidden="true" />
            暂时安静
          </p>
          <div className="home-mega-stats">
            <span>
              <b>{posts.length + notes.length}</b>
              <em>文</em>
            </span>
            <span>
              <b>{formatWan(siteWords)}</b>
              <em>万字</em>
            </span>
            <span>
              <b>{siteDays}</b>
              <em>日</em>
            </span>
          </div>
          <div className="home-mega-socials">
            <a href={BILI} target="_blank" rel="noreferrer" aria-label="B站" onClick={onJump}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
                <path d="M5.4 6.8 7.2 5l1.2 1.2L6.6 8H17.4l-1.8-1.8L16.8 5l1.8 1.8V8h.9A2.5 2.5 0 0 1 22 10.5v7A2.5 2.5 0 0 1 19.5 20h-15A2.5 2.5 0 0 1 2 17.5v-7A2.5 2.5 0 0 1 4.5 8h.9V6.8ZM7.8 12.2a1.2 1.2 0 0 0-1.2 1.2v1.2a1.2 1.2 0 1 0 2.4 0v-1.2a1.2 1.2 0 0 0-1.2-1.2Zm8.4 0a1.2 1.2 0 0 0-1.2 1.2v1.2a1.2 1.2 0 1 0 2.4 0v-1.2a1.2 1.2 0 0 0-1.2-1.2Z" />
              </svg>
            </a>
            <a href="/feed" target="_blank" rel="noreferrer" aria-label="RSS" onClick={onJump}>
              <Rss size={15} strokeWidth={1.8} />
            </a>
          </div>
        </section>
        <section className="home-mega-pages">
          <p className="mega-kicker">页面</p>
          <div className="home-mega-cols">
            <ul>
              {COL_A.map(([to, label]) => (
                <li key={to}>
                  <Link to={to} viewTransition onClick={onJump}>{label}</Link>
                </li>
              ))}
            </ul>
            <ul>
              {COL_B.map(([to, label]) => (
                <li key={to}>
                  <Link to={to} viewTransition onClick={onJump}>{label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
