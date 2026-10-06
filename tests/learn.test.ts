// §5: the learning path, the wash-sale explainer model, and the numbers its prose quotes.
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { TERM_EXPLAINER, WASH_EXPLAINER as X, calendarDate, calendarDay, longTermSaving, termCliff, termDay, termState, washState } from "@/lib/demo";
import { addDays, costBasis, firstSafeRebuyAfter } from "@/lib/engine";
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
