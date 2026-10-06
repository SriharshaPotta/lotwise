// Scenarios behind the hero, coupon, stamp, agent and IRA-trap copy.
import {
  addDays,
  costBasis,
  daysBetween,
  engine,
  firstSafeRebuyAfter,
  firstSafeSaleAfter,
  longTermDate,
  recognized,
} from "@/lib/engine";
import type { Lot, SaleResult } from "@/lib/engine";
import { account } from "./accounts";
import { DEMO_DATE, PRICES } from "./prices";
import { CLOSED_LOTS, LOTS, shareEquivalent, trade } from "./trades";


/** The NVDA calls in Brokerage Two that wash the hero sale. */
export const HERO_REPLACEMENT = trade("t7");

const heroRebuy = () => ({
  date: HERO_REPLACEMENT.date,
  qty: shareEquivalent(HERO_REPLACEMENT),
  price: HERO_REPLACEMENT.price,
  account: HERO_REPLACEMENT.account,
});

export interface HeroReceipt {
  shares: number;
  price: number;
  proceeds: number;
  basis: number;
  result: SaleResult | null;
  deductible: number;
  disallowed: number;
  /** Set when the visitor turns on "Buy back next week". */
  rebuy: { date: string; triggers: boolean } | null;
}

/** The pre-trade receipt for selling `shares` NVDA today (§4.2). */
export function heroReceipt(shares: number, buyBackNextWeek = false): HeroReceipt {
  const lot: Lot = LOTS.nvda;
  const price = PRICES.NVDA;
  const rebuyDate = addDays(DEMO_DATE, 7);

  if (shares <= 0) {
    return {
      shares: 0, price, proceeds: 0, basis: 0, result: null, deductible: 0, disallowed: 0,
      rebuy: buyBackNextWeek ? { date: rebuyDate, triggers: false } : null,
    };
  }

  const result = engine.simulateSale({ lot, qty: shares, price, date: DEMO_DATE, rebuy: heroRebuy() });

  let rebuy: HeroReceipt["rebuy"] = null;
  if (buyBackNextWeek) {
    const alt = engine.simulateSale({
      lot, qty: shares, price, date: DEMO_DATE,
      rebuy: { date: rebuyDate, qty: shares, price, account: lot.account },
    });
    rebuy = { date: rebuyDate, triggers: alt.wash !== null };
  }

  const kept = recognized(result);
  return {
    shares,
    price,
    proceeds: round(price * shares),
    basis: costBasis(lot, shares),
    result,
    deductible: kept < 0 ? -kept : 0,
    disallowed: result.wash?.disallowed ?? 0,
    rebuy,
  };
}

/** Coupon 1: the first day selling NVDA keeps the whole deduction. */
export function heroSafeSale() {
  const date = firstSafeSaleAfter(HERO_REPLACEMENT.date);
  const lot = LOTS.nvda;
  const result = engine.simulateSale({ lot, qty: lot.qty, price: PRICES.NVDA, date, rebuy: heroRebuy() });
  return { date, kept: -recognized(result), result };
}

/** Coupon 2: harvesting AMD instead. No replacement purchase anywhere, so no wash. */
export function amdHarvest() {
  const lot = LOTS.amd;
  const result = engine.simulateSale({ lot, qty: lot.qty, price: PRICES.AMD, date: DEMO_DATE });
  return { deductible: recognized(result), result };
}

/** "LONG-TERM IN 9 DAYS" stamp. */
export function aaplLongTerm() {
  const date = longTermDate(LOTS.aapl.acquired);
  return { date, daysAway: daysBetween(DEMO_DATE, date) };
}

/** Agents transcript (§4.7): sell XYZ today, rebuy next week. */
export function agentXyz() {
  const lot = LOTS.xyz;
  const rebuyDate = addDays(DEMO_DATE, 7);
  const result = engine.simulateSale({
    lot, qty: lot.qty, price: PRICES.XYZ, date: DEMO_DATE,
    rebuy: { date: rebuyDate, qty: lot.qty, price: PRICES.XYZ, account: lot.account },
  });
  return { result, rebuyDate, safeFrom: firstSafeRebuyAfter(DEMO_DATE) };
}

/** Convergence (§4.4): INTC sold at a loss in Brokerage One, bought back inside the Roth IRA. */
export function iraTrap() {
  const sale = trade("t3");
  const buy = trade("t11");
  const result = engine.simulateSale({
    lot: CLOSED_LOTS.intc, qty: sale.qty, price: sale.price, date: sale.date,
    rebuy: { date: buy.date, qty: buy.qty, price: buy.price, account: buy.account, isIra: account(buy.account).isIra },
  });
  return { sale, buy, result };
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}
