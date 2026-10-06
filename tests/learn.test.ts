// §5: the learning path, the wash-sale explainer model, and the numbers its prose quotes.
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ORDINARY_INCOME_OFFSET, S1256_EXPLAINER, harvestGrid, harvestLots, harvestTotals, TERM_EXPLAINER, WASH_SCENARIOS, s1256State, xspSaving, accountsExplainer, washOutcome, WASH_EXPLAINER as X, calendarDate, calendarDay, longTermSaving, termCliff, termDay, termState, washState } from "@/lib/demo";
import { addDays, costBasis, daysBetween, firstSafeRebuyAfter } from "@/lib/engine";
import { longDate, money } from "@/lib/format";
import { EXPLAINERS, neighbours, readingMinutes } from "@/lib/learn";

const MDX = readFileSync("content/learn/the-wash-sale.mdx", "utf8");

describe("learning path", () => {
  it("lists the seven §5 explainers in order", () => {
    expect(EXPLAINERS.map((e) => e.slug)).toEqual([
      "the-wash-sale", "short-vs-long-term", "across-accounts", "the-ira-trap",
      "options-can-trigger-it", "section-1256", "tax-loss-harvesting",
    ]);
    expect(EXPLAINERS.map((e) => e.n)).toEqual(["01", "02", "03", "04", "05", "06", "07"]);
  });
  it("every ready explainer has its MDX", () => {
    for (const e of EXPLAINERS.filter((x) => x.ready)) expect(existsSync(`content/learn/${e.slug}.mdx`)).toBe(true);
  });
  it("neighbours follow the path", () => {
    expect(neighbours("the-wash-sale").prev).toBeUndefined();
    expect(neighbours("the-wash-sale").next?.slug).toBe("short-vs-long-term");
    expect(neighbours("short-vs-long-term").prev?.slug).toBe("the-wash-sale");
  });
});

describe("wash-sale explainer model", () => {
  it("defaults to buying back a week later, inside the window", () => {
    const s = washState(X.defaultRebuy);
    expect(s.rebuyDate).toBe("2026-10-22");
    expect(s).toMatchObject({ inWindow: true, loss: -1840, disallowed: 1840, deductible: 0, newBasis: 14820 });
    expect(s.holdingStart).toBe(addDays(X.defaultRebuy, -X.daysHeld));
  });
  it("outside the window the loss is deductible and the new lot starts fresh", () => {
    const s = washState("2026-11-20");
    expect(s).toMatchObject({ inWindow: false, disallowed: 0, deductible: -1840, newBasis: 12980, holdingStart: "2026-11-20" });
  });
  it("the window is exactly 30 days either side, and the calendar shows it", () => {
    expect(washState("2026-09-15").inWindow).toBe(true);
    expect(washState("2026-09-14").inWindow).toBe(false);
    expect(washState("2026-11-14").inWindow).toBe(true);
    expect(washState("2026-11-15").inWindow).toBe(false);
    expect(X.windowStart).toBe("2026-09-15");
    expect(X.windowEnd).toBe("2026-11-14");
    expect(calendarDay(X.windowStart)).toBeGreaterThan(0);
    expect(calendarDay(X.windowEnd)).toBeLessThan(X.calendarDays - 1);
    expect(calendarDate(calendarDay(X.saleDate))).toBe(X.saleDate);
  });
});

describe("the-wash-sale prose", () => {
  const words = MDX.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;

  it("is under 600 words and ends with the estimates note", () => {
    expect(words).toBeLessThan(600);
    expect(MDX.trim().endsWith("</p>")).toBe(true);
    expect(MDX).toContain("Estimates only, not tax advice.");
    expect(readingMinutes(MDX)).toBeGreaterThanOrEqual(2);
  });

  it("quotes only numbers the engine produces", () => {
    const proceeds = money(X.price * X.qty, { whole: true });
    const paid = money(costBasis(X.lot, X.qty), { whole: true });
    const loss = money(-washState(X.defaultRebuy).loss, { whole: true });
    expect([proceeds, paid, loss]).toEqual(["$12,980", "$14,820", "$1,840"]);
    const amounts = new Set(MDX.match(/\$\d{1,3}(?:,\d{3})*/g));
    expect([...amounts].sort()).toEqual([loss, proceeds, paid].sort());
    expect(MDX).toContain(`${X.daysHeld} days`);
    expect(X.daysHeld).toBe(217);
    expect(MDX).toContain(`that's ${longDate(firstSafeRebuyAfter(X.saleDate))}`);
    expect(MDX).toContain(`on ${longDate(X.saleDate)}`);
  });
});

/** Shared prose checks: word limit, closing note, and only engine-backed dollar amounts. */
function proseChecks(slug: string, limit: number, amounts: string[]) {
  const mdx = readFileSync(`content/learn/${slug}.mdx`, "utf8");
  const words = mdx.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  expect(words).toBeLessThan(limit);
  expect(mdx).toContain("Estimates only, not tax advice.");
  expect(mdx.trim().endsWith("</p>")).toBe(true);
  expect([...new Set(mdx.match(/\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g))].sort()).toEqual([...new Set(amounts)].sort());
  return mdx;
}

describe("short-vs-long-term", () => {
  it("turns long-term on Oct 24 2026, the day after the anniversary", () => {
    expect(TERM_EXPLAINER.ltDate).toBe("2026-10-24");
    expect(termState("2026-10-23").term).toBe("short");
    expect(termState("2026-10-24").term).toBe("long");
    expect(termState(TERM_EXPLAINER.today).daysHeld).toBe(357);
    const lt = termDay(TERM_EXPLAINER.ltDate);
    expect(lt).toBeGreaterThan(0);
    expect(lt).toBeLessThan(TERM_EXPLAINER.calendarDays - 1);
  });
  it("the cliff: $1,093 → $683, saving $410 (the findings tape figure); waiting loses if AAPL falls ~5%", () => {
    const c = termCliff();
    expect(c.short.estTax).toBe(1093.34);
    expect(c.long.estTax).toBe(683.34);
    expect(c.save).toBe(410);
    expect(c.save).toBe(longTermSaving().save);
    expect(Math.round(c.breakEvenDrop * 100)).toBe(5);
  });
  it("prose quotes only those numbers", () => {
    const c = termCliff();
    const mdx = proseChecks("short-vs-long-term", 500, [
      money(TERM_EXPLAINER.lot.costPerShare), money(TERM_EXPLAINER.price), money(c.short.gain, { whole: true }),
      money(c.short.estTax, { whole: true }), money(c.long.estTax, { whole: true }), money(c.save, { whole: true }),
    ]);
    expect(mdx).toContain(`${TERM_EXPLAINER.qty} shares of ${TERM_EXPLAINER.lot.symbol}`);
    expect(mdx).toContain(`about ${Math.round(c.breakEvenDrop * 100)}%`);
    expect(mdx).toContain("October 24, 2026");
  });
});

describe("across-accounts", () => {
  const d = accountsExplainer();
  it("each broker alone finds nothing; together the Oct 3 calls disallow $1,840", () => {
    expect(d.accounts.map((a) => [a.name, a.washes])).toEqual([["Brokerage One", false], ["Brokerage Two", false]]);
    expect(d.replacementId).toBe("t7");
    expect(d.replacement.date).toBe("2026-10-03");
    expect(d.daysBefore).toBe(12);
    expect(d.disallowed).toBe(1840);
    expect(d.realized).toBe(-1840);
  });
  it("the merged ledger is both accounts in date order, with the window around the sale", () => {
    expect(d.merged).toHaveLength(d.accounts.reduce((n, a) => n + a.entries.length, 0));
    expect(d.merged.map((e) => e.date)).toEqual([...d.merged.map((e) => e.date)].sort());
    const ids = d.merged.slice(d.window.first, d.window.last + 1).map((e) => e.id);
    expect(ids).toContain(d.saleId);
    expect(ids).toContain(d.replacementId);
  });
  it("prose quotes only those numbers", () => {
    const mdx = proseChecks("across-accounts", 500, [money(d.disallowed, { whole: true })]);
    expect(mdx).toContain(`${d.daysBefore} days earlier`);
    expect(mdx).toContain("on October 3");
  });
});

describe("the-ira-trap", () => {
  const S = WASH_SCENARIOS.iraTrap;
  it("INTC sold Sep 28 at $21.20 (paid $27.40): a $620 loss", () => {
    expect(S.saleDate).toBe("2026-09-28");
    expect(washOutcome(S, S.defaultDate).loss).toBe(-620);
  });
  it("bought back in the Roth IRA 8 days later: disallowed for good, no basis added (matches the convergence)", () => {
    const s = washOutcome(S, S.defaultDate, "roth-ira");
    expect(daysBetween(S.saleDate, S.defaultDate)).toBe(8);
    expect(s).toMatchObject({ where: "gone", permanent: true, disallowed: 620, deductible: 0, newBasis: 2190 });
  });
  it("bought back in Brokerage One: an ordinary wash sale, basis up by $620", () => {
    expect(washOutcome(S, S.defaultDate, "brokerage-one")).toMatchObject({ where: "lot", permanent: false, newBasis: 2810 });
  });
  it("outside the window, in either account, the loss is deductible", () => {
    for (const a of S.accounts) expect(washOutcome(S, addDays(S.saleDate, 31), a)).toMatchObject({ where: "deductible", deductible: -620 });
  });
  it("prose quotes only those numbers", () => {
    const mdx = proseChecks("the-ira-trap", 500, [money(S.price), money(S.lot.costPerShare), money(620, { whole: true })]);
    expect(mdx).toContain(`${daysBetween(S.saleDate, S.defaultDate)} days later`);
    expect(mdx).toContain(`sold ${S.qty} ${S.lot.symbol}`);
  });
});

describe("options-can-trigger-it", () => {
  const S = WASH_SCENARIOS.options;
  it("2 NVDA calls bought Oct 3 at $6.40 a share: $1,280, counted as 200 shares", () => {
    expect(S.defaultDate).toBe("2026-10-03");
    expect(S.purchase).toMatchObject({ qty: 200, price: 6.4, what: "2 NVDA calls" });
    expect(washOutcome(S, "2026-11-20").newBasis).toBe(1280);
  });
  it("inside the window they disallow the whole $1,840 and the calls' basis becomes $3,120", () => {
    expect(washOutcome(S, S.defaultDate)).toMatchObject({ where: "lot", disallowed: 1840, newBasis: 3120, deductible: 0 });
  });
  it("this is the same wash the hero receipt and the convergence show", () => {
    expect(washOutcome(S, S.defaultDate).disallowed).toBe(accountsExplainer().disallowed);
  });
  it("prose quotes only those numbers", () => {
    proseChecks("options-can-trigger-it", 500, [money(S.purchase.price), "$1,280", "$1,840", "$3,120"]);
  });
});

describe("section-1256", () => {
  const def = s1256State(S1256_EXPLAINER.defaultGain, false);
  it("the demo's $7,185 SPY gain: $1,724 short-term vs $1,336 on XSP, saving $388 (the findings tape figure)", () => {
    expect(def.gain).toBe(7185);
    expect(def.spy).toEqual({ term: "short", tax: 1724.4 });
    expect(def.xsp.tax).toBe(1336.41);
    expect(Math.round(def.saving)).toBe(Math.round(xspSaving()));
    expect(def.xsp.ltTax + def.xsp.stTax).toBeCloseTo(def.xsp.tax, 2);
  });
  it("XSP is 18.6% blended, 5.4 points under short-term and 3.6 over long-term", () => {
    expect(def.xsp.blendedRate).toBeCloseTo(0.186, 6);
    const long = s1256State(10000, true);
    expect(long.spy.term).toBe("long");
    expect(long.saving).toBe(-360);
    expect(s1256State(10000, false).saving).toBe(540);
  });
  it("the default sits on the slider's step", () => {
    const x = S1256_EXPLAINER;
    expect((x.defaultGain - x.min) % x.step).toBe(0);
  });
  it("prose quotes only those numbers", () => {
    const mdx = proseChecks("section-1256", 500, ["$7,185", money(def.spy.tax, { whole: true }), money(def.xsp.tax, { whole: true }), money(def.saving, { whole: true })]);
    expect(mdx).toContain("18.6%");
    expect(mdx).toContain("5.4%");
  });
});

describe("tax-loss-harvesting", () => {
  const lots = harvestLots();
  const safe = lots.filter((l) => l.kind === "harvest");
  it("six safe losses, one blocked lot (NVDA, safe from Nov 3), three gains", () => {
    expect(safe).toHaveLength(6);
    expect(lots.filter((l) => l.kind === "gain").map((l) => l.symbol).sort()).toEqual(["AAPL", "VTI", "VTI"]);
    const blocked = lots.filter((l) => l.kind === "blocked");
    expect(blocked).toHaveLength(1);
    expect(blocked[0]).toMatchObject({ symbol: "NVDA", pnl: -1840, disallowed: 1840, safeFrom: "2026-11-03" });
  });
  it("harvesting all six saves $678.38, the same as the bento grid", () => {
    const all = harvestTotals(safe.map((l) => l.id));
    expect(all.count).toBe(6);
    expect(all.saved).toBe(678.38);
    const bento = harvestGrid().reduce((s, c) => s + (c.kind === "harvest" ? c.saved : 0), 0);
    expect(all.saved).toBeCloseTo(bento, 2);
    expect(harvestTotals([]).saved).toBe(0);
  });
  it("prose quotes only those numbers", () => {
    const all = harvestTotals(safe.map((l) => l.id));
    proseChecks("tax-loss-harvesting", 500, [money(ORDINARY_INCOME_OFFSET, { whole: true }), "$1,840", money(all.saved)]);
  });
});

describe("the learning path is complete", () => {
  it("every explainer is written and registered", () => {
    expect(EXPLAINERS.every((e) => e.ready)).toBe(true);
    const mdxComponents = readFileSync("mdx-components.tsx", "utf8");
    for (const e of EXPLAINERS) {
      const used = readFileSync(`content/learn/${e.slug}.mdx`, "utf8").match(/<([A-Z]\w+Explainer) \/>/)?.[1];
      expect(used, e.slug).toBeTruthy();
      expect(mdxComponents).toContain(`  ${used},`);
    }
  });
});
