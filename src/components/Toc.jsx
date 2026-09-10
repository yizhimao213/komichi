import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronUp, List, X } from "lucide-react";
import { useHeaderState } from "../context.jsx";

const RING_R = 6.5;
const RING_C = 2 * Math.PI * RING_R;
const TOC_TOP = 120;
const READ_LINE = 100;
const ease = [0.22, 1, 0.36, 1];
const SPRING_G = 2 * Math.sqrt(90) * 0.75;
const SQUIGGLES = [
  "M2 7 C4 2, 7 2, 9 5.5 C11 9, 14 9, 16 5 C18 1, 21 2, 24 6",
  "M2 6 C5 3, 8 3, 10 6 C12 9, 15 8, 18 5 C20 3, 23 4, 26 7",
  "M2 5 C4 8, 7 9, 10 6 C13 3, 15 2, 18 5.5 C20 8, 23 7, 25 5",
  "M2 7.5 C5 4, 8 3, 11 6 C13 8, 16 9, 19 5.5 C21 3, 23 4, 26 6",
  "M2 6.5 C4 3, 7 2.5, 9 5 C11 8, 14 8, 17 5 C19 2, 22 3, 25 6.5",
];

function groupToc(items) {
  if (!items.length) return [];
  const root = items.reduce((n, item) => Math.min(n, item.level), items[0].level);
  const groups = [];
  for (const item of items) {
    if (item.level === root) groups.push({ parent: item, children: [] });
    else if (groups.length) groups[groups.length - 1].children.push(item);
  }
  return groups;
}

function proseEl() {
  return document.querySelector(".note-paper .haklex-body, .article-page .haklex-body, .note-paper .rich-content, .article-page .rich-content");
}

function headingTitle(el) {
  const clone = el.cloneNode(true);
  clone.querySelectorAll(".rich-heading-anchor, del, .katex-container").forEach((node) => node.remove());
  return (clone.textContent || "").replace(/\s+/g, " ").trim();
}

function readHeadings() {
  const prose = proseEl();
  if (!prose) return [];
  return [...prose.querySelectorAll("h2[id], h3[id]")].map((el) => ({
    id: el.id,
    text: headingTitle(el),
    level: el.tagName === "H3" ? 3 : 2,
  }));
}

function sameItems(a, b) {
  if (a.length !== b.length) return false;
  return a.every((item, i) => item.id === b[i].id && item.text === b[i].text && item.level === b[i].level);
}

function ProgressBits({ pct, ringRef, ringOff, onTop }) {
  return (
    <>
      <div className="toc-now-meta">
        <span className="toc-now-ring" aria-hidden="true">
          <svg viewBox="0 0 16 16" width="16" height="16">
            <circle className="toc-now-ring-bg" cx="8" cy="8" r={RING_R} />
            <circle
              ref={ringRef}
              className="toc-now-ring-fg"
              cx="8"
              cy="8"
              r={RING_R}
              strokeDasharray={RING_C}
              strokeDashoffset={ringOff}
            />
          </svg>
        </span>
        <span className="toc-now-pct">{pct}%</span>
      </div>
      <button type="button" className={`toc-now-top${pct > 10 ? "" : " is-dim"}`} onPointerDown={onTop}>
        <ChevronUp size={13} strokeWidth={2.2} />
        回到顶部
      </button>
    </>
  );
}

function Squiggle() {
  const d = useMemo(() => SQUIGGLES[Math.floor(Math.random() * SQUIGGLES.length)], []);
  return (
    <div className="toc-full-rule" aria-hidden="true">
      <svg viewBox="0 0 28 10" preserveAspectRatio="none" fill="none">
        <path d={d} />
      </svg>
    </div>
  );
}

function itemStatus(id, activeId, visibleIds) {
  if (id === activeId) return "is-active";
  if (visibleIds.has(id)) return "is-range";
  return "is-idle";
}

function rippleDelay(index, activeIndex) {
  return Math.min(450, 50 * Math.abs(index - activeIndex));
}

function coverEl() {
  return document.querySelector(".article-page .article-cover, .note-page .note-cover-wash");
}

function tocPinTop() {
  const cover = coverEl();
  if (!cover) return TOC_TOP;
  return Math.max(TOC_TOP, Math.round(cover.getBoundingClientRect().top));
}

function railSize(top = TOC_TOP) {
  const vh = window.innerHeight;
  const h = vh - 96 - 72 - 150 - top;
  return Math.round(Math.min(vh * 0.75, Math.max(120, h)));
}

function headingAtLine(items, y = READ_LINE) {
  let cur = "";
  for (const item of items) {
    const el = document.getElementById(item.id);
    if (!el) continue;
    if (el.getBoundingClientRect().top <= y) cur = item.id;
    else break;
  }
  return cur;
}

export default function Toc({ items, active }) {
  const colRef = useRef(null);
  const stickyRef = useRef(null);
  const listRef = useRef(null);
  const fullListRef = useRef(null);
  const pathRef = useRef(null);
  const accentRef = useRef(null);
  const labelRef = useRef(null);
  const ringRef = useRef(null);
  const nodeRefs = useRef([]);
  const mixRef = useRef(0);
  const yRef = useRef(0);
  const velRef = useRef(0);
  const springX = useRef(0);
  const springV = useRef(0);
  const lastScroll = useRef(null);
  const pctLive = useRef(0);
  const markersLive = useRef([]);
  const railHLive = useRef(260);
  const foldTimers = useRef(new Map());
  const skipHover = useRef(false);
  const overContentRef = useRef(false);
  const hoverRef = useRef(false);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [railH, setRailH] = useState(260);
  const [overContent, setOverContent] = useState(false);
  const [hover, setHover] = useState(false);
  const [visibleIds, setVisibleIds] = useState(() => new Set());
  const [activeId, setActiveId] = useState(active || "");
  const [openIds, setOpenIds] = useState(() => {
    const first = groupToc(items)[0]?.parent.id;
    return first ? new Set([first]) : new Set();
  });
  const [rangeBar, setRangeBar] = useState(null);
  const [mask, setMask] = useState("");
  const [live, setLive] = useState(items);
  const [vw, setVw] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 800));
  const { setTocOpen } = useHeaderState();

  const toc = live.length ? live : items;
  const groups = useMemo(() => groupToc(toc), [toc]);
  const compact = vw <= 1100;
  const focus = overContent && !hover;
  const currentId = activeId || active || toc[0]?.id || "";
  const activeIndex = Math.max(0, toc.findIndex((item) => item.id === currentId));
  const minLevel = toc.reduce((n, item) => Math.min(n, item.level), toc[0]?.level || 2);
  const rootItem = useMemo(() => {
    if (!toc.length) return null;
    const idx = toc.findIndex((item) => item.id === currentId);
    if (idx < 0) return toc[0];
    for (let i = idx; i >= 0; i--) if (toc[i].level === minLevel) return toc[i];
    return toc[idx];
  }, [toc, currentId, minLevel]);
  const ringOff = RING_C * (1 - Math.round(progress) / 100);

  useEffect(() => {
    const scan = () => {
      const next = readHeadings();
      if (!next.length) return;
      setLive((prev) => (sameItems(prev, next) ? prev : next));
    };
    scan();
    const prose = proseEl();
    const mo = prose ? new MutationObserver(scan) : null;
    mo?.observe(prose, { childList: true, subtree: true });
    const ticks = [50, 200, 800].map((ms) => window.setTimeout(scan, ms));
    return () => {
      mo?.disconnect();
      ticks.forEach((id) => window.clearTimeout(id));
    };
  }, [items]);

  useEffect(() => {
    setTocOpen(sheetOpen);
    return () => setTocOpen(false);
  }, [sheetOpen, setTocOpen]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1100px)");
    const apply = () => {
      setVw(window.innerWidth);
      if (!mq.matches) setSheetOpen(false);
    };
    apply();
    mq.addEventListener("change", apply);
    window.addEventListener("resize", apply);
    return () => {
      mq.removeEventListener("change", apply);
      window.removeEventListener("resize", apply);
    };
  }, []);

  useEffect(() => {
    if (!toc.length) return undefined;
    const els = toc.map((item) => document.getElementById(item.id)).filter(Boolean);
    const seen = new Set();
    const syncActive = () => {
      const next = headingAtLine(toc) || toc[0]?.id || "";
      if (next) setActiveId((prev) => (prev === next ? prev : next));
    };
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) seen.add(entry.target.id);
          else seen.delete(entry.target.id);
        });
        setVisibleIds(new Set(seen));
        syncActive();
      },
      { rootMargin: "-100px 0px -55% 0px" }
    );
    els.forEach((el) => io.observe(el));
    syncActive();
    window.addEventListener("scroll", syncActive, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", syncActive);
    };
  }, [toc]);

  useEffect(() => {
    const timers = foldTimers.current;
    setOpenIds((prev) => {
      const next = new Set();
      for (const group of groups) {
        const on =
          group.parent.id === currentId ||
          group.children.some((child) => child.id === currentId) ||
          visibleIds.has(group.parent.id) ||
          group.children.some((child) => visibleIds.has(child.id));
        if (on) {
          const pending = timers.get(group.parent.id);
          if (pending) {
            clearTimeout(pending);
            timers.delete(group.parent.id);
          }
          next.add(group.parent.id);
        } else if (prev.has(group.parent.id)) {
          if (!timers.has(group.parent.id)) {
            timers.set(
              group.parent.id,
              window.setTimeout(() => {
                setOpenIds((cur) => {
                  const copy = new Set(cur);
                  copy.delete(group.parent.id);
                  return copy;
                });
                timers.delete(group.parent.id);
              }, 300)
            );
          }
          next.add(group.parent.id);
        }
      }
      return next;
    });
  }, [groups, visibleIds, currentId]);

  useEffect(
    () => () => {
      foldTimers.current.forEach((id) => clearTimeout(id));
      foldTimers.current.clear();
    },
    []
  );

  useEffect(() => {
    if (compact || hover) return;
    const row = fullListRef.current?.querySelector(".toc-full-row.is-on");
    const box = fullListRef.current;
    if (!row || !box) return;
    const top = row.offsetTop;
    const h = row.offsetHeight;
    if (top < box.scrollTop || top + h > box.scrollTop + box.clientHeight) {
      box.scrollTop = top - box.clientHeight / 2 + h / 2;
    }
  }, [currentId, compact, hover, openIds]);

  useEffect(() => {
    if (compact) return undefined;
    const measure = () => {
      const box = fullListRef.current;
      if (!box || !visibleIds.size) {
        setRangeBar(null);
        return;
      }
      const rows = [...box.querySelectorAll(".toc-full-row[data-anchor-id]")];
      let first = null;
      let last = null;
      for (const row of rows) {
        const id = row.dataset.anchorId;
        if (id && visibleIds.has(id)) {
          if (!first) first = row;
          last = row;
        }
      }
      if (!first || !last) {
        setRangeBar(null);
        return;
      }
      const top = first.offsetTop;
      setRangeBar({ top, height: last.offsetTop + last.offsetHeight - top });
    };
    measure();
    const box = fullListRef.current;
    box?.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      box?.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [visibleIds, openIds, compact, toc]);

  useEffect(() => {
    if (compact) return undefined;
    const clip = () => {
      const box = fullListRef.current;
      if (!box) return;
      if (box.scrollHeight <= box.clientHeight + 2) {
        setMask("");
        return;
      }
      const atTop = box.scrollTop <= 0;
      const atEnd = box.scrollTop + box.clientHeight >= box.scrollHeight - 1;
      setMask(atTop ? "mask-b" : atEnd ? "mask-t" : "mask-both");
    };
    clip();
    const box = fullListRef.current;
    box?.addEventListener("scroll", clip, { passive: true });
    window.addEventListener("resize", clip);
    return () => {
      box?.removeEventListener("scroll", clip);
      window.removeEventListener("resize", clip);
    };
  }, [toc, openIds, compact]);

  useEffect(() => {
    if (!toc.length || compact) return undefined;

    const pin = () => {
      const col = colRef.current;
      const sticky = stickyRef.current;
      if (!col || !sticky) return;
      const top = tocPinTop();
      const h = railSize(top);
      railHLive.current = h;
      setRailH((prev) => (prev === h ? prev : h));
      sticky.style.left = `${Math.round(col.getBoundingClientRect().left)}px`;
      sticky.style.top = `${top}px`;
      const maxW = Math.max(120, window.innerWidth - sticky.getBoundingClientRect().left - 30);
      sticky.style.setProperty("--toc-max-w", `${Math.round(maxW)}px`);
    };

    const layout = () => {
      pin();
      const prose = proseEl();
      if (!prose) return;
      const start = prose.getBoundingClientRect().top + window.scrollY;
      const height = Math.max(prose.offsetHeight, 1);
      markersLive.current = toc.map((item) => {
        const el = document.getElementById(item.id);
        const top = el ? el.getBoundingClientRect().top + window.scrollY : start;
        return {
          ...item,
          isRoot: item.level === minLevel,
          ratio: Math.min(1, Math.max(0, (top - start) / height)),
        };
      });
    };

    const read = () => {
      const prose = proseEl();
      const h = Math.max(prose?.offsetHeight || 1, 1);
      if (prose) {
        const top = prose.getBoundingClientRect().top + window.scrollY;
        const view = window.scrollY + window.innerHeight;
        pctLive.current = Math.min(100, Math.max(0, ((view - top) / h) * 100));
      }
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const atEnd = max <= 0 || window.scrollY >= max - 8;
      const pct = max <= 0 ? 100 : atEnd ? 100 : Math.min(99, Math.max(0, (window.scrollY / max) * 100));
      const rounded = Math.round(pct);
      setProgress((prev) => (prev === rounded ? prev : rounded));
      if (ringRef.current) {
        ringRef.current.setAttribute("stroke-dashoffset", String(RING_C * (1 - rounded / 100)));
      }
    };

    const setFocus = (on) => {
      if (on === overContentRef.current) return;
      overContentRef.current = on;
      setOverContent(on);
      if (!on) {
        hoverRef.current = false;
        setHover(false);
      }
    };

    const onProseEnter = () => setFocus(true);
    const onProseLeave = () => setFocus(false);
    const bindProse = () => {
      const prose = proseEl();
      if (!prose) return null;
      prose.addEventListener("mouseenter", onProseEnter);
      prose.addEventListener("mouseleave", onProseLeave);
      return prose;
    };

    layout();
    read();
    let prose = bindProse();
    let raf = 0;
    let last = 0;
    const tick = (now) => {
      const path = pathRef.current;
      const accent = accentRef.current;
      const h = railHLive.current || stickyRef.current?.clientHeight || 260;
      if (path && accent && h) {
        const dt = last ? now - last : 16;
        last = now;
        const want = overContentRef.current && !skipHover.current && !hoverRef.current ? 1 : 0;
        const k = 1 - Math.exp(-dt / 140);
        const mix = mixRef.current + (want - mixRef.current) * k;
        mixRef.current = Math.abs(want - mix) < 0.002 ? want : mix;
        const targetY = (pctLive.current / 100) * h;
        yRef.current = mixRef.current === 0 ? targetY : yRef.current + (targetY - yRef.current) * Math.min(1, 1.4 * k);
        const sy = window.scrollY;
        const raw = lastScroll.current == null ? 0 : ((sy - lastScroll.current) / dt) * 1000;
        lastScroll.current = sy;
        velRef.current += (raw - velRef.current) * Math.min(1, dt / 80);
        const stretch = Math.min(14, 0.012 * Math.abs(velRef.current));
        const step = Math.min(dt, 64) / 1000;
        springV.current += (90 * (stretch - springX.current) - SPRING_G * springV.current) * step;
        springX.current = Math.max(-4, springX.current + springV.current * step);
        const extra = springX.current;
        const breathe = 10.4 + 0.6 * Math.sin((now / 9000) * Math.PI * 2);
        const y = yRef.current;
        const radius = 56 + 2.2 * extra;
        const edge = Math.max(0, Math.min(1, y / radius, (h - y) / radius));
        const bulge = mixRef.current * (breathe + extra) * edge;
        const tip = 8 + bulge;
        const a = Math.max(0, y - radius);
        const b = Math.min(h, y + radius);
        const d = `M8 0 L8 ${a} C8 ${y - 0.45 * radius},${tip} ${y - 0.3 * radius},${tip} ${y} C${tip} ${y + 0.3 * radius},8 ${y + 0.45 * radius},8 ${b} L8 ${h}`;
        path.setAttribute("d", d);
        accent.setAttribute("d", d);
        accent.setAttribute("stroke-dashoffset", String(0.06 - y / h));
        markersLive.current.forEach((m, i) => {
          const node = nodeRefs.current[i];
          if (!node) return;
          const cy = m.ratio * h;
          const dist = Math.abs(cy - y) / radius;
          const cx = 8 + (dist >= 1 ? 0 : bulge * Math.cos((dist * Math.PI) / 2) ** 2);
          node.setAttribute("cx", String(cx));
          node.setAttribute("cy", String(cy));
        });
        if (labelRef.current) {
          labelRef.current.style.transform = `translateY(${y}px) translateY(-50%)`;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const onResize = () => {
      layout();
      read();
      const next = bindProse();
      if (next !== prose) {
        prose?.removeEventListener("mouseenter", onProseEnter);
        prose?.removeEventListener("mouseleave", onProseLeave);
        prose = next;
      }
    };
    const onScroll = () => {
      pin();
      read();
    };
    const cover = coverEl();
    const ro = new ResizeObserver(() => {
      pin();
      read();
    });
    if (cover) ro.observe(cover);
    if (colRef.current) ro.observe(colRef.current);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      prose?.removeEventListener("mouseenter", onProseEnter);
      prose?.removeEventListener("mouseleave", onProseLeave);
    };
  }, [toc, compact, minLevel, railH]);

  const jump = (id) => {
    skipHover.current = true;
    hoverRef.current = false;
    setHover(false);
    const el = document.getElementById(id);
    const top = el ? el.getBoundingClientRect().top + window.scrollY - 100 : 0;
    setSheetOpen(false);
    window.setTimeout(() => {
      window.scrollTo({ top, behavior: "smooth" });
      skipHover.current = false;
    }, 80);
  };

  const toTop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    skipHover.current = true;
    hoverRef.current = false;
    setHover(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
    window.setTimeout(() => {
      skipHover.current = false;
    }, 420);
  };

  if (!toc.length) return null;

  const desktop = compact ? null : (
    <div
      ref={stickyRef}
      className={`toc-sticky${focus ? " is-focus" : ""}`}
      style={{ "--toc-rail-h": `${railH}px` }}
      onMouseEnter={() => {
        hoverRef.current = true;
        setHover(true);
      }}
      onMouseLeave={() => {
        hoverRef.current = false;
        setHover(false);
      }}
    >
      <div className="toc-full" style={{ pointerEvents: focus ? "none" : "auto" }}>
        <div ref={fullListRef} className={`toc-full-list ${mask}`.trim()}>
          {rangeBar ? (
            <span className="toc-range" style={{ top: rangeBar.top, height: rangeBar.height }} />
          ) : null}
          {groups.map((group) => {
            const opened = openIds.has(group.parent.id);
            const parentIdx = toc.findIndex((item) => item.id === group.parent.id);
            return (
              <Fragment key={group.parent.id}>
                <div
                  className={`toc-full-row${group.parent.id === currentId ? " is-on" : ""}`}
                  data-anchor-id={group.parent.id}
                  style={{ "--toc-ripple-delay": `${rippleDelay(parentIdx, activeIndex)}ms` }}
                >
                  <button
                    type="button"
                    className={`toc-full-item ${itemStatus(group.parent.id, currentId, visibleIds)}`}
                    onClick={() => jump(group.parent.id)}
                  >
                    {group.parent.text}
                  </button>
                </div>
                {group.children.length ? (
                  <div className={`toc-full-kids${opened ? " is-open" : ""}`}>
                    <div className="toc-full-kids-inner">
                      {group.children.map((item) => {
                        const idx = toc.findIndex((entry) => entry.id === item.id);
                        return (
                          <div
                            key={item.id}
                            className={`toc-full-row${item.id === currentId ? " is-on" : ""}`}
                            data-anchor-id={item.id}
                            style={{ "--toc-ripple-delay": `${rippleDelay(idx, activeIndex)}ms` }}
                          >
                            <button
                              type="button"
                              className={`toc-full-item l3 ${itemStatus(item.id, currentId, visibleIds)}`}
                              onClick={() => jump(item.id)}
                            >
                              {item.text}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </Fragment>
            );
          })}
        </div>
        {toc.length ? <Squiggle /> : null}
        <div className="toc-full-foot">
          <ProgressBits pct={Math.round(progress)} ringRef={ringRef} ringOff={ringOff} onTop={toTop} />
        </div>
      </div>

      <div className="toc-overlay" aria-hidden="true">
        <svg
          className="toc-overlay-svg"
          viewBox={`0 0 48 ${railH}`}
          width="48"
          height={railH}
          style={{
            "--toc-clip-top": focus ? "-2%" : `${progress}%`,
            "--toc-clip-bottom": focus ? "-2%" : `${100 - progress}%`,
          }}
        >
          <path ref={pathRef} className="toc-overlay-path" d="" fill="none" />
          <path
            ref={accentRef}
            className="toc-overlay-accent"
            d=""
            fill="none"
            pathLength="1"
            strokeDasharray="0.12 0.88"
            strokeLinecap="round"
          />
          {toc.map((item, i) => (
            <circle
              key={item.id}
              ref={(el) => {
                nodeRefs.current[i] = el;
              }}
              className={`toc-overlay-node${item.id === currentId ? " is-on" : item.level === minLevel ? " is-root" : ""}`}
              cx="8"
              cy="0"
              r={item.id === currentId ? 2.5 : item.level === minLevel ? 1.75 : 1.25}
            />
          ))}
        </svg>
        <div ref={labelRef} className="toc-overlay-label">
          <AnimatePresence mode="wait" initial={false}>
            {rootItem ? (
              <motion.span
                key={rootItem.id}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                {rootItem.text}
              </motion.span>
            ) : null}
          </AnimatePresence>
          <em>{Math.round(progress)}%</em>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside ref={colRef} className="toc-col" aria-label="目录" />
      {!compact && typeof document !== "undefined" ? createPortal(desktop, document.body) : null}

      {compact && createPortal(
        <div className="toc-dock-layer">
          <AnimatePresence>
            {sheetOpen ? (
              <motion.button
                key="toc-mask"
                type="button"
                className="toc-sheet-mask"
                aria-label="关闭目录"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
                onClick={() => setSheetOpen(false)}
              />
            ) : null}
          </AnimatePresence>
          <motion.div
            className={`toc-sheet ${sheetOpen ? "is-open" : ""}`}
            initial={false}
            animate={{
              y: sheetOpen ? 0 : 18,
              opacity: sheetOpen ? 1 : 0,
            }}
            transition={{ duration: 0.22, ease }}
            style={{ pointerEvents: sheetOpen ? "auto" : "none" }}
          >
            <div className="toc-sheet-bar">
              <span className="toc-sheet-brand">目录</span>
              <button
                className="toc-sheet-toggle"
                type="button"
                aria-label="关闭目录"
                onClick={() => setSheetOpen(false)}
              >
                <X size={16} strokeWidth={1.8} />
              </button>
            </div>
            <div className="toc-sheet-clip">
              <div ref={listRef} className="toc-sheet-list">
                {toc.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`${item.level === 3 ? "l3" : ""} ${currentId === item.id ? "is-active" : ""}`}
                    onClick={() => jump(item.id)}
                  >
                    {item.text}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
          <button
            className="toc-fab"
            type="button"
            aria-label="打开目录"
            hidden={sheetOpen}
            onClick={() => setSheetOpen(true)}
          >
            <List size={16} strokeWidth={1.8} />
          </button>
        </div>,
        document.body
      )}
    </>
  );
}
