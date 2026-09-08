import { Link, useParams } from "react-router-dom";
import { getCategory, tagSlug } from "../content.js";

export function monthDay(iso) {
  const d = new Date(`${String(iso).replaceAll(".", "-")}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

function postYear(iso) {
  return String(iso || "").slice(0, 4);
}

export function postTags(post) {
  return (Array.isArray(post.tags) ? post.tags : post.tags ? [post.tags] : [])
    .map((t) => String(t).trim())
    .filter(Boolean);
}

export function groupByYear(list) {
  const map = new Map();
  for (const post of list) {
    const year = postYear(post.date) || "—";
    if (!map.has(year)) map.set(year, []);
    map.get(year).push(post);
  }
  return [...map.entries()].sort((a, b) => String(b[0]).localeCompare(String(a[0])));
}

function tagCloud(list) {
  const map = new Map();
  for (const post of list) {
    for (const name of postTags(post)) {
      const slug = tagSlug(name);
      if (!slug) continue;
      const existing = map.get(slug);
      if (!existing) map.set(slug, { slug, name, count: 1 });
      else existing.count += 1;
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count || String(a.name).localeCompare(String(b.name), "zh-CN"));
}

export default function Category() {
  const { slug } = useParams();
  const cat = getCategory(slug);

  if (!cat) {
    return (
      <main className="wrap">
        <p className="empty">这个分类还没有文稿。</p>
      </main>
    );
  }

  const years = groupByYear(cat.posts);
  const tags = tagCloud(cat.posts);
  const from = postYear(cat.posts[cat.posts.length - 1].date);

  return (
    <main className="wrap-wide cat-page">
      <header className="page-head">
        <p className="kicker">
          <Link to="/categories" viewTransition>分类</Link>
        </p>
        <p className="cat-meta">
          {cat.posts.length} 篇 · 始于 {from}
        </p>
        <h1>{cat.name}</h1>
      </header>

      <div className="cat-layout">
        <section>
          {years.map(([year, list]) => (
            <div className="cat-year" key={year}>
              <h2>
                {year}
                <span>{list.length} 篇</span>
              </h2>
              {list.map((post) => {
                const all = postTags(post);
                const shown = all.slice(0, 2);
                const extra = all.length - shown.length;
                return (
                  <Link className="cat-item" to={`/posts/${post.slug}`} viewTransition key={post.slug}>
                    <h3>{post.title}</h3>
                    {shown.length ? (
                      <span className="cat-item-tags">
                        {shown.map((name, i) => (
                          <span key={name}>
                            {i > 0 ? ", " : ""}
                            #{name}
                          </span>
                        ))}
                        {extra > 0 ? ` +${extra}` : ""}
                      </span>
                    ) : null}
                    <time>{monthDay(post.date)}</time>
                  </Link>
                );
              })}
            </div>
          ))}
        </section>

        {tags.length ? (
          <aside className="cat-aside">
            <h2>本分类标签</h2>
            <div className="cat-cloud">
              {tags.map((tag) => (
                <Link to={`/posts/tag/${tag.slug}`} viewTransition key={tag.slug}>
                  #{tag.name}
                  <em>{tag.count}</em>
                </Link>
              ))}
            </div>
          </aside>
        ) : null}
      </div>
    </main>
  );
}
