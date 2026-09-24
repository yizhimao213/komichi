export const BED_BPM = 280;
export const BED_STEP = 60 / BED_BPM;
export const BED_LENGTH = 64;

const LAYER0_CELL = [0, 1, 2, 1];
const LAYER1_SRC = "3443443443443434566566566566565678878878878878789119119119119191";

export const BED_VOLUMES = [1.2, 0.72, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2];

export function bedUrl(slot) {
  return `/tap/bed/${slot}.mp3`;
}

export function bedPattern() {
  const layer0 = Array.from({ length: BED_LENGTH }, (_, i) => LAYER0_CELL[i % 4]);
  const layer1 = Array.from(LAYER1_SRC, (ch) => {
    const n = Number(ch);
    return n === 1 ? 10 : n;
  });
  return [layer0, layer1];
}
