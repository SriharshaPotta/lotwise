// Findings tape (§4.3). Every figure is computed from the demo portfolio so the copy can't drift.
import { DEFAULT_RATES, engine, longTermDate, section1256Tax } from "@/lib/engine";
import { DEMO_DATE, PRICES } from "./prices";
import { LOTS } from "./trades";
import { aaplLongTerm, heroSafeSale, iraTrap } from "./scenarios";

/**
 * A closed, short-term SPY call trade in the demo portfolio. Run the same trade on XSP (a Section
 * 1256 index option) and 60% of the gain is taxed at the long-term rate.
 */
export const SPY_CALLS_GAIN = 7185.2;

export interface Finding {
  id: string;
  what: string;
  /** The money line, e.g. "$1,840 kept" or "save $410". */
  amount: number;
  verb: "kept" | "save" | "avoided";
}

/** Tax saved by waiting until the AAPL lot turns long-term. */
export function longTermSaving() {
  const lot = LOTS.aapl;
  const now = engine.simulateSale({ lot, qty: lot.qty, price: PRICES.AAPL, date: DEMO_DATE });
  const later = engine.simulateSale({ lot, qty: lot.qty, price: PRICES.AAPL, date: longTermDate(lot.acquired) });
  return { days: aaplLongTerm().daysAway, save: round(now.estTax - later.estTax) };
}

/** Selling 10 VTI: highest-cost lot first (HIFO) vs oldest first (FIFO, the broker default). */
export function hifoSaving() {
  const sell = (lot: typeof LOTS.vtiJan | typeof LOTS.vtiOct) =>
    engine.simulateSale({ lot, qty: 10, price: PRICES.VTI, date: DEMO_DATE }).estTax;
  return round(sell(LOTS.vtiJan) - sell(LOTS.vtiOct));
}

/** Same option trade on XSP instead of SPY. */
export function xspSaving() {
  return round(SPY_CALLS_GAIN * DEFAULT_RATES.st - section1256Tax(SPY_CALLS_GAIN));
}

export function findings(): Finding[] {
  const lt = longTermSaving();
  return [
    { id: "wash", what: "Wash sale caught", amount: heroSafeSale().kept, verb: "kept" },
    { id: "long-term", what: `Goes long-term in ${lt.days} days`, amount: lt.save, verb: "save" },
    { id: "ira", what: "IRA trap avoided", amount: iraTrap().result.wash!.disallowed, verb: "avoided" },
    { id: "hifo", what: "HIFO instead of FIFO", amount: hifoSaving(), verb: "save" },
    { id: "1256", what: "XSP instead of SPY", amount: xspSaving(), verb: "save" },
  ];
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}
