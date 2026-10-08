// The demo portfolio through the real engine, and the trade-file formats.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { DEMO_DATE, LOTS, PRICES, findings, hifoSaving } from "@/lib/demo";
import { initEngineSync, type WasmEngine } from "@/lib/engine/wasm";
import { exportLotwiseCsv, exportLotwiseJson, mergePortfolios, parseCsv, parseOccLike, parseTradeFile } from "@/lib/portfolio/csv";
import { DEMO_AS_OF, DEMO_PORTFOLIO, DEMO_PRICES, DEMO_SALE } from "@/lib/portfolio/demo";

let e: WasmEngine;
beforeAll(() => {
  e = initEngineSync(readFileSync(join(__dirname, "../lib/engine/wasm/lotwise_engine_bg.wasm")));
});

describe("demo portfolio = the site's story, through the real engine", () => {
  it("is anchored on the site's demo date and prices", () => {
    expect(DEMO_AS_OF).toBe(DEMO_DATE);
    for (const [sym, price] of Object.entries(PRICES)) expect(Number(DEMO_PRICES[sym])).toBe(price);
  });

  it("holds every lot the site talks about", () => {
    const { lots } = e.replay(DEMO_PORTFOLIO, DEMO_AS_OF);
    for (const l of [LOTS.nvda, LOTS.aapl, LOTS.vtiJan, LOTS.amd, LOTS.xyz, LOTS.msft]) {
      expect(lots).toContainEqual(expect.objectContaining({ account: l.account, symbol: l.symbol, qty: String(l.qty), acquired: l.acquired }));
    }
  });

  it("the sale you're about to regret: hero receipt numbers", () => {
    const r = e.simulate({ portfolio: DEMO_PORTFOLIO, prices: DEMO_PRICES, proposal: { ...DEMO_SALE } });
    expect(r).toMatchObject({ proceeds: "12980.00", basis: "14820.00", realized: "-1840.00", term: "short", deductible: "0.00", disallowed: "1840.00" });
    expect(r.causes).toEqual([expect.objectContaining({ tradeId: "t7", account: "brokerage-two", date: "2026-10-03", qty: "2", label: "NVDA 2026-11-20 140 C" })]);
    expect(r.coupons).toEqual([
      { kind: "avoidWash", date: "2026-11-03", keeps: "1840.00" },
      expect.objectContaining({ kind: "harvestInstead", symbol: "AMD", loss: "-1120.00", account: "brokerage-two" }),
    ]);
  });

  it("buy back next week would also trigger", () => {
    const r = e.simulate({ portfolio: DEMO_PORTFOLIO, proposal: { ...DEMO_SALE, rebuy: { date: "2026-10-22" } } });
    // The calls already absorb the whole loss, so the rebuy has nothing left to disallow…
    expect(r.rebuy).toMatchObject({ triggers: false, safeFrom: "2026-11-15" });
    // …but on its own (no calls) it would.
    const noCalls = { ...DEMO_PORTFOLIO, trades: DEMO_PORTFOLIO.trades.filter((t) => t.id !== "t7") };
    expect(e.simulate({ portfolio: noCalls, proposal: { ...DEMO_SALE, rebuy: { date: "2026-10-22" } } }).rebuy).toMatchObject({ triggers: true });
  });

  it("the IRA trap is in the history: $620 gone for good", () => {
    const s = e.yearSummary(DEMO_PORTFOLIO, 2026);
    expect(s.disallowedPermanent).toBe("620.00");
    // SOFI: sold at a loss in Brokerage Two, half bought back in Brokerage One 20 days later.
    expect(s.disallowedTemporary).toBe("215.00");
    const sofi = e.replay(DEMO_PORTFOLIO, DEMO_AS_OF).lots.find((l) => l.symbol === "SOFI");
    expect(sofi).toMatchObject({ basis: "1005.00", holdingStart: "2026-05-04" });
  });

  it("findings tape numbers hold on the full history", () => {
    const tape = Object.fromEntries(findings().map((f) => [f.id, f.amount]));
    const cd = e.countdown({ portfolio: DEMO_PORTFOLIO, prices: DEMO_PRICES, date: DEMO_AS_OF });
    expect(cd[0]).toMatchObject({ symbol: "AAPL", daysAway: 9, taxSavedByWaiting: "410.00" });
    expect(Object.values(tape)).toContain(410);
    const fifo = e.simulate({ portfolio: DEMO_PORTFOLIO, proposal: { account: "brokerage-one", symbol: "VTI", qty: 10, price: "290.20", date: DEMO_AS_OF } });
    const hifo = e.simulate({ portfolio: DEMO_PORTFOLIO, proposal: { account: "brokerage-one", symbol: "VTI", qty: 10, price: "290.20", date: DEMO_AS_OF, method: "hifo" } });
    expect(Number(fifo.estTax) - Number(hifo.estTax)).toBeCloseTo(hifoSaving(), 2);
    const spyCalls = e.replay(DEMO_PORTFOLIO).realizations.find((r) => r.saleId === "b1-spyc-sell")!;
    expect(spyCalls).toMatchObject({ realized: "7185.20", term: "short" });
  });

  it("harvest scan: AMD is the best clean loss; NVDA washes until Nov 3", () => {
    const h = e.harvestScan({ portfolio: DEMO_PORTFOLIO, prices: DEMO_PRICES, date: DEMO_AS_OF });
    const clean = h.filter((c) => c.clean);
    expect(clean[0]).toMatchObject({ symbol: "AMD", recognized: "-1120.00" });
    expect(h.find((c) => c.lotId === "b1-nvda-1")).toMatchObject({ clean: false, safeFrom: "2026-11-03" });
    expect(h.every((c) => c.account !== "roth-ira")).toBe(true);
  });
});

describe("trade files", () => {
  it("parses CSV with quotes, commas and newlines", () => {
    expect(parseCsv('a,"b,c","d ""e"""\r\n1,"x\ny",3\n\n')).toEqual([
      ["a", "b,c", 'd "e"'],
      ["1", "x\ny", "3"],
    ]);
  });

  it("Lotwise CSV round-trips the demo portfolio exactly (same engine results)", () => {
    const csv = exportLotwiseCsv(DEMO_PORTFOLIO);
    const back = parseTradeFile(csv);
    expect(back.format).toBe("lotwise-csv");
    expect(back.skipped).toEqual([]);
    expect(back.portfolio.accounts).toEqual(DEMO_PORTFOLIO.accounts);
    expect(e.replay(back.portfolio)).toEqual(e.replay(DEMO_PORTFOLIO));
  });

  it("Lotwise JSON round-trips with prices and date", () => {
    const back = parseTradeFile(exportLotwiseJson({ portfolio: DEMO_PORTFOLIO, prices: DEMO_PRICES, asOf: DEMO_AS_OF }));
    expect(back).toMatchObject({ format: "lotwise-json", prices: DEMO_PRICES, asOf: DEMO_AS_OF });
  });

  it("minimal Lotwise CSV: six columns, account kinds guessed from names, bad rows reported", () => {
    const r = parseTradeFile(
      ["date,account,side,symbol,qty,price", "2026-01-05,My Roth IRA,buy,abc,10,100", "01/06/2026,Taxable,buy,ABC,5,$1,000.00", "2026-01-07,Taxable,hold,ABC,1,1"].join("\n"),
    );
    expect(r.portfolio.accounts).toEqual([
      { id: "my-roth-ira", name: "My Roth IRA", kind: "roth" },
      { id: "taxable", name: "Taxable", kind: "taxable" },
    ]);
    expect(r.portfolio.trades[1]).toMatchObject({ date: "2026-01-06", symbol: "ABC" });
    expect(r.skipped).toEqual([{ line: 4, reason: 'side must be buy or sell, got "hold"' }]);
  });

  it("explains a missing column", () => {
    expect(() => parseTradeFile("date,account,side,symbol,qty\n")).toThrow(/No header row/);
  });

  it("reads a Schwab transactions export (newest first, options, junk rows)", () => {
    const schwab = [
      '"Transactions  for account Individual ...123 as of 10/15/2026 08:00:00 ET"',
      '"Date","Action","Symbol","Description","Quantity","Price","Fees & Comm","Amount"',
      '"10/03/2026","Buy to Open","NVDA 11/20/2026 140.00 C","CALL NVIDIA CORP","2","$6.40","$1.30","-$1,281.30"',
      '"09/30/2026","Qualified Dividend","MSFT","MICROSOFT CORP","","","","$12.45"',
      '"03/12/2026 as of 03/11/2026","Buy","NVDA","NVIDIA CORP","100","$148.20","","-$14,820.00"',
      '"Transactions Total","","","","","","","-$16,088.85"',
    ].join("\n");
    const r = parseTradeFile(schwab, { schwabAccount: { id: "schwab-ind", name: "Schwab Individual", kind: "taxable" } });
    expect(r.format).toBe("schwab");
    expect(r.portfolio.trades).toEqual([
      { id: "schwab-5", account: "schwab-ind", date: "2026-03-12", side: "buy", symbol: "NVDA", qty: "100", price: "148.20" },
      {
        id: "schwab-3",
        account: "schwab-ind",
        date: "2026-10-03",
        side: "buy",
        symbol: "NVDA",
        qty: "2",
        price: "6.40",
        fees: "1.30",
        option: { type: "call", multiplier: "100", strike: "140.00", expiry: "2026-11-20" },
      },
    ]);
    expect(r.skipped).toEqual([{ line: 4, reason: 'not a trade ("Qualified Dividend")' }]);
    expect(e.replay(r.portfolio).lots).toHaveLength(2);
  });

  it("parses OCC-like option symbols", () => {
    expect(parseOccLike("SPY 12/18/26 560 P")).toEqual({ symbol: "SPY", option: { type: "put", multiplier: "100", strike: "560", expiry: "2026-12-18" } });
    expect(parseOccLike("brk.b")).toEqual({ symbol: "BRK.B" });
  });

  it("merges imports into a portfolio by account name, keeping trade ids unique", () => {
    const add = parseTradeFile("date,account,side,symbol,qty,price,id\n2026-10-10,Brokerage One,buy,NVDA,1,130,t1\n").portfolio;
    const merged = mergePortfolios(DEMO_PORTFOLIO, add);
    expect(merged.accounts).toHaveLength(3);
    const added = merged.trades.at(-1)!;
    expect(added.account).toBe("brokerage-one");
    expect(added.id).not.toBe("t1");
    expect(new Set(merged.trades.map((t) => t.id)).size).toBe(merged.trades.length);
  });
});
