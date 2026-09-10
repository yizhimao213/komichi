import { motion, useReducedMotion } from "framer-motion";
import { Heart } from "lucide-react";
import { thoughts } from "../content.js";
import HaklexContent from "../haklex/HaklexContent.jsx";

const AUTHOR = "四十小路";
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

function ThinkingItem({ t, i, reduced }) {
  const when = relativeTime(t.date);
  const motionProps = reduced
    ? {}
    : {
        initial: { opacity: 0.001, y: 8 },
        animate: { opacity: 1, y: 0 },
        transition: { ...SPRING, delay: 0.045 * Math.min(i, 5) },
      };

  return (
    <motion.li className="tk-item" {...motionProps}>
      <div className="ni-deckle" aria-hidden="true" />
      <div className="tk-inner">
        <div className="tk-meta">
          <span className="tk-author">{AUTHOR}</span>
          <time className="tk-time" dateTime={t.date || undefined}>
            {when}
          </time>
        </div>
        <div className="tk-body">
          <HaklexContent markdown={t.text} variant="comment" />
        </div>
        <div className="tk-foot">
          <span className="tk-like">
            <Heart size={14} strokeWidth={1.8} />
          </span>
        </div>
      </div>
    </motion.li>
  );
}

export default function Thinking() {
  const reduced = useReducedMotion();

  return (
    <main className="tk-page">
      <motion.header
        className="tk-head"
        {...(reduced
          ? {}
          : {
              initial: { opacity: 0.001, y: 8 },
              animate: { opacity: 1, y: 0 },
              transition: SPRING,
            })}
      >
        <h1>思考</h1>
        <p>Thank you for lending an ear.</p>
      </motion.header>
      {thoughts.length ? (
        <ul className="tk-list">
          {thoughts.map((t, i) => (
            <ThinkingItem key={t.date + t.text} t={t} i={i} reduced={reduced} />
          ))}
        </ul>
      ) : (
        <p className="empty">还没有思考。</p>
      )}
    </main>
  );
}
