import { useCallback, useEffect, useMemo, useState } from "react";
import { LoaderCircle, MessageSquare, RefreshCw, Search, Trash2, X } from "lucide-react";
import HaklexContent from "../haklex/HaklexContent.jsx";
import { deleteComment, deleteMessage, listAdminComments, listAdminMessages } from "../contentApi.js";

const TABS = [
  { key: "comment", label: "文稿评论" },
  { key: "message", label: "全站留言" },
];

function parseState(raw) {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function plainOf(content) {
  const value = parseState(content);
  if (!value) return String(content || "").slice(0, 80);
  const walk = (nodes) =>
    (nodes || [])
      .map((node) => {
        if (typeof node.text === "string") return node.text;
        return walk(node.children);
      })
      .join("");
  return walk(value.root?.children).replace(/\s+/g, " ").trim().slice(0, 80);
}

function formatTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("zh-CN", { dateStyle: "medium", timeStyle: "short" });
}

function hrefOf(item) {
  if (item.kind === "note") return `/notes/${item.slug}`;
  if (item.kind === "post") return `/posts/${item.slug}`;
  return "/message";
}

function Body({ content }) {
  const value = parseState(content);
  if (value) return <HaklexContent value={value} variant="comment" />;
  return <p className="trace-text">{content}</p>;
}

export default function CommentManager() {
  const [tab, setTab] = useState("comment");
  const [comments, setComments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState("");
  const [hint, setHint] = useState("");

  const load = useCallback(async () => {
    setBusy("list");
    setHint("");
    try {
      const [nextComments, nextMessages] = await Promise.all([listAdminComments(), listAdminMessages()]);
      setComments(nextComments);
      setMessages(nextMessages);
    } catch (err) {
      setHint(err.message || "读不到评论");
    } finally {
      setBusy("");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rows = tab === "comment" ? comments : messages.map((item) => ({ ...item, kind: "message", slug: "" }));
  const q = query.trim().toLowerCase();
  const shown = useMemo(() => {
    if (!q) return rows;
    return rows.filter((item) =>
      `${item.nickname} ${plainOf(item.content)} ${item.kind} ${item.slug}`.toLowerCase().includes(q)
    );
  }, [comments, messages, q, tab]);

  const remove = async (item) => {
    if (busy) return;
    setBusy(String(item.id));
    setHint("");
    try {
      if (tab === "comment") {
        await deleteComment(item.id);
        setComments((prev) => prev.filter((row) => row.id !== item.id));
      } else {
        await deleteMessage(item.id);
        setMessages((prev) => prev.filter((row) => row.id !== item.id));
      }
      setHint("已删除");
    } catch (err) {
      setHint(err.message || "删除失败");
    } finally {
      setBusy("");
    }
  };

  return (
    <>
      <header className="adm-top">
        <div>
          <h1>评论</h1>
          <p>文稿与手记的评论、全站留言都在这里。删除后前台立刻消失。</p>
        </div>
        <div className="adm-top-actions">
          <button className="adm-btn" type="button" onClick={load} disabled={busy === "list"}>
            {busy === "list" ? <LoaderCircle size={15} className="adm-spin" /> : <RefreshCw size={15} strokeWidth={1.9} />}
            刷新
          </button>
        </div>
      </header>

      <div className="adm-toolbar">
        <div className="adm-pills">
          {TABS.map((item) => (
            <button
              key={item.key}
              className={`adm-pill ${tab === item.key ? "is-accent" : ""}`}
              type="button"
              onClick={() => setTab(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <label className="adm-search">
          <Search size={15} strokeWidth={1.9} />
          <input value={query} placeholder="搜索昵称或内容…" onChange={(e) => setQuery(e.target.value)} />
          {query ? (
            <button className="adm-icon is-mini" type="button" title="清空" onClick={() => setQuery("")}>
              <X size={14} strokeWidth={1.9} />
            </button>
          ) : null}
        </label>
      </div>

      {hint ? <p className="adm-muted">{hint}</p> : null}

      {shown.length ? (
        <ul className="adm-rows">
          {shown.map((item) => (
            <li className="adm-row" key={`${tab}-${item.id}`}>
              <div className="adm-row-main">
                <span className="adm-row-chip">
                  <MessageSquare size={15} strokeWidth={1.8} />
                </span>
                <span className="adm-row-text">
                  <strong className="adm-row-title">
                    {item.nickname}
                    {item.is_owner ? <span className="adm-owner-badge">站长</span> : null}
                    {item.parent_id ? <span className="adm-muted">回复 #{item.parent_id}</span> : null}
                    {item.slug ? ` · ${item.kind}/${item.slug}` : " · 全站留言"}
                  </strong>
                  <span className="adm-muted">
                    {formatTime(item.created_at)} · {plainOf(item.content) || "（空）"}
                  </span>
                </span>
              </div>
              <div className="adm-row-actions">
                <a className="adm-icon" href={hrefOf(item)} target="_blank" rel="noreferrer" title="查看">
                  ↗
                </a>
                <button
                  className="adm-icon is-danger"
                  type="button"
                  title="删除"
                  disabled={busy === String(item.id)}
                  onClick={() => remove(item)}
                >
                  <Trash2 size={15} strokeWidth={1.8} />
                </button>
              </div>
              <div className="adm-comment-preview">
                <Body content={item.content} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="adm-empty">{busy === "list" ? "正在读取…" : "这里还是空的。"}</p>
      )}
    </>
  );
}
