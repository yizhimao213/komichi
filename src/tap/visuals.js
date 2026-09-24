import { cellOfSlot } from "./keymap.js";

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

const KINDS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

function parse(color) {
  if (!color) return null;
  if (color.startsWith("#") && color.length === 7) {
    return [parseInt(color.slice(1, 3), 16), parseInt(color.slice(3, 5), 16), parseInt(color.slice(5, 7), 16)];
  }
  const m = color.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  return null;
}

function mix(a, b, t) {
  const pa = parse(a);
  const pb = parse(b);
  if (!pa || !pb) return a;
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  return `rgb(${r} ${g} ${bl})`;
}

function readAccent() {
  if (typeof document === "undefined") return PALETTE[0];
  const value = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
  return value || PALETTE[0];
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function chance(p) {
  return Math.random() < p;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp01(t) {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

function linear(t) {
  return t;
}

function powerOut(p) {
  return (t) => 1 - (1 - t) ** p;
}

function backOut(s = 1.7) {
  return (t) => {
    const x = t - 1;
    return x * x * ((s + 1) * x + s) + 1;
  };
}

function backIn(s = 1.7) {
  return (t) => t * t * ((s + 1) * t - s);
}

function elasticOut(amp = 1, period = 0.3) {
  return (t) => {
    if (t === 0 || t === 1) return t;
    const s = (period / (Math.PI * 2)) * Math.asin(1 / amp);
    return amp * 2 ** (-10 * t) * Math.sin(((t - s) * Math.PI * 2) / period) + 1;
  };
}

function bounceOut(t) {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
  if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
  return n1 * (t -= 2.625 / d1) * t + 0.984375;
}

function easeAt(fn, start, dur, now) {
  if (dur <= 0) return now >= start ? 1 : 0;
  return fn(clamp01((now - start) / dur));
}

function shuffle(list) {
  const next = list.slice();
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = next[i];
    next[i] = next[j];
    next[j] = tmp;
  }
  return next;
}

function pickInk(lastIdx) {
  if (chance(0.03)) return { color: "#444444", idx: lastIdx };
  if (chance(0.18)) return { color: "#ffffff", idx: lastIdx };
  let idx = 0;
  for (let i = 0; i < 10; i += 1) {
    idx = Math.floor(Math.random() * PALETTE.length);
    if (Math.abs(idx - lastIdx) > 2) break;
  }
  return { color: PALETTE[idx], idx };
}

export function createVisuals(canvas, { reduced = false } = {}) {
  const ctx = canvas.getContext("2d");
  const fx = [];
  const flashes = [];
  let order = shuffle(KINDS);
  let raf = 0;
  let width = 0;
  let height = 0;
  let bg = "#88ccac";
  let lastIdx = 0;
  let untilWipe = Math.random() * 16;
  let wipeGen = 0;
  let committedWipe = 0;

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function flash() {
    const now = performance.now();
    for (let a = 0; a < 3; a += 2) {
      flashes.push({ at: now + 70 * a, on: true });
      flashes.push({ at: now + 70 * (a + 1), on: false });
    }
  }

  function flashing(now) {
    let on = false;
    for (const item of flashes) {
      if (item.at <= now) on = item.on;
    }
    while (flashes.length && flashes[0].at < now - 80) flashes.shift();
    return on;
  }

  function ink() {
    const next = pickInk(lastIdx);
    lastIdx = next.idx;
    return next.color;
  }

  function spawnBurst(now, filled) {
    const n = Math.floor(rand(7, 13));
    const color = ink();
    const min = Math.min(width, height);
    const cx = width / 2;
    const cy = height / 2;
    const dur = reduced ? 140 : rand(400, 600);
    for (let i = 0; i < n; i += 1) {
      fx.push({
        type: "burst",
        filled,
        color,
        x0: cx,
        y0: cy,
        x1: rand(0, width),
        y1: rand(0, height),
        r0: 0,
        r1: min * rand(0.02, 0.05),
        rot0: rand(0, Math.PI),
        rot1: rand(0, Math.PI),
        lw: rand(3, 6),
        born: now,
        life: dur,
      });
    }
  }

  function spawnSpiral(now) {
    const color = ink();
    const min = Math.min(width, height);
    const step = (min / 64) * rand(0.7, 1.3);
    const rot = rand(0, Math.PI * 2);
    let rad = 10;
    let size = 2;
    for (let i = 0; i < 40; i += 1) {
      const a = ((25 * i) * Math.PI) / 180;
      fx.push({
        type: "spiral",
        color,
        x: Math.cos(a) * rad,
        y: Math.sin(a) * rad,
        size,
        rot,
        born: now + (reduced ? 0 : i * 30),
        life: reduced ? 160 : 1200,
      });
      rad += step;
      size += 0.22;
    }
  }

  function spawnPoly(now, filled) {
    const color = ink();
    const min = Math.min(width, height);
    const sides = Math.floor(rand(3, 8));
    const r = min * rand(0.16, 0.48);
    const spread = filled ? 2.5 : 3;
    const pts = [];
    for (let i = 0; i < sides; i += 1) {
      const a = (i / sides) * Math.PI * 2;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      pts.push({
        x,
        y,
        tx: x + r * (Math.random() - 0.5) * spread,
        ty: y + r * (Math.random() - 0.5) * spread,
      });
    }
    fx.push({
      type: "poly",
      filled,
      color,
      pts,
      rot: (Math.floor(Math.random() * 6) * 30 * Math.PI) / 180,
      lw: rand(3, 8),
      born: now,
      life: reduced ? 140 : 800,
    });
  }

  function spawnWedgePoly(now) {
    const color = ink();
    const min = Math.min(width, height);
    const sides = Math.floor(rand(3, 8));
    const r = min * rand(0.2, 0.48);
    const pts = [];
    const step = (Math.PI * 2) / sides;
    for (let i = 0; i <= sides; i += 1) {
      const a = i * step;
      pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
    }
    fx.push({
      type: "wedgeShape",
      mode: "poly",
      color,
      pts,
      r,
      lw: rand(4, 11),
      rot: (Math.floor(Math.random() * 6) * 30 * Math.PI) / 180,
      s0: rand(0.4, 1.2),
      s1: rand(0.4, 1.2),
      pieDir: chance(0.5) ? 1 : -1,
      pieOff: rand(0, 360),
      born: now,
      life: reduced ? 160 : 1500,
    });
  }

  function spawnHop(now, shape) {
    const color = ink();
    const min = Math.min(width, height);
    const n = Math.floor(rand(5, 10));
    for (let i = 0; i < n; i += 1) {
      const x = rand(0, width);
      const y = rand(0, height);
      fx.push({
        type: "hop",
        shape,
        color,
        x,
        y,
        ox: x + min * (Math.random() - 0.5),
        oy: y + min * (Math.random() - 0.5),
        fx: x + min * (Math.random() - 0.5),
        fy: y + min * (Math.random() - 0.5),
        size: min * (shape === "box" ? rand(0.05, 0.13) : rand(0.028, 0.064)),
        rot0: rand(0, Math.PI),
        rot1: -rand(0, Math.PI),
        lw: rand(4, 8),
        born: now + (reduced ? 0 : i * 60),
        life: reduced ? 160 : 1400,
      });
    }
  }

  function spawnBars(now) {
    const color = ink();
    const min = Math.min(width, height);
    const size = min * 0.8;
    const n = Math.floor(rand(2, 9));
    const gap = (size / n) * rand(0.7, 1.1);
    const thick = (size / n) * rand(0.1, 0.5);
    const rot0 = (Math.floor(Math.random() * 4) * Math.PI) / 2;
    const rot1 = rot0 + ((Math.floor(Math.random() * 4) - 2) * Math.PI) / 4;
    const s0 = rand(0.7, 1.3);
    const s1 = rand(0.7, 1.3);
    const mask = size / 2;
    for (let i = 0; i <= n; i += 1) {
      const y = (i - n / 2) * gap;
      const draw = rand(0.2, 0.4);
      const hide = rand(0.2, 0.4);
      fx.push({
        type: "bar",
        color,
        x0: -size / 2,
        y0: y,
        x1: size / 2,
        y1: y,
        thick,
        rot0,
        rot1,
        s0,
        s1,
        mask,
        draw,
        hide,
        born: now,
        life: reduced ? 160 : (draw + hide) * 1000 + 80,
      });
    }
  }

  function spawnRing(now) {
    const color = ink();
    const min = Math.min(width, height);
    const max = Math.max(width, height);
    const sides = Math.floor(rand(3, 8));
    const r = min * 0.6;
    const scale = (0.5 * max) / r * (1.6 + 0.6 / sides);
    fx.push({
      type: "ring",
      color,
      sides,
      r,
      scale,
      lw: rand(3, 8),
      rot0: rand(0, Math.PI),
      rot1: rand(0, Math.PI),
      born: now,
      life: reduced ? 140 : rand(600, 900),
    });
  }

  function spawnWedgeDot(now) {
    const color = ink();
    const min = Math.min(width, height);
    const r = min * rand(0.1, 0.35);
    fx.push({
      type: "wedgeShape",
      mode: "dot",
      color,
      r,
      pieDir: chance(0.5) ? 1 : -1,
      pieOff: rand(0, 360),
      s0: 1,
      s1: 1,
      rot: 0,
      born: now,
      life: reduced ? 160 : 1500,
    });
  }

  function spawnOrbit(now, shape) {
    const color = ink();
    const min = Math.min(width, height);
    const n = Math.floor(rand(6, 14));
    const radius = min * (shape === "box" ? rand(0.25, 0.5) : rand(0.25, 0.45));
    const size = radius * (shape === "box" ? rand(0.05, 0.2) : rand(0.05, 0.25));
    const spin = (chance(0.5) ? 1 : -1) * ((360 / n) * Math.PI) / 180;
    const base = (Math.floor(Math.random() * 4) * Math.PI) / 2;
    const groupRot = rand(0, Math.PI);
    for (let i = 0; i < n; i += 1) {
      const a = base + spin * i;
      fx.push({
        type: "orbit",
        shape,
        color,
        x: Math.cos(a) * radius,
        y: Math.sin(a) * radius,
        ox: Math.cos(a) * radius + width * rand(-0.25, 0.25),
        oy: Math.sin(a) * radius + height * rand(-0.25, 0.25),
        size,
        rot0: rand(0, Math.PI * 2),
        spin: rand(0, Math.PI * 2),
        groupRot,
        delay: reduced ? 0 : i * 50,
        born: now,
        life: reduced ? 160 : n * 50 + 1400,
      });
    }
  }

  function spawnCross(now) {
    const color = ink();
    const min = Math.min(width, height);
    const len = min * rand(0.7, 0.9);
    const thick = (len / 10) * rand(0.5, 1.3);
    fx.push({
      type: "cross",
      color,
      x: width * rand(0.2, 0.8),
      y: height * rand(0.2, 0.8),
      len,
      thick,
      rot1: chance(0.5) ? -Math.PI * 0.75 : Math.PI * (215 / 180),
      born: now,
      life: reduced ? 160 : 900,
    });
  }

  function spawnStroke(now) {
    const color = ink();
    const horiz = chance(0.5);
    const n = Math.floor(rand(3, 6));
    const pts = [];
    const span = horiz ? width / n : height / n;
    for (let i = 0; i <= n; i += 1) {
      if (horiz) {
        pts.push({ x: span * i + (i === 0 ? -10 : i === n ? 10 : 0), y: rand(0, height) });
      } else {
        pts.push({ x: rand(0, width), y: span * i + (i === 0 ? -10 : i === n ? 10 : 0) });
      }
    }
    fx.push({
      type: "stroke",
      color,
      pts,
      lw: rand(2, 22),
      flip: chance(0.5),
      born: now,
      life: reduced ? 140 : 900,
    });
  }

  function spawnWipe(now) {
    let idx = lastIdx;
    for (let i = 0; i < 10; i += 1) {
      idx = Math.floor(Math.random() * PALETTE.length);
      if (Math.abs(idx - lastIdx) > 2) break;
    }
    lastIdx = idx;
    const fill = PALETTE[idx];
    const slices = Math.floor(rand(1, 5));
    const horiz = chance(0.5);
    const flip = chance(0.5);
    const pts = [];
    const span = horiz ? height / slices : width / slices;
    for (let i = 0; i <= slices; i += 1) {
      const wobble = i === 0 || i === slices ? 0 : span * rand(-0.125, 0.125);
      pts.push({
        x: horiz ? 0 : span * i + wobble,
        y: horiz ? span * i + wobble : 0,
        tx: horiz ? width : span * i + wobble,
        ty: horiz ? span * i + wobble : height,
        dur: rand(300, 700),
      });
    }
    wipeGen += 1;
    const gen = wipeGen;
    fx.push({
      type: "wipe",
      color: fill,
      pts,
      horiz,
      flip,
      gen,
      born: now,
      life: reduced ? 200 : 2000,
    });
    if (!reduced && chance(0.3)) flash();
  }

  function spawnKind(kind, now) {
    if (kind === 0) spawnBurst(now, false);
    else if (kind === 1) spawnBurst(now, true);
    else if (kind === 2) spawnSpiral(now);
    else if (kind === 3) spawnPoly(now, false);
    else if (kind === 4) spawnPoly(now, true);
    else if (kind === 5) spawnWedgePoly(now);
    else if (kind === 6) spawnHop(now, "box");
    else if (kind === 7) spawnHop(now, "dot");
    else if (kind === 8) spawnBars(now);
    else if (kind === 9) spawnRing(now);
    else if (kind === 10) spawnWedgeDot(now);
    else if (kind === 11) spawnOrbit(now, "box");
    else if (kind === 12) spawnOrbit(now, "dot");
    else if (kind === 13) spawnCross(now);
    else spawnStroke(now);
  }

  function spawn(_x, _y, slot) {
    const now = performance.now();
    const kind = order[((slot % 15) + 15) % 15];
    spawnKind(kind, now);
    const cell = cellOfSlot(slot, width, height);
    fx.push({
      type: "cell",
      x: cell.x,
      y: cell.y,
      w: cell.w,
      h: cell.h,
      born: now,
      life: reduced ? 180 : 500,
    });
    untilWipe -= 1;
    if (untilWipe <= 0) {
      spawnWipe(now);
      untilWipe = 6 + Math.random() * 12;
    }
    if (fx.length > 160) fx.splice(0, fx.length - 160);
  }

  function pieClip(radius, rot, dir, offset, invert) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    if (!invert) {
      for (let t = 0; t < rot; t += 30) {
        const a = ((dir * t + offset) * Math.PI) / 180;
        ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
      }
      const a = ((dir * rot + offset) * Math.PI) / 180;
      ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
    } else {
      for (let t = 360; rot < t; t -= 30) {
        const a = ((dir * t + offset) * Math.PI) / 180;
        ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
      }
      const a = ((dir * rot + offset) * Math.PI) / 180;
      ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
    }
    ctx.closePath();
    ctx.clip();
  }

  function drawBurst(item, now) {
    const ePos = easeAt(powerOut(3), item.born, item.life, now);
    const eScale = easeAt(backOut(1.7), item.born, item.life, now);
    const x = lerp(item.x0, item.x1, ePos);
    const y = lerp(item.y0, item.y1, ePos);
    const s = lerp(item.r0, item.r1, eScale);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(lerp(item.rot0, item.rot1, ePos));
    ctx.fillStyle = item.color;
    ctx.strokeStyle = item.color;
    ctx.lineWidth = item.lw;
    if (item.filled) {
      ctx.fillRect(-s / 2, -s / 2, s, s);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, s, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawSpiral(item, now) {
    const t = now - item.born;
    if (t < 0) return;
    let scale = 0;
    if (t < 700) scale = elasticOut(1, 0.3)(clamp01(t / 700));
    else if (t < 800) scale = 1;
    else scale = 1 - powerOut(3)(clamp01((t - 800) / 400));
    if (scale <= 0) return;
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate(item.rot);
    ctx.translate(item.x, item.y);
    ctx.scale(scale, scale);
    ctx.fillStyle = item.color;
    ctx.beginPath();
    ctx.arc(0, 0, item.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawPoly(item, now) {
    const e = easeAt(powerOut(2), item.born, 600, now);
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate(item.rot);
    ctx.strokeStyle = item.color;
    ctx.fillStyle = item.color;
    ctx.lineWidth = item.lw;
    ctx.beginPath();
    item.pts.forEach((pt, i) => {
      const x = lerp(pt.x, pt.tx, e);
      const y = lerp(pt.y, pt.ty, e);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    if (item.filled) ctx.fill();
    else ctx.stroke();
    ctx.restore();
  }

  function drawWedgeShape(item, now) {
    const t = now - item.born;
    if (t < 0) return;
    const pieT = t < 600 ? powerOut(2)(clamp01(t / 600)) : powerOut(2)(clamp01((t - 600) / 900));
    const rot = pieT * 360;
    const invert = t >= 600;
    const scale = item.mode === "poly" ? lerp(item.s0, item.s1, bounceOut(clamp01(t / 900))) : 1;
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate(item.rot);
    ctx.scale(scale, scale);
    pieClip(item.r * 1.3, rot, item.pieDir, item.pieOff, invert);
    ctx.strokeStyle = item.color;
    ctx.fillStyle = item.color;
    ctx.lineWidth = item.lw || 6;
    if (item.mode === "dot") {
      ctx.beginPath();
      ctx.arc(0, 0, item.r, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      item.pts.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawHop(item, now) {
    const t = now - item.born;
    if (t < 0) return;
    const inT = clamp01(t / 500);
    const outT = clamp01((t - 700) / 500);
    const movingOut = t >= 700;
    const eIn = item.shape === "dot" ? elasticOut(1, 0.3)(inT) : backOut(1.7)(inT);
    const eOut = item.shape === "dot" ? backIn(1.7)(outT) : backIn(1.7)(outT);
    const x = movingOut ? lerp(item.x, item.fx, eOut) : lerp(item.ox, item.x, eIn);
    const y = movingOut ? lerp(item.y, item.fy, eOut) : lerp(item.oy, item.y, eIn);
    const scale = movingOut ? 1 - eOut : eIn;
    const rot = movingOut ? lerp(0, item.rot1, eOut) : lerp(item.rot0, 0, eIn);
    if (scale <= 0) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(scale, scale);
    ctx.strokeStyle = item.color;
    ctx.fillStyle = item.color;
    ctx.lineWidth = item.lw;
    if (item.shape === "box") {
      ctx.strokeRect(-item.size / 2, -item.size / 2, item.size, item.size);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, item.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawBar(item, now) {
    const t = now - item.born;
    if (t < 0) return;
    const drawMs = item.draw * 1000;
    const hideMs = item.hide * 1000;
    let x0 = item.x0;
    let y0 = item.y0;
    let x1 = item.x1;
    let y1 = item.y1;
    if (t < drawMs) {
      const e = powerOut(2)(clamp01(t / drawMs));
      x1 = lerp(item.x0, item.x1, e);
      y1 = lerp(item.y0, item.y1, e);
    } else {
      const e = powerOut(2)(clamp01((t - drawMs) / hideMs));
      x0 = lerp(item.x0, item.x1, e);
      y0 = lerp(item.y0, item.y1, e);
    }
    const rot = lerp(item.rot0, item.rot1, powerOut(3)(clamp01(t / 600)));
    const scale = lerp(item.s0, item.s1, backOut(1.7)(clamp01(t / 600)));
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate(rot);
    ctx.scale(scale, scale);
    ctx.beginPath();
    ctx.arc(0, 0, item.mask, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = item.color;
    ctx.lineWidth = item.thick;
    ctx.lineCap = "butt";
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.restore();
  }

  function drawRing(item, now) {
    const e = easeAt(powerOut(3), item.born, item.life, now);
    const rot = lerp(item.rot0, item.rot1, easeAt(powerOut(2), item.born, item.life, now));
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate(rot);
    ctx.scale(item.scale * e, item.scale * e);
    ctx.strokeStyle = item.color;
    ctx.lineWidth = item.lw / Math.max(0.001, item.scale * e);
    ctx.beginPath();
    for (let i = 0; i <= item.sides; i += 1) {
      const a = (i / item.sides) * Math.PI * 2;
      const x = Math.cos(a) * item.r;
      const y = Math.sin(a) * item.r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawOrbit(item, now) {
    const t = now - item.born - item.delay;
    if (t < 0) return;
    let scale = 0;
    let rot = item.rot0;
    let x = item.x;
    let y = item.y;
    let group = 0;
    if (item.shape === "box") {
      if (t < 300) scale = backOut(1.7)(clamp01(t / 300));
      else if (t < 1000) scale = 1;
      else scale = 1 - backIn(2)(clamp01((t - 1000) / 400));
      rot =
        t < 700
          ? lerp(item.rot0, 0, elasticOut(1, 0.3)(clamp01(t / 700)))
          : lerp(0, item.spin, backIn(2)(clamp01((t - 700) / 400)));
      group = bounceOut(clamp01(t / 1000)) * item.groupRot;
    } else {
      if (t < 300) scale = backOut(1.7)(clamp01(t / 300));
      else if (t < 800) scale = 1;
      else {
        const e = powerOut(2)(clamp01((t - 800) / 300));
        scale = 1 - powerOut(2)(e);
        x = lerp(item.x, item.ox, e);
        y = lerp(item.y, item.oy, e);
      }
    }
    if (scale <= 0) return;
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate(group);
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(scale, scale);
    ctx.fillStyle = item.color;
    if (item.shape === "box") ctx.fillRect(-item.size / 2, -item.size / 2, item.size, item.size);
    else {
      ctx.beginPath();
      ctx.arc(0, 0, item.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawCross(item, now) {
    const t = now - item.born;
    const sx = t < 400 ? powerOut(2)(clamp01(t / 400)) : 1 - powerOut(2)(clamp01((t - 400) / 300));
    const sy = t < 100 ? 0 : t < 500 ? powerOut(2)(clamp01((t - 100) / 400)) : 1 - powerOut(2)(clamp01((t - 600) / 300));
    const rot = Math.PI / 4 + item.rot1 * backOut(1.7)(clamp01(t / 600));
    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.rotate(rot);
    ctx.fillStyle = item.color;
    ctx.save();
    ctx.translate(-item.len / 2, 0);
    ctx.scale(Math.max(0, sx), 1);
    ctx.fillRect(0, -item.thick / 2, item.len, item.thick);
    ctx.restore();
    ctx.save();
    ctx.translate(0, -item.len / 2);
    ctx.scale(1, Math.max(0, sy));
    ctx.fillRect(-item.thick / 2, 0, item.thick, item.len);
    ctx.restore();
    ctx.restore();
  }

  function drawStroke(item, now) {
    const pts = item.pts;
    const n = pts.length - 1;
    const t = now - item.born;
    const half = item.life * 0.55;
    ctx.save();
    if (item.flip) {
      ctx.translate(width, height);
      ctx.rotate(Math.PI);
    }
    ctx.strokeStyle = item.color;
    ctx.lineWidth = item.lw;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    if (t < half) {
      const e = powerOut(2)(clamp01(t / half));
      const count = Math.max(1, Math.floor(e * n));
      const frac = e * n - (count - 1);
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < count; i += 1) ctx.lineTo(pts[i].x, pts[i].y);
      const a = pts[count - 1];
      const b = pts[Math.min(count, n)];
      ctx.lineTo(lerp(a.x, b.x, frac), lerp(a.y, b.y, frac));
    } else {
      const e = powerOut(2)(clamp01((t - half) / (item.life - half)));
      const start = Math.min(n, Math.floor(e * n));
      const frac = e * n - start;
      const a = pts[start];
      const b = pts[Math.min(start + 1, n)];
      ctx.moveTo(lerp(a.x, b.x, frac), lerp(a.y, b.y, frac));
      for (let i = start + 1; i <= n; i += 1) ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawWipe(item, now) {
    const pts = item.pts.map((pt) => {
      const e = easeAt(linear, item.born, pt.dur, now);
      return { x: lerp(pt.x, pt.tx, e), y: lerp(pt.y, pt.ty, e) };
    });
    ctx.save();
    if (item.flip) {
      ctx.translate(width, height);
      ctx.rotate(Math.PI);
    }
    ctx.fillStyle = item.color;
    ctx.beginPath();
    if (item.horiz) {
      ctx.moveTo(0, 0);
      ctx.lineTo(0, height);
    } else {
      ctx.moveTo(0, 0);
      ctx.lineTo(width, 0);
    }
    for (let i = pts.length - 1; i >= 0; i -= 1) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    if (now - item.born >= item.life && item.gen > committedWipe) {
      bg = item.color;
      committedWipe = item.gen;
    }
  }

  function drawFx(item, now) {
    if (now - item.born > item.life) return;
    if (item.type === "burst") drawBurst(item, now);
    else if (item.type === "spiral") drawSpiral(item, now);
    else if (item.type === "poly") drawPoly(item, now);
    else if (item.type === "wedgeShape") drawWedgeShape(item, now);
    else if (item.type === "hop") drawHop(item, now);
    else if (item.type === "bar") drawBar(item, now);
    else if (item.type === "ring") drawRing(item, now);
    else if (item.type === "orbit") drawOrbit(item, now);
    else if (item.type === "cross") drawCross(item, now);
    else if (item.type === "stroke") drawStroke(item, now);
    else if (item.type === "wipe") drawWipe(item, now);
    else if (item.type === "cell") {
      const p = clamp01((now - item.born) / item.life);
      ctx.save();
      ctx.globalAlpha = 0.7 * (1 - p);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(item.x, item.y, item.w, item.h);
      ctx.restore();
    }
  }

  function tick() {
    const now = performance.now();
    ctx.fillStyle = flashing(now) ? "#ffffff" : bg;
    ctx.fillRect(0, 0, width, height);
    for (let i = fx.length - 1; i >= 0; i -= 1) {
      if (now - fx[i].born > fx[i].life) {
        if (fx[i].type === "wipe" && fx[i].gen > committedWipe) {
          bg = fx[i].color;
          committedWipe = fx[i].gen;
        }
        fx.splice(i, 1);
      }
    }
    const rest = [];
    const wipes = [];
    const cells = [];
    for (const item of fx) {
      if (item.type === "cell") cells.push(item);
      else if (item.type === "wipe") wipes.push(item);
      else rest.push(item);
    }
    for (const item of rest) drawFx(item, now);
    for (const item of wipes) drawFx(item, now);
    for (const item of cells) drawFx(item, now);
    raf = requestAnimationFrame(tick);
  }

  function start() {
    bg = mix("#88ccac", readAccent(), 0.22) || "#88ccac";
    order = shuffle(KINDS);
    untilWipe = Math.random() * 16;
    resize();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
  }

  function stop() {
    cancelAnimationFrame(raf);
  }

  function reset() {
    fx.length = 0;
    flashes.length = 0;
    bg = mix("#88ccac", readAccent(), 0.22) || "#88ccac";
    order = shuffle(KINDS);
  }

  return { spawn, start, stop, resize, reset };
}
