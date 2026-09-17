import { useCallback, useEffect, useState } from "react";
import HaklexContent from "../haklex/HaklexContent.jsx";
import HaklexEditor from "../haklex/HaklexEditor.jsx";

function isBlankState(state) {
  const kids = state?.root?.children ?? [];
  if (!kids.length) return true;
  return kids.every((node) => {
    if (node.type && node.type !== "paragraph") return false;
    const text = (node.children ?? []).map((child) => child.text ?? "").join("");
    return !text.trim();
  });
}

function parseState(raw) {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function formatTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("zh-CN", { dateStyle: "medium", timeStyle: "short" });
}

function TraceBody({ content }) {
  const value = parseState(content);
  if (value) return <HaklexContent value={value} variant="comment" />;
  return <p className="trace-text">{content}</p>;
}

export default function Message() {
  const [hint, setHint] = useState("你说的每一句，我都会听。");
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [editorKey, setEditorKey] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/messages?limit=50");
      const data = await res.json();
      if (res.ok && data?.ok) setMessages(data.messages ?? []);
    } catch {
      /* 后端没起时保持空列表 */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const leaveTrace = async () => {
    if (busy) return;
    if (!draft || isBlankState(draft)) {
      setHint("先写一句再留下痕迹。");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: JSON.stringify(draft) }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || "failed");
      setHint("已留下痕迹。");
      setDraft(null);
      setEditorKey((key) => key + 1);
      await load();
    } catch {
      setHint("没能留下痕迹，稍后再试。");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="wrap">
      <header className="page-head">
        <p className="kicker">要不要在这里安静地留下一点什么</p>
        <h1>留言</h1>
        <p>远方的朋友，你好。这里可以随便说。</p>
      </header>
      <div className="comment-box haklex-comment" style={{ marginBottom: 32 }}>
        <HaklexEditor
          key={editorKey}
          placeholder="留下痕迹。"
          variant="comment"
          onChange={setDraft}
          onSubmit={leaveTrace}
        />
        <div className="row">
          <span>{hint}</span>
          <button
            className="btn btn-accent"
            type="button"
            onClick={leaveTrace}
            disabled={busy}
          >
            {busy ? "正在留下…" : "留下痕迹"}
          </button>
        </div>
      </div>

      <section className="trace-list">
        <h2 className="trace-heading">已留下的痕迹</h2>
        {messages.length === 0 ? (
          <p className="trace-empty">
            {loaded ? "还没有人留下痕迹，你可以是第一个。" : "正在看看大家说过什么…"}
          </p>
        ) : (
          messages.map((item) => (
            <article className="trace-item" key={item.id}>
              <div className="trace-meta">
                <span className="trace-name">{item.nickname}</span>
                <time className="trace-time">{formatTime(item.created_at)}</time>
              </div>
              <TraceBody content={item.content} />
            </article>
          ))
        )}
      </section>
    </main>
  );
}
