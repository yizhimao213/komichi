import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronUp, Copy } from "lucide-react";
import { categorySlug, countWords, getNote, getPost, getSeries, notes, seriesSlug } from "../content.js";
import { Link, useParams } from "react-router-dom";
import Toc from "../components/Toc.jsx";
import { useHeaderMeta } from "../context.jsx";
import HaklexContent from "../haklex/HaklexContent.jsx";
import { extractToc } from "../haklex/markdown.js";
import { openImageSrc, useImageLightbox } from "../haklex/ImageLightbox.jsx";

const AUTHOR = "四十小路";
const LICENSE_HREF = "https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-hans";

const NOTE_FONT_KEY = "yohaku-note-font";

function daysAgo(iso) {
  const start = new Date(`${String(iso).replaceAll(".", "-")}T00:00:00`);
  if (Number.isNaN(start.getTime())) return "";
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.max(0, Math.floor((today - start) / 86400000));
  if (diff === 0) return "今天";
  return `${diff}天前`;
}

function noteHref(note) {
  return `/notes/${note.nid || note.slug}`;
}

function nearbyNotes(currentId) {
  const list = notes;
  const idx = list.findIndex((n) => String(n.nid) === String(currentId) || n.slug === String(currentId));
  if (idx < 0) return list.slice(0, 9);
  const start = Math.max(0, idx - 4);
  return list.slice(start, start + 9);
}

function isCurrentNote(note, currentId) {
  return String(note.nid) === String(currentId) || note.slug === String(currentId);
}

function SeriesRibbon({ series, href, name }) {
  const latest = series?.notes?.[0];
  const latestHref = latest ? `/notes/${latest.nid || latest.slug}` : href;
  const intro = String(series?.subtitle || "").trim();
  const desc = String(series?.description || "").replace(/\s+/g, " ").trim();
  const count = series?.notes?.length || 0;
  const letter = series?.letter || String(name || "栏").slice(0, 1);

  const face = (
    <>
      <span className="ni-ribbon-row">
        <span className="ni-ribbon-bar" />
        <span className="ni-ribbon-face">{name}</span>
      </span>
      <span className="ni-ribbon-tail" />
    </>
  );

  return (
    <div className="ni-ribbon-wrap">
      {href ? (
        <Link className="ni-ribbon" to={href} viewTransition>
          {face}
        </Link>
      ) : (
        <span className="ni-ribbon">{face}</span>
      )}
      {series ? (
        <div className="ni-ribbon-pop" role="note">
          <div className="ni-ribbon-pop-card">
            <Link className="ni-ribbon-pop-head" to={href} viewTransition>
              <span className="ni-ribbon-pop-mark" aria-hidden="true">
                {letter}
              </span>
              <span className="ni-ribbon-pop-name">{name}</span>
              <span className="ni-ribbon-pop-go" aria-hidden="true">
                ↗
              </span>
            </Link>
            {intro ? <p className="ni-ribbon-pop-intro">{intro}</p> : null}
            {desc ? <p className="ni-ribbon-pop-desc">{desc}</p> : null}
            <div className="ni-ribbon-pop-foot">
              {latest ? (
                <p className="ni-ribbon-pop-latest">
                  最近更新
                  <Link to={latestHref} viewTransition>
                    「{latest.title}」
                  </Link>
                  <span>{daysAgo(latest.date)}</span>
                </p>
              ) : null}
              <p className="ni-ribbon-pop-count">共有手记：{count} 篇</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function NoteSeriesRail({ series, href, name, currentId }) {
  const [foldOpen, setFoldOpen] = useState(true);
  const count = series?.notes?.length || 0;
  const near = nearbyNotes(currentId);
  const seriesNotes = series?.notes || [];

  if (!series) return <div className="note-series-col" aria-hidden="true" />;

  return (
    <aside className="note-series-col" aria-label={`${name} 专栏`}>
      <div className="ni-ribbon-aside is-open">
        <ul className="ni-aside-near">
          {near.map((note) => {
            const current = isCurrentNote(note, currentId);
            return (
              <li key={note.nid || note.slug}>
                <Link
                  className={`ni-aside-item ${current ? "is-current" : ""}`}
                  to={noteHref(note)}
                  viewTransition
                >
                  {current ? `「${note.title}」` : note.title}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="ni-aside-rule" />
        <div className="ni-aside-series">
          <button
            type="button"
            className="ni-aside-head"
            aria-expanded={foldOpen}
            onClick={() => setFoldOpen((v) => !v)}
          >
            <span className="ni-aside-name">{name}</span>
            <span className="ni-aside-count">{count}</span>
            <ChevronUp
              className={`ni-aside-chevron ${foldOpen ? "is-open" : ""}`}
              size={12}
              strokeWidth={2.2}
              aria-hidden="true"
            />
          </button>
          {foldOpen ? (
            <ul className="ni-aside-list">
              {seriesNotes.map((note) => {
                const current = isCurrentNote(note, currentId);
                return (
                  <li key={note.nid || note.slug}>
                    <Link
                      className={`ni-aside-item ${current ? "is-current" : ""}`}
                      to={noteHref(note)}
                      viewTransition
                    >
                      {note.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : null}
          {href ? (
            <Link className="ni-aside-all" to={href} viewTransition>
              查看全部 {count} 篇 →
            </Link>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

function NoteSeriesEnd({ series, href, name }) {
  if (!series && !name) return null;
  const latest = series?.notes?.[0];
  const latestHref = latest ? `/notes/${latest.nid || latest.slug}` : href;
  const intro = String(series?.subtitle || "").trim();
  const desc = String(series?.description || "").replace(/\s+/g, " ").trim();
  const count = series?.notes?.length || 0;
  const letter = series?.letter || String(name || "栏").slice(0, 1);

  return (
    <section className="note-series-end" data-hide-print="true">
      <p className="note-series-end-kicker">此手记收录于专栏</p>
      <div className="note-series-end-card">
        {href ? (
          <Link className="note-series-end-head" to={href} viewTransition>
            <span className="note-series-end-mark" aria-hidden="true">
              {letter}
            </span>
            <span className="note-series-end-name">{name}</span>
            <span className="note-series-end-go" aria-hidden="true">
              ↗
            </span>
          </Link>
        ) : (
          <div className="note-series-end-head">
            <span className="note-series-end-mark" aria-hidden="true">
              {letter}
            </span>
            <span className="note-series-end-name">{name}</span>
          </div>
        )}
        {intro ? <p className="note-series-end-intro">{intro}</p> : null}
        {desc ? <p className="note-series-end-desc">{desc}</p> : null}
        <div className="note-series-end-foot">
          {latest ? (
            <p className="note-series-end-latest">
              最近更新
              <Link to={latestHref} viewTransition>
                「{latest.title}」
              </Link>
              <span>{daysAgo(latest.date)}</span>
            </p>
          ) : null}
          {count ? (
            <p className="note-series-end-count">
              共有手记：{count} 篇
              {href ? (
                <Link to={href} viewTransition>
                  查看全部 {count} 篇 →
                </Link>
              ) : null}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function NoteFontSwitch({ value, onChange }) {
  const [peek, setPeek] = useState(false);
  const current = value === "sans" ? "书写文稿" : "宋体";
  const other = value === "sans" ? "宋体" : "书写文稿";
  return (
    <button
      type="button"
      className={`note-font-switch ${peek ? "is-peek" : ""}`}
      onClick={() => onChange(value === "sans" ? "serif" : "sans")}
      onMouseEnter={() => setPeek(true)}
      onMouseLeave={() => setPeek(false)}
      aria-label={`当前${current}，切换为${other}`}
    >
      <span className="note-font-mark" aria-hidden="true">
        A
      </span>
      <span className="note-font-pair">
        <span className="note-font-name">{peek ? current : other}</span>
        <span className="note-font-arrow" aria-hidden="true">
          →
        </span>
        <span className="note-font-name is-muted">{peek ? other : current}</span>
      </span>
    </button>
  );
}

function seriesHue(name) {
  let n = 0;
  for (const ch of String(name || "")) n = (n + ch.charCodeAt(0) * 17) % 360;
  return n;
}

function stamp(iso) {
  const raw = String(iso || "").replaceAll(".", "-");
  const d = new Date(`${raw.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(iso || "");
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}/${m}/${day}`;
}

function articleHref(doc) {
  const origin = typeof window === "undefined" ? "https://komichi.ixoxi.cn" : window.location.origin;
  return `${origin}/posts/${doc.slug}`;
}

function ArticleEnd({ doc, catName, catHref }) {
  const [copied, setCopied] = useState(false);
  const href = articleHref(doc);
  const day = stamp(doc.updated || doc.modified || doc.date);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <footer className="article-end" id="copyright">
      <div className="article-copy-rule" />
      <div className="article-copy">
        <div className="article-copy-meta">
          <p>
            {doc.title} · {AUTHOR}
            {day ? ` · ${day}` : ""}
          </p>
          <p className="article-copy-link">
            <span>{href}</span>
            <button
              type="button"
              className="article-copy-btn"
              data-hide-print="true"
              aria-label={copied ? "已复制" : "复制链接"}
              onClick={copy}
            >
              {copied ? <Check size={14} strokeWidth={2} /> : <Copy size={14} strokeWidth={2} />}
            </button>
          </p>
          <p>
            本文采用
            <a href={LICENSE_HREF} target="_blank" rel="noopener noreferrer">
              CC BY-NC-SA 4.0
            </a>
            进行许可。
          </p>
        </div>
        <p className="article-sign" data-hide-print="true" aria-hidden="true">
          komichi
        </p>
      </div>
      <nav className="article-end-nav" data-hide-print="true">
        <div className="article-end-split">
          <span />
          <i />
          <span />
        </div>
        <div className="article-end-links">
          {catHref ? (
            <Link className="article-end-back" to={catHref} viewTransition>
              <ArrowLeft size={14} strokeWidth={2} />
              回到{catName}
            </Link>
          ) : (
            <span />
          )}
          <Link className="article-end-all" to="/posts" viewTransition>
            查看全部文稿
            <ArrowRight size={14} strokeWidth={2} />
          </Link>
        </div>
      </nav>
    </footer>
  );
}

export default function Article({ kind }) {
  const { slug, nid } = useParams();
  const doc = kind === "note" ? getNote(nid) : getPost(slug);
  const [active, setActive] = useState("");
  const [hint, setHint] = useState(kind === "note" ? "喜欢这篇手记的话，留下一句。" : "欢迎写下你的想法。");
  const { open: openImage } = useImageLightbox();
  const [noteFont, setNoteFont] = useState(() => {
    try {
      return localStorage.getItem(NOTE_FONT_KEY) === "sans" ? "sans" : "serif";
    } catch {
      return "serif";
    }
  });
  useHeaderMeta(doc ? { title: doc.title, hasCover: false } : {});

  const toc = useMemo(() => (doc ? extractToc(doc.body) : []), [doc]);

  useEffect(() => {
    if (!toc.length) return undefined;
    const sync = () => {
      let next = toc[0]?.id || "";
      for (const item of toc) {
        const el = document.getElementById(item.id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= 100) next = item.id;
        else break;
      }
      setActive((prev) => (prev === next ? prev : next));
    };
    sync();
    window.addEventListener("scroll", sync, { passive: true });
    return () => window.removeEventListener("scroll", sync);
  }, [toc, doc]);

  if (!doc) {
    return (
      <main className="wrap">
        <p className="empty">这里还什么都没有。</p>
      </main>
    );
  }

  const seriesHref = kind === "note" && doc.series ? `/notes/series/${seriesSlug(doc.series)}` : "";
  const catName = doc.category || "文稿";
  const catHref = kind !== "note" && doc.category ? `/categories/${categorySlug(doc.category)}` : "";
  const kicker = catHref ? (
    <Link to={catHref} viewTransition>{catName}</Link>
  ) : (
    catName
  );
  const tagList = Array.isArray(doc.tags) ? doc.tags : doc.tags ? [doc.tags] : [];
  const tags = tagList.length
    ? tagList.map((name, i) => (
        <span key={name}>
          {i > 0 ? " · " : ""}
          <Link to={`/posts/tag/${seriesSlug(name)}`} viewTransition>{name}</Link>
        </span>
      ))
    : null;
  const words = countWords(doc.body);
  const hue = seriesHue(doc.series);
  const seriesStyle = {
    "--series-h": String(hue),
  };

  const comment = (
    <form
      className="comment-box"
      onSubmit={(e) => {
        e.preventDefault();
        setHint("已留下痕迹。预览站只会保存在这一页。");
        e.currentTarget.reset();
      }}
    >
      <textarea name="message" placeholder={kind === "note" ? "喜欢这篇手记。" : "在这里留下一句安静的话。"} />
      <div className="row">
        <span>{hint}</span>
        <button className="btn btn-accent" type="submit">留下痕迹</button>
      </div>
    </form>
  );

  if (kind === "note") {
    const seriesName = doc.series || "手记";
    const chip = seriesHref ? (
      <Link className="note-series-chip" to={seriesHref} viewTransition style={seriesStyle}>
        <span className="note-series-dot">{seriesName.slice(0, 1)}</span>
        <span>{seriesName}</span>
      </Link>
    ) : (
      <span className="note-series-chip" style={seriesStyle}>
        <span className="note-series-dot">{seriesName.slice(0, 1)}</span>
        <span>{seriesName}</span>
      </span>
    );

    const series = doc.series ? getSeries(doc.series) : null;
    const changeNoteFont = (next) => {
      setNoteFont(next);
      try {
        localStorage.setItem(NOTE_FONT_KEY, next);
      } catch {
        /* ignore */
      }
    };

    return (
      <main className="note-page">
        <div className="note-stage">
          <NoteSeriesRail series={series} href={seriesHref} name={seriesName} currentId={doc.nid || doc.slug} />
          <div className="note-paper" data-note-font={noteFont} style={seriesStyle}>
            <div className="ni-deckle" aria-hidden="true" />
            <SeriesRibbon series={series} href={seriesHref} name={seriesName} />
            <div className="note-paper-inner">
              {doc.cover ? (
                <div className="note-cover-wash" aria-hidden="true">
                  <img src={doc.cover} alt="" loading="lazy" decoding="async" />
                </div>
              ) : null}
              {doc.cover ? <div className="note-cover-spacer" aria-hidden="true" /> : null}
              <div className="note-title-row">
                <h1>{doc.title}</h1>
                <NoteFontSwitch value={noteFont} onChange={changeNoteFont} />
              </div>
              <div className="note-chip-row">{chip}</div>
              <div className="note-meta">
                {doc.mood ? (
                  <span className="note-mood">
                    <i />
                    {doc.mood}
                  </span>
                ) : null}
                <span className="note-stats">
                  <span>{words.toLocaleString("zh-CN")} 字</span>
                </span>
              </div>
              {doc.summary ? (
                <section className="note-abstract">
                  <p className="note-abstract-kicker">概要</p>
                  <p>{doc.summary}</p>
                </section>
              ) : null}
              <HaklexContent markdown={doc.body} variant="note" />
              {doc.series ? (
                <NoteSeriesEnd series={series} href={seriesHref} name={seriesName} />
              ) : null}
              {comment}
            </div>
          </div>
          <Toc items={toc} active={active} />
        </div>
      </main>
    );
  }

  return (
    <main className="article-page">
      <div className="article-layout">
        <article>
          <header className="article-head">
            <p className="article-cat">{kicker}</p>
            <h1>{doc.title}</h1>
            <div className="meta-row">
              <span>{doc.date}</span>
              {doc.category ? <span>{doc.category}{tags ? " / " : null}{tags}</span> : tags ? <span>{tags}</span> : null}
              <span>{words.toLocaleString("zh-CN")} 字</span>
            </div>
          </header>
          {doc.cover ? (
            <figure className="article-cover">
              <button type="button" onClick={() => openImageSrc(openImage, doc.cover, doc.title)}>
                <img src={doc.cover} alt="" loading="lazy" decoding="async" />
              </button>
            </figure>
          ) : null}
          {doc.summary ? (
            <section className="article-insight">
              <p className="article-insight-kicker">关键洞察</p>
              <p>{doc.summary}</p>
            </section>
          ) : null}
          <HaklexContent markdown={doc.body} variant="article" />
          <ArticleEnd doc={doc} catName={catName} catHref={catHref} />
          {comment}
        </article>
        <Toc items={toc} active={active} />
      </div>
    </main>
  );
}
