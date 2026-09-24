import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BED_LENGTH, bedPattern, bedUrl } from "./bed.js";

describe("bedPattern", () => {
  it("repeats 0-1-2-1 on layer 0 for 64 steps", () => {
    const [layer0, layer1] = bedPattern();
    assert.equal(layer0.length, BED_LENGTH);
    assert.equal(layer1.length, BED_LENGTH);
    assert.deepEqual(layer0.slice(0, 8), [0, 1, 2, 1, 0, 1, 2, 1]);
    assert.equal(layer0[63], 1);
  });

  it("maps Joitap layer-1 digits and turns 1 into slot 10", () => {
    const [, layer1] = bedPattern();
    assert.equal(layer1[0], 3);
    assert.equal(layer1[32], 7);
    assert.equal(layer1[48], 9);
    assert.equal(layer1[49], 10);
    assert.equal(layer1[63], 10);
  });

  it("points default files at /tap/bed", () => {
    assert.equal(bedUrl(0), "/tap/bed/0.mp3");
    assert.equal(bedUrl(10), "/tap/bed/10.mp3");
  });
});
