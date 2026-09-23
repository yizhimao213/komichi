import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, LoaderCircle, Music, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { createTrack, deleteTrack, listAdminTracks, listFiles, saveTrack } from "../contentApi.js";

const emptyDraft = { title: "", artist: "", src: "", cover: "" };

export default function PlaylistManager() {
  const [tracks, setTracks] = useState([]);
  const [files, setFiles] = useState([]);
  const [draft, setDraft] = useState(emptyDraft);
  const [busy, setBusy] = useState("");
  const [hint, setHint] = useState("");

  const load = useCallback(async () => {
    setBusy("list");
    setHint("");
    try {
      const [nextTracks, nextFiles] = await Promise.all([listAdminTracks(), listFiles({ kind: "other" })]);
      setTracks(nextTracks);
      setFiles(nextFiles.filter((item) => String(item.mime || "").startsWith("audio/")));
    } catch (err) {
      setHint(err.message || "读不到歌单");
    } finally {
      setBusy("");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const add = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!draft.title.trim() || !draft.src.trim()) {
      setHint("歌名和音频地址都要填。");
      return;
    }
    setBusy("add");
    setHint("");
    try {
      const track = await createTrack(draft);
      setTracks((prev) => [...prev, track]);
      setDraft(emptyDraft);
      setHint("已加入歌单");
    } catch (err) {
      setHint(err.message || "加入失败");
    } finally {
      setBusy("");
    }
  };

  const patch = async (id, next) => {
    if (busy) return;
    setBusy(String(id));
    setHint("");
    try {
      const track = await saveTrack(id, next);
      setTracks((prev) => prev.map((item) => (item.id === id ? track : item)));
      setHint("已保存");
    } catch (err) {
      setHint(err.message || "保存失败");
    } finally {
      setBusy("");
    }
  };

  const move = async (index, dir) => {
    const nextIndex = index + dir;
    if (nextIndex < 0 || nextIndex >= tracks.length || busy) return;
    const current = tracks[index];
    const other = tracks[nextIndex];
    setBusy("move");
    try {
      await saveTrack(current.id, { sort: other.sort });
      await saveTrack(other.id, { sort: current.sort });
      await load();
    } catch (err) {
      setHint(err.message || "排序失败");
    } finally {
      setBusy("");
    }
  };

  const remove = async (id) => {
    if (busy) return;
    setBusy(String(id));
    try {
      await deleteTrack(id);
      setTracks((prev) => prev.filter((item) => item.id !== id));
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
          <h1>歌单</h1>
          <p>侧边播放器读这里的曲目。音频可先传到文件库，再把公开链接贴进来。</p>
        </div>
        <div className="adm-top-actions">
          <button className="adm-btn" type="button" onClick={load} disabled={busy === "list"}>
            {busy === "list" ? <LoaderCircle size={15} className="adm-spin" /> : <RefreshCw size={15} strokeWidth={1.9} />}
            刷新
          </button>
        </div>
      </header>

      <form className="adm-track-form" onSubmit={add}>
        <label>
          <span>歌名</span>
          <input value={draft.title} placeholder="曲名" onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
        </label>
        <label>
          <span>歌手</span>
          <input value={draft.artist} placeholder="可空" onChange={(e) => setDraft({ ...draft, artist: e.target.value })} />
        </label>
        <label>
          <span>音频地址</span>
          <input value={draft.src} placeholder="/files/… 或 https://" onChange={(e) => setDraft({ ...draft, src: e.target.value })} />
        </label>
        <label>
          <span>封面</span>
          <input value={draft.cover} placeholder="可空" onChange={(e) => setDraft({ ...draft, cover: e.target.value })} />
        </label>
        {files.length ? (
          <label>
            <span>从文件库选音频</span>
            <select
              value=""
              onChange={(e) => {
                const file = files.find((item) => item.url === e.target.value);
                if (!file) return;
                setDraft((prev) => ({
                  ...prev,
                  src: file.url,
                  title: prev.title || file.name.replace(/\.[^.]+$/, ""),
                }));
              }}
            >
              <option value="">选择已上传的音频…</option>
              {files.map((item) => (
                <option key={item.id} value={item.url}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <button className="adm-btn is-primary" type="submit" disabled={busy === "add"}>
          <Plus size={15} strokeWidth={2} />
          加入歌单
        </button>
      </form>

      {hint ? <p className="adm-muted">{hint}</p> : null}

      {tracks.length ? (
        <ul className="adm-rows">
          {tracks.map((item, index) => (
            <TrackRow
              key={item.id}
              item={item}
              busy={busy === String(item.id)}
              onSave={(next) => patch(item.id, next)}
              onUp={() => move(index, -1)}
              onDown={() => move(index, 1)}
              onRemove={() => remove(item.id)}
            />
          ))}
        </ul>
      ) : (
        <p className="adm-empty">{busy === "list" ? "正在读取…" : "歌单还是空的。"}</p>
      )}
    </>
  );
}

function TrackRow({ item, busy, onSave, onUp, onDown, onRemove }) {
  const [title, setTitle] = useState(item.title);
  const [artist, setArtist] = useState(item.artist);
  const [src, setSrc] = useState(item.src);
  const [cover, setCover] = useState(item.cover);

  useEffect(() => {
    setTitle(item.title);
    setArtist(item.artist);
    setSrc(item.src);
    setCover(item.cover);
  }, [item]);

  return (
    <li className="adm-row adm-track-row">
      <div className="adm-row-main">
        <span className="adm-row-chip">
          <Music size={15} strokeWidth={1.8} />
        </span>
        <span className="adm-track-fields">
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
          <input value={artist} placeholder="歌手" onChange={(e) => setArtist(e.target.value)} />
          <input value={src} placeholder="音频地址" onChange={(e) => setSrc(e.target.value)} />
          <input value={cover} placeholder="封面" onChange={(e) => setCover(e.target.value)} />
        </span>
      </div>
      <div className="adm-row-actions">
        <button className="adm-icon" type="button" title="上移" onClick={onUp}>
          <ChevronUp size={15} strokeWidth={1.8} />
        </button>
        <button className="adm-icon" type="button" title="下移" onClick={onDown}>
          <ChevronDown size={15} strokeWidth={1.8} />
        </button>
        <button
          className="adm-icon"
          type="button"
          title="保存"
          disabled={busy}
          onClick={() => onSave({ title, artist, src, cover })}
        >
          <Save size={15} strokeWidth={1.8} />
        </button>
        <button className="adm-icon is-danger" type="button" title="删除" disabled={busy} onClick={onRemove}>
          <Trash2 size={15} strokeWidth={1.8} />
        </button>
      </div>
    </li>
  );
}
