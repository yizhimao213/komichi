import { BED_COUNT, HIT_COUNT } from "./keymap.js";

const HIT_TYPES = ["sine", "triangle", "square", "sawtooth"];
const HIT_STEPS = [0, 2, 4, 5, 7, 9, 11, 12];

export function createTapEngine() {
  let ctx = null;
  let master = null;
  let bedGain = null;
  let bedNodes = [];
  const customHits = Array(HIT_COUNT).fill(null);
  const customBeds = Array(BED_COUNT).fill(null);

  function ensure() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.72;
    master.connect(ctx.destination);
    bedGain = ctx.createGain();
    bedGain.gain.value = 0.2;
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

  function playBuffer(buffer, loop, dest) {
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = Boolean(loop);
    src.connect(dest);
    src.start();
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

  function stopBed() {
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

  function startBedSynth(slot) {
    ensure();
    stopBed();
    const now = ctx.currentTime;
    const root = 82 * Math.pow(2, slot / 11);
    const intervals = slot % 2 === 0 ? [0, 7, 12] : [0, 5, 9];
    for (const interval of intervals) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = slot % 3 === 0 ? "triangle" : "sine";
      osc.frequency.value = root * Math.pow(2, interval / 12);
      gain.gain.value = 0.09;
      osc.connect(gain);
      gain.connect(bedGain);
      osc.start(now);
      bedNodes.push(osc);
    }
  }

  function startBed(slot) {
    const index = ((slot % BED_COUNT) + BED_COUNT) % BED_COUNT;
    ensure();
    stopBed();
    const buf = customBeds[index];
    if (buf) {
      try {
        bedNodes.push(playBuffer(buf, true, bedGain));
        return;
      } catch {
        /* fall through */
      }
    }
    startBedSynth(index);
  }

  async function loadSlot(kind, slot, url) {
    const list = kind === "bed" ? customBeds : customHits;
    if (!url) {
      list[slot] = null;
      return;
    }
    try {
      ensure();
      const res = await fetch(url);
      if (!res.ok) throw new Error("fetch");
      const raw = await res.arrayBuffer();
      const buf = await ctx.decodeAudioData(raw.slice(0));
      list[slot] = buf;
    } catch {
      list[slot] = null;
    }
  }

  async function applyConfig({ hits = [], beds = [] } = {}) {
    await Promise.all([
      ...hits.map((item) => loadSlot("hit", item.slot, item.src)),
      ...beds.map((item) => loadSlot("bed", item.slot, item.src)),
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
