import { useEffect, useRef, useState } from "react";
import { Music, Pause, Play, SkipBack, SkipForward, Volume2, X } from "lucide-react";
import { listPlaylist } from "../contentApi.js";

function fmt(sec) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function MusicPlayer() {
  const audioRef = useRef(null);
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
    const onTime = () => setProgress(audio.currentTime || 0);
    const onMeta = () => setDuration(audio.duration || 0);
    const onEnd = () => setIndex((prev) => (tracks.length ? (prev + 1) % tracks.length : 0));
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnd);
    };
  }, [tracks.length, volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    audio.src = track.src;
    audio.load();
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

  const seek = (value) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Number(value);
    setProgress(Number(value));
  };

  if (!tracks.length) return <audio ref={audioRef} preload="metadata" hidden />;

  return (
    <>
      <audio ref={audioRef} preload="metadata" />
      <button
        className={`np-fab ${open ? "is-open" : ""} ${playing ? "is-on" : ""}`}
        type="button"
        aria-label="打开播放器"
        onClick={() => setOpen(true)}
      >
        <Music size={18} strokeWidth={1.8} />
      </button>

      <button
        className={`np-scrim ${open ? "is-on" : ""}`}
        type="button"
        tabIndex={open ? 0 : -1}
        aria-label="关闭播放器"
        onClick={() => setOpen(false)}
      />

      <aside className={`np-drawer ${open ? "is-open" : ""}`} aria-hidden={!open}>
        <header className="np-head">
          <strong>正在听</strong>
          <button className="np-icon" type="button" onClick={() => setOpen(false)} aria-label="关闭">
            <X size={16} strokeWidth={1.9} />
          </button>
        </header>

        {track ? (
          <div className="np-now">
            {track.cover ? <img src={track.cover} alt="" /> : <span className="np-cover" />}
            <div>
              <strong>{track.title}</strong>
              <span>{track.artist || "未知艺人"}</span>
            </div>
          </div>
        ) : null}

        <div className="np-controls">
          <button className="np-icon" type="button" onClick={() => setIndex((prev) => (prev - 1 + tracks.length) % tracks.length)}>
            <SkipBack size={16} strokeWidth={1.8} />
          </button>
          <button className="np-play" type="button" onClick={toggle}>
            {playing ? <Pause size={18} strokeWidth={1.8} /> : <Play size={18} strokeWidth={1.8} />}
          </button>
          <button className="np-icon" type="button" onClick={() => setIndex((prev) => (prev + 1) % tracks.length)}>
            <SkipForward size={16} strokeWidth={1.8} />
          </button>
        </div>

        <label className="np-seek">
          <span>{fmt(progress)}</span>
          <input type="range" min="0" max={duration || 0} step="0.1" value={progress} onChange={(e) => seek(e.target.value)} />
          <span>{fmt(duration)}</span>
        </label>

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
    </>
  );
}
