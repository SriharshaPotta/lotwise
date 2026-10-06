import { describe, expect, it } from "vitest";
import { bezierTimeFor } from "@/lib/easing";
import { ease } from "@/lib/motion";
import { DIP_AT, TILE_POINTS, lowestIndex, periodicSeries, sampleAt, smoothPath, toPoints } from "@/lib/viz/priceLine";

describe("periodic price series", () => {
  const s = periodicSeries();

  it("is normalized to 0–1", () => {
    expect(Math.min(...s)).toBe(0);
    expect(Math.max(...s)).toBe(1);
  });
  it("closes on itself so two tiles join seamlessly", () => {
    expect(s).toHaveLength(TILE_POINTS + 1);
    expect(s[s.length - 1]).toBe(s[0]);
  });
  it("has its one deep dip where the wash window goes", () => {
    expect(lowestIndex(s) / TILE_POINTS).toBeCloseTo(DIP_AT, 1);
  });
  it("produces a path whose tangent matches across the seam", () => {
    const pts = toPoints(s, 1000, 128, 10);
    const a = smoothPath(pts);
    const b = smoothPath(pts, 1000);
    // tile B starts exactly where tile A ends
    const endA = a.split(/[CM]/).pop()!.trim().split(" ").slice(-2).map(Number);
    const startB = b.slice(1).split("C")[0].trim().split(" ").map(Number);
    expect(endA).toEqual(startB);
  });
  it("samples between points", () => {
    const pts = toPoints(s, 720, 100, 0);
    expect(sampleAt(pts, 0).x).toBe(0);
    expect(sampleAt(pts, 1).x).toBe(720);
    expect(sampleAt(pts, 0.5).x).toBeCloseTo(360);
  });
});

describe("bezierTimeFor", () => {
  it("inverts the ink easing at the ends and middle", () => {
    expect(bezierTimeFor(0, ease.ink)).toBeCloseTo(0, 3);
    expect(bezierTimeFor(1, ease.ink)).toBeCloseTo(1, 3);
    expect(bezierTimeFor(0.5, ease.ink)).toBeCloseTo(0.5, 2); // symmetric curve
  });
  it("is monotonic", () => {
    const ts = [0.1, 0.3, 0.6, 0.9].map((p) => bezierTimeFor(p, ease.ink));
    expect([...ts].sort((a, b) => a - b)).toEqual(ts);
  });
});
