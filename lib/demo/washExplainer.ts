// Wash-window explainers (§5): a loss sale, and a purchase the visitor drags along a calendar.
// Used by the-wash-sale, the-ira-trap and options-can-trigger-it.
import { WASH_WINDOW_DAYS, addDays, daysBetween, engine, recognized } from "@/lib/engine";
import type { Lot } from "@/lib/engine";
import { account, type AccountId } from "./accounts";
import { DEMO_DATE, PRICES } from "./prices";
import { CLOSED_LOTS, LOTS, shareEquivalent, trade } from "./trades";

/** Days shown either side of the sale. */
const SPAN = 45;

export interface WashScenario {
  id: "washSale" | "iraTrap" | "options";
  lot: Lot;
  qty: number;
  price: number;
  saleDate: string;
  /** What gets bought: share-equivalent quantity, price per share-equivalent, and how to say it. */
  purchase: { qty: number; price: number; what: string; verb: string };
  /** Accounts the purchase can be made in; the first is the default unless `defaultAccount` says otherwise. */
  accounts: AccountId[];
  defaultAccount: AccountId;
  defaultDate: string;
  calendarStart: string;
  calendarDays: number;
  windowStart: string;
  windowEnd: string;
  daysHeld: number;
}

function scenario(s: Omit<WashScenario, "calendarStart" | "calendarDays" | "windowStart" | "windowEnd" | "daysHeld">): WashScenario {
  return {
    ...s,
    calendarStart: addDays(s.saleDate, -SPAN),
    calendarDays: 2 * SPAN + 1,
    windowStart: addDays(s.saleDate, -WASH_WINDOW_DAYS),
    windowEnd: addDays(s.saleDate, WASH_WINDOW_DAYS),
    daysHeld: daysBetween(s.lot.acquired, s.saleDate),
  };
}

const intcSale = trade("t3");
const intcBuy = trade("t11");
const calls = trade("t7");

export const WASH_SCENARIOS = {
  /** The hero sale; buying the shares back at the same price keeps the story about the loss. */
  washSale: scenario({
    id: "washSale",
    lot: LOTS.nvda, qty: LOTS.nvda.qty, price: PRICES.NVDA, saleDate: DEMO_DATE,
    purchase: { qty: LOTS.nvda.qty, price: PRICES.NVDA, what: `${LOTS.nvda.qty} ${LOTS.nvda.symbol}`, verb: "buy back" },
    accounts: [LOTS.nvda.account as AccountId], defaultAccount: LOTS.nvda.account as AccountId,
    /** "Buy back next week", as on the hero ticket. */
    defaultDate: addDays(DEMO_DATE, 7),
  }),
  /** The convergence's IRA trap: INTC sold at a loss in Brokerage One, bought back in the Roth IRA. */
  iraTrap: scenario({
    id: "iraTrap",
    lot: CLOSED_LOTS.intc, qty: intcSale.qty, price: intcSale.price, saleDate: intcSale.date,
    purchase: { qty: intcBuy.qty, price: intcBuy.price, what: `${intcBuy.qty} ${intcBuy.symbol}`, verb: "buy back" },
    accounts: ["brokerage-one", "roth-ira"], defaultAccount: intcBuy.account,
    defaultDate: intcBuy.date,
  }),
  /** The hero sale against the 2 NVDA calls bought in Brokerage Two. */
  options: scenario({
    id: "options",
    lot: LOTS.nvda, qty: LOTS.nvda.qty, price: PRICES.NVDA, saleDate: DEMO_DATE,
    purchase: { qty: shareEquivalent(calls), price: calls.price, what: `${calls.qty} ${calls.symbol} calls`, verb: "buy calls" },
    accounts: [calls.account], defaultAccount: calls.account,
    defaultDate: calls.date,
  }),
} as const satisfies Record<WashScenario["id"], WashScenario>;

export interface WashState {
  rebuyDate: string;
  account: AccountId;
  inWindow: boolean;
  /** Disallowed and never coming back (bought back inside an IRA). */
  permanent: boolean;
  /** Realized loss on the sale (negative). */
  loss: number;
  disallowed: number;
  /** What actually comes off this year's taxable gains (negative), i.e. the Deductible bucket. */
  deductible: number;
  /** Cost basis of the new purchase. */
  newBasis: number;
  /** When the new purchase's holding period starts. */
  holdingStart: string;
  /** Where the loss ends up. */
  where: "deductible" | "lot" | "gone";
}

export function washOutcome(s: WashScenario, rebuyDate: string, accountId: AccountId = s.defaultAccount): WashState {
  const isIra = account(accountId).isIra;
  const result = engine.simulateSale({
    lot: s.lot, qty: s.qty, price: s.price, date: s.saleDate,
    rebuy: { date: rebuyDate, qty: s.purchase.qty, price: s.purchase.price, account: accountId, isIra },
  });
  const purchase = Math.round(s.purchase.price * s.purchase.qty * 100) / 100;
  const permanent = result.wash?.permanent ?? false;
  return {
    rebuyDate,
    account: accountId,
    inWindow: result.wash !== null,
    permanent,
    loss: result.realized,
    disallowed: result.wash?.disallowed ?? 0,
    deductible: recognized(result),
    newBasis: result.wash?.replacementBasis ?? purchase,
    holdingStart: result.wash?.holdingStart ?? rebuyDate,
    where: result.wash === null ? "deductible" : permanent ? "gone" : "lot",
  };
}

export const scenarioDate = (s: WashScenario, day: number) => addDays(s.calendarStart, day);
export const scenarioDay = (s: WashScenario, iso: string) => daysBetween(s.calendarStart, iso);

/* The wash-sale explainer's names, kept for its tests and copy checks. */
export const WASH_EXPLAINER = { ...WASH_SCENARIOS.washSale, rebuyPrice: WASH_SCENARIOS.washSale.purchase.price, defaultRebuy: WASH_SCENARIOS.washSale.defaultDate };
export const washState = (rebuyDate: string) => washOutcome(WASH_SCENARIOS.washSale, rebuyDate);
export const calendarDate = (day: number) => scenarioDate(WASH_SCENARIOS.washSale, day);
export const calendarDay = (iso: string) => scenarioDay(WASH_SCENARIOS.washSale, iso);
