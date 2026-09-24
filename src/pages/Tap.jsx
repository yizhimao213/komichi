import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createTapEngine } from "../tap/engine.js";
import { emptyTapConfig, slotFromKey, slotFromPoint } from "../tap/keymap.js";
import { createVisuals } from "../tap/visuals.js";
import { listTapSlots } from "../contentApi.js";

function canFullscreen() {
  return Boolean(document.fullscreenEnabled || document.webkitFullscreenEnabled);
}

export default function Tap() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const pageRef = useRef(null);
  const engineRef = useRef(null);
  const visualsRef = useRef(null);
  const lastSlotRef = useRef(-1);
  const playingRef = useRef(false);
  const startingRef = useRef(false);
  const bedOnRef = useRef(true);
  const idleTimer = useRef(0);
  const [phase, setPhase] = useState("start");
  const [about, setAbout] = useState(false);
  const [bedOn, setBedOn] = useState(true);
  const [hud, setHud] = useState(false);
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState(emptyTapConfig);
  const configRef = useRef(config);

  useEffect(() => {
    bedOnRef.current = bedOn;
  }, [bedOn]);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    document.documentElement.classList.add("is-tap");
    return () => document.documentElement.classList.remove("is-tap");
  }, []);

  useEffect(() => {
    let alive = true;
    listTapSlots().then((next) => {
      if (alive) setConfig(next);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const engine = createTapEngine();
    engineRef.current = engine;
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !playingRef.current) return undefined;
    engine.applyConfig(config);
    return undefined;
  }, [config]);

  const showHudSoon = () => {
    window.clearTimeout(idleTimer.current);
    setHud(false);
    idleTimer.current = window.setTimeout(() => setHud(true), 1600);
  };

  const trigger = (slot, x, y) => {
    const engine = engineRef.current;
    const visuals = visualsRef.current;
    if (!engine || slot < 0) return;
    engine.playHit(slot);
    if (visuals) visuals.spawn(x, y, slot);
    showHudSoon();
  };

  const begin = async () => {
    const canvas = canvasRef.current;
    const engine = engineRef.current;
    if (!canvas || !engine || playingRef.current || startingRef.current) return;
    startingRef.current = true;
    setLoading(true);
    try {
      await engine.resume();
      await engine.applyConfig(configRef.current);
      const reduced =
        typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const visuals = createVisuals(canvas, { reduced });
      visualsRef.current = visuals;
      visuals.start();
      playingRef.current = true;
      if (bedOnRef.current) engine.startBed();
      setPhase("play");
      setAbout(false);
      showHudSoon();
    } finally {
      startingRef.current = false;
      setLoading(false);
    }
  };

  const backToStart = () => {
    const engine = engineRef.current;
    playingRef.current = false;
    engine?.stopBed();
    visualsRef.current?.reset();
    window.clearTimeout(idleTimer.current);
    setHud(false);
    setPhase("start");
  };

  const onBack = () => {
    if (playingRef.current) backToStart();
    else navigate("/");
  };

  const toggleBed = () => {
    const next = !bedOn;
    setBedOn(next);
    bedOnRef.current = next;
    const engine = engineRef.current;
    if (!engine || !playingRef.current) return;
    if (next) engine.startBed();
    else engine.stopBed();
  };

  const toggleFs = () => {
    const node = pageRef.current;
    if (!node) return;
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
      return;
    }
    node.requestFullscreen?.() || node.webkitRequestFullscreen?.();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const onResize = () => visualsRef.current?.resize();
    window.addEventListener("resize", onResize);

    const local = (e) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top, w: rect.width, h: rect.height };
    };

    const onDown = (e) => {
      if (!playingRef.current) return;
      canvas.setPointerCapture(e.pointerId);
      const { x, y, w, h } = local(e);
      const slot = slotFromPoint(x, y, w, h);
      lastSlotRef.current = slot;
      trigger(slot, x, y);
    };

    const onMove = (e) => {
      if (!playingRef.current || e.buttons === 0) return;
      const { x, y, w, h } = local(e);
      const slot = slotFromPoint(x, y, w, h);
      if (slot === lastSlotRef.current) return;
      lastSlotRef.current = slot;
      trigger(slot, x, y);
    };

    const onUp = () => {
      lastSlotRef.current = -1;
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);

    return () => {
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      visualsRef.current?.stop();
      window.clearTimeout(idleTimer.current);
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.repeat || !playingRef.current || about) return;
      if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      let slot = slotFromKey(e.key);
      if (slot < 0 && e.key.length === 1) slot = e.key.charCodeAt(0) % 32;
      if (slot < 0) return;
      e.preventDefault();
      const canvas = canvasRef.current;
      const rect = canvas?.getBoundingClientRect();
      const cols = rect && rect.width > rect.height ? 8 : 4;
      const rows = 32 / cols;
      const x = rect ? ((slot % cols) + 0.5) * (rect.width / cols) : 0;
      const y = rect ? (Math.floor(slot / cols) + 0.5) * (rect.height / rows) : 0;
      trigger(slot, x, y);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [about]);

  return (
    <div className="tap-page" ref={pageRef}>
      <canvas ref={canvasRef} className="tap-canvas" aria-label="硅胶画布" />

      {phase === "play" ? (
        <>
          <button className={`tap-corner tap-back ${hud ? "is-on" : ""}`} type="button" onClick={onBack}>
            ＜ 返回
          </button>
          {canFullscreen() ? (
            <button className={`tap-corner tap-fs ${hud ? "is-on" : ""}`} type="button" onClick={toggleFs}>
              □ 全屏显示
            </button>
          ) : null}
          <div className={`tap-play-hint ${hud ? "is-on" : ""}`}>
            <p>点击 & 拖动或者按任意键!</p>
            <button className="tap-link" type="button" onClick={toggleBed}>
              背景音乐: {bedOn ? "开启" : "关闭"}
            </button>
          </div>
        </>
      ) : null}

      {phase === "start" || loading ? (
        <div className="tap-scene">
          {loading ? (
            <div className="tap-load">
              <hr />
            </div>
          ) : (
            <div className="tap-top">
              <h1>komichi</h1>
              <button className="tap-start" type="button" onClick={begin}>
                !开始!
              </button>
              <button className="tap-link" type="button" onClick={() => setAbout(true)}>
                *关于*
              </button>
              <p className="tap-note">※请打开声音并享受。</p>
            </div>
          )}
        </div>
      ) : null}

      {about ? (
        <div className="tap-about" onClick={() => setAbout(false)}>
          <div className="tap-about-card" onClick={(e) => e.stopPropagation()}>
            <button className="tap-about-close" type="button" onClick={() => setAbout(false)}>
              ×
            </button>
            <p>点击、拖动，或按键盘出声出图。</p>
            <p>格子平时不画，触发时整格闪白。几何按对照站 15 种缓动弹出。开场循环 280 BPM 底轨，可随时开关。</p>
            <p className="tap-about-meta">
              结构对照 Joitap / Mikutap
              <br />
              原作者 daniwell · 灵感 Patatap
            </p>
            <button className="tap-link" type="button" onClick={() => setAbout(false)}>
              ＜返回
            </button>
          </div>
        </div>
      ) : null}

      {phase === "start" ? (
        <button className="tap-corner tap-back is-on" type="button" onClick={onBack}>
          ＜ 返回
        </button>
      ) : null}
    </div>
  );
}
