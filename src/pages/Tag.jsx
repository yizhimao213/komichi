import { Link, useParams } from "react-router-dom";
import { getTag } from "../content.js";
import { groupByYear, monthDay, postTags } from "./Category.jsx";

export default function Tag() {
  const { slug } = useParams();
  const tag = getTag(slug);

  if (!tag) {
    return (
      <main className="wrap">
        <p className="empty">这个标签还没有文稿。</p>
      </main>
    );
  }

  const years = groupByYear(tag.posts);

  return (
    <main className="wrap-wide cat-page">
      <header className="page-head">
        <p className="kicker">标签</p>
        <p className="cat-meta">{tag.posts.length} 篇</p>
        <h1>#{tag.name}</h1>
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
                const all = postTags(post).filter((name) => name !== tag.name);
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
                    ) : post.category ? (
                      <span className="cat-item-tags">{post.category}</span>
                    ) : null}
                    <time>{monthDay(post.date)}</time>
                  </Link>
                );
              })}
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
