import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Rss } from "lucide-react";
import { citeOf, notes, posts, quotes, says, siteDays, siteLead, siteWords, thoughts } from "../content.js";
import TypewriterQuote from "../components/TypewriterQuote.jsx";

function daysAgo(iso) {
  const start = new Date(`${String(iso).replaceAll(".", "-")}T00:00:00`);
  if (Number.isNaN(start.getTime())) return "";
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.max(0, Math.floor((today - start) / 86400000));
  if (diff === 0) return "今天";
  return `${diff} 天前`;
}

function formatWords(n) {
  if (n >= 10000) return `${(n / 10000).toFixed(n >= 100000 ? 0 : 1).replace(/\.0$/, "")} 万字`;
  return `${n} 字`;
}

const allWrites = [
  ...posts.map((item) => ({
    kind: "文章",
    item,
    href: `/posts/${item.slug}`,
    date: item.date,
  })),
  ...notes.map((item) => ({
    kind: "笔记",
    item,
    href: `/notes/${item.nid || item.slug}`,
    date: item.date,
  })),
].sort((a, b) => String(b.date).localeCompare(String(a.date)));

const feed = allWrites.slice(0, 5);

function parseDay(iso) {
  const d = new Date(`${String(iso).replaceAll(".", "-")}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function seasonLabel(month) {
  if (month >= 3 && month <= 5) return "春";
  if (month >= 6 && month <= 8) return "夏";
  if (month >= 9 && month <= 11) return "秋";
  return "冬";
}

const MONTH_NAME = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];
const tipSpring = { type: "spring", stiffness: 420, damping: 26, mass: 0.62 };
const easeOut = [0.22, 1, 0.36, 1];
const inView = { once: true, margin: "-12%" };

function fadeUp(delay = 0, y = 16, duration = 0.5) {
  return {
    initial: { opacity: 0, y },
    whileInView: { opacity: 1, y: 0 },
    viewport: inView,
    transition: { duration, ease: easeOut, delay },
  };
}

function fadeIn(delay = 0, duration = 0.5) {
  return {
    initial: { opacity: 0 },
    whileInView: { opacity: 1 },
    viewport: inView,
    transition: { duration, ease: easeOut, delay },
  };
}

function drawRail(delay = 0, duration = 0.7) {
  return {
    initial: { clipPath: "inset(0 100% 0 0)" },
    whileInView: { clipPath: "inset(0 0% 0 0)" },
    viewport: { once: true, amount: 0 },
    transition: { duration, ease: easeOut, delay },
  };
}
const SEASON_RANGE = { spring: [2, 5], summer: [5, 8], autumn: [8, 11], winter: [11, 14] };
const SEASON_KEY = { 春: "spring", 夏: "summer", 秋: "autumn", 冬: "winter" };

function seasonOf(month) {
  const label = seasonLabel(month);
  return SEASON_KEY[label];
}

function clamp01(n) {
  return Math.min(1, Math.max(0, n));
}

function clusterWrites(items) {
  const groups = [];
  for (const item of items) {
    const last = groups.at(-1);
    if (
      last &&
      item.left - last.at(-1).left <= 1.5 &&
      item.left - last[0].left <= 5
    ) {
      last.push(item);
    } else {
      groups.push([item]);
    }
  }
  return groups.map((group) => {
    const left = group.reduce((sum, row) => sum + row.left, 0) / group.length;
    return {
      key: group[0].href,
      left,
      align: left < 18 ? "is-start" : left > 82 ? "is-end" : "is-mid",
      isCurrentSeason: group.some((row) => row.isCurrentSeason),
      items: group,
    };
  });
}

function yearLineModel() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(today);
  start.setFullYear(start.getFullYear() - 1);
  const span = Math.max(1, today.getTime() - start.getTime());
  const frac = (t) => clamp01((t - start.getTime()) / span);

  const nowMonth = today.getMonth() + 1;
  const nowSeason = seasonOf(nowMonth);
  const nowSeasonYear = nowMonth <= 2 ? today.getFullYear() - 1 : today.getFullYear();
  const nowKey = `${nowSeasonYear}-${nowSeason}`;

  const items = allWrites
    .map((row) => {
      const d = parseDay(row.date);
      if (!d || d < start || d > today) return null;
      const month = d.getMonth() + 1;
      const season = seasonOf(month);
      const seasonYear = month <= 2 ? d.getFullYear() - 1 : d.getFullYear();
      const key = `${seasonYear}-${season}`;
      return {
        ...row,
        dateObj: d,
        left: frac(d.getTime()) * 100,
        monthLabel: MONTH_NAME[d.getMonth()],
        season,
        seasonKey: key,
        isCurrentSeason: key === nowKey,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.dateObj - b.dateObj);

  const seasonMap = new Map();
  for (const row of items) {
    if (!seasonMap.has(row.seasonKey)) {
      const [sm, em] = SEASON_RANGE[row.season];
      const year = Number(row.seasonKey.split("-")[0]);
      seasonMap.set(row.seasonKey, {
        key: row.seasonKey,
        season: row.season,
        label: seasonLabel(sm + 1),
        isCurrent: row.seasonKey === nowKey,
        startFraction: frac(new Date(year, sm, 1).getTime()),
        endFraction: frac(new Date(year, em, 1).getTime()),
        items: [],
      });
    }
    seasonMap.get(row.seasonKey).items.push(row);
  }
  const seasonsWithItems = [...seasonMap.values()].sort(
    (a, b) => a.startFraction - b.startFraction
  );

  const labels = [];
  for (let i = 0; i < 4; i++) {
    const mid = new Date(start.getTime() + ((i + 0.5) / 4) * span);
    const month = mid.getMonth() + 1;
    const season = seasonOf(month);
    const year = month <= 2 ? mid.getFullYear() - 1 : mid.getFullYear();
    labels.push({
      key: `${year}-${season}-${i}`,
      label: seasonLabel(month),
      left: ((i + 0.5) / 4) * 100,
      isCurrent: `${year}-${season}` === nowKey,
    });
  }

  const [csm] = SEASON_RANGE[nowSeason];
  return {
    labels,
    seasonsWithItems,
    clusters: clusterWrites(items),
    currentStart: frac(new Date(nowSeasonYear, csm, 1).getTime()) * 100,
    yearCount: items.length,
    latest: items.at(-1) || allWrites[0] || null,
  };
}

export default function Home() {
  const yearLine = yearLineModel();
  const reduced = useReducedMotion();
  const [hoverCluster, setHoverCluster] = useState(null);
  const [ready, setReady] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  const up = reduced ? () => ({}) : fadeUp;
  const inn = reduced ? () => ({}) : fadeIn;
  const rail = reduced ? () => ({}) : drawRail;
  const clusterStep = Math.min(0.05, 0.8 / Math.max(yearLine.clusters.length, 1));
  const clusterSpan = Math.max(yearLine.clusters.length - 1, 0) * clusterStep;

  useEffect(() => {
    if (ready) return;
    const t = window.setTimeout(() => setReady(true), 760);
    return () => window.clearTimeout(t);
  }, [ready]);

  return (
    <main>
      <section className="hero wrap-wide">
        <div className={`hero-intro${ready ? " is-done" : ""}`} aria-hidden="true">
          <div className="boot-rings">
            <span className="boot-dot" />
            <span className="boot-ring boot-ring-a" />
            <span className="boot-ring boot-ring-b" />
            <span className="boot-glow" />
          </div>
        </div>
        <div className={`hero-body${ready ? " is-on" : ""}`}>
          <div className="hero-top">
            <div className="avatar">
              <span className="avatar-glow" aria-hidden="true" />
              <img src="/assets/avatar.jpg" alt="站长头像" data-eager loading="eager" decoding="async" />
            </div>
            <h1>
              你好，我是 <span className="hero-name">komichi</span> <span className="wave">👋</span>
              <br />
              把<span className="accent-word">念头</span>炼成会自己走路的世界
              <span className="sparkle">✦</span>
              <span className="ai-mark">AI Agents</span>
            </h1>
            <p className="lead">{siteLead}</p>
          </div>
          <div className="hero-bottom">
            <TypewriterQuote quotes={quotes} />
            <p className="stats">
              {posts.length + notes.length} 篇 · {formatWords(siteWords)} · {siteDays} 天
            </p>
            <div className="socials">
              <a href="https://space.bilibili.com/1512246445" target="_blank" rel="noreferrer" aria-label="B站">
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M5.4 6.8 7.2 5l1.2 1.2L6.6 8H17.4l-1.8-1.8L16.8 5l1.8 1.8V8h.9A2.5 2.5 0 0 1 22 10.5v7A2.5 2.5 0 0 1 19.5 20h-15A2.5 2.5 0 0 1 2 17.5v-7A2.5 2.5 0 0 1 4.5 8h.9V6.8ZM7.8 12.2a1.2 1.2 0 0 0-1.2 1.2v1.2a1.2 1.2 0 1 0 2.4 0v-1.2a1.2 1.2 0 0 0-1.2-1.2Zm8.4 0a1.2 1.2 0 0 0-1.2 1.2v1.2a1.2 1.2 0 1 0 2.4 0v-1.2a1.2 1.2 0 0 0-1.2-1.2Z" /></svg>
              </a>
              <a href="/feed" target="_blank" rel="noreferrer" aria-label="RSS">
                <Rss size={16} strokeWidth={1.8} />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="section wrap-wide">
        <div className="home-split">
          <motion.div className="home-feed" {...up(0, 16, 0.5)}>
            <p className="section-kicker">Recent Writing</p>
            <h2 className="section-h">近期笔墨</h2>
            <div className="writing-list">
              {feed.map((row, i) => (
                <Link className={`writing ${i === 0 ? "is-now" : ""}`} to={row.href} viewTransition key={row.href}>
                  <span className="writing-no">{String(i + 1).padStart(2, "0")}</span>
                  <span className="writing-body">
                    <span className="writing-row">
                      <h3>{row.item.title}</h3>
                      {row.date ? <span className="writing-date">{daysAgo(row.date)}</span> : null}
                    </span>
                    <span className="writing-kind">
                      {row.kind}
                      {row.item.category ? ` · ${row.item.category}` : ""}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </motion.div>

          <motion.aside className="home-side" {...up(0.12, 16, 0.5)}>
            <section className="home-musings">
              <p className="section-kicker">Musings</p>
              <h2 className="section-h">碎念</h2>
              <div className="musing-list">
                {thoughts.slice(0, 4).map((t) => (
                  <Link className="musing" to="/thinking" viewTransition key={t.date + t.text}>
                    <p>{t.text}</p>
                    <span>{daysAgo(t.date)}</span>
                  </Link>
                ))}
              </div>
            </section>

            <section className="home-letters">
              <p className="section-kicker">Says</p>
              <h2 className="section-h">一言</h2>
              <div className="letter-list">
                {says.slice(0, 2).map((s) => (
                  <Link className="letter" to="/says" viewTransition key={s.slug}>
                    <q>{s.text}</q>
                    <cite>{citeOf(s)}</cite>
                  </Link>
                ))}
              </div>
            </section>
          </motion.aside>
        </div>

        <section className="year-line-sec" aria-label="笔耕不辍">
          <motion.h2 className="year-line-title" {...up(0, 14, 0.6)}>
            笔耕不辍
          </motion.h2>
          <div className="year-line year-line-desk">
            <div className="year-line-track">
              <motion.div className="year-line-rail" {...rail(0)} />
              {yearLine.currentStart != null ? (
                <motion.div
                  className="year-line-now-band"
                  style={{ left: `${yearLine.currentStart}%` }}
                  {...inn(0.7 + (yearLine.currentStart / 100) * clusterSpan)}
                />
              ) : null}
              {yearLine.clusters.map((cluster, i) => (
                <motion.div
                  key={cluster.key}
                  className={`year-line-hit ${cluster.align}${hoverCluster?.key === cluster.key ? " is-on" : ""}`}
                  style={{ left: `${cluster.left}%` }}
                  onMouseEnter={() => setHoverCluster(cluster)}
                  onMouseLeave={() => setHoverCluster(null)}
                  {...inn(0.7 + i * clusterStep, 0.35)}
                >
                  <span
                    className={`year-line-dot${cluster.items.length > 1 ? " is-many" : ""}${cluster.isCurrentSeason ? " is-now" : ""}`}
                    aria-label={cluster.items.map((row) => row.item.title).join("、")}
                  />
                  <AnimatePresence>
                    {hoverCluster?.key === cluster.key ? (
                      <motion.div
                        key={cluster.key}
                        className={`year-line-tip ${cluster.align}`}
                        initial={{ opacity: 0, scale: 0.72, y: 10, x: cluster.align === "is-mid" ? "-50%" : 0 }}
                        animate={{ opacity: 1, scale: 1, y: 0, x: cluster.align === "is-mid" ? "-50%" : 0 }}
                        exit={{ opacity: 0, scale: 0.86, y: 6, x: cluster.align === "is-mid" ? "-50%" : 0 }}
                        transition={tipSpring}
                        style={{
                          originY: 1,
                          originX: cluster.align === "is-start" ? 0 : cluster.align === "is-end" ? 1 : 0.5,
                        }}
                      >
                        {cluster.items.map((row) => (
                          <Link key={row.href} to={row.href} viewTransition>
                            {row.item.title}
                            <em>{row.monthLabel}</em>
                          </Link>
                        ))}
                      </motion.div>
                    ) : null}
                    </AnimatePresence>
                </motion.div>
              ))}
              <motion.div {...inn(0.7 + clusterSpan)}>
                <i className="year-line-now-tick" aria-hidden="true" />
                <span className="year-line-now" aria-hidden="true">
                  今
                </span>
              </motion.div>
            </div>
            <div className="year-line-seasons">
              {yearLine.labels.map((s) => (
                <motion.span
                  key={s.key}
                  className={s.isCurrent ? "is-now" : ""}
                  style={{ left: `${s.left}%` }}
                  {...inn(0.7 + (s.left / 100) * clusterSpan)}
                >
                  {s.label}
                </motion.span>
              ))}
            </div>
            {yearLine.latest ? (
              <motion.p className="year-line-latest" {...up(0.6, 14, 0.6)}>
                近作 ·{" "}
                <Link to={yearLine.latest.href} viewTransition>
                  {yearLine.latest.item.title}
                </Link>
              </motion.p>
            ) : null}
          </div>
          <div className="year-line year-line-phone">
            {yearLine.seasonsWithItems.map((season, i) => (
              <motion.div key={season.key} {...up(0.07 * i, 14, 0.6)}>
              <Link className="year-line-phone-row" to="/timeline" viewTransition>
                <div className="year-line-phone-head">
                  <span className={season.isCurrent ? "is-now" : ""}>{season.label}</span>
                  <em>{season.items.length} 篇</em>
                </div>
                <div className="year-line-phone-track">
                  <motion.i className={season.isCurrent ? "is-now" : ""} {...rail(0)} />
                  {season.items.map((row) => {
                    const span = Math.max(0.01, season.endFraction - season.startFraction);
                    const left = clamp01((row.left / 100 - season.startFraction) / span) * 100;
                    return (
                      <span
                        key={row.href}
                        className={season.isCurrent ? "is-now" : ""}
                        style={{ left: `${left}%` }}
                      />
                    );
                  })}
                  {season.isCurrent ? <b /> : null}
                </div>
                {season.isCurrent && yearLine.latest ? (
                  <p className="year-line-latest">近作 · {yearLine.latest.item.title}</p>
                ) : null}
              </Link>
              </motion.div>
            ))}
          </div>
          <motion.p className="year-line-foot" {...up(0.75, 14, 0.6)}>
            本年 {yearLine.yearCount} 篇
            <span className="dot">·</span>
            <Link to="/timeline" viewTransition>
              翻阅完整时间线 →
            </Link>
          </motion.p>
        </section>

        <motion.p className="quick-links" {...up(0.2, 14, 0.6)}>
          <Link to="/friends" viewTransition>友人帐</Link><span className="dot">·</span>
          <Link to="/projects" viewTransition>项目</Link><span className="dot">·</span>
          <Link to="/says" viewTransition>一言</Link>
        </motion.p>
      </section>
    </main>
  );
}
