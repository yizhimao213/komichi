import { Link, useSearchParams } from "react-router-dom";
import { Feather, FileText, Heart } from "lucide-react";
import { notes, posts } from "../content.js";

function daysAgo(iso) {
  const start = new Date(`${String(iso).replaceAll(".", "-")}T00:00:00`);
  if (Number.isNaN(start.getTime())) return "";
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.max(0, Math.floor((today - start) / 86400000));
  if (diff === 0) return "今天";
  return `${diff}天前`;
}

const TABS = [
  { id: "note", label: "手记", to: "/timeline?type=note", Icon: Feather },
  { id: "post", label: "文稿", to: "/timeline?type=post", Icon: FileText },
  { id: "memory", label: "回忆", to: "/timeline?memory=1", Icon: Heart },
];

const recent = [
  ...posts.map((p) => ({
    title: p.title,
    href: `/posts/${p.slug}`,
    kind: "文稿",
    date: p.date,
  })),
  ...notes.map((n) => ({
    title: n.title,
    href: `/notes/${n.nid || n.slug}`,
    kind: "手记",
    date: n.date,
  })),
]
  .sort((a, b) => String(b.date).localeCompare(String(a.date)))
  .slice(0, 4);

export default function TimelineMega({ onJump }) {
  const [params] = useSearchParams();
  const type = params.get("type");
  const memory = params.get("memory") === "1";
  const active = memory ? "memory" : type === "post" ? "post" : type === "note" ? "note" : "";

  return (
    <div className="mega-body tl-mega">
      <div className="tl-mega-tabs">
        {TABS.map((tab) => (
          <Link
            key={tab.id}
            to={tab.to}
            viewTransition
            className={active === tab.id ? "is-on" : ""}
            onClick={onJump}
          >
            <tab.Icon size={13} strokeWidth={1.8} />
            {tab.label}
          </Link>
        ))}
      </div>
      <p className="mega-kicker">近期动态</p>
      <div className="tl-mega-feed">
        {recent.map((item) => (
          <Link className="tl-mega-row" to={item.href} viewTransition key={item.href} onClick={onJump}>
            <div className="tl-mega-main">
              <h3>{item.title}</h3>
              <p>{daysAgo(item.date)}</p>
            </div>
            <em>{item.kind}</em>
          </Link>
        ))}
      </div>
    </div>
  );
}
