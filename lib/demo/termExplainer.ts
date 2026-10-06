// Short vs long term explainer (§5): one AAPL lot, a sale date scrubbed across the one-year line.
import { DEFAULT_RATES, addDays, daysBetween, engine, longTermDate } from "@/lib/engine";
import { DEMO_DATE, PRICES } from "./prices";
import { LOTS } from "./trades";

const lot = LOTS.aapl;
/** The strip shows days held from FIRST to FIRST + DAYS - 1. */
const FIRST = 330;
const DAYS = 71;

export const TERM_EXPLAINER = {
  lot,
  qty: lot.qty,
  price: PRICES.AAPL,
  today: DEMO_DATE,
  ltDate: longTermDate(lot.acquired),
  calendarStart: addDays(lot.acquired, FIRST),
  calendarDays: DAYS,
} as const;

export interface TermState {
  saleDate: string;
  daysHeld: number;
  term: "short" | "long";
  rate: number;
  gain: number;
  estTax: number;
  /** Days until long-term (0 once there). */
  daysToLong: number;
}

export function termState(saleDate: string): TermState {
  const x = TERM_EXPLAINER;
  const r = engine.simulateSale({ lot: x.lot, qty: x.qty, price: x.price, date: saleDate });
  return {
    saleDate,
    daysHeld: daysBetween(x.lot.acquired, saleDate),
    term: r.term,
    rate: r.term === "long" ? DEFAULT_RATES.lt : DEFAULT_RATES.st,
    gain: r.realized,
    estTax: r.estTax,
    daysToLong: Math.max(0, daysBetween(saleDate, x.ltDate)),
  };
}

/** Selling today vs on the first long-term day, and the price drop that would cancel the saving. */
export function termCliff() {
  const x = TERM_EXPLAINER;
  const short = termState(addDays(x.ltDate, -1));
  const long = termState(x.ltDate);
  const save = Math.round((short.estTax - long.estTax) * 100) / 100;
  // After-tax proceeds now vs after waiting, if the price falls by d per share:
  //   now:   P·q − st·G           later: (P − d)·q − lt·(G − d·q)
  // Equal when d = (st − lt)·G / (q·(1 − lt)).
  const d = ((DEFAULT_RATES.st - DEFAULT_RATES.lt) * short.gain) / (x.qty * (1 - DEFAULT_RATES.lt));
  return { short, long, save, breakEvenDrop: d / x.price };
}

export const termDate = (day: number) => addDays(TERM_EXPLAINER.calendarStart, day);
export const termDay = (iso: string) => daysBetween(TERM_EXPLAINER.calendarStart, iso);
