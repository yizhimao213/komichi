import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { cellOfSlot, emptyTapConfig, normalizeTapConfig, slotFromKey, slotFromPoint } from "./keymap.js";

describe("slotFromKey", () => {
  it("maps A-Z to 0-25", () => {
    assert.equal(slotFromKey("a"), 0);
    assert.equal(slotFromKey("Z"), 25);
  });

  it("maps extra keys to 26-31", () => {
    assert.equal(slotFromKey("["), 26);
    assert.equal(slotFromKey("]"), 27);
    assert.equal(slotFromKey(";"), 28);
    assert.equal(slotFromKey("'"), 29);
    assert.equal(slotFromKey(","), 30);
    assert.equal(slotFromKey("."), 31);
  });

  it("rejects unmapped keys", () => {
    assert.equal(slotFromKey(" "), -1);
    assert.equal(slotFromKey("Enter"), -1);
  });
});

describe("slotFromPoint", () => {
  it("uses 8x4 in landscape and 4x8 in portrait", () => {
    assert.equal(slotFromPoint(0, 0, 800, 400), 0);
    assert.equal(slotFromPoint(799, 0, 800, 400), 7);
    assert.equal(slotFromPoint(0, 399, 800, 400), 24);
    assert.equal(slotFromPoint(799, 399, 800, 400), 31);
    assert.equal(slotFromPoint(399, 0, 400, 800), 3);
  });

  it("cellOfSlot covers the 8x4 hit pad", () => {
    const cell = cellOfSlot(7, 800, 400);
    assert.equal(cell.x, 700);
    assert.equal(cell.w, 100);
    assert.equal(cell.h, 100);
    const last = cellOfSlot(31, 800, 400);
    assert.equal(last.x, 700);
    assert.equal(last.y, 300);
  });
});

describe("normalizeTapConfig", () => {
  it("fills 32 hits and 11 beds", () => {
    const next = normalizeTapConfig({
      hits: [{ slot: 0, src: "/files/a/a.mp3", label: "kick" }],
      beds: [],
    });
    assert.equal(next.hits.length, 32);
    assert.equal(next.beds.length, 11);
    assert.equal(next.hits[0].src, "/files/a/a.mp3");
    assert.equal(next.hits[1].src, "");
  });

  it("emptyTapConfig starts blank", () => {
    const base = emptyTapConfig();
    assert.equal(base.hits.length, 32);
    assert.equal(base.beds.length, 11);
  });
});
