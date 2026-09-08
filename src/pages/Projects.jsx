import { projects } from "../content.js";

export default function Projects() {
  return (
    <main className="wrap">
      <header className="page-head">
        <p className="kicker">公开造过的东西</p>
        <h1>项目</h1>
        <p>界面、工作流，以及小小的自治系统。</p>
      </header>
      <section className="card-grid">
        {projects.map((p) => (
          <a className="project" href={p.url} target="_blank" rel="noreferrer" key={p.name}>
            <div className={`project-mark ${p.avatar ? "is-avatar" : ""}`}>
              {p.avatar ? <img src={p.avatar} alt="" loading="lazy" decoding="async" /> : p.mark}
            </div>
            <div>
              <h3>{p.name}</h3>
              <p>{p.desc}</p>
            </div>
          </a>
        ))}
      </section>
    </main>
  );
}
