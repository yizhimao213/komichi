import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { notes, posts } from "../content.js";
import PeekModal from "../components/PeekModal.jsx";
import { parsePeekPath, readPeekOrigin } from "../peek.js";

const SEASONS = [
  { id: "spring", label: "春", months: [3, 4, 5] },
  { id: "summer", label: "夏", months: [6, 7, 8] },
  { id: "autumn", label: "秋", months: [9, 10, 11] },
  { id: "winter", label: "冬", months: [12, 1, 2] },
];

const VIEWS = [
  { id: "relaxed", label: "舒" },
  { id: "dense", label: "密" },
  { id: "skim", label: "概览" },
];

const MONTH_LABEL = ["1 月", "2 月", "3 月", "4 月", "5 月", "6 月", "7 月", "8 月", "9 月", "10 月", "11 月", "12 月"];

const easeOut = [0.22, 1, 0.36, 1];

function parseDate(iso) {
  const d = new Date(`${String(iso).replaceAll(".", "-")}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function seasonOf(iso) {
  const d = parseDate(iso);
  if (!d) return "";
  const m = d.getMonth() + 1;
  return SEASONS.find((s) => s.months.includes(m))?.id || "";
}

function dayOfYear(now) {
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now - start) / 86400000);
}

function daysInYear(year) {
  return year % 400 === 0 || (year % 4 === 0 && year % 100 !== 0) ? 366 : 365;
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

const items = [
  ...posts.map((p) => ({
    date: p.date,
    title: p.title,
    href: `/posts/${p.slug}`,
    kind: "文稿",
    extra: p.category || "",
  })),
  ...notes.map((n) => ({
    date: n.date,
    title: n.title,
    href: `/notes/${n.nid || n.slug}`,
    kind: "手记",
    extra: [n.mood ? `心情：${n.mood}` : "", n.weather ? `天气：${n.weather}` : ""].filter(Boolean).join(" · "),
  })),
].sort((a, b) => String(b.date).localeCompare(String(a.date)));

function groupYears(list) {
  const map = new Map();
  for (const item of list) {
    const d = parseDate(item.date);
    const year = d ? String(d.getFullYear()) : String(item.date || "").slice(0, 4) || "—";
    const month = d ? d.getMonth() + 1 : 0;
    const day = d ? pad2(d.getDate()) : "";
    if (!map.has(year)) map.set(year, []);
    map.get(year).push({ ...item, year, month, day });
  }
  return [...map.entries()]
    .sort((a, b) => String(b[0]).localeCompare(String(a[0])))
    .map(([year, rows]) => {
      const months = new Map();
      for (const row of rows) {
        if (!months.has(row.month)) months.set(row.month, []);
        months.get(row.month).push(row);
      }
      const monthList = [...months.entries()].sort((a, b) => b[0] - a[0]);
      return { year, rows, months: monthList };
    });
}

export default function Timeline() {
  const now = new Date();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawView = searchParams.get("view");
  const type = searchParams.get("type") === "note" || searchParams.get("type") === "post" ? searchParams.get("type") : "";
  const memory = searchParams.get("memory") === "1";
  const view = memory ? "skim" : VIEWS.some((v) => v.id === rawView) ? rawView : "relaxed";
  const [season, setSeason] = useState("now");
  const pendingScroll = useRef("");
  const [peekOrigin, setPeekOrigin] = useState(null);
  const peekTo = searchParams.get("peek-to");
  const [desktop, setDesktop] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 1101px)").matches
  );

  const filtered = useMemo(() => {
    let list = items;
    if (type === "note") list = list.filter((item) => item.kind === "手记");
    if (type === "post") list = list.filter((item) => item.kind === "文稿");
    if (season === "now") return list;
    return list.filter((item) => seasonOf(item.date) === season);
  }, [season, type]);

  const years = useMemo(() => groupYears(filtered), [filtered]);
  const doy = dayOfYear(now);
  const diy = daysInYear(now.getFullYear());
  const todayPct = (now.getHours() * 60 + now.getMinutes()) / (24 * 60);

  function writeParams(next = {}) {
    const params = {};
    if (type) params.type = type;
    if (next.view && next.view !== "relaxed") params.view = next.view;
    const peek = searchParams.get("peek-to");
    if (peek) params["peek-to"] = peek;
    setSearchParams(params);
  }

  const closePeek = useCallback(() => {
    const params = new URLSearchParams(searchParams);
    params.delete("peek-to");
    setSearchParams(params, { replace: true });
  }, [searchParams, setSearchParams]);

  function openPeek(href, el) {
    setPeekOrigin(readPeekOrigin(el, "text"));
    const params = new URLSearchParams(searchParams);
    params.set("peek-to", href);
    setSearchParams(params, { replace: true });
  }

  function onPeekClick(e, item) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (!desktop) return;
    if (!parsePeekPath(item.href)) return;
    e.preventDefault();
    const titleEl = e.currentTarget.querySelector(".tl-title") || e.currentTarget;
    openPeek(item.href, titleEl);
  }

  function setView(next) {
    writeParams({ view: next });
  }

  function openMonth(year, month) {
    pendingScroll.current = `tl-${year}-${pad2(month)}`;
    setView("relaxed");
  }

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1101px)");
    const onChange = () => {
      setDesktop(mq.matches);
      if (!mq.matches && searchParams.get("peek-to")) closePeek();
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [closePeek, searchParams]);

  useEffect(() => {
    const id = pendingScroll.current;
    if (!id || view !== "relaxed") return;
    pendingScroll.current = "";
    const t = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
    return () => window.clearTimeout(t);
  }, [view]);

  const yearPct = Math.round((doy / diy) * 100);
  const todayPctText = `${(todayPct * 100).toFixed(2)}%`;
  const viewTabs = (
    <div className="tl-views" role="tablist" aria-label="视图">
      {VIEWS.map((v) => (
        <button
          key={v.id}
          type="button"
          role="tab"
          aria-selected={view === v.id}
          className={view === v.id ? "is-on" : ""}
          onClick={() => setView(v.id)}
        >
          {v.label}
        </button>
      ))}
    </div>
  );

  return (
    <main className="tl-page">
      <header className="tl-skim-hero">
        <div className="tl-skim-top">
          <p className="kicker">时间线</p>
          {viewTabs}
        </div>
        <p className="tl-skim-total">
          <strong>{filtered.length}</strong>
          <em>篇，再接再厉</em>
        </p>
        <div className="tl-skim-nums">
          <div>
            <b>{doy}</b>
            <span>今年第几天</span>
          </div>
          <div>
            <b>{yearPct}%</b>
            <span>年度进度</span>
          </div>
          <div>
            <b>{todayPctText}</b>
            <span>今日进度</span>
          </div>
        </div>
        <p className="tl-skim-quote">活在当下，珍惜眼下</p>
        {view !== "skim" ? (
          <nav className="tl-seasons" aria-label="季节">
            {SEASONS.map((s) => (
              <button
                key={s.id}
                type="button"
                className={season === s.id ? "is-on" : ""}
                onClick={() => setSeason(s.id)}
              >
                {s.label}
              </button>
            ))}
            <button type="button" className={season === "now" ? "is-on" : ""} onClick={() => setSeason("now")}>
              今
            </button>
          </nav>
        ) : null}
      </header>

      <PeekModal open={desktop && Boolean(peekTo)} href={peekTo} origin={peekOrigin} onClose={closePeek} />

      <AnimatePresence mode="wait">
        <motion.section
          key={`${view}-${season}-${type}`}
          className={`tl-body is-${view}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.4, ease: easeOut }}
        >
          {view === "skim" ? (
            <SkimBoard years={years} onOpenMonth={openMonth} />
          ) : years.length ? (
            years.map((block, yi) => (
              <YearBlock key={block.year} block={block} view={view} index={yi} onPeekClick={onPeekClick} />
            ))
          ) : (
            <p className="empty">这个季节还没有留下痕迹。</p>
          )}
        </motion.section>
      </AnimatePresence>
    </main>
  );
}

function YearBlock({ block, view, index, onPeekClick }) {
  let i = index;
  return (
    <div className="tl-year">
      <div className="tl-year-row" style={{ "--tl-i": i }} data-tl-in>
        <h2 className="tl-year-title">{block.year}</h2>
        <span className="tl-year-count">{block.rows.length} 篇</span>
      </div>
      {block.months.map(([month, list]) => (
        <div key={month}>
          <p className="tl-month" id={`tl-${block.year}-${pad2(month)}`} style={{ "--tl-i": ++i }} data-tl-in>
            {MONTH_LABEL[month - 1]}
          </p>
          <ul>
            {list.map((item) => (
              <li key={item.href}>
                <Link
                  className={`tl-item${view === "dense" ? " is-dense" : ""}`}
                  to={item.href}
                  viewTransition
                  style={{ "--tl-i": ++i }}
                  data-tl-in
                  onClick={(e) => onPeekClick(e, item)}
                >
                  <time className="tl-date">{item.day}</time>
                  {view === "dense" ? <em className="tl-type">{item.kind}</em> : null}
                  <span className="tl-title">{item.title}</span>
                  {view === "relaxed" && item.extra ? <b className="tl-extra">{item.extra}</b> : null}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function SkimBoard({ years, onOpenMonth }) {
  if (!years.length) {
    return <p className="empty">这个季节还没有留下痕迹。</p>;
  }
  let i = 0;
  return (
    <>
      {years.map((block) => {
        const counts = Array.from({ length: 12 }, (_, m) => {
          const hit = block.months.find(([month]) => month === m + 1);
          return hit ? hit[1].length : 0;
        });
        const max = Math.max(1, ...counts);
        return (
          <div className="tl-year" key={block.year}>
            <div className="tl-year-row" style={{ "--tl-i": i++ }} data-tl-in>
              <h2 className="tl-year-title">{block.year}</h2>
              <span className="tl-year-count">{block.rows.length} 篇</span>
            </div>
            {counts.map((count, mi) => (
              <button
                type="button"
                className="tl-skim-row"
                key={`${block.year}-${mi}`}
                style={{ "--tl-i": i++, "--skim-w": `${(count / max) * 100}%` }}
                data-tl-in
                onClick={() => count && onOpenMonth(block.year, mi + 1)}
                disabled={!count}
              >
                <span className="tl-skim-label">{MONTH_LABEL[mi]}</span>
                <span className="tl-skim-chart">
                  <span className="tl-skim-fill" />
                </span>
                <span className="tl-skim-count">{count || ""}</span>
              </button>
            ))}
          </div>
        );
      })}
    </>
  );
}
