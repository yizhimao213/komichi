import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Boxes,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  EyeOff,
  FileStack,
  FileText,
  FolderOpen,
  Globe,
  LayoutDashboard,
  Library,
  Lightbulb,
  LoaderCircle,
  LogOut,
  Menu,
  MessageSquareQuote,
  NotebookPen,
  Pencil,
  Plus,
  Quote,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  KIND_GROUPS,
  KIND_MAP,
  tagsToText,
  textToTags,
} from "../contentKinds.js";
import {
  getDocument,
  listDocuments,
  loadOverrides,
  login,
  logout,
  removeDocument,
  saveDocument,
} from "../contentApi.js";
import HaklexEditor from "../haklex/HaklexEditor.jsx";
import { markdownToLexical } from "../haklex/markdown.js";
import FileManager from "./FileManager.jsx";

const KIND_ICON = {
  post: FileText,
  note: NotebookPen,
  page: FileStack,
  thought: Lightbulb,
  say: Quote,
  quote: MessageSquareQuote,
  series: Library,
  friend: Users,
  project: Boxes,
  site: Globe,
};

const iconOf = (kind) => KIND_ICON[kind] || LayoutDashboard;
const docKey = (kind, slug) => `${kind}:${slug}`;

function baselineOf(entry) {
  return entry.baseline() || [];
}

function findBaseline(entry, slug) {
  return baselineOf(entry).find((item) => String(item.slug) === String(slug)) || null;
}

function isBaseline(entry, slug) {
  return Boolean(findBaseline(entry, slug));
}

function baseBodyOf(entry, base) {
  if (!base) return "";
  if (entry.kind === "series") return String(base.description || "");
  if (entry.body === "text") return String(base.text || base.body || "");
  return String(base.body || "");
}

function safeParseLexical(raw) {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && parsed.root ? parsed : null;
  } catch {
    return null;
  }
}

function safeParseArray(raw) {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function slugifyName(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff]+/g, "-")
    .replace(/^-|-$/g, "");
}

function fmtTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ---------------------------------- 登录 ---------------------------------- */

function LoginScreen({ onDone }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (busy || !value.trim()) return;
    setBusy(true);
    setError("");
    const ok = await login(value.trim());
    if (!ok) {
      setBusy(false);
      setError("口令不正确。本地预览用 komichi-dev-admin，线上用另一组口令。");
      return;
    }
    const loaded = await onDone();
    setBusy(false);
    if (!loaded) setError("口令已通过，但后台数据暂时读不到。再试一次。");
  };

  return (
    <div className="adm-login">
      <form className="adm-login-card" onSubmit={submit}>
        <div className="adm-login-brand">
          <span className="adm-logo">k</span>
          <div>
            <strong>komichi</strong>
            <span>内容后台</span>
          </div>
        </div>
        <label className="adm-login-field">
          <span>访问口令</span>
          <input
            type="password"
            value={value}
            autoFocus
            placeholder="ADMIN_TOKEN"
            onChange={(e) => {
              setValue(e.target.value);
              setError("");
            }}
          />
        </label>
        {error ? <p className="adm-login-error">{error}</p> : null}
        <button className="adm-btn is-primary is-block" type="submit" disabled={busy || !value.trim()}>
          {busy ? <LoaderCircle size={15} className="adm-spin" /> : null}
          {busy ? "正在验证" : "进入后台"}
        </button>
        <p className="adm-login-tip">口令由 Worker 的 ADMIN_TOKEN 提供，只保存在这台设备上。</p>
      </form>
    </div>
  );
}

/* --------------------------------- 侧边栏 --------------------------------- */

function Sidebar({ pathname, onLogout, open, onClose }) {
  const isOn = (href) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <button
        className={`adm-scrim ${open ? "is-on" : ""}`}
        type="button"
        tabIndex={open ? 0 : -1}
        aria-label="收起导航"
        onClick={onClose}
      />
      <aside className={`adm-side ${open ? "is-open" : ""}`}>
        <div className="adm-brand">
          <span className="adm-logo">k</span>
          <div className="adm-brand-text">
            <strong>komichi</strong>
            <span>内容后台</span>
          </div>
          <button className="adm-icon adm-side-close" type="button" title="收起" onClick={onClose}>
            <X size={16} strokeWidth={1.9} />
          </button>
        </div>

        <nav className="adm-nav">
          <Link className={`adm-nav-item ${pathname === "/admin" ? "is-on" : ""}`} to="/admin">
            <LayoutDashboard size={16} strokeWidth={1.8} />
            <span>总览</span>
          </Link>
          <Link className={`adm-nav-item ${isOn("/admin/files") ? "is-on" : ""}`} to="/admin/files">
            <FolderOpen size={16} strokeWidth={1.8} />
            <span>文件库</span>
          </Link>
          {KIND_GROUPS.map((group) => (
            <div className="adm-nav-group" key={group.name}>
              <p className="adm-nav-title">{group.name}</p>
              {group.items.map((entry) => {
                const href = entry.mode === "collection" ? `/admin/c/${entry.kind}` : `/admin/s/${entry.kind}`;
                const Icon = iconOf(entry.kind);
                return (
                  <Link key={entry.kind} className={`adm-nav-item ${isOn(href) ? "is-on" : ""}`} to={href}>
                    <Icon size={16} strokeWidth={1.8} />
                    <span>{entry.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="adm-side-foot">
          <a className="adm-side-link" href="/" target="_blank" rel="noreferrer">
            <ExternalLink size={15} strokeWidth={1.8} />
            查看站点
          </a>
          <button className="adm-side-link is-btn" type="button" onClick={onLogout}>
            <LogOut size={15} strokeWidth={1.8} />
            退出后台
          </button>
        </div>
      </aside>
    </>
  );
}

/* --------------------------------- 总览页 --------------------------------- */

function Dashboard({ docs }) {
  const stats = useMemo(
    () =>
      KIND_GROUPS.flatMap((group) =>
        group.items.map((entry) => {
          const own = docs.filter((doc) => doc.kind === entry.kind);
          const added = own.filter((doc) => !doc.deleted && !isBaseline(entry, doc.slug));
          return {
            entry,
            total: baselineOf(entry).length + added.length,
            changed: own.filter((doc) => !doc.deleted).length,
            hidden: own.filter((doc) => doc.deleted).length,
          };
        })
      ),
    [docs]
  );

  const totalItems = stats.reduce((sum, item) => sum + item.total, 0);
  const totalChanged = stats.reduce((sum, item) => sum + item.changed, 0);
  const totalHidden = stats.reduce((sum, item) => sum + item.hidden, 0);

  const recent = [...docs].sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at))).slice(0, 7);

  const hrefFor = (entry, doc) =>
    entry.mode === "collection" ? `/admin/c/${entry.kind}/${encodeURIComponent(doc.slug)}` : `/admin/s/${entry.kind}`;

  const tiles = [
    { icon: Library, label: "内容条目", value: totalItems },
    { icon: Pencil, label: "已改动", value: totalChanged },
    { icon: EyeOff, label: "已隐藏", value: totalHidden },
  ];

  return (
    <>
      <header className="adm-top">
        <div>
          <h1>总览</h1>
          <p>站点上的内容都在这里。改动写入 D1，与仓库里的 Markdown 基线合并后呈现。</p>
        </div>
      </header>

      <section className="adm-tiles">
        {tiles.map(({ icon: Icon, label, value }) => (
          <div className="adm-tile" key={label}>
            <span className="adm-tile-icon">
              <Icon size={16} strokeWidth={1.8} />
            </span>
            <div className="adm-tile-text">
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          </div>
        ))}
      </section>

      <section className="adm-section">
        <header className="adm-section-head">
          <h2>内容类型</h2>
          <span className="adm-muted">共 {stats.length} 类</span>
        </header>
        <div className="adm-cards">
          {stats.map(({ entry, total, changed }) => {
            const Icon = iconOf(entry.kind);
            return (
              <Link
                className="adm-card"
                key={entry.kind}
                to={entry.mode === "collection" ? `/admin/c/${entry.kind}` : `/admin/s/${entry.kind}`}
              >
                <span className="adm-card-icon" style={{ "--tint": entry.accent }}>
                  <Icon size={17} strokeWidth={1.8} />
                </span>
                <span className="adm-card-text">
                  <strong>{entry.label}</strong>
                  <em>{total} 项</em>
                </span>
                <span className={`adm-pill ${changed ? "is-accent" : ""}`}>
                  {changed ? `${changed} 已改` : "原始"}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="adm-panel">
        <header className="adm-panel-head">
          <h2>最近改动</h2>
          {recent.length ? <span className="adm-muted">{recent.length} 条</span> : null}
        </header>
        {recent.length ? (
          <ul className="adm-rows">
            {recent.map((doc) => {
              const entry = KIND_MAP[doc.kind];
              if (!entry) return null;
              const Icon = iconOf(doc.kind);
              return (
                <li className="adm-row" key={docKey(doc.kind, doc.slug)}>
                  <Link className="adm-row-main" to={hrefFor(entry, doc)}>
                    <span className="adm-row-chip" style={{ "--tint": entry.accent }}>
                      <Icon size={15} strokeWidth={1.8} />
                    </span>
                    <span className="adm-row-text">
                      <strong className="adm-row-title">{doc.title || doc.meta?.name || doc.slug}</strong>
                      <span className="adm-muted">
                        {entry.label} · {doc.slug}
                      </span>
                    </span>
                    {doc.deleted ? <span className="adm-pill is-warn">已隐藏</span> : null}
                  </Link>
                  <time className="adm-time">
                    <Clock size={13} strokeWidth={1.8} />
                    {fmtTime(doc.updated_at)}
                  </time>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="adm-empty">还没有任何改动，内容都与仓库里的 Markdown 一致。</p>
        )}
      </section>
    </>
  );
}

/* -------------------------------- 列表页 -------------------------------- */

function CollectionList({ entry, docs, onRefresh }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState("");
  const [query, setQuery] = useState("");

  const overrides = useMemo(() => {
    const map = new Map();
    for (const doc of docs) map.set(docKey(doc.kind, doc.slug), doc);
    return map;
  }, [docs]);

  const list = baselineOf(entry);
  const fresh = docs.filter((doc) => doc.kind === entry.kind && !doc.deleted && !isBaseline(entry, doc.slug));

  const rows = [
    ...list.map((item) => ({ item, slug: String(item.slug), base: true })),
    ...fresh.map((doc) => ({ item: doc, slug: doc.slug, base: false })),
  ];

  const q = query.trim().toLowerCase();
  const shown = q
    ? rows.filter(({ item, slug }) =>
        `${entry.titleOf(item)} ${entry.metaOf(item)} ${slug}`.toLowerCase().includes(q)
      )
    : rows;

  const openItem = (slug) =>
    navigate(
      entry.mode === "collection"
        ? `/admin/c/${entry.kind}/${encodeURIComponent(slug)}`
        : `/admin/s/${entry.kind}`
    );

  const act = async (slug, run) => {
    if (busy) return;
    setBusy(slug);
    try {
      await run();
      await loadOverrides();
      await onRefresh();
    } finally {
      setBusy("");
    }
  };

  const hideOrRemove = (slug, base, doc) => {
    if (base) {
      return act(slug, () =>
        saveDocument(entry.kind, slug, {
          title: doc?.title || "",
          meta: doc?.meta || {},
          body: doc?.body || "",
          deleted: true,
        })
      );
    }
    return act(slug, () => removeDocument(entry.kind, slug, true));
  };

  const Icon = iconOf(entry.kind);

  return (
    <>
      <header className="adm-top">
        <div>
          <h1>{entry.label}</h1>
          <p>
            共 {rows.length} 项。{entry.mode === "collection" ? "编辑写入覆盖层，仓库原文保留。" : "保存后立即生效。"}
          </p>
        </div>
        <div className="adm-top-actions">
          {entry.mode === "collection" ? (
            <button className="adm-btn is-primary" type="button" onClick={() => navigate(`/admin/c/${entry.kind}/new`)}>
              <Plus size={15} strokeWidth={2} />
              新建
            </button>
          ) : null}
          <button className="adm-btn" type="button" onClick={onRefresh}>
            <RefreshCw size={15} strokeWidth={1.9} />
            刷新
          </button>
        </div>
      </header>

      <div className="adm-toolbar">
        <label className="adm-search">
          <Search size={15} strokeWidth={1.9} />
          <input
            type="text"
            value={query}
            placeholder={`搜索${entry.label}…`}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query ? (
            <button className="adm-icon is-mini" type="button" title="清空" onClick={() => setQuery("")}>
              <X size={14} strokeWidth={1.9} />
            </button>
          ) : null}
        </label>
      </div>

      {shown.length ? (
        <ul className="adm-rows">
          {shown.map(({ item, slug, base }) => {
            const doc = overrides.get(docKey(entry.kind, slug));
            const hidden = Boolean(doc?.deleted);
            return (
              <li className={`adm-row ${hidden ? "is-dim" : ""}`} key={`${base ? "b" : "n"}-${slug}`}>
                <button className="adm-row-main is-btn" type="button" onClick={() => openItem(slug)}>
                  <span className="adm-row-chip" style={{ "--tint": entry.accent }}>
                    <Icon size={15} strokeWidth={1.8} />
                  </span>
                  <span className="adm-row-text">
                    <strong className="adm-row-title">{entry.titleOf(item)}</strong>
                    <span className="adm-muted">{entry.metaOf(item)}</span>
                  </span>
                  {!base ? <span className="adm-pill is-new">新增</span> : null}
                  {base && doc && !hidden ? <span className="adm-pill is-accent">已覆盖</span> : null}
                  {hidden ? <span className="adm-pill is-warn">已隐藏</span> : null}
                </button>
                <div className="adm-row-actions">
                  {entry.hrefOf ? (
                    <a
                      className="adm-icon"
                      title="查看"
                      href={entry.hrefOf(slug)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink size={15} strokeWidth={1.8} />
                    </a>
                  ) : null}
                  <button className="adm-icon" type="button" title="编辑" onClick={() => openItem(slug)}>
                    <Pencil size={15} strokeWidth={1.8} />
                  </button>
                  {hidden ? (
                    <>
                      <button
                        className="adm-icon"
                        type="button"
                        title="取消隐藏"
                        disabled={busy === slug}
                        onClick={() =>
                          act(slug, () =>
                            saveDocument(entry.kind, slug, {
                              title: doc?.title || "",
                              meta: doc?.meta || {},
                              body: doc?.body || "",
                              deleted: false,
                            })
                          )
                        }
                      >
                        <RefreshCw size={15} strokeWidth={1.8} />
                      </button>
                      <button
                        className="adm-icon is-warn"
                        type="button"
                        title="彻底删除覆盖记录"
                        disabled={busy === slug}
                        onClick={() => act(slug, () => removeDocument(entry.kind, slug, true))}
                      >
                        <Trash2 size={15} strokeWidth={1.8} />
                      </button>
                    </>
                  ) : (
                    <button
                      className="adm-icon is-warn"
                      type="button"
                      title={base ? "隐藏（可随时取消）" : "删除"}
                      disabled={busy === slug}
                      onClick={() => hideOrRemove(slug, base, doc)}
                    >
                      <Trash2 size={15} strokeWidth={1.8} />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="adm-empty">{query ? `没有匹配「${query}」的内容。` : "还没有内容。"}</p>
      )}
    </>
  );
}

/* ------------------------------- 字段输入 ------------------------------- */

function Field({ field, value, onChange }) {
  const common = {
    value: value ?? "",
    placeholder: field.placeholder || "",
    onChange: (e) => onChange(e.target.value),
  };
  return (
    <label className={`adm-field ${field.wide ? "is-wide" : ""}`}>
      <span>{field.label}</span>
      {field.lines ? <textarea rows={field.lines} {...common} /> : <input type="text" {...common} />}
      {field.hint ? <em>{field.hint}</em> : null}
    </label>
  );
}

/* ------------------------------- 列表编辑器 ------------------------------- */

function EntriesEditor({ entry, initial, onSave, busy, hint }) {
  const [items, setItems] = useState(initial || []);
  const blank = () => Object.fromEntries((entry.entryFields || []).map((f) => [f.key, ""]));

  const patch = (index, key, value) =>
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)));

  const move = (index, dir) =>
    setItems((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      const [row] = next.splice(index, 1);
      next.splice(target, 0, row);
      return next;
    });

  const remove = (index) => setItems((prev) => prev.filter((_, i) => i !== index));

  return (
    <>
      <div className="adm-entries">
        {items.map((item, index) => (
          <div className="adm-entry" key={index}>
            <div className="adm-entry-head">
              <span className="adm-entry-no">{String(index + 1).padStart(2, "0")}</span>
              <strong>{item.name || `第 ${index + 1} 项`}</strong>
              <div className="adm-entry-tools">
                <button className="adm-icon" type="button" title="上移" onClick={() => move(index, -1)}>
                  <ChevronUp size={15} strokeWidth={1.9} />
                </button>
                <button className="adm-icon" type="button" title="下移" onClick={() => move(index, 1)}>
                  <ChevronDown size={15} strokeWidth={1.9} />
                </button>
                <button className="adm-icon is-warn" type="button" title="移除" onClick={() => remove(index)}>
                  <X size={15} strokeWidth={1.9} />
                </button>
              </div>
            </div>
            <div className="adm-form">
              {(entry.entryFields || []).map((field) => (
                <Field
                  key={field.key}
                  field={field}
                  value={item[field.key]}
                  onChange={(value) => patch(index, field.key, value)}
                />
              ))}
            </div>
          </div>
        ))}
        <button className="adm-add" type="button" onClick={() => setItems((prev) => [...prev, blank()])}>
          <Plus size={15} strokeWidth={2} />
          添加一项
        </button>
      </div>
      <SaveBar hint={hint} busy={busy} onSave={() => onSave(items)} />
    </>
  );
}

/* -------------------------------- 保存条 -------------------------------- */

function SaveBar({ hint, busy, onSave, extra }) {
  return (
    <div className="adm-savebar">
      <span className={`adm-savebar-hint ${hint ? "is-on" : ""}`}>{hint || "改完记得保存。"}</span>
      <div className="adm-savebar-actions">
        {extra}
        <button className="adm-btn is-primary" type="button" onClick={onSave} disabled={busy}>
          {busy ? <LoaderCircle size={15} className="adm-spin" /> : <Save size={15} strokeWidth={1.9} />}
          {busy ? "正在保存" : "保存"}
        </button>
      </div>
    </div>
  );
}

/* --------------------------------- 编辑页 --------------------------------- */

function ItemEditor({ entry, slug, isNew, onSaved }) {
  const navigate = useNavigate();
  const baseline = slug ? findBaseline(entry, slug) : null;
  const [meta, setMeta] = useState({});
  const [state, setState] = useState(null);
  const [text, setText] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState("");
  const showBody = entry.body === "rich" || entry.body === "text";

  const fieldDefs = entry.fields || [];

  useEffect(() => {
    let alive = true;
    setReady(false);
    const run = async () => {
      let doc = null;
      if (slug && !isNew) {
        try {
          doc = await getDocument(entry.kind, slug);
        } catch {
          doc = null;
        }
      }
      if (!alive) return;
      const source = doc?.meta && typeof doc.meta === "object" ? doc.meta : {};
      const nextMeta = {};
      for (const field of fieldDefs) {
        const raw = source[field.key] ?? baseline?.[field.key] ?? "";
        nextMeta[field.key] = field.type === "tags" ? tagsToText(raw) : String(raw ?? "");
      }
      setMeta(nextMeta);

      if (entry.body === "rich") {
        let initial = null;
        if (doc?.body) initial = safeParseLexical(doc.body);
        if (!initial && baseline) {
          try {
            initial = markdownToLexical(baseBodyOf(entry, baseline));
          } catch {
            initial = null;
          }
        }
        setState(initial);
      } else if (entry.body === "text") {
        setText(doc?.body ?? baseBodyOf(entry, baseline));
      }
      setReady(true);
    };
    run();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.kind, slug, isNew]);

  const buildMeta = () => {
    const out = {};
    for (const field of fieldDefs) {
      const value = meta[field.key] ?? "";
      out[field.key] = field.type === "tags" ? textToTags(value) : value;
    }
    if (entry.kind === "series" && slug) out.slug = slug;
    return out;
  };

  const save = async () => {
    const target = isNew ? String(meta.__slug || "").trim() : slug;
    if (!target) {
      setHint("先写一个短名。");
      return;
    }
    let body = "";
    if (entry.body === "rich") {
      if (!state) {
        setHint("正文还没准备好。");
        return;
      }
      body = JSON.stringify(state);
    } else if (entry.body === "text") {
      body = text;
    }
    setBusy(true);
    setHint("");
    try {
      await saveDocument(entry.kind, target, {
        title: meta.title || meta.name || "",
        meta: buildMeta(),
        body,
      });
      await loadOverrides();
      onSaved?.();
      if (isNew) {
        navigate(`/admin/c/${entry.kind}/${encodeURIComponent(target)}`, { replace: true });
      } else if (entry.kind === "series") {
        navigate("/admin/c/series");
      } else {
        setHint("已保存。");
      }
    } catch (err) {
      setHint(err?.status === 401 ? "口令过期，请重新登录。" : "保存失败，稍后重试。");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <header className="adm-top">
        <div className="adm-top-lead">
          <Link className="adm-icon is-box" to={`/admin/c/${entry.kind}`} title="返回列表">
            <ArrowLeft size={16} strokeWidth={1.9} />
          </Link>
          <div>
            <h1>{isNew ? `新建${entry.label}` : meta.title || meta.name || slug}</h1>
            <p>
              {entry.label}
              {slug ? ` · ${slug}` : ""}
            </p>
          </div>
        </div>
        <div className="adm-top-actions">
          {slug && entry.hrefOf ? (
            <a className="adm-btn" href={entry.hrefOf(slug)} target="_blank" rel="noreferrer">
              <ExternalLink size={15} strokeWidth={1.9} />
              查看页面
            </a>
          ) : null}
        </div>
      </header>

      <div className="adm-panel">
        <header className="adm-panel-head">
          <h2>基本信息</h2>
        </header>
        <div className="adm-form">
          {isNew ? (
            <label className="adm-field is-wide">
              <span>短名（网址里的那一段）</span>
              <input
                type="text"
                value={meta.__slug || ""}
                placeholder="例如 yu-li-de-jiu-shu-dian"
                onChange={(e) => setMeta((prev) => ({ ...prev, __slug: e.target.value }))}
              />
              <em>只用一次，之后就是这篇文章的地址。</em>
            </label>
          ) : null}
          {fieldDefs.map((field) => (
            <Field
              key={field.key}
              field={field}
              value={meta[field.key]}
              onChange={(value) => setMeta((prev) => ({ ...prev, [field.key]: value }))}
            />
          ))}
        </div>
      </div>

      {showBody ? (
        <div className="adm-panel is-flush">
          <header className="adm-panel-head">
            <h2>{entry.bodyLabel || "正文"}</h2>
            {entry.body === "rich" ? (
              <span className="adm-muted">工具栏 · 输入 / 插入模块 · Markdown 快捷键</span>
            ) : null}
          </header>
          {ready ? (
            entry.body === "rich" ? (
              <div className="adm-editor">
                <HaklexEditor
                  key={`${entry.kind}:${slug || "new"}`}
                  variant="article"
                  slash
                  persistUploads
                  initialValue={state ?? undefined}
                  onChange={setState}
                />
              </div>
            ) : (
              <textarea
                className="adm-textarea"
                rows={entry.kind === "series" ? 6 : 12}
                value={text}
                placeholder={entry.bodyLabel || "写点什么…"}
                onChange={(e) => setText(e.target.value)}
              />
            )
          ) : (
            <p className="adm-empty">正在载入正文…</p>
          )}
        </div>
      ) : null}

      <SaveBar hint={hint} busy={busy} onSave={save} />
    </>
  );
}

/* -------------------------------- 单例页面 -------------------------------- */

function SingletonPage({ entry, onRefresh }) {
  const [baseline, setBaseline] = useState(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const slug = entry.slug || "index";

  useEffect(() => {
    let alive = true;
    setReady(false);
    const run = async () => {
      let doc = null;
      try {
        doc = await getDocument(entry.kind, slug);
      } catch {
        doc = null;
      }
      if (!alive) return;
      const base = findBaseline(entry, slug) || {};
      if (entry.mode === "entries") {
        const parsed = safeParseArray(doc?.body);
        setBaseline(parsed || baselineOf(entry));
      } else {
        const source = doc?.meta && typeof doc.meta === "object" ? doc.meta : {};
        const next = {};
        for (const field of entry.fields || []) {
          next[field.key] = String(source[field.key] ?? base[field.key] ?? "");
        }
        setBaseline(next);
      }
      setReady(true);
    };
    run();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.kind, reloadKey]);

  const done = async (message) => {
    await loadOverrides();
    await onRefresh();
    setHint(message);
  };

  const saveEntries = async (items) => {
    setBusy(true);
    setHint("");
    try {
      const normalized = items
        .filter((item) => item.name || item.url)
        .map((item) => ({ ...item, slug: slugifyName(item.name) }));
      await saveDocument(entry.kind, slug, { title: entry.label, meta: {}, body: JSON.stringify(normalized) });
      setBaseline(normalized);
      await done("已保存，线上即刻生效。");
    } catch (err) {
      setHint(err?.status === 401 ? "口令过期，请重新登录。" : "保存失败，稍后重试。");
    } finally {
      setBusy(false);
    }
  };

  const saveFields = async () => {
    setBusy(true);
    setHint("");
    try {
      await saveDocument(entry.kind, slug, { title: entry.label, meta: baseline, body: "" });
      await done("已保存，线上即刻生效。");
    } catch (err) {
      setHint(err?.status === 401 ? "口令过期，请重新登录。" : "保存失败，稍后重试。");
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    if (!window.confirm("恢复为仓库里的默认内容？当前的覆盖记录会被删除。")) return;
    setBusy(true);
    setHint("");
    try {
      await removeDocument(entry.kind, slug, true);
      await loadOverrides();
      await onRefresh();
      setReady(false);
      setReloadKey((key) => key + 1);
      setHint("已恢复默认。");
    } catch (err) {
      setHint(err?.status === 401 ? "口令过期，请重新登录。" : "恢复失败，稍后重试。");
    } finally {
      setBusy(false);
    }
  };

  if (!ready) {
    return <p className="adm-empty">正在载入…</p>;
  }

  return (
    <>
      <header className="adm-top">
        <div>
          <h1>{entry.label}</h1>
          <p>{entry.mode === "entries" ? "增删、排序都会写回覆盖层。" : "修改后会立即生效。"}</p>
        </div>
        <div className="adm-top-actions">
          {entry.hrefOf ? (
            <a className="adm-btn" href={entry.hrefOf()} target="_blank" rel="noreferrer">
              <ExternalLink size={15} strokeWidth={1.9} />
              查看页面
            </a>
          ) : null}
          <button className="adm-btn" type="button" onClick={restore} disabled={busy}>
            <RefreshCw size={15} strokeWidth={1.9} />
            恢复默认
          </button>
        </div>
      </header>

      {entry.mode === "entries" ? (
        <EntriesEditor
          key={entry.kind}
          entry={entry}
          initial={baseline}
          onSave={saveEntries}
          busy={busy}
          hint={hint}
        />
      ) : (
        <>
          <div className="adm-panel">
            <div className="adm-form">
              {(entry.fields || []).map((field) => (
                <Field
                  key={field.key}
                  field={field}
                  value={baseline?.[field.key]}
                  onChange={(value) => setBaseline((prev) => ({ ...prev, [field.key]: value }))}
                />
              ))}
            </div>
          </div>
          <SaveBar hint={hint} busy={busy} onSave={saveFields} />
        </>
      )}
    </>
  );
}

/* --------------------------------- 入口 --------------------------------- */

export default function Editor() {
  const { pathname } = useLocation();
  const params = useParams();
  const [authed, setAuthed] = useState(null);
  const [docs, setDocs] = useState([]);
  const [navOpen, setNavOpen] = useState(false);

  const refreshDocs = useCallback(async () => {
    try {
      const list = await listDocuments();
      setDocs(list);
      setAuthed(true);
      return true;
    } catch (err) {
      if (err?.status === 401 || err?.status === 403) {
        setAuthed(false);
        return false;
      }
      setAuthed(true);
      return false;
    }
  }, []);

  useEffect(() => {
    document.title = "后台 · komichi";
  }, []);

  useEffect(() => {
    refreshDocs();
  }, [refreshDocs]);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  const doLogout = () => {
    logout();
    setAuthed(false);
    setDocs([]);
  };

  if (authed === null) {
    return (
      <div className="adm-login">
        <p className="adm-muted">正在检查登录状态…</p>
      </div>
    );
  }

  if (!authed) return <LoginScreen onDone={refreshDocs} />;

  const isNew = pathname.endsWith("/new");
  const isSingleton = pathname.startsWith("/admin/s/");
  const entry = params.kind ? KIND_MAP[params.kind] : null;

  const crumbs = [];
  if (pathname === "/admin") crumbs.push({ label: "总览" });
  else if (pathname === "/admin/files") crumbs.push({ label: "文件库" });
  else if (!entry) crumbs.push({ label: "未知分类" });
  else if (isSingleton) crumbs.push({ label: entry.group }, { label: entry.label, now: true });
  else if (isNew)
    crumbs.push(
      { label: entry.group },
      { label: entry.label, to: `/admin/c/${entry.kind}` },
      { label: "新建", now: true }
    );
  else if (params.slug)
    crumbs.push(
      { label: entry.group },
      { label: entry.label, to: `/admin/c/${entry.kind}` },
      { label: params.slug, now: true }
    );
  else crumbs.push({ label: entry.group }, { label: entry.label, now: true });

  let content = null;
  let key = "none";

  if (pathname === "/admin") {
    content = <Dashboard docs={docs} />;
    key = "dashboard";
  } else if (pathname === "/admin/files") {
    content = <FileManager />;
    key = "files";
  } else if (entry && isSingleton) {
    content = <SingletonPage key={`s-${entry.kind}`} entry={entry} onRefresh={refreshDocs} />;
    key = `s-${entry.kind}`;
  } else if (entry && (params.slug || isNew)) {
    key = `i-${entry.kind}-${params.slug || "new"}`;
    content = <ItemEditor key={key} entry={entry} slug={params.slug} isNew={isNew} onSaved={refreshDocs} />;
  } else if (entry) {
    key = `c-${entry.kind}`;
    content = <CollectionList key={key} entry={entry} docs={docs} onRefresh={refreshDocs} />;
  } else {
    content = <p className="adm-empty">找不到这个内容类型。</p>;
  }

  return (
    <div className="adm-shell">
      <Sidebar
        pathname={pathname}
        onLogout={doLogout}
        open={navOpen}
        onClose={() => setNavOpen(false)}
      />
      <main className="adm-main">
        <div className="adm-topbar">
          <button className="adm-icon adm-burger" type="button" title="展开导航" onClick={() => setNavOpen(true)}>
            <Menu size={17} strokeWidth={1.9} />
          </button>
          <nav className="adm-crumbs">
            <span className="adm-crumb">后台</span>
            {crumbs.map((crumb, i) => (
              <Fragment key={`${crumb.label}-${i}`}>
                <span className="adm-crumb-sep">/</span>
                {crumb.to ? (
                  <Link className="adm-crumb is-link" to={crumb.to}>
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="adm-crumb is-now">{crumb.label}</span>
                )}
              </Fragment>
            ))}
          </nav>
        </div>
        <div className="adm-body" key={key}>
          {content}
        </div>
      </main>
    </div>
  );
}
