// Engine rules. WEBSITE_PLAN.md §6 asks for PLAN.md fixtures F1, F2, F3, F4, F6, F8; PLAN.md is not in
// the repo yet, so these are stand-ins under the same ids covering the same rule set. Replace their
// inputs with the PLAN.md fixtures verbatim once that file lands.
import { describe, expect, it } from "vitest";
import { addMonths, daysBetween, engine, isLongTerm, longTermDate, recognized } from "@/lib/engine";
import type { Lot } from "@/lib/engine";

const lot = (over: Partial<Lot> = {}): Lot => ({
  id: "L1", account: "taxable-a", symbol: "ABC", qty: 100, costPerShare: 50, acquired: "2026-01-02", ...over,
});

describe("F1 · short-term gain, no rebuy", () => {
  const r = engine.simulateSale({ lot: lot({ qty: 10, costPerShare: 100 }), qty: 10, price: 150, date: "2026-06-01" });
  it("realizes the gain at the short-term rate", () => {
    expect(r).toEqual({ realized: 500, term: "short", estTax: 120, wash: null });
  });
});

describe("F2 · the one-year boundary", () => {
  const l = lot({ acquired: "2025-03-15", costPerShare: 40 });
  it("is still short-term on the anniversary", () => {
    expect(engine.simulateSale({ lot: l, qty: 100, price: 50, date: "2026-03-15" }).term).toBe("short");
  });
  it("is long-term the day after, taxed at 15%", () => {
    const r = engine.simulateSale({ lot: l, qty: 100, price: 50, date: "2026-03-16" });
    expect(r.term).toBe("long");
    expect(r.estTax).toBe(150);
  });
  it("clamps leap days when adding twelve months", () => {
    expect(addMonths("2024-02-29", 12)).toBe("2025-02-28");
    expect(isLongTerm("2024-02-29", "2025-02-28")).toBe(false);
    expect(isLongTerm("2024-02-29", "2025-03-01")).toBe(true);
    expect(longTermDate("2024-02-29")).toBe("2025-03-01");
  });
});

describe("F3 · partial wash sale in a taxable account", () => {
  // 100 sh bought at $50, sold at $40 (−$1,000), 40 sh rebought 10 days later at $41.
  const r = engine.simulateSale({
    lot: lot(), qty: 100, price: 40, date: "2026-04-01",
    rebuy: { date: "2026-04-11", qty: 40, price: 41, account: "taxable-b" },
  });
  it("disallows the loss pro rata to the replacement shares", () => {
    expect(r.realized).toBe(-1000);
    expect(r.wash?.disallowed).toBe(400);
    expect(r.wash?.permanent).toBe(false);
  });
  it("adds the disallowed loss to the replacement basis", () => {
    expect(r.wash?.replacementBasis).toBe(40 * 41 + 400);
  });
  it("moves the replacement holding start earlier by the days held", () => {
    const held = daysBetween("2026-01-02", "2026-04-01");
    expect(daysBetween(r.wash!.holdingStart, "2026-04-11")).toBe(held);
  });
  it("only deducts the allowed part", () => {
    expect(recognized(r)).toBe(-600);
    expect(r.estTax).toBe(-144);
  });
});

describe("F4 · the ±30-day window edges", () => {
  const sell = (rebuyDate: string) =>
    engine.simulateSale({ lot: lot(), qty: 100, price: 40, date: "2026-04-01", rebuy: { date: rebuyDate, qty: 100, price: 40, account: "x" } });
  it.each([
    ["2026-03-02", true],  // 30 days before
    ["2026-03-01", false], // 31 days before
    ["2026-05-01", true],  // 30 days after
    ["2026-05-02", false], // 31 days after
  ])("rebuy on %s washes: %s", (date, washes) => {
    expect(sell(date).wash !== null).toBe(washes);
  });
});

describe("F6 · rebuy inside an IRA", () => {
  const r = engine.simulateSale({
    lot: lot(), qty: 100, price: 40, date: "2026-04-01",
    rebuy: { date: "2026-04-05", qty: 100, price: 40.5, account: "roth", isIra: true },
  });
  it("loses the deduction permanently and does not adjust basis", () => {
    expect(r.wash).toEqual({ disallowed: 1000, replacementBasis: 4050, holdingStart: "2026-04-05", permanent: true });
  });
});

describe("F8 · a gain is never a wash sale", () => {
  const r = engine.simulateSale({
    lot: lot(), qty: 100, price: 60, date: "2026-04-01",
    rebuy: { date: "2026-04-02", qty: 100, price: 60, account: "x" },
  });
  it("ignores the rebuy", () => {
    expect(r.wash).toBeNull();
    expect(r.realized).toBe(1000);
  });
});

describe("input validation", () => {
  it("rejects selling more than the lot holds", () => {
    expect(() => engine.simulateSale({ lot: lot(), qty: 101, price: 40, date: "2026-04-01" })).toThrow(RangeError);
  });
  it("honours custom tax rates", () => {
    const r = engine.simulateSale({ lot: lot(), qty: 100, price: 60, date: "2026-04-01", taxRates: { st: 0.37, lt: 0.2 } });
    expect(r.estTax).toBe(370);
  });
});
