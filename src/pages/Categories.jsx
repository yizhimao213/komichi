import { Link } from "react-router-dom";
import { categoryList } from "../content.js";

export default function Categories() {
  return (
    <main className="wrap">
      <header className="page-head">
        <p className="kicker">书写</p>
        <h1>分类</h1>
        <p>文稿按分类收纳，点进去按年份展开。</p>
      </header>
      <section className="timeline">
        {categoryList.map((item) => (
          <Link className="t-item" to={`/categories/${item.slug}`} viewTransition key={item.slug}>
            <time>{item.posts.length} 篇</time>
            <div>
              <h3>{item.name}</h3>
              <p>始于 {String(item.posts[item.posts.length - 1].date).slice(0, 4)}</p>
            </div>
          </Link>
        ))}
      </section>
    </main>
  );
}
