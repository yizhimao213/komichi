import { useEffect, useRef } from "react";
import { cssColorRgb } from "../cssRgb.js";

export default function DotsBand() {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const baseRef = useRef(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const baseEl = baseRef.current;
    if (!wrap || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const SPACING = 17;
    const ROWS = 3;

    let width = 0;
    let height = 0;
    let dots = [];

    const build = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = wrap.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      dots = [];
      const cols = Math.ceil(width / SPACING) + 1;
      for (let c = 0; c < cols; c += 1) {
        for (let r = 0; r < ROWS; r += 1) {
          dots.push({
            x: c * SPACING,
            row: r,
            phase: Math.random() * Math.PI * 2,
            twinkle: 0.6 + Math.random() * 0.9,
            ring: Math.random() < 0.075,
          });
        }
      }
    };

    let t = Math.random() * 100;
    let rafId = 0;
    let running = false;
    let destroyed = false;
    let inView = true;
    let resizeRaf = 0;
    let io = null;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const rgb = baseEl ? cssColorRgb(baseEl) : "170, 118, 32";
      const rowGap = height / (ROWS + 1);

      for (const d of dots) {
        const wave = Math.sin(d.x * 0.018 - t * 1.55 + d.row * 0.85);
        const drift = Math.sin(d.x * 0.0065 + t * 0.6 + d.phase);
        const y = rowGap * (d.row + 1) + wave * 7 + drift * 3;
        const crest = (wave + 1) / 2;
        const pulse = (Math.sin(t * d.twinkle * 2 + d.phase) + 1) / 2;
        const alpha = 0.16 + crest * 0.42 + pulse * 0.28 * crest;
        const radius = 1.15 + crest * 1.35 + pulse * 0.7;

        if (d.ring) {
          ctx.strokeStyle = `rgba(${rgb}, ${Math.min(alpha * 1.15, 0.6)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(d.x, y, radius + 1.4, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.fillStyle = `rgba(${rgb}, ${alpha})`;
          ctx.beginPath();
          ctx.arc(d.x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const tick = () => {
      t += 0.016;
      draw();
      rafId = requestAnimationFrame(tick);
    };

    const start = () => {
      if (running || destroyed || reducedMotion) return;
      running = true;
      rafId = requestAnimationFrame(tick);
    };
    const stop = () => {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
    };
    const onVisibility = () => {
      if (document.hidden || !inView) stop();
      else start();
    };
    const onResize = () => {
      if (resizeRaf) return;
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = 0;
        build();
        draw();
      });
    };

    build();
    draw();

    if (!reducedMotion) {
      io = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          inView = entry.isIntersecting;
          if (inView && !document.hidden) start();
          else stop();
        }
      });
      io.observe(wrap);
      document.addEventListener("visibilitychange", onVisibility);
    }

    const look = new MutationObserver(() => draw());
    look.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "data-season"],
    });

    window.addEventListener("resize", onResize);
    return () => {
      destroyed = true;
      stop();
      look.disconnect();
      if (resizeRaf) cancelAnimationFrame(resizeRaf);
      if (io) io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div className="dots-band wrap-wide" ref={wrapRef} aria-hidden="true">
      <span className="dots-band-probe" ref={baseRef} />
      <canvas ref={canvasRef} />
    </div>
  );
}
