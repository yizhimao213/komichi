import { BED_COUNT, HIT_COUNT } from "./keymap.js";
import { BED_LENGTH, BED_STEP, BED_VOLUMES, bedPattern, bedUrl } from "./bed.js";

const HIT_TYPES = ["sine", "triangle", "square", "sawtooth"];
const HIT_STEPS = [0, 2, 4, 5, 7, 9, 11, 12];
const PATTERN = bedPattern();

export function createTapEngine() {
  let ctx = null;
  let master = null;
  let bedGain = null;
  let bedNodes = [];
  let bedOn = false;
  let bedStart = 0;
  let bedStep = 0;
  let bedRaf = 0;
  const customHits = Array(HIT_COUNT).fill(null);
  const beds = Array(BED_COUNT).fill(null);

  function ensure() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.72;
    master.connect(ctx.destination);
    bedGain = ctx.createGain();
    bedGain.gain.value = 0.85;
    bedGain.connect(master);
  }

  async function resume() {
    ensure();
    if (ctx.state === "suspended") await ctx.resume();
  }

  function playHitSynth(slot) {
    ensure();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = HIT_TYPES[slot % HIT_TYPES.length];
    const octave = Math.floor(slot / 8);
    const note = HIT_STEPS[slot % 8] + octave * 12;
    osc.frequency.value = 196 * Math.pow(2, note / 12);
    filter.type = "lowpass";
    filter.frequency.value = 900 + (slot % 8) * 420;
    const dur = 0.08 + (slot % 6) * 0.05;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.32, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + dur + 0.04);
  }

  function playBuffer(buffer, loop, dest, when, gainValue = 1) {
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    src.buffer = buffer;
    src.loop = Boolean(loop);
    gain.gain.value = gainValue;
    src.connect(gain);
    gain.connect(dest);
    src.start(when == null ? ctx.currentTime : when);
    return src;
  }

  function playHit(slot) {
    const index = ((slot % HIT_COUNT) + HIT_COUNT) % HIT_COUNT;
    ensure();
    const buf = customHits[index];
    if (buf) {
      try {
        playBuffer(buf, false, master);
        return;
      } catch {
        /* fall through */
      }
    }
    playHitSynth(index);
  }

  function forgetNode(node) {
    bedNodes = bedNodes.filter((item) => item !== node);
  }

  function playBedVoice(slot, when) {
    const buf = beds[slot];
    const vol = BED_VOLUMES[slot] ?? 1.2;
    if (buf) {
      try {
        const src = playBuffer(buf, false, bedGain, when, vol);
        bedNodes.push(src);
        src.onended = () => forgetNode(src);
        return;
      } catch {
        /* fall through */
      }
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const freq = 110 * Math.pow(2, slot / 12);
    osc.type = slot % 2 === 0 ? "triangle" : "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(0.18, when + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.16);
    osc.connect(gain);
    gain.connect(bedGain);
    osc.start(when);
    osc.stop(when + 0.18);
    bedNodes.push(osc);
    osc.onended = () => forgetNode(osc);
  }

  function playStep(index, when) {
    for (const layer of PATTERN) {
      const slot = layer[index];
      if (slot == null || slot < 0) continue;
      playBedVoice(slot, when);
    }
  }

  function pumpBed() {
    if (!bedOn || !ctx) return;
    const look = 0.18;
    const now = ctx.currentTime;
    while (bedStart + bedStep * BED_STEP < now + look) {
      const when = Math.max(bedStart + bedStep * BED_STEP, now);
      const index = ((bedStep % BED_LENGTH) + BED_LENGTH) % BED_LENGTH;
      playStep(index, when);
      bedStep += 1;
    }
    bedRaf = requestAnimationFrame(pumpBed);
  }

  function stopBed() {
    bedOn = false;
    cancelAnimationFrame(bedRaf);
    bedRaf = 0;
    bedStep = 0;
    for (const node of bedNodes) {
      try {
        node.stop();
      } catch {
        /* already stopped */
      }
      try {
        node.disconnect();
      } catch {
        /* ignore */
      }
    }
    bedNodes = [];
  }

  function startBed() {
    ensure();
    stopBed();
    bedOn = true;
    bedStart = ctx.currentTime;
    bedStep = 0;
    pumpBed();
  }

  async function decodeUrl(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error("fetch");
    const raw = await res.arrayBuffer();
    return ctx.decodeAudioData(raw.slice(0));
  }

  async function loadHit(slot, url) {
    if (!url) {
      customHits[slot] = null;
      return;
    }
    try {
      ensure();
      customHits[slot] = await decodeUrl(url);
    } catch {
      customHits[slot] = null;
    }
  }

  async function loadBed(slot, url) {
    const tries = [];
    if (url) tries.push(url);
    const fallback = bedUrl(slot);
    if (!tries.includes(fallback)) tries.push(fallback);
    ensure();
    for (const item of tries) {
      try {
        beds[slot] = await decodeUrl(item);
        return;
      } catch {
        /* try next */
      }
    }
    beds[slot] = null;
  }

  async function applyConfig({ hits = [], beds: nextBeds = [] } = {}) {
    await Promise.all([
      ...hits.map((item) => loadHit(item.slot, item.src)),
      ...Array.from({ length: BED_COUNT }, (_, slot) => {
        const src = nextBeds.find((item) => item.slot === slot)?.src || "";
        return loadBed(slot, src);
      }),
    ]);
  }

  function dispose() {
    stopBed();
    if (ctx) {
      ctx.close().catch(() => {});
    }
    ctx = null;
    master = null;
    bedGain = null;
  }

  return { resume, playHit, startBed, stopBed, applyConfig, dispose };
}
