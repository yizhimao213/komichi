import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useMotionValue, useSpring, useMotionValueEvent } from "framer-motion";
import { ChevronUp, List, X } from "lucide-react";
import { useHeaderState } from "../context.jsx";

const LX = 10;
const BULGE = 24;
const RADIUS = 90;
const PAD = 22;
const ease = [0.22, 1, 0.36, 1];
const followSpring = { stiffness: 78, damping: 18, mass: 0.46 };
const labelSpring = { stiffness: 58, damping: 20, mass: 0.55 };
const dockSpring = { type: "spring", stiffness: 360, damping: 34, mass: 0.72 };
const RING_R = 6.5;
const RING_C = 2 * Math.PI * RING_R;

function bumpX(y, ay, radius, bulge) {
  const t = (y - ay) / radius;
  if (Math.abs(t) >= 1) return LX;
  return LX + bulge * 0.5 * (1 + Math.cos(t * Math.PI));
}

function waveX(y, t, motion) {
  const idle = 0.72 + Math.sin(t * 1.05) * 0.22;
  const amp = idle + motion * 1.6;
  return Math.sin(y * 0.042 + t * 1.55) * amp + Math.sin(y * 0.088 - t * 1.12) * amp * 0.32;
}

function xAt(y, ay, radius, bulge, t, motion) {
  return bumpX(y, ay, radius, bulge) + waveX(y, t, motion);
}

function bulgePath(h, ay, radius, bulge, t, motion) {
  const steps = Math.max(96, Math.round(h / 3.2));
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const y = (i / steps) * h;
    d += `${i ? "L" : "M"}${xAt(y, ay, radius, bulge, t, motion).toFixed(2)} ${y.toFixed(2)} `;
  }
  return d.trim();
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
      <button type="button" className="toc-now-top" onPointerDown={onTop}>
        <ChevronUp size={13} strokeWidth={2.2} />
        回到顶部
      </button>
    </>
  );
}

function headingAt(markers, y) {
  let cur = markers[0];
  for (const m of markers) {
    if (m.y <= y + 10) cur = m;
    else break;
  }
  return cur;
}

function railSize() {
  return Math.round(Math.min(560, Math.max(380, window.innerHeight * 0.64)));
}

export default function Toc({ items, active }) {
  const colRef = useRef(null);
  const stickyRef = useRef(null);
  const pathRef = useRef(null);
  const nowRef = useRef(null);
  const pctRef = useRef(null);
  const ringRef = useRef(null);
  const glowRef = useRef(null);
  const beadRef = useRef(null);
  const nodeRefs = useRef({});
  const hitRefs = useRef({});
  const skipHover = useRef(false);
  const enterTimer = useRef(0);
  const leaveTimer = useRef(0);
  const markersRef = useRef([]);
  const readingRef = useRef(false);
  const lastPct = useRef(-1);
  const railHRef = useRef(420);
  const lastAy = useRef(PAD);
  const lastT = useRef(0);
  const velRef = useRef(0);
  const ayRef = useRef(PAD);
  const motionRef = useRef(0);
  const startT = useRef(0);
  const currentIdxRef = useRef(0);

  const targetY = useMotionValue(PAD);
  const y = useSpring(targetY, followSpring);
  const labelY = useSpring(targetY, labelSpring);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [markers, setMarkers] = useState([]);
  const [reading, setReading] = useState(false);
  const [hover, setHover] = useState(false);
  const [railH, setRailH] = useState(420);
  const [heading, setHeading] = useState("");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [vw, setVw] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 800));
  const [listH, setListH] = useState(0);
  const listRef = useRef(null);
  const { setTocOpen } = useHeaderState();

  const paint = (ay, now = performance.now()) => {
    const list = markersRef.current;
    const h = railHRef.current;
    if (!list.length || !pathRef.current) return;
    if (!startT.current) startT.current = now;
    const dt = Math.max(8, now - (lastT.current || now));
    const raw = ((ay - lastAy.current) / dt) * 1000;
    velRef.current = velRef.current * 0.86 + raw * 0.14;
    lastAy.current = ay;
    lastT.current = now;
    const stretch = Math.min(1, Math.abs(velRef.current) / 620);
    motionRef.current += (stretch - motionRef.current) * 0.08;
    const motion = motionRef.current;
    const t = (now - startT.current) / 1000;
    const breathe = Math.sin(t * 0.95) * 1.05;
    const radius = RADIUS + motion * 28;
    const bulge = BULGE + breathe + motion * 3.2;
      pathRef.current.setAttribute("d", bulgePath(h, ay, radius, bulge, t, motion));
      const current = headingAt(list, ay);
      const tipX = xAt(ay, ay, radius, bulge, t, motion);
      const pulse = 1 + Math.sin(t * 2.2) * 0.08;
      if (glowRef.current) {
        glowRef.current.setAttribute("cx", String(tipX));
        glowRef.current.setAttribute("cy", String(ay));
        glowRef.current.setAttribute("r", String((11 + motion * 4) * pulse));
        glowRef.current.setAttribute("opacity", String(0.22 + (1 - motion) * 0.08));
      }
      if (beadRef.current) {
        beadRef.current.setAttribute("cx", String(tipX));
        beadRef.current.setAttribute("cy", String(ay));
        beadRef.current.setAttribute("r", String(3.4 * pulse));
      }
      list.forEach((m) => {
        const cx = xAt(m.y, ay, radius, bulge, t, motion);
        const hit = hitRefs.current[m.id];
        const node = nodeRefs.current[m.id];
        if (hit) {
          hit.setAttribute("cx", String(cx));
          hit.setAttribute("cy", String(m.y));
        }
        if (node) {
          const dist = Math.abs(m.y - ay);
          const on = current?.id === m.id;
          const near = Math.max(0, 1 - dist / (radius * 1.15));
          node.setAttribute("cx", String(cx));
          node.setAttribute("cy", String(m.y));
          node.setAttribute("r", on ? "2.2" : (1.25 + near * 0.55).toFixed(2));
          node.setAttribute("opacity", on ? "1" : String(0.28 + near * 0.45));
          node.classList.toggle("is-on", on);
        }
      });
      if (current?.text) {
        const idx = list.findIndex((m) => m.id === current.id);
        if (idx >= 0 && idx !== currentIdxRef.current) {
          currentIdxRef.current = idx;
          setCurrentIdx(idx);
        }
        setHeading((prev) => (prev === current.text ? prev : current.text));
      }
    };

  useMotionValueEvent(y, "change", (ay) => {
    ayRef.current = ay;
  });
  useMotionValueEvent(labelY, "change", (ay) => {
    if (nowRef.current) nowRef.current.style.transform = `translate3d(0, ${ay}px, 0) translateY(-50%)`;
  });

  useEffect(() => {
    if (!items.length) return undefined;

    const proseEl = () => document.querySelector(".note-paper .prose, .article-page .prose");

    const pinCol = () => {
      const col = colRef.current;
      const sticky = stickyRef.current;
      if (!col || !sticky) return;
      sticky.style.left = `${Math.round(col.getBoundingClientRect().left)}px`;
    };

    const layout = () => {
      const prose = proseEl();
      const h = railSize();
      railHRef.current = h;
      setRailH(h);
      if (!prose) return;
      const start = prose.getBoundingClientRect().top + window.scrollY;
      const height = Math.max(prose.offsetHeight, 1);
      const span = h - PAD * 2;
      const next = items.map((item) => {
        const el = document.getElementById(item.id);
        const top = el ? el.getBoundingClientRect().top + window.scrollY : start;
        const ratio = Math.min(1, Math.max(0, (top - start) / height));
        return { ...item, y: PAD + ratio * span };
      });
      markersRef.current = next;
      setMarkers(next);
      if (!heading && next[0]?.text) setHeading(next[0].text);
    };

    const readTarget = () => {
      const prose = proseEl();
      if (!prose) return;
      const h = railHRef.current;
      const rect = prose.getBoundingClientRect();
      const start = rect.top + window.scrollY;
      const height = Math.max(prose.offsetHeight, 1);
      const view = window.scrollY + Math.min(132, window.innerHeight * 0.18);
      const ratio = Math.min(1, Math.max(0, (view - start) / height));
      targetY.set(PAD + ratio * (h - PAD * 2));

      const max = document.documentElement.scrollHeight - window.innerHeight;
      const atEnd = max <= 0 || window.scrollY >= max - 8;
      const pct = max <= 0 ? 100 : atEnd ? 100 : Math.min(99, Math.max(1, (window.scrollY / max) * 100));
      const rounded = Math.round(pct);
      if (rounded !== lastPct.current) {
        lastPct.current = rounded;
        if (pctRef.current) pctRef.current.textContent = `${rounded}%`;
        if (ringRef.current) {
          ringRef.current.setAttribute("stroke-dashoffset", String(RING_C * (1 - rounded / 100)));
        }
        setProgress(rounded);
      }

      let nextReading = readingRef.current;
      if (atEnd) nextReading = false;
      else if (rect.top < 96) nextReading = true;
      else if (rect.top > 168) nextReading = false;
      if (nextReading !== readingRef.current) {
        readingRef.current = nextReading;
        setReading(nextReading);
        if (!nextReading) setHover(false);
      }
    };

    const onResize = () => {
      pinCol();
      layout();
      readTarget();
    };
    pinCol();
    layout();
    readTarget();
    ayRef.current = targetY.get();
    let raf = 0;
    const tick = (now) => {
      paint(ayRef.current, now);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    window.addEventListener("scroll", readTarget, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", readTarget);
      window.removeEventListener("resize", onResize);
    };
  }, [items, targetY]);

  useEffect(
    () => () => {
      window.clearTimeout(enterTimer.current);
      window.clearTimeout(leaveTimer.current);
    },
    []
  );

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

  useLayoutEffect(() => {
    const pin = () => {
      const col = colRef.current;
      const sticky = stickyRef.current;
      if (!col || !sticky) return;
      sticky.style.left = `${Math.round(col.getBoundingClientRect().left)}px`;
    };
    pin();
    window.addEventListener("resize", pin);
    return () => window.removeEventListener("resize", pin);
  }, [items, vw, railH]);

  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return undefined;
    const apply = () => {
      const cap = Math.max(96, Math.round(window.innerHeight - 88));
      setListH(Math.min(el.scrollHeight, cap));
    };
    apply();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(apply) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [items, sheetOpen, vw]);

  const showList = !reading || hover;

  const jump = (id) => {
    skipHover.current = true;
    window.clearTimeout(enterTimer.current);
    window.clearTimeout(leaveTimer.current);
    setHover(false);
    const el = document.getElementById(id);
    const top = el ? el.getBoundingClientRect().top + window.scrollY - 84 : 0;
    setSheetOpen(false);
    window.setTimeout(() => {
      if (el) window.scrollTo({ top, behavior: "smooth" });
      skipHover.current = false;
    }, 80);
  };

  const onEnter = () => {
    window.clearTimeout(leaveTimer.current);
    if (skipHover.current || !reading) return;
    window.clearTimeout(enterTimer.current);
    enterTimer.current = window.setTimeout(() => {
      if (!skipHover.current) setHover(true);
    }, 90);
  };

  const onLeave = () => {
    window.clearTimeout(enterTimer.current);
    window.clearTimeout(leaveTimer.current);
    leaveTimer.current = window.setTimeout(() => setHover(false), 70);
  };

  const onDotDown = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    jump(id);
  };

  const toTop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    skipHover.current = true;
    setHover(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
    window.setTimeout(() => {
      skipHover.current = false;
    }, 420);
  };

  if (!items.length) return null;
  const first = markers[0];
  const list = markers.length ? markers : items;
  const idx = Math.min(currentIdx, Math.max(0, list.length - 1));
  const prevItem = list[idx - 1];
  const nowItem = list[idx] || first;
  const nextItem = list[idx + 1];
  const ringOff = RING_C * (1 - Math.round(progress) / 100);
  const padOpen = 12;
  const dockClosedW = Math.round(vw * 0.7);
  const dockW = sheetOpen ? Math.max(dockClosedW, vw - padOpen * 2) : dockClosedW;
  const dockLeft = sheetOpen ? padOpen : (vw - dockClosedW) / 2;

  const panel = (
        <div
          ref={stickyRef}
          className={`toc-sticky ${showList ? "is-list" : "is-rail"}`}
          style={{ "--toc-rail-h": `${railH}px` }}
          onMouseEnter={onEnter}
          onMouseLeave={onLeave}
        >
          <motion.div
            className="toc-full"
            aria-hidden={!showList}
            initial={false}
            animate={{ opacity: showList ? 1 : 0, x: showList ? 0 : 10 }}
            transition={{ duration: 0.38, ease }}
            style={{ pointerEvents: showList ? "auto" : "none" }}
          >
            <p className="toc-kicker">目录</p>
            <div className="toc-full-list">
              {items.map((item, i) => (
                <motion.button
                  key={item.id}
                  type="button"
                  className={`toc-full-item ${item.level === 3 ? "l3" : ""} ${active === item.id ? "is-active" : ""}`}
                  initial={false}
                  animate={{
                    opacity: showList ? (active === item.id ? 1 : 0.5) : 0,
                    x: showList ? (active === item.id ? 8 : 0) : 14,
                  }}
                  transition={{
                    duration: 0.42,
                    ease,
                    delay: showList ? i * 0.032 : i * 0.012,
                  }}
                  onClick={() => jump(item.id)}
                >
                  {item.text}
                </motion.button>
              ))}
            </div>
            <div className="toc-full-foot">
              <ProgressBits pct={Math.round(progress)} ringOff={ringOff} onTop={toTop} />
            </div>
          </motion.div>

          <motion.div
            className="toc-rail"
            aria-hidden={showList}
            initial={false}
            animate={{ opacity: showList ? 0 : 1 }}
            transition={{ duration: 0.36, ease, delay: showList ? 0 : 0.08 }}
            style={{ pointerEvents: showList ? "none" : "auto" }}
          >
            <svg className="toc-svg" viewBox={`0 0 200 ${railH}`} width="200" height={railH}>
              <path ref={pathRef} className="toc-path" d="" fill="none" />
              <circle ref={glowRef} className="toc-glow" cx={LX + BULGE} cy={PAD} r="12" />
              <circle ref={beadRef} className="toc-bead" cx={LX + BULGE} cy={PAD} r="3.4" />
              {markers.map((m) => (
                <g key={m.id}>
                  <circle
                    ref={(el) => {
                      hitRefs.current[m.id] = el;
                    }}
                    className="toc-hit"
                    cx={LX}
                    cy={m.y}
                    r={12}
                    onPointerDown={(e) => onDotDown(e, m.id)}
                  />
                  <circle
                    ref={(el) => {
                      nodeRefs.current[m.id] = el;
                    }}
                    className="toc-node"
                    cx={LX}
                    cy={m.y}
                    r={1.5}
                  />
                </g>
              ))}
            </svg>
            <div ref={nowRef} className="toc-now">
              <div className="toc-now-stack">
                {prevItem && (
                  <button
                    type="button"
                    className="toc-now-near toc-now-prev"
                    onPointerDown={(e) => onDotDown(e, prevItem.id)}
                  >
                    {prevItem.text}
                  </button>
                )}
                <button
                  type="button"
                  className="toc-now-current"
                  onPointerDown={(e) => onDotDown(e, nowItem?.id)}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={heading || nowItem?.text || "toc"}
                      initial={{ opacity: 0, y: 7, filter: "blur(4px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      exit={{ opacity: 0, y: -7, filter: "blur(4px)" }}
                      transition={{ duration: 0.22, ease }}
                    >
                      {heading || nowItem?.text || ""}
                    </motion.span>
                  </AnimatePresence>
                </button>
                {nextItem && (
                  <button
                    type="button"
                    className="toc-now-near toc-now-next"
                    onPointerDown={(e) => onDotDown(e, nextItem.id)}
                  >
                    {nextItem.text}
                  </button>
                )}
              </div>
              <ProgressBits
                pct={Math.round(progress)}
                ringRef={ringRef}
                ringOff={ringOff}
                onTop={toTop}
              />
            </div>
          </motion.div>
        </div>
  );

  return (
    <>
      <aside ref={colRef} className="toc-col" aria-label="目录" />
      {typeof document !== "undefined" ? createPortal(panel, document.body) : panel}

      {createPortal(
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
              left: dockLeft,
              width: dockW,
              y: sheetOpen ? 0 : 88,
              opacity: sheetOpen ? 1 : 0,
              borderRadius: 20,
            }}
            transition={dockSpring}
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
            <motion.div
              className="toc-sheet-clip"
              initial={false}
              animate={{ height: sheetOpen ? listH : 0, opacity: sheetOpen ? 1 : 0 }}
              transition={{
                height: dockSpring,
                opacity: { duration: 0.18, delay: sheetOpen ? 0.06 : 0 },
              }}
            >
              <div ref={listRef} className="toc-sheet-list">
                {items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`${item.level === 3 ? "l3" : ""} ${active === item.id ? "is-active" : ""}`}
                    onClick={() => jump(item.id)}
                  >
                    {item.text}
                  </button>
                ))}
              </div>
            </motion.div>
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
