import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, ChevronDown, Clock, Feather, House, Lightbulb, Menu, X } from "lucide-react";
import { SEASON_LIST, useHeaderState } from "../context.jsx";
import { categoryList, seriesList } from "../content.js";
import HomeMega from "./HomeMega.jsx";
import NotesMega from "./NotesMega.jsx";
import PostsMega from "./PostsMega.jsx";
import TimelineMega from "./TimelineMega.jsx";

const NAV = [
  ["/", "首页", House],
  ["/posts", "文稿", BookOpen],
  ["/notes", "手记", Feather],
  ["/timeline", "时光", Clock],
  ["/thinking", "思考", Lightbulb],
];

const DRAWER_EXTRA = [
  ["/friends", "友人帐"],
  ["/projects", "项目"],
  ["/says", "一言"],
  ["/about", "关于我"],
];

const sliderSpring = { type: "spring", stiffness: 380, damping: 36, mass: 0.7 };
const dockSpring = { type: "spring", stiffness: 360, damping: 34, mass: 0.72 };
const megaMorph = { type: "spring", stiffness: 480, damping: 38, mass: 0.7 };
const MEGA_ORDER = ["home", "posts", "notes", "timeline"];
const MEGA_PANEL = {
  home: HomeMega,
  posts: PostsMega,
  notes: NotesMega,
  timeline: TimelineMega,
};

function activeIndex(pathname) {
  return NAV.findIndex(([to]) => (to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`)));
}

function DockFold({ to, label, open, setOpen, height, innerRef, onClose }) {
  const isNotes = to === "/notes";
  const isTimeline = to === "/timeline";
  const isHome = to === "/";
  return (
    <>
      <div className="dock-row">
        <NavLink
          to={to}
          className={({ isActive }) => (isActive ? "is-active" : "")}
          onClick={onClose}
        >
          <span>{label}</span>
        </NavLink>
        <button
          type="button"
          className={`dock-fold ${open ? "is-open" : ""}`}
          aria-label={open ? "收起" : isHome ? "展开页面" : isNotes ? "展开专栏" : isTimeline ? "展开筛选" : "展开分类"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <motion.span
            className="dock-fold-ico"
            initial={false}
            animate={{ rotate: open ? 180 : 0 }}
            transition={dockSpring}
          >
            <ChevronDown size={14} strokeWidth={1.8} />
          </motion.span>
        </button>
      </div>
      <motion.div
        className="dock-sub-clip"
        initial={false}
        animate={{
          height: open ? height : 0,
          opacity: open ? 1 : 0,
        }}
        transition={{
          height: dockSpring,
          opacity: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
        }}
      >
        <div ref={innerRef} className="dock-sub">
          {isHome ? (
            <>
              <NavLink to="/about" onClick={onClose}>自述</NavLink>
              <NavLink to="/thinking" onClick={onClose}>思考</NavLink>
              <NavLink to="/about-site" onClick={onClose}>此站点</NavLink>
              <NavLink to="/projects" onClick={onClose}>项目</NavLink>
              <NavLink to="/friends" onClick={onClose}>友人帐</NavLink>
              <NavLink to="/says" onClick={onClose}>一言</NavLink>
              <NavLink to="/message" onClick={onClose}>留言</NavLink>
            </>
          ) : isNotes ? (
            <>
              <NavLink to="/notes/series" onClick={onClose}>
                全部专栏
              </NavLink>
              {seriesList.map((item) => (
                <NavLink key={item.slug} to={`/notes/series/${item.slug}`} onClick={onClose}>
                  {item.name}
                </NavLink>
              ))}
            </>
          ) : isTimeline ? (
            <>
              <NavLink to="/timeline?type=note" onClick={onClose}>
                手记
              </NavLink>
              <NavLink to="/timeline?type=post" onClick={onClose}>
                文稿
              </NavLink>
              <NavLink to="/timeline?memory=1" onClick={onClose}>
                回忆
              </NavLink>
            </>
          ) : (
            <>
              <NavLink to="/categories" onClick={onClose}>
                全部分类
              </NavLink>
              {categoryList.map((item) => (
                <NavLink key={item.slug} to={`/categories/${item.slug}`} onClick={onClose}>
                  {item.name}
                </NavLink>
              ))}
            </>
          )}
        </div>
      </motion.div>
    </>
  );
}

export default function Header({
  scrolled,
  menuOpen,
  setMenuOpen,
  onSearch,
  onTheme,
  onBg,
  themeMode,
  bgOn,
  season,
  setSeason,
}) {
  const { meta, tocOpen } = useHeaderState();
  const { pathname } = useLocation();
  const [overCover, setOverCover] = useState(() => Boolean(meta.hasCover));
  const [progress, setProgress] = useState(0);
  const [slider, setSlider] = useState({ left: 0, width: 0, ready: false });
  const [isDock, setIsDock] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 1100px)").matches : false
  );
  const [dockMini, setDockMini] = useState(false);
  const [headHidden, setHeadHidden] = useState(false);
  const [vw, setVw] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 800));
  const [menuH, setMenuH] = useState(0);
  const [megaKind, setMegaKind] = useState(null);
  const [homeFold, setHomeFold] = useState(false);
  const [notesFold, setNotesFold] = useState(false);
  const [postsFold, setPostsFold] = useState(false);
  const [tlFold, setTlFold] = useState(false);
  const lastY = useRef(0);
  const moveAcc = useRef(0);
  const megaTimer = useRef(0);
  const idleTimer = useRef(0);
  const lockY = useRef(0);
  const navRef = useRef(null);
  const chipRefs = useRef([]);
  const menuInnerRef = useRef(null);
  const homeSubRef = useRef(null);
  const notesSubRef = useRef(null);
  const postsSubRef = useRef(null);
  const tlSubRef = useRef(null);
  const [homeSubH, setHomeSubH] = useState(0);
  const [notesSubH, setNotesSubH] = useState(0);
  const [postsSubH, setPostsSubH] = useState(0);
  const [tlSubH, setTlSubH] = useState(0);
  const [megaSize, setMegaSize] = useState({ w: 0, h: 0 });
  const megaPaneRefs = useRef({});
  const megaCache = useRef({});
  const megaMorphing = useRef(false);
  const current = activeIndex(pathname);
  const megaOpen = Boolean(megaKind);

  const applyMegaSize = (kind) => {
    const cached = megaCache.current[kind];
    if (cached) setMegaSize(cached);
  };
  const openMega = (kind) => {
    window.clearTimeout(megaTimer.current);
    megaMorphing.current = Boolean(megaKind);
    applyMegaSize(kind);
    setMegaKind(kind);
  };
  const closeMega = () => {
    window.clearTimeout(megaTimer.current);
    megaTimer.current = window.setTimeout(() => {
      megaMorphing.current = false;
      setMegaKind(null);
    }, 180);
  };
  const jumpMega = () => {
    window.clearTimeout(megaTimer.current);
    megaMorphing.current = false;
    setMegaKind(null);
    setMenuOpen(false);
  };

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1100px)");
    const apply = () => {
      setIsDock(mq.matches);
      setVw(window.innerWidth);
      if (!mq.matches) setMenuOpen(false);
    };
    apply();
    mq.addEventListener("change", apply);
    window.addEventListener("resize", apply);
    return () => {
      mq.removeEventListener("change", apply);
      window.removeEventListener("resize", apply);
    };
  }, [setMenuOpen]);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(100, (y / max) * 100) : 0);
      if (meta.hasCover) {
        setOverCover(y < Math.min(window.innerHeight * 0.46, 420));
      } else {
        setOverCover(false);
      }
      const dy = y - lastY.current;
      lastY.current = y;
      if (isDock) {
        window.clearTimeout(idleTimer.current);
        if (menuOpen || tocOpen || y < 16) {
          setDockMini(false);
          return;
        }
        if (dy > 2) setDockMini(true);
        else if (dy < -2) setDockMini(false);
        idleTimer.current = window.setTimeout(() => setDockMini(false), 1500);
        return;
      }
      if (y < 24 || megaOpen || menuOpen) {
        moveAcc.current = 0;
        setHeadHidden(false);
        return;
      }
      if (dy === 0) return;
      if (Math.sign(dy) !== Math.sign(moveAcc.current) && moveAcc.current !== 0) {
        moveAcc.current = dy;
      } else {
        moveAcc.current += dy;
      }
      if (moveAcc.current > 8) {
        setHeadHidden(true);
        moveAcc.current = 0;
      } else if (moveAcc.current < -8) {
        setHeadHidden(false);
        moveAcc.current = 0;
      }
    };
    lastY.current = window.scrollY;
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(idleTimer.current);
    };
  }, [meta.hasCover, meta.title, isDock, menuOpen, megaOpen, tocOpen]);

  useEffect(() => {
    if (menuOpen) setDockMini(false);
  }, [menuOpen]);

  useEffect(() => {
    if (tocOpen) {
      setMenuOpen(false);
      setDockMini(false);
    }
  }, [tocOpen, setMenuOpen]);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const locked = isDock && (menuOpen || tocOpen);
    const allowSel = ".dock-menu-clip, .toc-sheet-clip";
    const freeze = (node) => {
      node.style.overflow = "hidden";
      node.style.overscrollBehavior = "none";
    };
    const thaw = (node) => {
      node.style.overflow = "";
      node.style.overscrollBehavior = "";
    };
    const unlock = () => {
      thaw(html);
      thaw(body);
      html.style.scrollbarGutter = "";
      html.classList.remove("is-scroll-lock");
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      body.style.width = "";
      if (body.dataset.scrollLock != null) {
        window.scrollTo(0, Number(body.dataset.scrollLock));
        delete body.dataset.scrollLock;
      }
    };
    if (!locked) {
      unlock();
      return undefined;
    }
    if (body.dataset.scrollLock == null) {
      const y = window.scrollY;
      lockY.current = y;
      body.dataset.scrollLock = String(y);
      freeze(html);
      freeze(body);
      html.style.scrollbarGutter = "auto";
      html.classList.add("is-scroll-lock");
      body.style.position = "fixed";
      body.style.top = `-${y}px`;
      body.style.left = "0";
      body.style.right = "0";
      body.style.width = "100%";
    }
    const block = (e) => {
      if (e.target.closest?.(allowSel)) return;
      e.preventDefault();
    };
    document.addEventListener("touchmove", block, { passive: false });
    document.addEventListener("wheel", block, { passive: false });
    return () => {
      document.removeEventListener("touchmove", block);
      document.removeEventListener("wheel", block);
    };
  }, [isDock, menuOpen, tocOpen]);

  useLayoutEffect(() => {
    const el = menuInnerRef.current;
    if (!el) return;
    const apply = () => setMenuH(el.scrollHeight);
    apply();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(apply) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [isDock, vw, homeFold, notesFold, postsFold, tlFold, menuOpen, homeSubH, notesSubH, postsSubH, tlSubH]);

  useLayoutEffect(() => {
    const el = homeSubRef.current;
    if (!el) return;
    const apply = () => setHomeSubH(el.scrollHeight);
    apply();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(apply) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [isDock]);

  useLayoutEffect(() => {
    const el = notesSubRef.current;
    if (!el) return;
    const apply = () => setNotesSubH(el.scrollHeight);
    apply();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(apply) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [isDock]);

  useLayoutEffect(() => {
    const el = postsSubRef.current;
    if (!el) return;
    const apply = () => setPostsSubH(el.scrollHeight);
    apply();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(apply) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [isDock]);

  useLayoutEffect(() => {
    const el = tlSubRef.current;
    if (!el) return;
    const apply = () => setTlSubH(el.scrollHeight);
    apply();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(apply) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [isDock]);

  useEffect(() => {
    if (!menuOpen) {
      setHomeFold(false);
      setNotesFold(false);
      setPostsFold(false);
      setTlFold(false);
    }
  }, [menuOpen]);

  useLayoutEffect(() => {
    if (isDock) return;
    const measure = () => {
      const nav = navRef.current;
      const chip = current >= 0 ? chipRefs.current[current] : null;
      if (!nav || !chip) {
        setSlider((s) => (s.ready ? { ...s, ready: false } : s));
        return;
      }
      const nr = nav.getBoundingClientRect();
      const cr = chip.getBoundingClientRect();
      setSlider({
        left: cr.left - nr.left - nav.clientLeft,
        width: cr.width,
        ready: true,
      });
    };
    measure();
    let raf = 0;
    const until = performance.now() + 280;
    const tick = (now) => {
      measure();
      if (now < until) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    const nav = navRef.current;
    if (nav && ro) ro.observe(nav);
    chipRefs.current.forEach((el) => el && ro?.observe(el));
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
      ro?.disconnect();
    };
  }, [current, scrolled, menuOpen, meta.hasCover, overCover, isDock]);

  useLayoutEffect(() => {
    if (isDock) return;
    const measure = () => {
      for (const id of MEGA_ORDER) {
        const el = megaPaneRefs.current[id];
        const node = el?.firstElementChild || el;
        if (!node) continue;
        const rect = node.getBoundingClientRect();
        const w = Math.ceil(rect.width || node.offsetWidth);
        const h = Math.ceil(rect.height || node.offsetHeight);
        if (w > 0 && h > 0) megaCache.current[id] = { w, h };
      }
      if (!megaKind) return;
      const size = megaCache.current[megaKind];
      if (size) setMegaSize((prev) => (prev.w === size.w && prev.h === size.h ? prev : size));
    };
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    MEGA_ORDER.forEach((id) => {
      const inner = megaPaneRefs.current[id]?.firstElementChild;
      if (inner) ro?.observe(inner);
    });
    return () => ro?.disconnect();
  }, [megaKind, isDock]);

  useEffect(() => {
    if (!megaKind) return;
    const id = window.requestAnimationFrame(() => {
      megaMorphing.current = true;
    });
    return () => window.cancelAnimationFrame(id);
  }, [megaKind]);

  useEffect(() => {
    megaMorphing.current = false;
    setMegaKind(null);
    setHeadHidden(false);
    lastY.current = typeof window !== "undefined" ? window.scrollY : 0;
    moveAcc.current = 0;
    window.clearTimeout(megaTimer.current);
  }, [pathname, isDock]);

  useEffect(() => {
    if (megaOpen) setHeadHidden(false);
  }, [megaOpen]);

  useEffect(() => () => window.clearTimeout(megaTimer.current), []);

  const overlay = Boolean(meta.hasCover) && overCover && !menuOpen && !isDock;
  const solid = scrolled && !overlay;
  const padOpen = 12;
  const dockMiniOn = dockMini && !menuOpen && !tocOpen;
  const dockClosedW = Math.round(vw * 0.7);
  const dockMiniW = 44;
  const dockW = menuOpen ? Math.max(dockClosedW, vw - padOpen * 2) : dockMiniOn ? dockMiniW : dockClosedW;
  const dockLeft = menuOpen ? padOpen : dockMiniOn ? padOpen : (vw - dockClosedW) / 2;

  return (
    <>
    {!isDock ? <div className="header-spacer" aria-hidden="true" /> : null}
    <header
      className={[
        "site-header",
        scrolled ? "is-scrolled" : "",
        overlay ? "is-overlay" : "",
        isDock ? "is-dock" : "",
        dockMiniOn && isDock ? "is-dock-mini" : "",
        headHidden && !isDock ? "is-head-hidden" : "",
        menuOpen && isDock ? "is-dock-open" : "",
      ].join(" ")}
    >
      <div className="read-progress" style={{ width: `${progress}%` }} />
      <div className="header-inner">
        <button
          className="icon-btn menu-btn"
          type="button"
          aria-label={menuOpen ? "关闭菜单" : "打开菜单"}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? <X size={16} strokeWidth={1.7} /> : <Menu size={16} strokeWidth={1.7} />}
        </button>

        <Link className="logo" to="/" aria-label="komichi">
          <span className="logo-cjk">komichi</span>
        </Link>

        <div className="header-center">
          <nav ref={navRef} className={`pill-nav ${solid ? "is-solid" : ""}`} aria-label="主导航">
            {slider.ready ? (
              <motion.span
                className="nav-active-bg"
                aria-hidden="true"
                initial={false}
                animate={{ left: slider.left, width: slider.width }}
                transition={sliderSpring}
              />
            ) : null}
            {NAV.map(([to, label, Icon], i) => {
              const mega = to === "/" ? "home" : to === "/notes" ? "notes" : to === "/posts" ? "posts" : to === "/timeline" ? "timeline" : null;
              return (
              <span
                key={to}
                className={`pill-item ${mega ? "has-mega" : ""}`}
                onMouseEnter={mega && !isDock ? () => openMega(mega) : undefined}
                onMouseLeave={mega && !isDock ? closeMega : undefined}
              >
                {i > 0 ? <span className="pill-sep" aria-hidden="true" /> : null}
                <NavLink
                  to={to}
                  end={to === "/"}
                  className={({ isActive }) => (isActive ? "is-active" : "")}
                  onClick={() => setMenuOpen(false)}
                >
                  <span
                    className="nav-chip"
                    ref={(el) => {
                      chipRefs.current[i] = el;
                    }}
                  >
                    <span className="nav-ico-wrap" aria-hidden="true">
                      <Icon className="nav-ico" size={13} strokeWidth={1.8} />
                    </span>
                    <span className="nav-label">{label}</span>
                  </span>
                </NavLink>
              </span>
            );
            })}
          </nav>
          {!isDock ? (
            <motion.div
              className={`notes-mega-wrap${megaKind ? " is-open" : ""}`}
              initial={false}
              animate={megaKind ? { opacity: 1, y: 0, x: "-50%" } : { opacity: 0, y: 8, x: "-50%" }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              style={{ pointerEvents: megaKind ? "auto" : "none" }}
              aria-hidden={!megaKind}
              onMouseEnter={() => megaKind && openMega(megaKind)}
              onMouseLeave={closeMega}
            >
              <motion.div
                className="notes-mega"
                initial={false}
                animate={megaSize.w ? { width: megaSize.w, height: megaSize.h } : undefined}
                transition={megaMorphing.current ? megaMorph : { duration: 0 }}
              >
                {MEGA_ORDER.map((id) => {
                  const Panel = MEGA_PANEL[id];
                  return (
                    <div
                      key={id}
                      className={`mega-pane${megaKind === id ? " is-on" : ""}`}
                      ref={(el) => {
                        megaPaneRefs.current[id] = el;
                      }}
                    >
                      <Panel onJump={jumpMega} />
                    </div>
                  );
                })}
              </motion.div>
            </motion.div>
          ) : null}
        </div>

        <div className="header-tools">
          <Link className="avatar-link" to="/about" aria-label="关于我">
            <img src="/assets/avatar.jpg" alt="" data-eager loading="eager" decoding="async" />
          </Link>
        </div>
      </div>

      {isDock ? (
        <div className="dock-layer">
          <AnimatePresence>
            {menuOpen ? (
              <motion.button
                key="dock-mask"
                type="button"
                className="dock-mask"
                aria-label="关闭菜单"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
                onClick={() => setMenuOpen(false)}
              />
            ) : null}
          </AnimatePresence>

          <motion.div
            className={`dock-shell ${menuOpen ? "is-open" : ""} ${dockMiniOn ? "is-collapsed" : ""}`}
            initial={false}
            animate={{
              left: dockLeft,
              width: dockW,
              y: tocOpen ? 88 : 0,
              opacity: tocOpen ? 0 : 1,
              borderRadius: dockMiniOn ? 22 : 20,
            }}
            transition={dockSpring}
            style={{ pointerEvents: tocOpen ? "none" : "auto" }}
          >
            <motion.div
              className="dock-menu-clip"
              initial={false}
              animate={{ height: menuOpen ? menuH : 0, opacity: menuOpen ? 1 : 0 }}
              transition={{
                height: dockSpring,
                opacity: { duration: 0.18, delay: menuOpen ? 0.06 : 0 },
              }}
            >
              <nav ref={menuInnerRef} className="dock-menu" aria-label="站点菜单">
                {NAV.map(([to, label], i) => (
                  <div key={to} className="dock-block">
                    {to === "/" || to === "/notes" || to === "/posts" || to === "/timeline" ? (
                      <DockFold
                        to={to}
                        label={label}
                        open={to === "/" ? homeFold : to === "/notes" ? notesFold : to === "/posts" ? postsFold : tlFold}
                        setOpen={to === "/" ? setHomeFold : to === "/notes" ? setNotesFold : to === "/posts" ? setPostsFold : setTlFold}
                        height={to === "/" ? homeSubH : to === "/notes" ? notesSubH : to === "/posts" ? postsSubH : tlSubH}
                        innerRef={to === "/" ? homeSubRef : to === "/notes" ? notesSubRef : to === "/posts" ? postsSubRef : tlSubRef}
                        onClose={() => setMenuOpen(false)}
                      />
                    ) : (
                      <NavLink
                        to={to}
                        end={to === "/"}
                        className={({ isActive }) => (isActive ? "is-active" : "")}
                        onClick={() => setMenuOpen(false)}
                      >
                        <span>{label}</span>
                        {i === 0 ? <ChevronDown size={14} strokeWidth={1.8} /> : <span />}
                      </NavLink>
                    )}
                  </div>
                ))}
                <div className="dock-more">
                  <p>更多</p>
                  <div className="dock-more-row">
                    {DRAWER_EXTRA.map(([to, label]) => (
                      <NavLink key={to} to={to} onClick={() => setMenuOpen(false)}>
                        {label}
                      </NavLink>
                    ))}
                  </div>
                </div>
              </nav>
            </motion.div>

            <div className="dock-bar">
              <Link className="dock-brand" to="/" onClick={() => setMenuOpen(false)}>
                komichi
              </Link>
              <button
                className="dock-toggle"
                type="button"
                aria-label={menuOpen ? "关闭菜单" : dockMiniOn ? "展开导航" : "打开菜单"}
                onClick={() => (dockMiniOn ? setDockMini(false) : setMenuOpen((v) => !v))}
              >
                {menuOpen ? (
                  <X size={16} strokeWidth={1.8} />
                ) : dockMiniOn ? (
                  <span className="dock-orb" aria-hidden="true" />
                ) : (
                  <Menu size={16} strokeWidth={1.8} />
                )}
              </button>
            </div>
          </motion.div>
        </div>
      ) : (
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              className="nav-sheet-mask"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
            >
              <motion.nav
                className="nav-sheet"
                initial={{ x: -24, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -16, opacity: 0 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                onClick={(e) => e.stopPropagation()}
              >
                {NAV.map(([to, label, Icon]) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === "/"}
                    className={({ isActive }) => (isActive ? "is-active" : "")}
                    onClick={() => setMenuOpen(false)}
                  >
                    <Icon size={16} strokeWidth={1.8} />
                    {label}
                  </NavLink>
                ))}
                <div className="nav-sheet-extra">
                  {DRAWER_EXTRA.map(([to, label]) => (
                    <NavLink key={to} to={to} onClick={() => setMenuOpen(false)}>
                      {label}
                    </NavLink>
                  ))}
                  <button type="button" onClick={() => { setMenuOpen(false); onSearch(); }}>
                    搜索
                  </button>
                  <button type="button" onClick={() => { setMenuOpen(false); onTheme(); }}>
                    {themeMode === "dark" ? "外观 · 浅色" : "外观 · 深色"}
                  </button>
                  <button type="button" onClick={() => { setMenuOpen(false); onBg(); }}>
                    {bgOn ? "背景效果 · 开" : "背景效果 · 关"}
                  </button>
                  <div className="nav-sheet-seasons">
                    {SEASON_LIST.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={season === item.id ? "is-on" : ""}
                        onClick={() => setSeason(item.id)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.nav>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </header>
    </>
  );
}
