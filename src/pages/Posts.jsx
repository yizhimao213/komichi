import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { categorySlug, posts, tagList, tagSlug } from "../content.js";
import { postTags } from "./Category.jsx";

const PAGE_SIZE = 8;
const PRELOAD = 4;
const easeOut = [0.22, 1, 0.36, 1];

function excerpt(post, max = 88) {
  const raw = String(post.summary || post.body || "")
    .replace(/^#+\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
  if (raw.length <= max) return raw;
  return `${raw.slice(0, max).trim()}…`;
}

function openSearch() {
  window.dispatchEvent(new Event("open-search"));
}

export default function Posts() {
  const [sort, setSort] = useState("latest");
  const [showTags, setShowTags] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [revealed, setRevealed] = useState(false);
  const sentRef = useRef(null);

  const pinned = posts.find((p) => p.pinned) || null;
  const list = useMemo(() => {
    const rest = pinned ? posts.filter((p) => p !== pinned) : posts.slice();
    if (sort === "oldest") rest.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    else rest.sort((a, b) => String(b.date).localeCompare(String(a.date)));
    return rest;
  }, [pinned, sort]);

  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const page = Math.min(totalPages, Math.max(1, Number(searchParams.get("page")) || 1));
  const start = (page - 1) * PAGE_SIZE;
  const pageItems = list.slice(start, start + PAGE_SIZE);
  const head = pageItems.slice(0, PRELOAD);
  const tail = pageItems.slice(PRELOAD);

  useEffect(() => {
    setRevealed(false);
  }, [page, sort]);

  useEffect(() => {
    const el = sentRef.current;
    if (!el || revealed || tail.length === 0) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setRevealed(true);
      },
      { threshold: 0.35, rootMargin: "0px 0px -18% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [revealed, tail.length, page, sort]);

  function goPage(next) {
    const n = Math.min(totalPages, Math.max(1, next));
    setSearchParams(n <= 1 ? {} : { page: String(n) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function changeSort(next) {
    setSort(next);
    setSearchParams({});
  }

  const tagCloud = (
    <div className="cat-cloud">
      {tagList.map((tag) => (
        <Link to={`/posts/tag/${tag.slug}`} viewTransition key={tag.slug}>
          #{tag.name}
          <em>{tag.posts.length}</em>
        </Link>
      ))}
    </div>
  );

  const sortRow = (
    <div className="posts-sort">
      <button type="button" className={sort === "latest" ? "is-on" : ""} onClick={() => changeSort("latest")}>
        最新
      </button>
      <button type="button" className={sort === "oldest" ? "is-on" : ""} onClick={() => changeSort("oldest")}>
        最早
      </button>
    </div>
  );

  return (
    <main className="posts-page">
      <div className="posts-layout">
        <div className="posts-main">
          <header className="page-head posts-head">
            <p className="kicker">书写</p>
            <h1>文稿</h1>
          </header>

          {pinned ? <PostCard post={pinned} pinned /> : null}

          <div className="posts-tools-mobile">
            <button type="button" onClick={openSearch}>
              <i className="posts-ico-search" aria-hidden="true" />
              搜索
            </button>
            <button type="button" onClick={() => setShowTags((v) => !v)}>
              <i className="posts-ico-hash" aria-hidden="true" />
              全部标签
            </button>
          </div>

          {showTags ? <div className="posts-tag-panel">{tagCloud}</div> : null}

          <div className="posts-list">
            {head.map((post) => (
              <PostCard post={post} key={post.slug} />
            ))}
            {tail.length ? <div className="posts-sent" ref={sentRef} aria-hidden /> : null}
            <AnimatePresence>
              {revealed
                ? tail.map((post, i) => (
                    <motion.div
                      key={post.slug}
                      initial={{ opacity: 0, y: 22 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.55, delay: i * 0.07, ease: easeOut }}
                    >
                      <PostCard post={post} />
                    </motion.div>
                  ))
                : null}
            </AnimatePresence>
          </div>

          <div className="posts-pager">
            <button type="button" disabled={page <= 1} onClick={() => goPage(page - 1)}>
              上一页
            </button>
            <span className="posts-pager-dot">·</span>
            <button type="button" disabled={page >= totalPages} onClick={() => goPage(page + 1)}>
              下一页
            </button>
            <span className="posts-page-n">第 {page} / {totalPages} 页</span>
          </div>

          <div className="posts-foot-mobile">
            <p>{posts.length} 篇</p>
            {sortRow}
          </div>
        </div>

        <aside className="posts-aside">
          <button type="button" className="posts-aside-btn" onClick={openSearch}>
            <i className="posts-ico-search" aria-hidden="true" />
            搜索
          </button>
          <button type="button" className={showTags ? "posts-aside-btn is-on" : "posts-aside-btn"} onClick={() => setShowTags((v) => !v)}>
            <i className="posts-ico-hash" aria-hidden="true" />
            全部标签
          </button>
          {showTags ? tagCloud : null}
          <div className="posts-aside-foot">
            <p>{posts.length} 篇</p>
            {sortRow}
          </div>
        </aside>
      </div>
    </main>
  );
}

function PostCard({ post, pinned = false }) {
  const navigate = useNavigate();
  const tags = postTags(post);
  const shown = tags.slice(0, 3);
  const extra = tags.length - shown.length;
  const href = `/posts/${post.slug}`;
  const catHref = post.category ? `/categories/${categorySlug(post.category)}` : "";
  const text = excerpt(post, pinned ? 120 : 84);

  function go(to, e) {
    e.preventDefault();
    e.stopPropagation();
    navigate(to, { viewTransition: true });
  }

  return (
    <article
      className={`post-card${pinned ? " is-pinned" : ""}`}
      onClick={() => navigate(href, { viewTransition: true })}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") navigate(href, { viewTransition: true });
      }}
    >
      {pinned ? <p className="post-pin">置顶</p> : null}
      {pinned ? <h2>{post.title}</h2> : <h3>{post.title}</h3>}
      {text ? <p>{text}</p> : null}
      <div className="post-card-meta">
        <span className="post-card-dot">·</span>
        {post.category ? (
          <button type="button" onClick={(e) => go(catHref, e)}>
            {post.category}
          </button>
        ) : null}
        {shown.length ? (
          <>
            {post.category ? <span className="post-card-sep">/</span> : null}
            {shown.map((name, i) => (
              <span key={name}>
                {i > 0 ? <span className="post-card-sep">,</span> : null}
                <button type="button" onClick={(e) => go(`/posts/tag/${tagSlug(name)}`, e)}>
                  {name}
                </button>
              </span>
            ))}
            {extra > 0 ? <span className="post-card-more">+{extra}</span> : null}
          </>
        ) : null}
      </div>
    </article>
  );
}
