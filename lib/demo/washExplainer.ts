// The wash-sale explainer (§5): the hero NVDA sale, and a buy-back the visitor drags along a calendar.
import { WASH_WINDOW_DAYS, addDays, daysBetween, engine, recognized } from "@/lib/engine";
import { DEMO_DATE, PRICES } from "./prices";
import { LOTS } from "./trades";

const lot = LOTS.nvda;
/** Days shown either side of the sale. */
const SPAN = 45;

export const WASH_EXPLAINER = {
  lot,
  qty: lot.qty,
  price: PRICES.NVDA,
  saleDate: DEMO_DATE,
  /** Buying back at the same price keeps the story about the loss, not the market. */
  rebuyPrice: PRICES.NVDA,
  calendarStart: addDays(DEMO_DATE, -SPAN),
  calendarDays: 2 * SPAN + 1,
  windowStart: addDays(DEMO_DATE, -WASH_WINDOW_DAYS),
  windowEnd: addDays(DEMO_DATE, WASH_WINDOW_DAYS),
  /** "Buy back next week", as on the hero ticket. */
  defaultRebuy: addDays(DEMO_DATE, 7),
  daysHeld: daysBetween(lot.acquired, DEMO_DATE),
} as const;

export interface WashState {
  rebuyDate: string;
  inWindow: boolean;
  /** Realized loss on the sale (negative). */
  loss: number;
  disallowed: number;
  /** What actually comes off this year's taxable gains (negative), i.e. the Deductible bucket. */
  deductible: number;
  /** Cost basis of the shares bought back. */
  newBasis: number;
  /** When the new shares' holding period starts. */
  holdingStart: string;
}

export function washState(rebuyDate: string): WashState {
  const x = WASH_EXPLAINER;
  const result = engine.simulateSale({
    lot: x.lot, qty: x.qty, price: x.price, date: x.saleDate,
    rebuy: { date: rebuyDate, qty: x.qty, price: x.rebuyPrice, account: x.lot.account },
  });
  const purchase = Math.round(x.rebuyPrice * x.qty * 100) / 100;
  return {
    rebuyDate,
    inWindow: result.wash !== null,
    loss: result.realized,
    disallowed: result.wash?.disallowed ?? 0,
    deductible: recognized(result),
    newBasis: result.wash?.replacementBasis ?? purchase,
    holdingStart: result.wash?.holdingStart ?? rebuyDate,
  };
}

/** Day index on the explainer calendar ↔ ISO date. */
export const calendarDate = (day: number) => addDays(WASH_EXPLAINER.calendarStart, day);
export const calendarDay = (iso: string) => daysBetween(WASH_EXPLAINER.calendarStart, iso);
