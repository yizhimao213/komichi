import { useEffect, useRef } from "react";

const TAU = Math.PI * 2;

const LAYERS = [
  { scale: 0.62, alpha: 0.65, fall: 0.7, weight: 0.4 },
  { scale: 0.82, alpha: 0.85, fall: 0.85, weight: 0.35 },
  { scale: 1, alpha: 1, fall: 1, weight: 0.25 },
];

const PALETTE = {
  spring: {
    light: { h: [330, 350], s: [45, 70], l: [72, 86], glow: [340, 55, 78], density: 1.28, fall: 0.85 },
    dark: { h: [320, 345], s: [50, 72], l: [58, 72], glow: [330, 60, 62], density: 0.9, fall: 0.7 },
  },
  summer: {
    light: { h: [150, 172], s: [42, 62], l: [48, 64], glow: [160, 50, 58], density: 0.72, fall: 0.35 },
    dark: { h: [152, 170], s: [50, 70], l: [52, 68], glow: [158, 58, 56], density: 0.58, fall: 0.18 },
  },
  autumn: {
    light: { h: [33, 40], s: [65, 80], l: [52, 62], glow: [36, 70, 58], density: 1.18, fall: 1 },
    dark: { h: [28, 36], s: [55, 70], l: [55, 65], glow: [32, 62, 60], density: 0.88, fall: 0.75 },
  },
  winter: {
    light: { h: [200, 220], s: [8, 22], l: [88, 98], glow: [210, 20, 92], density: 1.5, fall: 1.15 },
    dark: { h: [205, 225], s: [12, 30], l: [82, 96], glow: [210, 40, 80], density: 1.15, fall: 0.9 },
  },
};

function rand(a, b) {
  return a + Math.random() * (b - a);
}

function pickLayer() {
  let t = Math.random();
  let acc = 0;
  for (const layer of LAYERS) {
    acc += layer.weight;
    if (t <= acc) return layer;
  }
  return LAYERS[LAYERS.length - 1];
}

function readSeason() {
  const s = document.documentElement.dataset.season;
  return PALETTE[s] ? s : "autumn";
}

function isDarkTheme() {
  return document.documentElement.dataset.theme === "dark";
}

function paletteOf() {
  const season = readSeason();
  return PALETTE[season][isDarkTheme() ? "dark" : "light"];
}

function makeParticle(w, h, fromTop) {
  const layer = pickLayer();
  const season = readSeason();
  return {
    baseX: Math.random() * w,
    y: fromTop ? Math.random() * h : -rand(10, 0.35 * h),
    size: rand(3.2, 10.5) * (0.7 + 0.3 * layer.scale),
    spriteIndex: Math.floor(Math.random() * 4),
    rotation: rand(0, TAU),
    rotationVel: season === "winter" ? rand(-0.35, 0.35) : rand(-0.95, 0.95),
    fallVel: rand(16, 42) * layer.fall,
    alphaBase: rand(0.32, 0.7),
    layerAlpha: layer.alpha,
    swayAmp1: rand(8, 28) * layer.scale,
    swayFreq1: rand(0.035, 0.1),
    swayPhase1: rand(0, TAU),
    swayAmp2: rand(2, 10) * layer.scale,
    swayFreq2: rand(0.11, 0.26),
    swayPhase2: rand(0, TAU),
    breathPhase: rand(0, TAU),
    twinkle: rand(0.6, 1.6),
  };
}

function paintPetal(ctx, pal, dark) {
  const hue = rand(pal.h[0], pal.h[1]);
  const sat = rand(pal.s[0], pal.s[1]);
  const light = rand(pal.l[0], pal.l[1]);
  if (dark) {
    const glow = ctx.createRadialGradient(48, 48, 0, 48, 48, 46);
    glow.addColorStop(0, `hsla(${hue}, ${sat}%, ${light + 6}%, 0.16)`);
    glow.addColorStop(1, `hsla(${hue}, ${sat}%, ${light + 6}%, 0)`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(48, 48, 46, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = `hsl(${hue}, ${sat}%, ${light}%)`;
  ctx.beginPath();
  ctx.moveTo(48, 18);
  ctx.quadraticCurveTo(72, 30, 70, 52);
  ctx.quadraticCurveTo(48, 78, 48, 78);
  ctx.quadraticCurveTo(24, 52, 26, 30);
  ctx.quadraticCurveTo(36, 18, 48, 18);
  ctx.fill();
  ctx.fillStyle = `hsla(${hue}, ${sat + 8}%, ${light - 10}%, 0.45)`;
  ctx.beginPath();
  ctx.moveTo(48, 28);
  ctx.quadraticCurveTo(56, 46, 48, 72);
  ctx.quadraticCurveTo(40, 46, 48, 28);
  ctx.fill();
}

function paintSpark(ctx, pal, dark) {
  const hue = rand(pal.h[0], pal.h[1]);
  const sat = rand(pal.s[0], pal.s[1]);
  const light = rand(pal.l[0], pal.l[1]);
  const glow = ctx.createRadialGradient(48, 48, 0, 48, 48, 46);
  glow.addColorStop(0, `hsla(${hue}, ${sat}%, ${light}%, ${dark ? 0.95 : 0.7})`);
  glow.addColorStop(0.28, `hsla(${hue}, ${sat}%, ${light}%, ${dark ? 0.35 : 0.18})`);
  glow.addColorStop(1, `hsla(${hue}, ${sat}%, ${light}%, 0)`);
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(48, 48, 46, 0, TAU);
  ctx.fill();
  ctx.fillStyle = `hsla(${hue}, ${Math.min(100, sat + 10)}%, ${Math.min(98, light + 12)}%, 0.95)`;
  ctx.beginPath();
  ctx.arc(48, 48, dark ? 4.2 : 3.2, 0, TAU);
  ctx.fill();
}

function paintFlake(ctx, pal, dark) {
  const hue = rand(pal.h[0], pal.h[1]);
  const sat = rand(pal.s[0], pal.s[1]);
  const light = rand(pal.l[0], pal.l[1]);
  if (dark) {
    const glow = ctx.createRadialGradient(48, 48, 0, 48, 48, 40);
    glow.addColorStop(0, `hsla(${hue}, ${sat}%, ${light}%, 0.22)`);
    glow.addColorStop(1, `hsla(${hue}, ${sat}%, ${light}%, 0)`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(48, 48, 40, 0, TAU);
    ctx.fill();
  }
  ctx.strokeStyle = `hsla(${hue}, ${sat}%, ${light}%, ${dark ? 0.82 : 0.55})`;
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  for (let i = 0; i < 6; i++) {
    const a = (i * TAU) / 6;
    ctx.beginPath();
    ctx.moveTo(48, 48);
    ctx.lineTo(48 + Math.cos(a) * 22, 48 + Math.sin(a) * 22);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(48 + Math.cos(a) * 12, 48 + Math.sin(a) * 12);
    ctx.lineTo(48 + Math.cos(a + 0.4) * 16, 48 + Math.sin(a + 0.4) * 16);
    ctx.moveTo(48 + Math.cos(a) * 12, 48 + Math.sin(a) * 12);
    ctx.lineTo(48 + Math.cos(a - 0.4) * 16, 48 + Math.sin(a - 0.4) * 16);
    ctx.stroke();
  }
  ctx.fillStyle = `hsla(${hue}, ${sat}%, ${light}%, ${dark ? 0.9 : 0.7})`;
  ctx.beginPath();
  ctx.arc(48, 48, 3.4, 0, TAU);
  ctx.fill();
}

function paintOsmanthus(ctx, pal, dark) {
  const hue = rand(pal.h[0], pal.h[1]);
  const sat = rand(pal.s[0], pal.s[1]);
  const light = rand(pal.l[0], pal.l[1]);
  if (dark) {
    const glow = ctx.createRadialGradient(48, 48, 0, 48, 48, 46);
    glow.addColorStop(0, `hsla(${hue}, ${sat}%, ${light + 5}%, 0.12)`);
    glow.addColorStop(1, `hsla(${hue}, ${sat}%, ${light + 5}%, 0)`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(48, 48, 46, 0, TAU);
    ctx.fill();
  }
  const start = rand(0, TAU);
  const rx = 18 * rand(0.52, 0.6);
  const ry = 18 * rand(0.38, 0.46);
  ctx.fillStyle = `hsl(${hue}, ${sat}%, ${light}%)`;
  for (let i = 0; i < 4; i++) {
    const a = start + (i * TAU) / 4 + rand(-0.08, 0.08);
    ctx.save();
    ctx.translate(48 + 8.1 * Math.cos(a), 48 + 8.1 * Math.sin(a));
    ctx.rotate(a);
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = `hsl(${hue + 2}, ${sat + 5}%, ${light - 12}%)`;
  ctx.beginPath();
  ctx.arc(48, 48, 3.96, 0, TAU);
  ctx.fill();
}

function paintSprite(ctx, season, pal, dark) {
  if (season === "spring") paintPetal(ctx, pal, dark);
  else if (season === "summer") paintSpark(ctx, pal, dark);
  else if (season === "winter") paintFlake(ctx, pal, dark);
  else paintOsmanthus(ctx, pal, dark);
}

function makeSprites() {
  const season = readSeason();
  const dark = isDarkTheme();
  const pal = paletteOf();
  return Array.from({ length: 4 }, () => {
    const canvas = document.createElement("canvas");
    canvas.width = 96;
    canvas.height = 96;
    const ctx = canvas.getContext("2d");
    if (ctx) paintSprite(ctx, season, pal, dark);
    return canvas;
  });
}

export default function Background({ enabled }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = { width: 0, height: 0, dpr: 1 };
    const particles = [];
    let sprites = [];
    let pal = paletteOf();
    let season = readSeason();
    let dark = isDarkTheme();
    let seeded = true;
    let inited = false;
    let lookFade = 1;
    let lookFadeDir = 0;
    let raf = 0;
    let last = performance.now();
    let origin = last;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = window.innerWidth;
      const height = window.innerHeight;
      size.width = width;
      size.height = height;
      size.dpr = dpr;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };

    const applyLook = () => {
      season = readSeason();
      dark = isDarkTheme();
      pal = paletteOf();
      sprites = makeSprites();
      particles.length = 0;
      seeded = true;
    };

    const paint = (now, dt) => {
      const { width, height, dpr } = size;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      if (!enabled) return;
      const density = Math.max(
        0,
        Math.round(Math.min(160, Math.max(36, (width * height) / 26000)) * pal.density)
      );
      while (particles.length < density) particles.push(makeParticle(width, height, seeded));
      if (particles.length > density) particles.length = density;
      seeded = false;
      const t = (now - origin) / 1000;
      if (!sprites.length) return;
      for (const p of particles) {
        p.y += p.fallVel * pal.fall * dt;
        p.rotation += p.rotationVel * dt;
        if (p.y - p.size * 3 > height) {
          Object.assign(p, makeParticle(width, height, false));
          continue;
        }
        const x =
          p.baseX +
          Math.sin(t * p.swayFreq1 * TAU + p.swayPhase1) * p.swayAmp1 +
          Math.sin(t * p.swayFreq2 * TAU + p.swayPhase2) * p.swayAmp2;
        const breath = 1 + 0.25 * Math.sin((t * TAU) / 18 + 0.0025 * p.baseX + p.breathPhase);
        let alpha = Math.min(0.78, p.alphaBase * p.layerAlpha * breath * lookFade);
        if (season === "summer") {
          alpha *= 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * p.twinkle * TAU + p.breathPhase));
        }
        if (alpha <= 0.01) continue;
        const sprite = sprites[p.spriteIndex];
        const drawSize = p.size * (season === "summer" ? 3.4 : season === "winter" ? 2.2 : 8 / 3);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(x, p.y);
        ctx.rotate(p.rotation);
        ctx.drawImage(sprite, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
        ctx.restore();
      }
    };

    const syncLook = () => {
      const nextSeason = readSeason();
      const nextDark = isDarkTheme();
      if (!inited) {
        inited = true;
        applyLook();
        return;
      }
      if (nextSeason === season && nextDark === dark) return;
      if (
        window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
        document.documentElement.classList.contains("is-look-changing")
      ) {
        applyLook();
        lookFade = 1;
        lookFadeDir = 0;
        paint(performance.now(), 0);
        return;
      }
      lookFadeDir = -1;
    };

    const draw = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (lookFadeDir === -1) {
        lookFade = Math.max(0, lookFade - dt / 0.36);
        if (lookFade <= 0) {
          applyLook();
          lookFadeDir = 1;
        }
      } else if (lookFadeDir === 1) {
        lookFade = Math.min(1, lookFade + dt / 0.58);
        if (lookFade >= 1) lookFadeDir = 0;
      }
      paint(now, dt);
      raf = requestAnimationFrame(draw);
    };

    syncLook();
    resize();
    raf = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);
    const mo = new MutationObserver(syncLook);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-season"] });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      mo.disconnect();
    };
  }, [enabled]);

  return <canvas id="bg-canvas" className={enabled ? "is-on" : ""} ref={ref} aria-hidden="true" />;
}
