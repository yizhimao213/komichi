import { useCallback, useEffect, useState } from "react";
import { Eraser, LoaderCircle, RefreshCw, Save } from "lucide-react";
import { listAdminTapSlots, listFiles, saveTapSlot } from "../contentApi.js";

function SlotRow({ item, files, busy, onSave }) {
  const [label, setLabel] = useState(item.label);
  const [src, setSrc] = useState(item.src);

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
        </span>
      </div>
      <div className="adm-row-actions">
        <button
          className="adm-icon"
          type="button"
          title="保存"
          disabled={busy}
          onClick={() => onSave({ src, label })}
        >
          <Save size={15} strokeWidth={1.8} />
        </button>
        <button
          className="adm-icon"
          type="button"
          title="清空为占位音"
          disabled={busy}
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

function SlotList({ title, hint, items, files, busy, onSave }) {
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
            busy={busy === `${item.kind}-${item.slot}`}
            onSave={(next) => onSave(item.kind, item.slot, next)}
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
      setHint(err.message || "读不到点按槽");
    } finally {
      setBusy("");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
          <h1>点按</h1>
          <p>32 个点按音、11 条底轨。空地址用合成占位音。和歌单分开。</p>
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

      {hint ? <p className="adm-muted">{hint}</p> : null}

      {hits.length ? (
        <>
          <SlotList
            title="点按音"
            hint="A–Z 对应 00–25，[ ] ; ' , . 对应 26–31。"
            items={hits}
            files={files}
            busy={busy}
            onSave={save}
          />
          <SlotList
            title="底轨"
            hint="开关打开时从这 11 条里抽一条循环。"
            items={beds}
            files={files}
            busy={busy}
            onSave={save}
          />
        </>
      ) : (
        <p className="adm-empty">{busy === "list" ? "正在读取…" : "读不到槽位。"}</p>
      )}
    </>
  );
}
