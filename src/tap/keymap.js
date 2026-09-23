export const HIT_COUNT = 32;
export const BED_COUNT = 11;

const EXTRA_KEYS = ["[", "]", ";", "'", ",", "."];

export function slotFromKey(key) {
  if (!key) return -1;
  if (key.length === 1) {
    const lower = key.toLowerCase();
    if (lower >= "a" && lower <= "z") return lower.charCodeAt(0) - 97;
    const extra = EXTRA_KEYS.indexOf(key);
    if (extra >= 0) return 26 + extra;
  }
  return -1;
}

export function slotFromPoint(x, y, width, height) {
  const landscape = width > height;
  const cols = landscape ? 8 : 4;
  const rows = landscape ? 4 : 8;
  if (width <= 0 || height <= 0) return 0;
  const col = Math.min(cols - 1, Math.max(0, Math.floor((x / width) * cols)));
  const row = Math.min(rows - 1, Math.max(0, Math.floor((y / height) * rows)));
  return row * cols + col;
}

export function emptyTapConfig() {
  return {
    hits: Array.from({ length: HIT_COUNT }, (_, slot) => ({ kind: "hit", slot, src: "", label: "" })),
    beds: Array.from({ length: BED_COUNT }, (_, slot) => ({ kind: "bed", slot, src: "", label: "" })),
  };
}

function mergeSlots(base, incoming, kind) {
  const map = new Map();
  for (const item of incoming || []) {
    const slot = Number(item.slot);
    if (!Number.isInteger(slot)) continue;
    map.set(slot, {
      kind,
      slot,
      src: item.src || "",
      label: item.label || "",
    });
  }
  return base.map((row) => map.get(row.slot) || row);
}

export function normalizeTapConfig(data) {
  const base = emptyTapConfig();
  return {
    hits: mergeSlots(base.hits, data?.hits, "hit"),
    beds: mergeSlots(base.beds, data?.beds, "bed"),
  };
}
