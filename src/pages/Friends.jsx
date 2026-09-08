import { friends } from "../content.js";

export default function Friends() {
  return (
    <main className="wrap">
      <header className="page-head">
        <p className="kicker">同一片林子里的邻居</p>
        <h1>友人帐</h1>
        <p>我常去的站点。哪句对上了，就点进去看看。</p>
      </header>
      <section className="card-grid">
        {friends.map((f) => (
          <a className="friend" href={f.url} target="_blank" rel="noreferrer" key={f.url}>
            <div className={`project-mark ${f.avatar ? "is-avatar" : ""}`}>
              {f.avatar ? <img src={f.avatar} alt="" loading="lazy" decoding="async" /> : f.name.slice(0, 1)}
            </div>
            <div>
              <h3>{f.name}</h3>
              <p>{f.desc}</p>
            </div>
          </a>
        ))}
      </section>
    </main>
  );
}
