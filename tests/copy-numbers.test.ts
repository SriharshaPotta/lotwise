// Locks the numbers printed in the site copy (WEBSITE_PLAN.md §4) to the demo data.
// If one of these fails, either the data drifted or the copy needs updating. Never both silently.
import { describe, expect, it } from "vitest";
import {
  DEMO_DATE,
  HERO_REPLACEMENT,
  aaplLongTerm,
  account,
  agentXyz,
  agentTranscript,
  amdHarvest,
  heroReceipt,
  heroSafeSale,
  iraTrap,
  LOTS,
  PRICES,
} from "@/lib/demo";
import { money, receiptDate, shortDate } from "@/lib/format";

describe("demo date", () => {
  it("is Oct 15 2026", () => {
    expect(DEMO_DATE).toBe("2026-10-15");
    expect(receiptDate(DEMO_DATE)).toBe("OCT 15 2026");
  });
});

describe("§4.2 hero receipt: SELL 100 NVDA @ 129.80", () => {
  const r = heroReceipt(100);

  it("position row: 100 sh, avg cost $148.20, last $129.80", () => {
    expect(LOTS.nvda.qty).toBe(100);
    expect(LOTS.nvda.costPerShare).toBe(148.2);
    expect(PRICES.NVDA).toBe(129.8);
    expect(account(LOTS.nvda.account).name).toBe("Brokerage One");
  });
  it("Proceeds $12,980.00", () => expect(money(r.proceeds)).toBe("$12,980.00"));
  it("Cost basis $14,820.00", () => expect(money(r.basis)).toBe("$14,820.00"));
  it("Realized −$1,840.00", () => expect(money(r.result!.realized)).toBe("−$1,840.00"));
  it("Term SHORT", () => expect(r.result!.term).toBe("short"));
  it("Deductible loss $0.00", () => expect(money(r.deductible)).toBe("$0.00"));
  it("Disallowed (wash sale) $1,840.00", () => expect(money(r.disallowed)).toBe("$1,840.00"));
  it("caused by 2 NVDA calls bought Oct 3 in Brokerage Two", () => {
    expect(HERO_REPLACEMENT).toMatchObject({ symbol: "NVDA", qty: 2, option: { type: "call" } });
    expect(shortDate(HERO_REPLACEMENT.date)).toBe("Oct 3");
    expect(account(HERO_REPLACEMENT.account).name).toBe("Brokerage Two");
  });
  it("stamps WASH SALE whenever shares > 0, and not at 0", () => {
    expect(heroReceipt(1).result!.wash).not.toBeNull();
    expect(heroReceipt(0).result).toBeNull();
  });
  it("scales with the slider (50 shares → −$920.00, all disallowed)", () => {
    const half = heroReceipt(50);
    expect(money(half.result!.realized)).toBe("−$920.00");
    expect(half.disallowed).toBe(920);
  });
  it("Rebuy Oct 22 would also trigger", () => {
    const withRebuy = heroReceipt(100, true);
    expect(shortDate(withRebuy.rebuy!.date)).toBe("Oct 22");
    expect(withRebuy.rebuy!.triggers).toBe(true);
  });
});

describe("§4.2 coupons", () => {
  it("Sell on or after Nov 3 → keep the full $1,840 deduction", () => {
    const s = heroSafeSale();
    expect(shortDate(s.date)).toBe("Nov 3");
    expect(s.result.wash).toBeNull();
    expect(money(s.kept, { whole: true })).toBe("$1,840");
  });
  it("Harvest AMD instead → −$1,120 deductible, no wash", () => {
    const a = amdHarvest();
    expect(money(a.deductible, { whole: true })).toBe("−$1,120");
    expect(a.result.wash).toBeNull();
  });
});

describe("§2.6.3 stamp: LONG-TERM IN 9 DAYS", () => {
  it("AAPL goes long-term 9 days after the demo date", () => {
    expect(aaplLongTerm().daysAway).toBe(9);
  });
});

describe("§4.3 / §4.4 IRA trap", () => {
  it("INTC sold at a loss, rebought in the Roth IRA: $620 lost permanently", () => {
    const t = iraTrap();
    expect(money(t.result.realized, { whole: true })).toBe("−$620");
    expect(t.result.wash?.permanent).toBe(true);
    expect(t.result.wash?.disallowed).toBe(620);
  });
});

describe("§4.7 agents transcript", () => {
  it("SELL 100 XYZ realized −$1,000, rebuy safe from NOV 15", () => {
    const x = agentXyz();
    expect(money(x.result.realized, { whole: true })).toBe("−$1,000");
    expect(x.result.wash).not.toBeNull();
    expect(receiptDate(x.safeFrom).startsWith("NOV 15")).toBe(true);
  });
});

describe("§4.7 agents transcript copy", () => {
  it("matches the plan word for word", () => {
    const t = agentTranscript();
    expect(t.user).toBe("Sell my XYZ to lock in the loss, then buy it back next week.");
    expect(t.receipt).toEqual({ sale: "SELL 100 XYZ", realized: "−$1,000", risk: "HIGH", safeFrom: "NOV 15" });
    expect(t.reply).toBe(
      "Selling now locks in a $1,000 loss, but buying back next week would disallow it. I’ll sell today and set a reminder to rebuy on November 15, or I can buy a similar-but-not-identical ETF now. Which do you prefer?",
    );
  });
});
