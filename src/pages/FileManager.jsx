import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Copy,
  FileText,
  FolderOpen,
  FolderPlus,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  createFolder,
  deleteFile,
  deleteFolder,
  listFiles,
  listFolders,
  moveFile,
  renameFolder,
  uploadFile,
} from "../contentApi.js";

const FILTERS = [
  { key: "", label: "全部" },
  { key: "image", label: "图片" },
  { key: "document", label: "文档" },
  { key: "other", label: "其他" },
];

function fmtSize(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
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

function kindLabel(kind) {
  if (kind === "image") return "图片";
  if (kind === "document") return "文档";
  return "其他";
}

export default function FileManager() {
  const inputRef = useRef(null);
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [folder, setFolder] = useState("图片");
  const [kind, setKind] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState("");
  const [hint, setHint] = useState("");
  const [drop, setDrop] = useState(false);
  const [draft, setDraft] = useState("");

  const load = useCallback(async () => {
    setBusy("list");
    try {
      const [nextFolders, nextFiles] = await Promise.all([listFolders(), listFiles()]);
      setFolders(nextFolders);
      setFiles(nextFiles);
      setFolder((prev) => {
        if (nextFolders.some((item) => item.name === prev)) return prev;
        return nextFolders[0]?.name || "未分类";
      });
    } catch (err) {
      setHint(err.message || "读取失败");
    } finally {
      setBusy("");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const ingest = async (list) => {
    const incoming = Array.from(list || []).filter(Boolean);
    if (!incoming.length || busy) return;
    setBusy("upload");
    setHint("");
    let ok = 0;
    let fail = 0;
    for (const file of incoming) {
      try {
        await uploadFile(file, undefined, folder);
        ok += 1;
      } catch {
        fail += 1;
      }
    }
    await load();
    if (fail && ok) setHint(`${ok} 个已入库，${fail} 个失败`);
    else if (fail) setHint("上传失败");
    else if (ok) setHint(`${ok} 个已放入「${folder}」`);
  };

  const copyUrl = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      setHint("链接已复制");
    } catch {
      setHint("复制失败");
    }
  };

  const shown = useMemo(
    () =>
      files.filter((item) => {
        if (folder && item.folder !== folder) return false;
        if (kind && item.kind !== kind) return false;
        const q = query.trim().toLowerCase();
        if (q && !String(item.name).toLowerCase().includes(q)) return false;
        return true;
      }),
    [files, folder, kind, query]
  );

  const addFolder = async () => {
    const name = draft.trim();
    if (!name || busy) return;
    setBusy("folder");
    setHint("");
    try {
      await createFolder(name);
      setDraft("");
      await load();
      setFolder(name);
      setHint(`已建「${name}」`);
    } catch (err) {
      setHint(err.message || "未能建文件夹");
    } finally {
      setBusy("");
    }
  };

  const renameCurrent = async () => {
    const next = window.prompt("文件夹新名字", folder);
    if (!next || next.trim() === folder) return;
    setBusy("folder");
    setHint("");
    try {
      await renameFolder(folder, next.trim());
      await load();
      setFolder(next.trim());
      setHint("已改名，R2 路径已跟着挪");
    } catch (err) {
      setHint(err.message || "改名失败");
    } finally {
      setBusy("");
    }
  };

  const removeCurrent = async () => {
    if (folder === "未分类") {
      setHint("「未分类」不能删");
      return;
    }
    if (!window.confirm(`删除「${folder}」？里面的文件会挪到「未分类」。`)) return;
    setBusy("folder");
    setHint("");
    try {
      await deleteFolder(folder);
      await load();
      setFolder("未分类");
      setHint("文件夹已删，文件已挪到「未分类」");
    } catch (err) {
      setHint(err.message || "删除失败");
    } finally {
      setBusy("");
    }
  };

  const relocate = async (id, nextFolder) => {
    if (!nextFolder || nextFolder === folder || busy) return;
    setBusy(id);
    setHint("");
    try {
      await moveFile(id, nextFolder);
      await load();
      setHint(`已挪到「${nextFolder}」`);
    } catch (err) {
      setHint(err.message || "移动失败");
    } finally {
      setBusy("");
    }
  };

  const remove = async (id) => {
    if (busy) return;
    setBusy(id);
    setHint("");
    try {
      await deleteFile(id);
      setFiles((prev) => prev.filter((item) => item.id !== id));
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
          <h1>文件库</h1>
          <p>按文件夹整理。R2 里也是「文件夹/文件 id」，公开链接仍用文件 id。</p>
        </div>
        <div className="adm-top-actions">
          <button className="adm-btn is-primary" type="button" onClick={() => inputRef.current?.click()}>
            <Plus size={15} strokeWidth={2} />
            上传到当前文件夹
          </button>
          <button className="adm-btn" type="button" onClick={load} disabled={busy === "list"}>
            {busy === "list" ? <LoaderCircle size={15} className="adm-spin" /> : <RefreshCw size={15} strokeWidth={1.9} />}
            刷新
          </button>
        </div>
      </header>

      <input
        ref={inputRef}
        className="adm-file-input"
        type="file"
        multiple
        onChange={(e) => {
          ingest(e.target.files);
          e.target.value = "";
        }}
      />

      <div className="adm-files-layout">
        <aside className="adm-folders">
          <div className="adm-folders-head">
            <span>文件夹</span>
            <span className="adm-muted">{folders.length}</span>
          </div>
          <ul>
            {folders.map((item) => (
              <li key={item.name}>
                <button
                  className={`adm-folder ${folder === item.name ? "is-on" : ""}`}
                  type="button"
                  onClick={() => setFolder(item.name)}
                >
                  <FolderOpen size={15} strokeWidth={1.8} />
                  <strong>{item.name}</strong>
                  <em>{item.count || 0}</em>
                </button>
              </li>
            ))}
          </ul>
          <form
            className="adm-folder-new"
            onSubmit={(e) => {
              e.preventDefault();
              addFolder();
            }}
          >
            <input
              value={draft}
              placeholder="新文件夹名"
              onChange={(e) => setDraft(e.target.value)}
            />
            <button className="adm-icon is-box" type="submit" title="新建" disabled={!draft.trim()}>
              <FolderPlus size={15} strokeWidth={1.8} />
            </button>
          </form>
        </aside>

        <section>
          <div className="adm-folder-tools">
            <h2>{folder}</h2>
            <div className="adm-top-actions">
              <button className="adm-icon is-box" type="button" title="改名" onClick={renameCurrent}>
                <Pencil size={15} strokeWidth={1.8} />
              </button>
              <button className="adm-icon is-box is-warn" type="button" title="删除文件夹" onClick={removeCurrent}>
                <Trash2 size={15} strokeWidth={1.8} />
              </button>
            </div>
          </div>

          <div
            className={`adm-drop ${drop ? "is-on" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDrop(true);
            }}
            onDragLeave={() => setDrop(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrop(false);
              ingest(e.dataTransfer.files);
            }}
            onClick={() => inputRef.current?.click()}
          >
            <Upload size={18} strokeWidth={1.8} />
            <span>{busy === "upload" ? "正在入库…" : `拖到「${folder}」，或点选本地文件`}</span>
          </div>

          <div className="adm-toolbar adm-files-bar">
            <div className="adm-pills">
              {FILTERS.map((item) => (
                <button
                  key={item.key || "all"}
                  className={`adm-pill ${kind === item.key ? "is-accent" : ""}`}
                  type="button"
                  onClick={() => setKind(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <label className="adm-search">
              <Search size={15} strokeWidth={1.9} />
              <input
                type="text"
                value={query}
                placeholder="搜索当前文件夹…"
                onChange={(e) => setQuery(e.target.value)}
              />
              {query ? (
                <button className="adm-icon is-mini" type="button" title="清空" onClick={() => setQuery("")}>
                  <X size={14} strokeWidth={1.9} />
                </button>
              ) : null}
            </label>
          </div>

          {hint ? <p className="adm-muted">{hint}</p> : null}

          {shown.length ? (
            <ul className="adm-files">
              {shown.map((item) => (
                <li className="adm-file" key={item.id}>
                  {item.kind === "image" ? (
                    <a className="adm-file-thumb" href={item.url} target="_blank" rel="noreferrer">
                      <img src={item.url} alt={item.name} />
                    </a>
                  ) : (
                    <a className="adm-file-thumb is-icon" href={item.url} target="_blank" rel="noreferrer">
                      {item.kind === "document" ? <FileText size={22} strokeWidth={1.7} /> : <FolderOpen size={22} strokeWidth={1.7} />}
                    </a>
                  )}
                  <div className="adm-file-meta">
                    <strong title={item.name}>{item.name}</strong>
                    <span>
                      {kindLabel(item.kind)} · {fmtSize(item.size)} · {fmtTime(item.created_at)}
                    </span>
                  </div>
                  <div className="adm-file-actions">
                    <select
                      className="adm-file-move"
                      value={item.folder || folder}
                      title="挪到文件夹"
                      onChange={(e) => relocate(item.id, e.target.value)}
                    >
                      {folders.map((entry) => (
                        <option key={entry.name} value={entry.name}>
                          {entry.name}
                        </option>
                      ))}
                    </select>
                    <button className="adm-icon" type="button" title="复制链接" onClick={() => copyUrl(item.url)}>
                      <Copy size={15} strokeWidth={1.8} />
                    </button>
                    <button
                      className="adm-icon is-warn"
                      type="button"
                      title="删除"
                      disabled={busy === item.id}
                      onClick={() => remove(item.id)}
                    >
                      {busy === item.id ? <LoaderCircle size={15} className="adm-spin" /> : <Trash2 size={15} strokeWidth={1.8} />}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="adm-empty">{busy === "list" ? "正在读取…" : `「${folder}」还是空的。`}</p>
          )}
        </section>
      </div>
    </>
  );
}
