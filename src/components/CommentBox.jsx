import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { $insertNodes } from "lexical";
import { $createImageNode } from "@haklex/rich-editor/nodes";
import HaklexContent from "../haklex/HaklexContent.jsx";
import HaklexEditor from "../haklex/HaklexEditor.jsx";
import {
  createComment,
  getToken,
  listComments,
  uploadCommentImage,
} from "../contentApi.js";

const OWNER_AVATAR = "/assets/avatar.jpg";
const MAX_LEN = 2000;

async function commentUpload(file) {
  const url = await uploadCommentImage(file);
  if (!url) throw new Error("upload_failed");
  return { src: url };
}

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

function draftLength(state) {
  if (!state?.root?.children) return 0;
  let total = 0;
  const walk = (nodes) => {
    for (const node of nodes || []) {
      if (typeof node.text === "string") total += node.text.length;
      if (node.children) walk(node.children);
    }
  };
  walk(state.root.children);
  return total;
}

function formatTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diff = Date.now() - date.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "刚刚";
  if (min < 60) return `${min} 分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小时前`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} 天前`;
  return date.toLocaleDateString("zh-CN", { dateStyle: "medium" });
}

function nameHue(name) {
  const label = String(name || "路人");
  let hash = 0;
  for (const ch of label) hash = (hash * 33 + ch.charCodeAt(0)) >>> 0;
  return 20 + (hash % 300);
}

function nameLetter(name) {
  const label = String(name || "路人").trim() || "路人";
  return Array.from(label)[0];
}

function hostOf(url) {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
}

function buildTree(list) {
  const roots = [];
  const map = new Map();
  for (const item of list) map.set(item.id, { ...item, children: [] });
  for (const item of list) {
    const node = map.get(item.id);
    const parent = item.parent_id != null ? map.get(item.parent_id) : null;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

function CommentAvatar({ name, owner, src }) {
  if (owner && src) {
    return (
      <div className="comment-avatar is-owner">
        <img src={src} alt="" loading="lazy" decoding="async" />
      </div>
    );
  }
  return (
    <div
      className={`comment-avatar${owner ? " is-owner" : ""}`}
      style={{ "--comment-hue": String(nameHue(name)) }}
      aria-hidden="true"
    >
      {nameLetter(name)}
    </div>
  );
}

function CommentBody({ content }) {
  const value = parseState(content);
  if (value) return <HaklexContent value={value} variant="comment" />;
  return <p className="comment-plain">{content}</p>;
}

function CommentNode({ item, onReply, activeId }) {
  const owner = Boolean(item.is_owner);
  const site = hostOf(item.url);
  return (
    <li
      className={`comment-item${activeId === item.id ? " is-target" : ""}`}
      id={`comment-${item.id}`}
      data-comment-id={item.id}
      data-parent-id={item.parent_id ?? ""}
    >
      <div className="comment-item-row">
        <div className="comment-avatar-col">
          <CommentAvatar name={item.nickname} owner={owner} src={owner ? OWNER_AVATAR : ""} />
        </div>
        <div className="comment-item-main">
          <div className="comment-item-head">
            <span className="comment-item-name">
              {item.url ? (
                <a href={item.url} target="_blank" rel="noreferrer nofollow">
                  {item.nickname || "路人"}
                </a>
              ) : (
                item.nickname || "路人"
              )}
            </span>
            {owner ? <span className="comment-owner-badge">站长</span> : null}
            {site ? <span className="comment-item-site">{site}</span> : null}
            <time className="comment-item-time" dateTime={item.created_at}>
              {formatTime(item.created_at)}
            </time>
            <a
              className="comment-anchor"
              href={`#comment-${item.id}`}
              title="复制这一条的链接"
              onClick={(e) => {
                e.preventDefault();
                try {
                  history.replaceState(null, "", `#comment-${item.id}`);
                } catch {
                  /* ignore */
                }
                document.getElementById(`comment-${item.id}`)?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              #
            </a>
          </div>
          <div className="comment-bubble-row">
            <div className="comment-bubble">
              <CommentBody content={item.content} />
            </div>
            <div className="comment-actions">
              <button type="button" className="comment-reply-btn" onClick={() => onReply(item)}>
                回复
              </button>
            </div>
          </div>
        </div>
      </div>
      {item.children?.length ? (
        <ul className="comment-children">
          {item.children.map((child) => (
            <CommentNode key={child.id} item={child} onReply={onReply} activeId={activeId} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export default function CommentBox({ kind, slug, placeholder, hint: initialHint }) {
  const ownerMode = Boolean(getToken());
  const [hint, setHint] = useState(initialHint || "欢迎写下你的想法。");
  const [draft, setDraft] = useState(null);
  const [nickname, setNickname] = useState(() => {
    try {
      return localStorage.getItem("komichi-comment-name") || "";
    } catch {
      return "";
    }
  });
  const [mail, setMail] = useState(() => {
    try {
      return localStorage.getItem("komichi-comment-mail") || "";
    } catch {
      return "";
    }
  });
  const [site, setSite] = useState(() => {
    try {
      return localStorage.getItem("komichi-comment-url") || "";
    } catch {
      return "";
    }
  });
  const [busy, setBusy] = useState(false);
  const [comments, setComments] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const [replyTo, setReplyTo] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const composerRef = useRef(null);
  const fileRef = useRef(null);
  const [editor, setEditor] = useState(null);

  const count = draftLength(draft);

  const load = useCallback(async () => {
    try {
      const list = await listComments(kind, slug);
      setComments(list);
    } catch {
      setComments([]);
    }
    setLoaded(true);
  }, [kind, slug]);

  useEffect(() => {
    setLoaded(false);
    setComments([]);
    setDraft(null);
    setReplyTo(null);
    setEditorKey((key) => key + 1);
    load();
  }, [load]);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith("#comment-")) return;
    const id = Number(hash.slice("#comment-".length));
    if (!id) return;
    setActiveId(id);
    const t = setTimeout(() => {
      document.getElementById(`comment-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
    return () => clearTimeout(t);
  }, [loaded]);

  const tree = useMemo(() => buildTree(comments), [comments]);

  const startReply = useCallback((item) => {
    setReplyTo({ id: item.id, name: item.nickname || "路人" });
    composerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    const el = composerRef.current?.querySelector("[contenteditable='true']");
    el?.focus();
  }, []);

  const pickImage = () => fileRef.current?.click();

  const onFilePicked = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const { src } = await commentUpload(file);
      if (!src || !editor) return;
      editor.update(() => {
        $insertNodes([$createImageNode({ src, altText: file.name || "" })]);
      });
    } catch {
      setHint("图片没能传上去。");
    }
  };

  const leaveTrace = async () => {
    if (busy) return;
    if (!draft || isBlankState(draft)) {
      setHint("先写一句再留下痕迹。");
      return;
    }
    if (!ownerMode) {
      const name = nickname.trim();
      if (!name || name.length > 20) {
        setHint("昵称需要 1–20 个字。");
        return;
      }
      if (!/^[\w.+-]+@[\w-]+(?:\.[\w-]+)+$/.test(mail.trim())) {
        setHint("邮箱格式不对。");
        return;
      }
      try {
        localStorage.setItem("komichi-comment-name", name);
        localStorage.setItem("komichi-comment-mail", mail.trim());
        localStorage.setItem("komichi-comment-url", site.trim());
      } catch {
        /* ignore */
      }
    }
    setBusy(true);
    try {
      await createComment(kind, slug, JSON.stringify(draft), ownerMode ? "" : nickname, {
        mail: ownerMode ? "" : mail,
        url: ownerMode ? "" : site,
        parentId: replyTo?.id ?? null,
      });
      setHint(replyTo ? "回复已送达。" : "已留下痕迹。");
      setDraft(null);
      setReplyTo(null);
      setEditorKey((key) => key + 1);
      await load();
    } catch {
      setHint("没能留下痕迹，稍后再试。");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="comment-thread" ref={composerRef}>
      <section className={`comment-composer${ownerMode ? " is-owner" : ""}`}>
        {ownerMode ? (
          <div className="comment-avatar-col">
            <CommentAvatar name="站长" owner src={OWNER_AVATAR} />
          </div>
        ) : null}
        <div className="comment-composer-main">
          {!ownerMode ? (
            <div className="comment-fields">
              <input
                className="comment-field"
                value={nickname}
                maxLength={40}
                placeholder="昵称 *"
                onChange={(e) => setNickname(e.target.value)}
              />
              <input
                className="comment-field"
                value={mail}
                maxLength={120}
                placeholder="邮箱 *"
                onChange={(e) => setMail(e.target.value)}
              />
              <input
                className="comment-field"
                value={site}
                maxLength={200}
                placeholder="网址"
                onChange={(e) => setSite(e.target.value)}
              />
            </div>
          ) : null}
          {replyTo ? (
            <div className="comment-reply-chip">
              <span>正在回复 {replyTo.name}</span>
              <button type="button" onClick={() => setReplyTo(null)}>
                取消
              </button>
            </div>
          ) : null}
          <div className="comment-editor-wrap">
            <HaklexEditor
              key={editorKey}
              placeholder={placeholder || "说点什么…"}
              variant="comment"
              onChange={setDraft}
              onSubmit={leaveTrace}
              onEditorReady={setEditor}
              uploadFn={commentUpload}
            />
          </div>
          <div className="comment-composer-row">
            <span className="comment-count">
              {count}/{MAX_LEN}
            </span>
            <div className="comment-composer-tools">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                className="comment-file"
                onChange={onFilePicked}
              />
              <button
                type="button"
                className="comment-icon-btn"
                title="上传图片"
                aria-label="上传图片"
                onClick={pickImage}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                  <path
                    d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm0 1v9.6l4.2-4.2a1 1 0 0 1 1.4 0l3.3 3.3 1.9-1.9a1 1 0 0 1 1.4 0L20 15.7V6H4Zm5 3.5a1.75 1.75 0 1 1 0-3.5 1.75 1.75 0 0 1 0 3.5Z"
                    fill="currentColor"
                  />
                </svg>
              </button>
              <button
                className="btn btn-accent comment-send"
                type="button"
                onClick={leaveTrace}
                disabled={busy}
              >
                {busy ? "发送中…" : "发送"}
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="comment-list-head">
        <span className="comment-total">
          {loaded ? `${comments.length} 条评论` : "正在读取评论…"}
        </span>
      </div>

      <ul className="comment-list">
        {!loaded ? (
          <>
            <CommentSkeleton />
            <CommentSkeleton />
          </>
        ) : tree.length === 0 ? (
          <li className="comment-empty">还没有人留下痕迹，你可以是第一个。</li>
        ) : (
          tree.map((item) => (
            <CommentNode key={item.id} item={item} onReply={startReply} activeId={activeId} />
          ))
        )}
      </ul>

      <p className="comment-hint">{hint}</p>
    </div>
  );
}

function CommentSkeleton() {
  return (
    <li className="comment-item is-skeleton" aria-hidden="true">
      <div className="comment-item-row">
        <div className="comment-avatar-col">
          <div className="comment-avatar" />
        </div>
        <div className="comment-item-main">
          <div className="comment-item-head">
            <span className="comment-skel comment-skel-name" />
            <span className="comment-skel comment-skel-time" />
          </div>
          <div className="comment-bubble-row">
            <div className="comment-bubble comment-skel-bubble" />
          </div>
        </div>
      </div>
    </li>
  );
}
