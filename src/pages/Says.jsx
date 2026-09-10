import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Rss } from "lucide-react";
import { says } from "../content.js";
import { useSiteTheme } from "../haklex/theme.js";

const WEEK = ["日", "一", "二", "三", "四", "五", "六"];
const SPRING = { duration: 0.35, type: "spring", stiffness: 120, damping: 20 };

function parseDay(iso) {
  const raw = String(iso || "").trim();
  if (!raw) return null;
  const d = new Date(raw.includes("T") ? raw : `${raw.replaceAll(".", "-")}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function relativeTime(iso) {
  const d = parseDay(iso);
  if (!d) return "";
  const diff = Date.now() - d.getTime();
  const days = Math.abs(Math.floor(diff / 86400000));
  if (days > 29) {
    return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日星期${WEEK[d.getDay()]}`;
  }
  if (diff < 60000) return "刚刚";
  if (diff < 3600000) return `${Math.round(diff / 60000)} 分钟前`;
  if (diff < 86400000) return `${Math.round(diff / 3600000)} 小时前`;
  if (diff < 2592000000) return `${Math.round(diff / 86400000)} 天前`;
  if (diff < 31536000000) return `${Math.round(diff / 2592000000)} 个月前`;
  return `${Math.round(diff / 31536000000)} 年前`;
}

function citeLine(s) {
  const source = String(s.source || "").trim();
  const author = String(s.author || "").trim();
  if (source && author) return `出自“${source}”, ${author}`;
  if (source) return `出自“${source}”`;
  if (author) return author;
  return "我说";
}

function hashString(s) {
  let t = 0;
  for (let i = 0; i < s.length; i += 1) t = s.charCodeAt(i) + ((t << 5) - t);
  return t;
}

function stringToHue(s) {
  const r = hashString(s) % 360;
  return r < 0 ? r + 360 : r;
}

function accentOf(seed, dark) {
  const hue = dark ? (stringToHue(seed) + 180) % 360 : stringToHue(seed);
  const h = Math.abs(hashString(`${seed}:${dark ? "d" : "l"}`));
  const sat = 70 + (h % 21);
  const lit = dark ? 20 + (h % 31) : 40 + (h % 31);
  return `hsl(${hue}, ${sat}%, ${lit}%)`;
}

function addAlpha(hsl, a) {
  return hsl.replace("hsl(", "hsla(").replace(")", `, ${a})`);
}

function splitColumns(items, n) {
  const cols = Array.from({ length: n }, () => []);
  items.forEach((item, i) => cols[i % n].push({ item, i }));
  return cols;
}

function SayCard({ s, i, dark, reduced }) {
  const seed = s.slug || s.text || String(i);
  const accent = useMemo(() => accentOf(seed, dark), [seed, dark]);
  const wash = addAlpha(accent, dark ? 0.08 : 0.045);
  const quote = addAlpha(accent, dark ? 0.15 : 0.12);
  const when = relativeTime(s.date);
  const by = citeLine(s);
  const motionProps = reduced
    ? {}
    : {
        initial: { opacity: 0.001, y: 8 },
        animate: { opacity: 1, y: 0 },
        transition: { ...SPRING, delay: 0.06 * i },
      };

  return (
    <motion.blockquote
      className="says-card"
      style={{
        backgroundImage: `linear-gradient(150deg, ${wash} 0%, transparent 55%)`,
      }}
      {...motionProps}
    >
      <span className="says-mark" aria-hidden="true" style={{ color: quote }}>
        “
      </span>
      <q>{s.text}</q>
      <div className="says-foot">
        <time dateTime={s.date || undefined}>{when}</time>
        <cite>{by}</cite>
      </div>
    </motion.blockquote>
  );
}

export default function Says() {
  const [cols, setCols] = useState(2);
  const dark = useSiteTheme() === "dark";
  const reduced = useReducedMotion();

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
      <motion.header
        className="says-head"
        {...(reduced
          ? {}
          : {
              initial: { opacity: 0.001, y: 8 },
              animate: { opacity: 1, y: 0 },
              transition: SPRING,
            })}
      >
        <h1>一言</h1>
        <a className="says-rss" href="/feed" target="_blank" rel="noreferrer" aria-label="RSS">
          <Rss size={18} strokeWidth={0} fill="currentColor" />
        </a>
      </motion.header>
      <div className="says-board">
        {columns.map((col, ci) => (
          <div className="says-col" key={ci}>
            {col.map(({ item, i }) => (
              <SayCard key={item.slug} s={item} i={i} dark={dark} reduced={reduced} />
            ))}
          </div>
        ))}
      </div>
    </main>
  );
}
