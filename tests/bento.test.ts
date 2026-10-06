// Locks the numbers the §4.5 bento visuals show to the demo data, and checks the loop helpers.
import { describe, expect, it } from "vitest";
import { HARVEST_COLS, HARVEST_ROWS, countdown, harvestGrid, sec1256Compare, simulatorTable } from "@/lib/demo";
import { findings } from "@/lib/demo";
import { keyframes, progress, sampleAt, wrap } from "@/lib/loop";

describe("pre-trade simulator", () => {
  const rows = simulatorTable();
  it("has one row per share, starting at zero", () => {
    expect(rows).toHaveLength(41);
    expect(rows[0]).toEqual({ shares: 0, proceeds: 0, gain: 0, estTax: 0 });
  });
  it("selling all 40 AAPL realizes $4,555.60 short-term, $1,093.34 tax", () => {
    expect(rows[40]).toEqual({ shares: 40, proceeds: 9256, gain: 4555.6, estTax: 1093.34 });
  });
  it("tax is proportional to shares, so interpolating between rows is a true tween", () => {
    expect(sampleAt(rows, 20.5, (r) => r.estTax)).toBeCloseTo((rows[20].estTax + rows[21].estTax) / 2, 2);
  });
});

describe("loss harvesting", () => {
  const cells = harvestGrid();
  const losses = cells.filter((c) => c.kind !== "hold") as Exclude<(typeof cells)[number], { kind: "hold" }>[];
  it("fills a 7×4 grid with seven loss lots, worked through in order", () => {
    expect(cells).toHaveLength(HARVEST_COLS * HARVEST_ROWS);
    expect(losses.map((c) => c.order)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
  it("the one that would wash is the hero NVDA lot ($1,840)", () => {
    const wash = losses.filter((c) => c.kind === "wash");
    expect(wash).toEqual([{ kind: "wash", symbol: "NVDA", disallowed: 1840, order: 3 }]);
  });
  it("the six clean harvests save $678.38, starting with AMD", () => {
    const harvests = losses.filter((c) => c.kind === "harvest");
    expect(harvests[0]).toMatchObject({ symbol: "AMD" });
    expect(harvests.reduce((s, c) => s + (c.kind === "harvest" ? c.saved : 0), 0)).toBeCloseTo(678.38, 2);
  });
});

describe("long-term countdown", () => {
  it("AAPL goes long-term in 9 days (Oct 24), saving $410, matching the findings tape", () => {
    const cd = countdown();
    expect(cd).toMatchObject({ symbol: "AAPL", daysAway: 9, ltDate: "2026-10-24", save: 410 });
    expect(cd.held + cd.daysAway).toBe(cd.total);
    expect(findings().find((f) => f.id === "long-term")?.amount).toBe(cd.save);
  });
});

describe("section 1256", () => {
  it("XSP instead of SPY saves $388, matching the findings tape", () => {
    const s = sec1256Compare();
    expect(s.spyTax).toBe(1724.45);
    expect(s.xspTax).toBe(1336.45);
    expect(s.save).toBe(388);
    expect(s.ltPart + s.stPart).toBeCloseTo(s.xspTax, 1);
    expect(findings().find((f) => f.id === "1256")?.amount).toBe(s.save);
  });
});

describe("loop helpers", () => {
  const stops = [[0, 0], [1, 10], [2, 10], [3, 0]] as const;
  it("interpolates within segments and holds the ends", () => {
    expect(keyframes(-1, stops)).toBe(0);
    expect(keyframes(0.5, stops)).toBe(5);
    expect(keyframes(1.5, stops)).toBe(10);
    expect(keyframes(2.5, stops)).toBe(5);
    expect(keyframes(9, stops)).toBe(0);
  });
  it("progress is clamped 0..1", () => {
    expect(progress(0, 1, 2)).toBe(0);
    expect(progress(1.25, 1, 2)).toBe(0.25);
    expect(progress(5, 1, 2)).toBe(1);
  });
  it("wrap folds time into one period", () => {
    expect(wrap(8.5, 8)).toBeCloseTo(0.5);
    expect(wrap(-1, 8)).toBe(7);
  });
});
