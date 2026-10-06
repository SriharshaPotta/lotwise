// The showcase (§4.2) prints whatever tradeReceipt returns; these lock it to the copy.
import { describe, expect, it } from "vitest";
import { heroReceipt, position, receiptSerial, tradeReceipt, washTriggers } from "@/lib/demo";
import { money, shortDate } from "@/lib/format";

describe("Brokerage One · NVDA (the hero receipt)", () => {
  const r = tradeReceipt("brokerage-one", 100);

  it("position row: NVDA · 100 sh · avg cost $148.20 · last $129.80, unrealized −$1,840.00", () => {
    const p = position("brokerage-one");
    expect([p.lot.symbol, p.lot.qty, money(p.lot.costPerShare), money(p.price), money(p.unrealized)]).toEqual([
      "NVDA", 100, "$148.20", "$129.80", "−$1,840.00",
    ]);
  });
  it("matches heroReceipt line for line", () => {
    const h = heroReceipt(100);
    expect([r.proceeds, r.basis, r.realized, r.term, r.deductible, r.disallowed]).toEqual([
      h.proceeds, h.basis, h.result!.realized, h.result!.term, h.deductible, h.disallowed,
    ]);
  });
  it("finds the wash trigger in another account: 2 NVDA calls bought Oct 3 · Brokerage Two", () => {
    expect(washTriggers("NVDA").map((t) => t.id)).toEqual(["t7"]);
    expect(r.cause?.trade.qty).toBe(2);
    expect(shortDate(r.cause!.trade.date)).toBe("Oct 3");
    expect(r.cause?.account.name).toBe("Brokerage Two");
  });
  it("stamps WASH SALE", () => expect(r.stamp).toBe("WASH SALE"));
  it("offers the two coupons from the copy", () => {
    expect(r.coupons).toEqual([
      { kind: "wait-to-sell", date: "2026-11-03", keep: 1840 },
      { kind: "harvest-instead", symbol: "AMD", deductible: -1120 },
    ]);
  });
  it("scales with the slider and keeps the stamp for any shares > 0", () => {
    expect(tradeReceipt("brokerage-one", 1).stamp).toBe("WASH SALE");
    expect(tradeReceipt("brokerage-one", 50).disallowed).toBe(920);
    expect(tradeReceipt("brokerage-one", 0).stamp).toBeNull();
  });
  it("toggle adds: Rebuy Oct 22 would also trigger", () => {
    const t = tradeReceipt("brokerage-one", 100, true);
    expect(shortDate(t.rebuy!.date)).toBe("Oct 22");
    expect(t.rebuy!.triggers).toBe(true);
    expect(t.disallowed).toBe(1840);
  });
  it("starts serials at #00042", () => expect(receiptSerial(0)).toBe("#00042"));
});

describe("Brokerage Two · AMD", () => {
  it("is a clean −$1,120 loss with no stamp", () => {
    const r = tradeReceipt("brokerage-two", 80);
    expect(r.deductible).toBe(1120);
    expect(r.stamp).toBeNull();
    expect(r.coupons).toEqual([]);
  });
  it("buying back next week washes it; the coupon says wait until Nov 15", () => {
    const r = tradeReceipt("brokerage-two", 80, true);
    expect(r.stamp).toBe("WASH SALE");
    expect(r.disallowed).toBe(1120);
    expect(r.coupons[0]).toEqual({ kind: "wait-to-rebuy", date: "2026-11-15", keep: 1120 });
  });
});

describe("Roth IRA · MSFT", () => {
  it("is tax-free: no deduction, nothing disallowed, no stamp", () => {
    const r = tradeReceipt("roth-ira", 15, true);
    expect(r.taxFree).toBe(true);
    expect(r.realized).toBe(487.5);
    expect([r.deductible, r.disallowed, r.stamp]).toEqual([0, 0, null]);
  });
  it("clamps shares to the position size", () => {
    expect(tradeReceipt("roth-ira", 100).shares).toBe(15);
  });
});
