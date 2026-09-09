import { useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Maximize2, X } from "lucide-react";
import { categorySlug, countWords, getNote, getPost, seriesSlug } from "../content.js";
import { parsePeekPath } from "../peek.js";
import HaklexContent from "../haklex/HaklexContent.jsx";

const PEEK_EXIT_MS = 340;
const EASE_OUT = "cubic-bezier(0.22, 1, 0.36, 1)";
const EASE_IO = "cubic-bezier(0.4, 0, 0.2, 1)";

function seriesHue(name) {
  let n = 0;
  for (const ch of String(name || "")) n = (n + ch.charCodeAt(0) * 17) % 360;
  return n;
}

function noiseEdge(len) {
  const stops = Array.from({ length: Math.ceil(len / 20) + 2 }, () => Math.random());
  return (x) => {
    const i = Math.floor(x / 20);
    const t = (1 - Math.cos(((x % 20) / 20) * Math.PI)) / 2;
    return 2.5 * Math.max(0, Math.min(1, stops[i] * (1 - t) + stops[i + 1] * t + (Math.random() - 0.5) * 0.35));
  };
}

function tornMask(width, height) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * dpr));
  canvas.height = Math.max(1, Math.round(height * dpr));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.scale(dpr, dpr);
  const top = noiseEdge(width);
  const right = noiseEdge(height);
  const bottom = noiseEdge(width);
  const left = noiseEdge(height);
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.moveTo(left(0), top(0));
  for (let x = 0; x <= width; x += 2) ctx.lineTo(x, top(x));
  for (let y = 0; y <= height; y += 2) ctx.lineTo(width - right(y), y);
  for (let x = width; x >= 0; x -= 2) ctx.lineTo(x, height - bottom(x));
  for (let y = height; y >= 0; y -= 2) ctx.lineTo(left(y), y);
  ctx.closePath();
  ctx.fill();
  return canvas.toDataURL();
}

function insetClip(origin, box, radius) {
  const t = Math.max(0, origin.top - box.top);
  const r = Math.max(0, box.right - origin.right);
  const b = Math.max(0, box.bottom - origin.bottom);
  const l = Math.max(0, origin.left - box.left);
  return `inset(${t}px ${r}px ${b}px ${l}px round ${radius}px)`;
}

function radiusPair(origin, sx, sy) {
  const n = origin.kind === "text" ? origin.height / 2 : 12;
  return `${n / sx}px / ${n / sy}px`;
}

function peekExitProps(box, origin) {
  if (!box || !origin) return { opacity: [1, 1, 0] };
  const sx = origin.width / box.width;
  const sy = origin.height / box.height;
  return {
    borderRadius: ["0px / 0px", radiusPair(origin, sx, sy)],
    opacity: [1, 1, 0],
    scaleX: sx,
    scaleY: sy,
    x: origin.left - box.left,
    y: origin.top - box.top,
  };
}

function playPeekEnter(paper, shadow, origin) {
  const runs = [];
  const animate = (el, keyframes, opts) => {
    runs.push(el.animate(keyframes, { fill: "backwards", ...opts }));
  };
  const box = paper.getBoundingClientRect();
  const content = paper.querySelector("[data-peek-content]");
  if (shadow) {
    shadow.style.left = `${box.left}px`;
    shadow.style.top = `${box.top}px`;
    shadow.style.width = `${box.width}px`;
    shadow.style.height = `${box.height}px`;
  }
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    animate(paper, [{ opacity: 0 }, { opacity: 1 }], { duration: 160 });
    if (shadow) animate(shadow, [{ opacity: 0 }, { opacity: 1 }], { duration: 160 });
    return () => runs.forEach((a) => a.cancel());
  }
  if (shadow) {
    animate(shadow, [{ offset: 0, opacity: 0 }, { offset: 0.55, opacity: 0 }, { offset: 1, opacity: 1 }], {
      duration: 800,
      easing: "linear",
    });
  }
  if (origin) {
    const sx = origin.width / box.width;
    const sy = origin.height / box.height;
    const dx = origin.left - box.left;
    const dy = origin.top - box.top;
    animate(
      paper,
      [
        {
          borderRadius: radiusPair(origin, sx, sy),
          transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`,
          transformOrigin: "0 0",
        },
        { borderRadius: "0px", transform: "none", transformOrigin: "0 0" },
      ],
      { duration: 800, easing: EASE_OUT }
    );
    if (content) {
      animate(content, [{ offset: 0, opacity: 0 }, { offset: 0.05, opacity: 0 }, { offset: 1, opacity: 1 }], {
        duration: 920,
        easing: EASE_IO,
      });
    }
  } else {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const seed = { bottom: cy + 1, height: 2, left: cx - 120, right: cx + 120, top: cy - 1, width: 240 };
    const radius = seed.height / 2;
    const rightGap = Math.max(0, box.right - seed.right);
    const leftGap = Math.max(0, seed.left - box.left);
    animate(
      paper,
      [
        { clipPath: insetClip(seed, box, radius), offset: 0 },
        { clipPath: `inset(0px ${rightGap}px 0px ${leftGap}px round ${radius}px)`, offset: 0.45 },
        { clipPath: "inset(0px 0px 0px 0px round 0px)", offset: 1 },
      ],
      { duration: 800, easing: EASE_OUT }
    );
    if (content) {
      animate(content, [{ offset: 0, opacity: 0 }, { offset: 0.25, opacity: 0 }, { offset: 1, opacity: 1 }], {
        duration: 920,
        easing: EASE_IO,
      });
    }
  }
  return () => runs.forEach((a) => a.cancel());
}

function PeekNote({ doc }) {
  const words = countWords(doc.body);
  const hue = seriesHue(doc.series);
  const seriesName = doc.series || "手记";
  const seriesHref = doc.series ? `/notes/series/${seriesSlug(doc.series)}` : "";
  const seriesStyle = { "--series-h": String(hue) };
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

  return (
    <div className="peek-note" style={seriesStyle}>
      {doc.cover ? (
        <div className="note-cover-wash" aria-hidden="true">
          <img src={doc.cover} alt="" loading="lazy" decoding="async" />
        </div>
      ) : null}
      <div className="note-paper-inner">
        <h1>{doc.title}</h1>
        <div className="note-chip-row">{chip}</div>
        <div className="note-meta">
          {doc.mood ? (
            <span className="note-mood">
              <i />
              {doc.mood}
            </span>
          ) : null}
          {doc.date ? <span>{doc.date}</span> : null}
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
      </div>
    </div>
  );
}

function PeekPost({ doc }) {
  const words = countWords(doc.body);
  const catName = doc.category || "文稿";
  const catHref = doc.category ? `/categories/${categorySlug(doc.category)}` : "";
  const tagList = Array.isArray(doc.tags) ? doc.tags : doc.tags ? [doc.tags] : [];
  const tags = tagList.length
    ? tagList.map((name, i) => (
        <span key={name}>
          {i > 0 ? " · " : ""}
          <Link to={`/posts/tag/${seriesSlug(name)}`} viewTransition>
            {name}
          </Link>
        </span>
      ))
    : null;

  return (
    <div className="peek-post">
      <header className="article-head">
        <p className="article-cat">
          {catHref ? (
            <Link to={catHref} viewTransition>
              {catName}
            </Link>
          ) : (
            catName
          )}
        </p>
        <h1>{doc.title}</h1>
        <div className="meta-row">
          <span>{doc.date}</span>
          {doc.category ? (
            <span>
              {doc.category}
              {tags ? " / " : null}
              {tags}
            </span>
          ) : tags ? (
            <span>{tags}</span>
          ) : null}
          <span>{words.toLocaleString("zh-CN")} 字</span>
        </div>
      </header>
      {doc.summary ? (
        <section className="article-insight">
          <p className="article-insight-kicker">关键洞察</p>
          <p>{doc.summary}</p>
        </section>
      ) : null}
      <HaklexContent markdown={doc.body} variant="article" />
    </div>
  );
}

function PeekStage({ href, origin, onClose }) {
  const paperRef = useRef(null);
  const shadowRef = useRef(null);
  const parsed = parsePeekPath(href);
  const doc = parsed ? (parsed.kind === "note" ? getNote(parsed.key) : getPost(parsed.key)) : null;
  const to = parsed?.href || href;

  useEffect(() => {
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    html.classList.add("is-peek-open");
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      html.style.overflow = prev;
      html.classList.remove("is-peek-open");
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  useLayoutEffect(() => {
    const paper = paperRef.current;
    if (!paper) return undefined;
    const { width, height } = paper.getBoundingClientRect();
    const mask = tornMask(width, height);
    if (mask) {
      paper.style.setProperty("-webkit-mask-image", `url(${mask})`);
      paper.style.setProperty("mask-image", `url(${mask})`);
      paper.style.setProperty("-webkit-mask-size", "100% 100%");
      paper.style.setProperty("mask-size", "100% 100%");
    }
    return playPeekEnter(paper, shadowRef.current, origin ?? null);
  }, [href, origin]);

  return (
    <motion.div className="peek-root" initial={false} exit={{ opacity: 1 }} transition={{ duration: PEEK_EXIT_MS / 1000 }}>
      <motion.button
        type="button"
        className="peek-backdrop"
        aria-label="关闭预览"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.28 }}
        onClick={onClose}
      />
      <motion.div
        aria-hidden="true"
        className="peek-shadow"
        exit={{ opacity: 0 }}
        initial={false}
        ref={shadowRef}
        transition={{ duration: (0.5 * PEEK_EXIT_MS) / 1000 }}
      />
      <motion.div
        className="peek-paper"
        exit="out"
        initial={false}
        ref={paperRef}
        role="dialog"
        aria-modal="true"
        aria-label={doc?.title || "预览"}
        style={{ transformOrigin: "0 0" }}
        variants={{
          out: () => peekExitProps(paperRef.current?.getBoundingClientRect() ?? null, origin ?? null),
        }}
        transition={{
          duration: PEEK_EXIT_MS / 1000,
          ease: [0.4, 0, 1, 1],
          opacity: { duration: PEEK_EXIT_MS / 1000, ease: "linear", times: [0, 0.4, 1] },
        }}
      >
        <div className="peek-scroll" data-peek-content>
          {doc ? (
            parsed.kind === "note" ? (
              <PeekNote doc={doc} />
            ) : (
              <PeekPost doc={doc} />
            )
          ) : (
            <p className="empty">这里还什么都没有。</p>
          )}
        </div>
        <div className="peek-tools">
          <Link className="peek-tool" to={to} viewTransition aria-label="打开全文">
            <Maximize2 size={15} strokeWidth={1.7} />
          </Link>
          <span className="peek-tool-div" aria-hidden="true" />
          <button type="button" className="peek-tool" aria-label="关闭" onClick={onClose}>
            <X size={15} strokeWidth={1.7} />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function PeekModal({ open, href, origin, onClose }) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {open && href ? <PeekStage key={href} href={href} origin={origin} onClose={onClose} /> : null}
    </AnimatePresence>,
    document.body
  );
}
