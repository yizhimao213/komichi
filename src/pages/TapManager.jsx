import { useCallback, useEffect, useState } from "react";
import { Eraser, LoaderCircle, RefreshCw, Save } from "lucide-react";
import { listAdminTapSlots, listFiles, saveTapSlot, uploadFile } from "../contentApi.js";
import AdminDrop from "../components/AdminDrop.jsx";

const AUDIO_ACCEPT = "audio/*,.mp3,.wav,.ogg,.flac,.aac,.m4a,.webm";

function SlotRow({ item, files, busy, onSave, onUpload }) {
  const [label, setLabel] = useState(item.label);
  const [src, setSrc] = useState(item.src);
  const locked = Boolean(busy);
  const uploading = busy === `${item.kind}-${item.slot}`;

  useEffect(() => {
    setLabel(item.label);
    setSrc(item.src);
  }, [item]);

  return (
    <li className="adm-row adm-track-row">
      <div className="adm-row-main">
        <span className="adm-row-chip">{String(item.slot).padStart(2, "0")}</span>
        <span className="adm-track-fields">
          <input value={label} placeholder="显示名，可空" onChange={(e) => setLabel(e.target.value)} />
          <input value={src} placeholder="/files/… 或 https://" onChange={(e) => setSrc(e.target.value)} />
          {files.length ? (
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) setSrc(e.target.value);
              }}
            >
              <option value="">从文件库选音频…</option>
              {files.map((file) => (
                <option key={file.id} value={file.url}>
                  {file.name}
                </option>
              ))}
            </select>
          ) : null}
          <AdminDrop
            compact
            multiple={false}
            accept={AUDIO_ACCEPT}
            disabled={locked}
            label={uploading ? "正在入库…" : "拖入或粘贴到此槽"}
            onPick={(list) => {
              if (list[0]) onUpload(list[0], { src, label });
            }}
          />
        </span>
      </div>
      <div className="adm-row-actions">
        <button
          className="adm-icon"
          type="button"
          title="保存"
          disabled={locked}
          onClick={() => onSave({ src, label })}
        >
          <Save size={15} strokeWidth={1.8} />
        </button>
        <button
          className="adm-icon"
          type="button"
          title="清空为占位音"
          disabled={locked}
          onClick={() => {
            setSrc("");
            onSave({ src: "", label });
          }}
        >
          <Eraser size={15} strokeWidth={1.8} />
        </button>
      </div>
    </li>
  );
}

function SlotList({ title, hint, items, files, busy, onSave, onUpload }) {
  return (
    <section className="tap-admin-block">
      <h2>{title}</h2>
      <p className="adm-muted">{hint}</p>
      <ul className="adm-rows">
        {items.map((item) => (
          <SlotRow
            key={`${item.kind}-${item.slot}`}
            item={item}
            files={files}
            busy={busy}
            onSave={(next) => onSave(item.kind, item.slot, next)}
            onUpload={(file, next) => onUpload(item.kind, item.slot, file, next)}
          />
        ))}
      </ul>
    </section>
  );
}

export default function TapManager() {
  const [hits, setHits] = useState([]);
  const [beds, setBeds] = useState([]);
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState("");
  const [hint, setHint] = useState("");

  const load = useCallback(async () => {
    setBusy("list");
    setHint("");
    try {
      const [config, nextFiles] = await Promise.all([listAdminTapSlots(), listFiles({ kind: "other" })]);
      setHits(config.hits);
      setBeds(config.beds);
      setFiles(nextFiles.filter((item) => String(item.mime || "").startsWith("audio/")));
    } catch (err) {
      setHint(err.message || "读不到硅胶槽");
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
        await uploadFile(file, undefined, "硅胶");
        ok += 1;
      } catch {
        fail += 1;
      }
    }
    await load();
    if (fail && ok) setHint(`${ok} 个已入库，${fail} 个失败`);
    else if (fail) setHint("上传失败");
    else if (ok) setHint(`${ok} 个已放入「硅胶」，可在槽位下拉里选`);
  };

  const uploadToSlot = async (kind, slot, file, next) => {
    if (!file || busy) return;
    setBusy(`${kind}-${slot}`);
    setHint("");
    try {
      const item = await uploadFile(file, undefined, "硅胶");
      const saved = await saveTapSlot(kind, slot, { src: item.url, label: next.label });
      const apply = (list) => list.map((row) => (row.slot === slot ? { ...row, ...saved } : row));
      if (kind === "hit") setHits(apply);
      else setBeds(apply);
      await load();
      setHint(`槽 ${String(slot).padStart(2, "0")} 已换上 ${item.name}`);
    } catch (err) {
      setHint(err.message || "上传失败");
    } finally {
      setBusy("");
    }
  };

  const save = async (kind, slot, next) => {
    if (busy) return;
    setBusy(`${kind}-${slot}`);
    setHint("");
    try {
      const saved = await saveTapSlot(kind, slot, next);
      const apply = (list) => list.map((item) => (item.slot === slot ? { ...item, ...saved } : item));
      if (kind === "hit") setHits(apply);
      else setBeds(apply);
      setHint(next.src ? "已保存" : "已回到占位音");
    } catch (err) {
      setHint(err.message || "保存失败");
    } finally {
      setBusy("");
    }
  };

  return (
    <>
      <header className="adm-top">
        <div>
          <h1>硅胶</h1>
          <p>32 个硅胶音、11 条底轨。可拖入、点选或粘贴音频。空地址用合成占位音。和歌单分开。</p>
        </div>
        <div className="adm-top-actions">
          <a className="adm-btn" href="/komichi" target="_blank" rel="noreferrer">
            打开 /komichi
          </a>
          <button className="adm-btn" type="button" onClick={load} disabled={busy === "list"}>
            {busy === "list" ? <LoaderCircle size={15} className="adm-spin" /> : <RefreshCw size={15} strokeWidth={1.9} />}
            刷新
          </button>
        </div>
      </header>

      <AdminDrop
        accept={AUDIO_ACCEPT}
        windowPaste
        disabled={Boolean(busy)}
        label={busy === "upload" ? "正在入库…" : "拖入、点选或粘贴音频到「硅胶」文件夹"}
        onPick={ingest}
      />

      {hint ? <p className="adm-muted">{hint}</p> : null}

      {hits.length ? (
        <>
          <SlotList
            title="硅胶音"
            hint="A–Z 对应 00–25，[ ] ; ' , . 对应 26–31。也可直接拖到某一槽。"
            items={hits}
            files={files}
            busy={busy}
            onSave={save}
            onUpload={uploadToSlot}
          />
          <SlotList
            title="底轨"
            hint="开关打开时走 Joitap 280 BPM 音序。自定义地址会盖掉对应采样。"
            items={beds}
            files={files}
            busy={busy}
            onSave={save}
            onUpload={uploadToSlot}
          />
        </>
      ) : (
        <p className="adm-empty">{busy === "list" ? "正在读取…" : "读不到槽位。"}</p>
      )}
    </>
  );
}
