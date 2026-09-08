import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { categoryList, posts } from "../content.js";

const WEEK = ["日", "一", "二", "三", "四", "五", "六"];

function formatWhen(iso) {
  const start = new Date(`${String(iso).replaceAll(".", "-")}T00:00:00`);
  if (Number.isNaN(start.getTime())) return "";
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.max(0, Math.floor((today - start) / 86400000));
  if (diff === 0) return "今天";
  if (diff <= 30) return `${diff}天前`;
  return `${start.getFullYear()}年${start.getMonth() + 1}月${start.getDate()}日星期${WEEK[start.getDay()]}`;
}

export default function PostsMega({ onJump }) {
  const [active, setActive] = useState(categoryList[0]?.slug || "");
  const cat = useMemo(
    () => categoryList.find((item) => item.slug === active) || categoryList[0] || null,
    [active]
  );
  const recent = (cat?.posts || []).slice(0, 3);

  return (
    <div className="mega-body posts-mega">
      <div className="mega-cols">
        <section>
          <p className="mega-kicker">分类</p>
          <ul className="mega-cats">
            {categoryList.map((item) => (
              <li key={item.slug}>
                <Link
                  to={`/categories/${item.slug}`}
                  className={item.slug === cat?.slug ? "is-on" : ""}
                  viewTransition
                  onMouseEnter={() => setActive(item.slug)}
                  onFocus={() => setActive(item.slug)}
                  onClick={onJump}
                >
                  <span>{item.name}</span>
                  <em>{item.posts.length}</em>
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <p className="mega-kicker">{cat ? `${cat.name} · 最近` : "最近"}</p>
          <div className="mega-notes">
            {recent.map((post) => (
              <Link
                className="mega-note"
                to={`/posts/${post.slug}`}
                viewTransition
                key={post.slug}
                onClick={onJump}
              >
                <h3>{post.title}</h3>
                <p>{formatWhen(post.date)}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
      <div className="mega-foot">
        <Link to="/posts" viewTransition onClick={onJump}>查看全部文稿</Link>
        <span>{posts.length} 篇文稿</span>
      </div>
    </div>
  );
}
