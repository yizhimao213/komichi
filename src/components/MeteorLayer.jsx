import { useEffect, useRef } from "react";

export default function MeteorLayer({ density = 0.45, height = "46vh" }) {
  const layerRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const layer = layerRef.current;
    const canvas = canvasRef.current;
    if (!layer || !canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dens = Math.max(0.1, Number(density) || 1);
    const maxMeteors = Math.max(4, Math.round(8 * dens));
    let width = 0;
    let heightPx = 0;
    const meteors = [];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = layer.getBoundingClientRect();
      width = rect.width;
      heightPx = rect.height;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(heightPx * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const spawn = () => {
      const angle = Math.PI / 2 + (Math.random() * 0.5 - 0.1);
      const trail = 5 + Math.floor(Math.random() * 4);
      const jitter = [];
      for (let i = 0; i < trail; i++) {
        jitter.push({ x: (Math.random() - 0.5) * 3.2, y: (Math.random() - 0.5) * 3.2 });
      }
      meteors.push({
        x: width * (0.04 + Math.random() * 0.92),
        y: -24,
        dx: Math.cos(angle),
        dy: Math.sin(angle),
        speed: 150 + Math.random() * 210,
        trail,
        jitter,
        spacing: 9 + Math.random() * 5,
        size: 1.7 + Math.random() * 1.2,
        cool: Math.random() < 0.12,
        fadeAt: heightPx * (0.45 + Math.random() * 0.45),
        alpha: 1,
      });
    };

    let lastTime = 0;
    let spawnTimer = 0;
    let nextSpawn = 400;
    let rafId = 0;
    let running = false;
    let destroyed = false;
    let resizeRaf = 0;

    const step = (now) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      spawnTimer += dt * 1000;
      if (spawnTimer >= nextSpawn) {
        spawnTimer = 0;
        nextSpawn = (380 + Math.random() * 1100) / dens;
        if (meteors.length < maxMeteors) spawn();
      }

      const dark = document.documentElement.dataset.theme === "dark";
      const goldRgb = dark ? "226, 190, 110" : "170, 118, 32";
      const coolRgb = dark ? "147, 197, 253" : "59, 130, 246";
      ctx.clearRect(0, 0, width, heightPx);

      for (let m = meteors.length - 1; m >= 0; m--) {
        const meteor = meteors[m];
        meteor.x += meteor.dx * meteor.speed * dt;
        meteor.y += meteor.dy * meteor.speed * dt;
        if (meteor.y > meteor.fadeAt) meteor.alpha -= dt * 2.4;
        if (meteor.alpha <= 0 || meteor.y - meteor.trail * meteor.spacing > heightPx + 30) {
          meteors.splice(m, 1);
          continue;
        }
        const rgb = meteor.cool ? coolRgb : goldRgb;
        for (let i = 0; i < meteor.trail; i++) {
          const px = meteor.x - meteor.dx * meteor.spacing * i + meteor.jitter[i].x;
          const py = meteor.y - meteor.dy * meteor.spacing * i + meteor.jitter[i].y;
          const falloff = Math.pow(0.74, i);
          const alpha = meteor.alpha * 0.62 * falloff;
          const radius = meteor.size * (i === 0 ? 1.18 : Math.pow(0.88, i));
          if (alpha < 0.015 || py < -10) continue;
          ctx.fillStyle = `rgba(${rgb}, ${alpha})`;
          ctx.beginPath();
          ctx.arc(px, py, radius, 0, Math.PI * 2);
          ctx.fill();
          if (i === 0) {
            ctx.fillStyle = `rgba(${rgb}, ${alpha * 0.22})`;
            ctx.beginPath();
            ctx.arc(px, py, radius * 2.6, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      rafId = requestAnimationFrame(step);
    };

    const start = () => {
      if (running || destroyed) return;
      running = true;
      lastTime = performance.now();
      rafId = requestAnimationFrame(step);
    };
    const stop = () => {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
    };
    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };
    const onResize = () => {
      if (resizeRaf) return;
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = 0;
        resize();
      });
    };

    resize();
    start();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("resize", onResize);
    return () => {
      destroyed = true;
      stop();
      if (resizeRaf) cancelAnimationFrame(resizeRaf);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", onResize);
    };
  }, [density]);

  return (
    <div className="meteor-layer" ref={layerRef} style={{ height }} aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
