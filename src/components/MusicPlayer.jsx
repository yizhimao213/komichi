import { useEffect, useRef, useState } from "react";
import { ChevronDown, Music, Pause, Play, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { listPlaylist } from "../contentApi.js";

function fmt(sec) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function ratioOf(progress, duration) {
  if (!duration || duration <= 0) return 0;
  return Math.min(1, Math.max(0, progress / duration));
}

export default function MusicPlayer() {
  const audioRef = useRef(null);
  const seekRef = useRef(null);
  const seekingRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [tracks, setTracks] = useState([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);

  useEffect(() => {
    let alive = true;
    listPlaylist()
      .then((list) => {
        if (alive) setTracks(list);
      })
      .catch(() => {
        if (alive) setTracks([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  const track = tracks[index] || null;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;
    audio.volume = volume;
    const onTime = () => {
      if (!seekingRef.current) setProgress(audio.currentTime || 0);
    };
    const onMeta = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onEnd = () => setIndex((prev) => (tracks.length ? (prev + 1) % tracks.length : 0));
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("durationchange", onMeta);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("durationchange", onMeta);
      audio.removeEventListener("ended", onEnd);
    };
  }, [tracks.length, volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    audio.src = track.src;
    audio.load();
    setProgress(0);
    setDuration(0);
    if (playing) audio.play().catch(() => setPlaying(false));
  }, [track?.id, track?.src]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  };

  const seekFromClientX = (clientX) => {
    const el = seekRef.current;
    const audio = audioRef.current;
    if (!el || !audio) return;
    const rect = el.getBoundingClientRect();
    const ratio = rect.width ? Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) : 0;
    const next = (Number.isFinite(audio.duration) ? audio.duration : duration) * ratio;
    setProgress(next);
    return next;
  };

  const onSeekPointerDown = (e) => {
    if (e.button != null && e.button !== 0) return;
    seekingRef.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    seekFromClientX(e.clientX);
  };

  const onSeekPointerMove = (e) => {
    if (!seekingRef.current) return;
    seekFromClientX(e.clientX);
  };

  const onSeekPointerUp = (e) => {
    if (!seekingRef.current) return;
    const next = seekFromClientX(e.clientX);
    const audio = audioRef.current;
    if (audio && Number.isFinite(next)) audio.currentTime = next;
    seekingRef.current = false;
  };

  if (!tracks.length) return <audio ref={audioRef} preload="metadata" hidden />;

  const ratio = ratioOf(progress, duration);

  return (
    <>
      <audio ref={audioRef} preload="metadata" />

      <div className={`np ${open ? "is-open" : ""} ${playing ? "is-on" : ""}`}>
        {open ? (
          <aside className="np-card" aria-label="播放器">
            <button className="np-fold" type="button" onClick={() => setOpen(false)} aria-label="收起">
              <ChevronDown size={16} strokeWidth={1.9} />
            </button>

            <div className="np-disc-wrap">
              {track?.cover ? (
                <img className={`np-disc ${playing ? "is-spin" : ""}`} src={track.cover} alt="" />
              ) : (
                <span className={`np-disc is-empty ${playing ? "is-spin" : ""}`}>
                  <Music size={28} strokeWidth={1.6} />
                </span>
              )}
            </div>

            <div className="np-meta">
              <strong>{track?.title || "未选曲"}</strong>
              <span>{track?.artist || "未知艺人"}</span>
            </div>

            <div
              ref={seekRef}
              className="np-bar"
              role="slider"
              tabIndex={0}
              aria-label="进度"
              aria-valuemin={0}
              aria-valuemax={Math.round(duration || 0)}
              aria-valuenow={Math.round(progress || 0)}
              onPointerDown={onSeekPointerDown}
              onPointerMove={onSeekPointerMove}
              onPointerUp={onSeekPointerUp}
              onPointerCancel={onSeekPointerUp}
              onKeyDown={(e) => {
                const audio = audioRef.current;
                if (!audio || !duration) return;
                const step = e.shiftKey ? 10 : 5;
                if (e.key === "ArrowRight" || e.key === "ArrowUp") {
                  e.preventDefault();
                  const next = Math.min(duration, (audio.currentTime || 0) + step);
                  audio.currentTime = next;
                  setProgress(next);
                }
                if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
                  e.preventDefault();
                  const next = Math.max(0, (audio.currentTime || 0) - step);
                  audio.currentTime = next;
                  setProgress(next);
                }
              }}
            >
              <i style={{ width: `${ratio * 100}%` }} />
            </div>
            <div className="np-time">
              <span>{fmt(progress)}</span>
              <span>{fmt(duration)}</span>
            </div>

            <div className="np-controls">
              <button
                className="np-icon"
                type="button"
                aria-label="上一首"
                onClick={() => setIndex((prev) => (prev - 1 + tracks.length) % tracks.length)}
              >
                <SkipBack size={16} strokeWidth={1.8} />
              </button>
              <button className="np-play" type="button" aria-label={playing ? "暂停" : "播放"} onClick={toggle}>
                {playing ? <Pause size={18} strokeWidth={1.8} /> : <Play size={18} strokeWidth={1.8} />}
              </button>
              <button
                className="np-icon"
                type="button"
                aria-label="下一首"
                onClick={() => setIndex((prev) => (prev + 1) % tracks.length)}
              >
                <SkipForward size={16} strokeWidth={1.8} />
              </button>
            </div>

            <label className="np-vol">
              <Volume2 size={14} strokeWidth={1.8} />
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
              />
            </label>

            <ul className="np-list">
              {tracks.map((item, i) => (
                <li key={item.id}>
                  <button
                    className={`np-item ${i === index ? "is-on" : ""}`}
                    type="button"
                    onClick={() => {
                      setIndex(i);
                      setPlaying(true);
                    }}
                  >
                    <span>{item.title}</span>
                    <em>{item.artist}</em>
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        ) : (
          <div className="np-dock">
            <button className="np-dock-open" type="button" aria-label="打开播放器" onClick={() => setOpen(true)}>
              {track?.cover ? (
                <img className={playing ? "is-spin" : ""} src={track.cover} alt="" />
              ) : (
                <span className={`np-dock-icon ${playing ? "is-on" : ""}`}>
                  <Music size={18} strokeWidth={1.8} />
                </span>
              )}
              <span className="np-dock-text">
                <strong>{track?.title || "歌单"}</strong>
                <em>{playing ? "正在播放" : "点开听"}</em>
              </span>
            </button>
            <button className="np-dock-play" type="button" aria-label={playing ? "暂停" : "播放"} onClick={toggle}>
              {playing ? <Pause size={14} strokeWidth={1.9} /> : <Play size={14} strokeWidth={1.9} />}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
