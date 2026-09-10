import { useEffect, useLayoutEffect, useState } from "react";
import { flushSync } from "react-dom";
import { Link, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { aboutPage, aboutSitePage, catalog, getCategory, getNote, getPost, getSeries, getTag } from "./content.js";
import Home from "./pages/Home.jsx";
import Posts from "./pages/Posts.jsx";
import Notes from "./pages/Notes.jsx";
import Series from "./pages/Series.jsx";
import SeriesDetail from "./pages/SeriesDetail.jsx";
import Categories from "./pages/Categories.jsx";
import Category from "./pages/Category.jsx";
import Tag from "./pages/Tag.jsx";
import Article from "./pages/Article.jsx";
import Friends from "./pages/Friends.jsx";
import Projects from "./pages/Projects.jsx";
import Says from "./pages/Says.jsx";
import About from "./pages/About.jsx";
import AboutSite from "./pages/AboutSite.jsx";
import Message from "./pages/Message.jsx";
import Timeline from "./pages/Timeline.jsx";
import Thinking from "./pages/Thinking.jsx";
import Background from "./components/Background.jsx";
import DeckleFilter from "./components/DeckleFilter.jsx";
import Header from "./components/Header.jsx";
import PageLoader from "./components/PageLoader.jsx";
import { HeaderMetaProvider, SeasonProvider, SEASON_LIST } from "./context.jsx";
import { ImageLightboxProvider } from "./haklex/ImageLightbox.jsx";

const THEME_KEY = "yohaku-theme";
const BG_KEY = "yohaku-bg";
const SEASON_KEY = "yohaku-season";
const HOLD_MS = 980;
const easeOut = [0.22, 1, 0.36, 1];

function withLookTransition(update) {
  const run = () => flushSync(update);
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (
    reduced ||
    typeof document === "undefined" ||
    typeof document.startViewTransition !== "function" ||
    document.documentElement.classList.contains("is-look-changing")
  ) {
    run();
    return;
  }
  document.documentElement.classList.add("is-look-changing");
  const done = () => document.documentElement.classList.remove("is-look-changing");
  let vt;
  try {
    vt = document.startViewTransition({ update: run, types: ["look"] });
  } catch {
    vt = document.startViewTransition(run);
  }
  vt.finished.then(done, done);
}

function isContentPage(path) {
  if (/^\/posts\/[^/]+/.test(path)) return true;
  if (/^\/notes\/series/.test(path)) return false;
  return /^\/notes\/[^/]+/.test(path);
}

const STATIC_TITLES = {
  "/posts": "文稿",
  "/notes": "手记",
  "/timeline": "时光",
  "/thinking": "思考",
  "/says": "一言",
  "/friends": "友人帐",
  "/projects": "项目",
  "/message": "留言",
  "/categories": "分类",
  "/notes/series": "专栏",
};

function pageTitle(pathname) {
  if (pathname === "/") return "komichi";
  if (STATIC_TITLES[pathname]) return `${STATIC_TITLES[pathname]} · komichi`;
  if (pathname === "/about") return `${aboutPage.title || "关于我"} · komichi`;
  if (pathname === "/about-site") return `${aboutSitePage.title || "关于本站"} · komichi`;
  const tagM = pathname.match(/^\/posts\/tag\/([^/]+)$/);
  if (tagM) {
    const tag = getTag(tagM[1]);
    return `${tag ? `#${tag.name}` : "标签"} · komichi`;
  }
  const catM = pathname.match(/^\/categories\/([^/]+)$/);
  if (catM) {
    const cat = getCategory(catM[1]);
    return `${cat?.name || "分类"} · komichi`;
  }
  const seriesM = pathname.match(/^\/notes\/series\/([^/]+)$/);
  if (seriesM) {
    const series = getSeries(seriesM[1]);
    return `${series?.name || "专栏"} · komichi`;
  }
  const postM = pathname.match(/^\/posts\/([^/]+)$/);
  if (postM) {
    const post = getPost(postM[1]);
    return `${post?.title || "文稿"} · komichi`;
  }
  const noteM = pathname.match(/^\/notes\/([^/]+)$/);
  if (noteM) {
    const note = getNote(noteM[1]);
    return `${note?.title || "手记"} · komichi`;
  }
  return "komichi";
}

function AppRoutes({ location }) {
  return (
    <Routes location={location}>
      <Route path="/" element={<Home />} />
      <Route path="/posts" element={<Posts />} />
      <Route path="/posts/tag/:slug" element={<Tag />} />
      <Route path="/posts/:slug" element={<Article kind="post" />} />
      <Route path="/categories" element={<Categories />} />
      <Route path="/categories/:slug" element={<Category />} />
      <Route path="/notes" element={<Notes />} />
      <Route path="/notes/series" element={<Series />} />
      <Route path="/notes/series/:slug" element={<SeriesDetail />} />
      <Route path="/notes/:nid" element={<Article kind="note" />} />
      <Route path="/friends" element={<Friends />} />
      <Route path="/projects" element={<Projects />} />
      <Route path="/says" element={<Says />} />
      <Route path="/about" element={<About />} />
      <Route path="/about-site" element={<AboutSite />} />
      <Route path="/message" element={<Message />} />
      <Route path="/timeline" element={<Timeline />} />
      <Route path="/thinking" element={<Thinking />} />
    </Routes>
  );
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [themeMode, setThemeMode] = useState(() => {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === "dark" || saved === "light" ? saved : "light";
  });
  const [bgOn, setBgOn] = useState(() => localStorage.getItem(BG_KEY) !== "off");
  const [season, setSeason] = useState(() => {
    const saved = localStorage.getItem(SEASON_KEY);
    return SEASON_LIST.some((item) => item.id === saved) ? saved : "autumn";
  });
  const [holding, setHolding] = useState(() => isContentPage(location.pathname));
  const year = new Date().getFullYear();

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = themeMode;
    document.documentElement.lang = "zh-CN";
    localStorage.setItem(THEME_KEY, themeMode);
  }, [themeMode]);

  useEffect(() => {
    localStorage.setItem(BG_KEY, bgOn ? "on" : "off");
  }, [bgOn]);

  useLayoutEffect(() => {
    document.documentElement.dataset.season = season;
    localStorage.setItem(SEASON_KEY, season);
  }, [season]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.title = pageTitle(location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
    window.scrollTo(0, 0);
    if (!isContentPage(location.pathname)) {
      setHolding(false);
      return;
    }
    setHolding(true);
    const t = window.setTimeout(() => setHolding(false), HOLD_MS);
    return () => window.clearTimeout(t);
  }, [location.pathname]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setSearchOpen(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    const onOpenSearch = () => setSearchOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-search", onOpenSearch);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("open-search", onOpenSearch);
    };
  }, []);

  const hits = catalog
    .filter((item) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return item.title.toLowerCase().includes(q) || item.kind.toLowerCase().includes(q);
    })
    .slice(0, 8);

  const changeSeason = (id) => {
    if (id === season) return;
    withLookTransition(() => setSeason(id));
  };
  const changeTheme = (mode) => {
    if (mode === themeMode) return;
    withLookTransition(() => setThemeMode(mode));
  };
  const toggleTheme = () => {
    withLookTransition(() => setThemeMode((v) => (v === "dark" ? "light" : "dark")));
  };

  return (
    <HeaderMetaProvider>
      <SeasonProvider value={{ season, setSeason: changeSeason }}>
      <ImageLightboxProvider>
      <Background enabled={bgOn} />
      <DeckleFilter />
      <div className="app">
        <Header
          scrolled={scrolled}
          menuOpen={menuOpen}
          setMenuOpen={setMenuOpen}
          onSearch={() => setSearchOpen(true)}
          onTheme={toggleTheme}
          onBg={() => setBgOn((v) => !v)}
          themeMode={themeMode}
          bgOn={bgOn}
          season={season}
          setSeason={changeSeason}
        />

        <div className="page-stage">
          <AnimatePresence mode="wait">
            {holding ? (
              <motion.div
                key={`hold-${location.pathname}`}
                className="page-enter"
                initial={false}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.28, ease: easeOut }}
              >
                <PageLoader />
              </motion.div>
            ) : location.pathname === "/message" || isContentPage(location.pathname) ? (
              <div key={location.pathname} className="page-enter">
                <AppRoutes location={location} />
              </div>
            ) : (
              <motion.div
                key={location.pathname}
                className="page-enter"
                initial={location.pathname === "/" ? false : { opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.62, ease: easeOut }}
              >
                <AppRoutes location={location} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <footer className="site-footer">
          <div className="wrap-wide">
            <div className="footer-grid">
              <div className="brand-block">
                <div className="word">komichi</div>
                <p>Stay hungry. Stay foolish.</p>
                <p style={{ marginTop: 16, fontSize: 12, color: "var(--n-6)" }}>
                  © 2020-{year} Powered by 四十小路 & 四季折 / komichi.
                </p>
              </div>
              <div className="footer-col">
                <h4>关于</h4>
                <Link to="/about-site" viewTransition>关于本站</Link>
                <Link to="/about" viewTransition>关于我</Link>
              </div>
              <div className="footer-col">
                <h4>更多</h4>
                <Link to="/says" viewTransition>一言</Link>
                <Link to="/message" viewTransition>写留言</Link>
              </div>
              <div className="footer-col">
                <h4>联系</h4>
                <a href="https://space.bilibili.com/1512246445" target="_blank" rel="noreferrer">B站 ↗</a>
              </div>
            </div>
            <div className="footer-bottom">
              <span>正被人披览</span>
              <div className="footer-controls">
                <button
                  type="button"
                  className={themeMode === "light" ? "is-on" : ""}
                  onClick={() => changeTheme("light")}
                >
                  浅色
                </button>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  className={themeMode === "dark" ? "is-on" : ""}
                  onClick={() => changeTheme("dark")}
                >
                  深色
                </button>
                <span className="footer-sep" aria-hidden="true">|</span>
                <button
                  type="button"
                  className={bgOn ? "is-on" : ""}
                  onClick={() => setBgOn((v) => !v)}
                >
                  背景效果
                </button>
                <span className="footer-sep" aria-hidden="true">|</span>
                {SEASON_LIST.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={season === item.id ? "is-on" : ""}
                    onClick={() => changeSeason(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </footer>
      </div>

      {searchOpen && (
        <div className="overlay" onClick={() => setSearchOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>搜索</h3>
            <div className="search-panel">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索文稿、手记、页面"
              />
              <div style={{ marginTop: 12 }}>
                {hits.map((item) => (
                  <a
                    className="writing"
                    key={item.href}
                    href={item.href}
                    onClick={(e) => {
                      e.preventDefault();
                      setSearchOpen(false);
                      navigate(item.href);
                    }}
                  >
                    <span className="writing-no">{item.kind}</span>
                    <h3>{item.title}</h3>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      </ImageLightboxProvider>
      </SeasonProvider>
    </HeaderMetaProvider>
  );
}
