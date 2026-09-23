const PALETTE = [
  "#cd2eee",
  "#88ccac",
  "#8ad3cc",
  "#0eabdd",
  "#10a1b1",
  "#008899",
  "#d4a29e",
  "#f5d8c8",
  "#ec6d45",
  "#fc3b37",
  "#5946b7",
  "#312a4d",
];

function mix(a, b, t) {
  const pa = parse(a);
  const pb = parse(b);
  if (!pa || !pb) return a;
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  return `rgb(${r} ${g} ${bl})`;
}

function parse(color) {
  if (!color) return null;
  if (color.startsWith("#") && color.length === 7) {
    return [parseInt(color.slice(1, 3), 16), parseInt(color.slice(3, 5), 16), parseInt(color.slice(5, 7), 16)];
  }
  const m = color.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  return null;
}

function readAccent() {
  if (typeof document === "undefined") return PALETTE[0];
  const value = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
  return value || PALETTE[0];
}

function pickColor(exclude = -1) {
  let idx = 0;
  for (let i = 0; i < 8; i += 1) {
    idx = Math.floor(Math.random() * PALETTE.length);
    if (Math.abs(idx - exclude) > 1) break;
  }
  return { color: PALETTE[idx], idx };
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function chance(p) {
  return Math.random() < p;
}

export function createVisuals(canvas, { reduced = false } = {}) {
  const ctx = canvas.getContext("2d");
  const fx = [];
  let raf = 0;
  let width = 0;
  let height = 0;
  let bg = "#88ccac";
  let accent = readAccent();
  let lastIdx = 0;
  let flashUntil = 0;

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function spawn(x, y, slot) {
    accent = readAccent();
    const now = performance.now();
    const { color, idx } = pickColor(lastIdx);
    lastIdx = idx;
    const tint = mix(color, accent, 0.28);

    if (!reduced && chance(0.32)) {
      bg = mix(color, accent, 0.18);
      if (chance(0.28)) flashUntil = now + 90;
    }

    const kind = slot % 12;
    const cx = width / 2;
    const cy = height / 2;
    const min = Math.min(width, height);

    if (kind === 0 || kind === 1) {
      const n = Math.floor(rand(7, 13));
      for (let i = 0; i < n; i += 1) {
        fx.push({
          type: kind === 0 ? "dot" : "box",
          x: cx,
          y: cy,
          tx: rand(0, width),
          ty: rand(0, height),
          size: min * rand(0.02, 0.05),
          rot: rand(0, Math.PI),
          trot: rand(0, Math.PI),
          born: now,
          life: reduced ? 120 : rand(420, 700),
          color: tint,
          fill: kind === 1,
        });
      }
    } else if (kind === 2) {
      const steps = 28;
      for (let i = 0; i < steps; i += 1) {
        const a = ((i * 25) * Math.PI) / 180;
        const r = 10 + i * (min / 64) * rand(0.7, 1.2);
        fx.push({
          type: "pop",
          x: cx + Math.cos(a) * r,
          y: cy + Math.sin(a) * r,
          size: 2 + i * 0.22,
          born: now + i * 28,
          life: reduced ? 160 : 700,
          color: tint,
        });
      }
    } else if (kind === 3 || kind === 4) {
      const sides = Math.floor(rand(3, 8));
      const r = min * rand(0.16, 0.48);
      const pts = [];
      for (let i = 0; i < sides; i += 1) {
        const a = (i / sides) * Math.PI * 2;
        pts.push({
          x: Math.cos(a) * r,
          y: Math.sin(a) * r,
          tx: Math.cos(a) * r + rand(-r * 0.4, r * 0.4),
          ty: Math.sin(a) * r + rand(-r * 0.4, r * 0.4),
        });
      }
      fx.push({
        type: "poly",
        x: cx,
        y: cy,
        pts,
        rot: (Math.floor(Math.random() * 6) * 30 * Math.PI) / 180,
        born: now,
        life: reduced ? 140 : 800,
        color: tint,
        fill: kind === 4,
        width: rand(3, 8),
      });
    } else if (kind === 5) {
      fx.push({
        type: "wedge",
        x: cx,
        y: cy,
        r: min * rand(0.2, 0.48),
        born: now,
        life: reduced ? 140 : 900,
        color: tint,
        dir: chance(0.5) ? 1 : -1,
        fill: chance(0.5),
      });
    } else if (kind === 6) {
      const n = Math.floor(rand(5, 10));
      for (let i = 0; i < n; i += 1) {
        fx.push({
          type: "bounce",
          x: rand(0, width),
          y: rand(0, height),
          tx: cx,
          ty: cy,
          ox: rand(0, width),
          oy: rand(0, height),
          size: min * rand(0.05, 0.1),
          born: now + i * 60,
          life: reduced ? 160 : 1000,
          color: tint,
          shape: chance(0.5) ? "box" : "dot",
        });
      }
    } else if (kind === 7) {
      fx.push({
        type: "ring",
        x: cx,
        y: cy,
        r: min * rand(0.12, 0.28),
        scale: rand(0.6, 1.6),
        born: now,
        life: reduced ? 120 : 700,
        color: tint,
        width: rand(3, 8),
      });
    } else if (kind === 8) {
      const n = Math.floor(rand(6, 14));
      const r = min * rand(0.22, 0.42);
      const size = r * rand(0.12, 0.22);
      for (let i = 0; i < n; i += 1) {
        const a = (i / n) * Math.PI * 2 + rand(0, Math.PI / 2);
        fx.push({
          type: "orbit",
          x: cx + Math.cos(a) * r,
          y: cy + Math.sin(a) * r,
          size,
          rot: rand(0, Math.PI * 2),
          born: now + i * 50,
          life: reduced ? 140 : 1100,
          color: tint,
          shape: chance(0.5) ? "box" : "dot",
        });
      }
    } else if (kind === 9) {
      fx.push({
        type: "cross",
        x: rand(width * 0.2, width * 0.8),
        y: rand(height * 0.2, height * 0.8),
        len: min * rand(0.55, 0.9),
        thick: min * rand(0.04, 0.1),
        rot: Math.PI / 4,
        trot: chance(0.5) ? -Math.PI * 0.75 : Math.PI * 1.2,
        born: now,
        life: reduced ? 140 : 900,
        color: tint,
      });
    } else if (kind === 10) {
      const cols = chance(0.5);
      const steps = Math.floor(rand(3, 6));
      const pts = [];
      for (let i = 0; i <= steps; i += 1) {
        pts.push(
          cols
            ? { x: (width / steps) * i, y: rand(0, height) }
            : { x: rand(0, width), y: (height / steps) * i }
        );
      }
      fx.push({
        type: "stroke",
        pts,
        width: rand(2, 18),
        born: now,
        life: reduced ? 140 : 700,
        color: tint,
        from: chance(0.5) ? 0 : 1,
      });
    } else {
      const horiz = chance(0.5);
      fx.push({
        type: "wipe",
        horiz,
        born: now,
        life: reduced ? 140 : 700,
        color: mix(tint, bg, 0.12),
      });
    }

    fx.push({
      type: "cell",
      x,
      y,
      born: now,
      life: reduced ? 90 : 420,
      color: "#fff",
    });

    if (fx.length > 90) fx.splice(0, fx.length - 90);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function easeOut(t) {
    return 1 - (1 - t) * (1 - t);
  }

  function drawFx(item, now) {
    const raw = (now - item.born) / item.life;
    if (raw < 0) return;
    const p = Math.min(1, raw);
    const e = easeOut(p);
    ctx.save();
    ctx.globalAlpha = 1 - p;
    ctx.fillStyle = item.color;
    ctx.strokeStyle = item.color;

    if (item.type === "dot" || item.type === "box") {
      const x = lerp(item.x, item.tx, e);
      const y = lerp(item.y, item.ty, e);
      const s = item.size * Math.min(1, e * 1.4);
      ctx.translate(x, y);
      ctx.rotate(lerp(item.rot, item.trot, e));
      if (item.type === "dot") {
        ctx.beginPath();
        ctx.arc(0, 0, s, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillRect(-s / 2, -s / 2, s, s);
      }
    } else if (item.type === "pop") {
      const s = item.size * (p < 0.55 ? e * 2 : (1 - p) * 2);
      ctx.beginPath();
      ctx.arc(item.x, item.y, Math.max(0.4, s), 0, Math.PI * 2);
      ctx.fill();
    } else if (item.type === "poly") {
      ctx.translate(item.x, item.y);
      ctx.rotate(item.rot);
      ctx.lineWidth = item.width;
      ctx.beginPath();
      item.pts.forEach((pt, i) => {
        const x = lerp(pt.x, pt.tx, e);
        const y = lerp(pt.y, pt.ty, e);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      if (item.fill) ctx.fill();
      else ctx.stroke();
    } else if (item.type === "wedge") {
      ctx.translate(item.x, item.y);
      const ang = e * Math.PI * 2 * item.dir;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, item.r, 0, ang, item.dir < 0);
      ctx.closePath();
      if (item.fill) ctx.fill();
      else {
        ctx.lineWidth = 6;
        ctx.stroke();
      }
    } else if (item.type === "bounce") {
      const mid = p < 0.45;
      const t = mid ? p / 0.45 : (p - 0.45) / 0.55;
      const x = mid ? lerp(item.x, item.tx, easeOut(t)) : lerp(item.tx, item.ox, t);
      const y = mid ? lerp(item.y, item.ty, easeOut(t)) : lerp(item.ty, item.oy, t);
      const s = item.size * (mid ? t : 1 - t);
      ctx.translate(x, y);
      if (item.shape === "box") ctx.fillRect(-s / 2, -s / 2, s, s);
      else {
        ctx.beginPath();
        ctx.arc(0, 0, s / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (item.type === "ring") {
      ctx.translate(item.x, item.y);
      ctx.lineWidth = item.width;
      ctx.beginPath();
      ctx.arc(0, 0, item.r * lerp(0.4, item.scale, e), 0, Math.PI * 2);
      ctx.stroke();
    } else if (item.type === "orbit") {
      const s = item.size * (p < 0.35 ? e * 2 : p > 0.7 ? (1 - p) * 3 : 1);
      ctx.translate(item.x, item.y);
      ctx.rotate(item.rot + e);
      if (item.shape === "box") ctx.fillRect(-s / 2, -s / 2, s, s);
      else {
        ctx.beginPath();
        ctx.arc(0, 0, s / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (item.type === "cross") {
      ctx.translate(item.x, item.y);
      ctx.rotate(lerp(item.rot, item.trot, e));
      const grow = p < 0.45 ? e * 2 : 1;
      const shrink = p > 0.7 ? (1 - p) / 0.3 : 1;
      const len = item.len * grow * shrink;
      ctx.fillRect(-len / 2, -item.thick / 2, len, item.thick);
      ctx.fillRect(-item.thick / 2, -len / 2, item.thick, len);
    } else if (item.type === "stroke") {
      const n = item.pts.length - 1;
      const count = Math.max(1, Math.floor(e * n));
      ctx.lineWidth = item.width;
      ctx.lineJoin = "round";
      ctx.beginPath();
      if (item.from) {
        ctx.moveTo(item.pts[n].x, item.pts[n].y);
        for (let i = n; i >= n - count; i -= 1) ctx.lineTo(item.pts[i].x, item.pts[i].y);
      } else {
        ctx.moveTo(item.pts[0].x, item.pts[0].y);
        for (let i = 1; i <= count; i += 1) ctx.lineTo(item.pts[i].x, item.pts[i].y);
      }
      ctx.stroke();
    } else if (item.type === "wipe") {
      ctx.globalAlpha = 1;
      if (item.horiz) ctx.fillRect(0, 0, width * e, height);
      else ctx.fillRect(0, 0, width, height * e);
    } else if (item.type === "cell") {
      ctx.globalAlpha = 0.55 * (1 - p);
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.arc(item.x, item.y, 18 + e * 26, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function tick() {
    const now = performance.now();
    ctx.fillStyle = now < flashUntil ? "#ffffff" : bg;
    ctx.fillRect(0, 0, width, height);
    for (let i = fx.length - 1; i >= 0; i -= 1) {
      if (now - fx[i].born > fx[i].life) fx.splice(i, 1);
    }
    for (const item of fx) drawFx(item, now);
    raf = requestAnimationFrame(tick);
  }

  function start() {
    accent = readAccent();
    bg = mix("#88ccac", accent, 0.22) || "#88ccac";
    resize();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
  }

  function stop() {
    cancelAnimationFrame(raf);
  }

  function reset() {
    fx.length = 0;
    bg = mix("#88ccac", readAccent(), 0.22) || "#88ccac";
  }

  return { spawn, start, stop, resize, reset };
}
