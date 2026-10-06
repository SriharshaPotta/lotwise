// Simplified rules, matching PLAN.md §4 for the cases the site shows:
// - long-term if sale date > acquired + 12 months
// - wash sale if loss AND rebuy within ±30 days; disallowed = |loss| * min(rebuyQty, qty) / qty
// - taxable rebuy: basis += disallowed, holding start moves earlier by days held
// - IRA rebuy: permanent = true, no basis adjustment
// - estTax = recognized gain/loss * (st or lt rate), defaults st 0.24 / lt 0.15.
//   Losses show a negative tax impact (a deduction). A disallowed loss is not recognized,
//   so it contributes nothing to estTax — that is the whole point of the receipt.
import { addDays, addMonths, daysBetween } from "./dates";
import type { Engine, Lot, SaleInput, SaleResult } from "./types";

export const DEFAULT_RATES = { st: 0.24, lt: 0.15 } as const;
export const WASH_WINDOW_DAYS = 30;

const cents = (n: number) => Math.round(n * 100) / 100 + 0; // + 0 normalizes -0

export function isLongTerm(acquired: string, saleDate: string): boolean {
  return saleDate > addMonths(acquired, 12);
}

/** First sale date that counts as long-term. */
export function longTermDate(acquired: string): string {
  return addDays(addMonths(acquired, 12), 1);
}

export function isInWashWindow(saleDate: string, purchaseDate: string): boolean {
  return Math.abs(daysBetween(saleDate, purchaseDate)) <= WASH_WINDOW_DAYS;
}

/** Earliest sale date that no longer washes against a purchase made on `purchaseDate`. */
export function firstSafeSaleAfter(purchaseDate: string): string {
  return addDays(purchaseDate, WASH_WINDOW_DAYS + 1);
}

/** Earliest rebuy date that no longer washes against a sale made on `saleDate`. */
export function firstSafeRebuyAfter(saleDate: string): string {
  return addDays(saleDate, WASH_WINDOW_DAYS + 1);
}

export function costBasis(lot: Lot, qty: number): number {
  return cents(lot.costPerShare * qty);
}

/**
 * Section 1256 contracts (broad index options like XSP): taxed 60% long-term / 40% short-term
 * regardless of how long they were held.
 */
export function section1256Tax(gain: number, rates: { st: number; lt: number } = DEFAULT_RATES): number {
  return cents(gain * (0.6 * rates.lt + 0.4 * rates.st));
}

/** The gain/loss that actually hits this year's return (realized minus any disallowed loss). */
export function recognized(result: SaleResult): number {
  return cents(result.realized + (result.wash?.disallowed ?? 0));
}

export const mockEngine: Engine = {
  simulateSale(input: SaleInput): SaleResult {
    const { lot, qty, price, date, rebuy } = input;
    if (qty <= 0 || qty > lot.qty) throw new RangeError(`qty must be in 1..${lot.qty}, got ${qty}`);
    const rates = input.taxRates ?? DEFAULT_RATES;

    const realized = cents(price * qty - lot.costPerShare * qty);
    const term = isLongTerm(lot.acquired, date) ? "long" : "short";

    let wash: SaleResult["wash"] = null;
    if (realized < 0 && rebuy && rebuy.qty > 0 && isInWashWindow(date, rebuy.date)) {
      const matched = Math.min(rebuy.qty, qty);
      const disallowed = cents((Math.abs(realized) * matched) / qty);
      const purchaseCost = cents(rebuy.price * rebuy.qty);
      if (rebuy.isIra) {
        wash = { disallowed, replacementBasis: purchaseCost, holdingStart: rebuy.date, permanent: true };
      } else {
        const daysHeld = daysBetween(lot.acquired, date);
        wash = {
          disallowed,
          replacementBasis: cents(purchaseCost + disallowed),
          holdingStart: addDays(rebuy.date, -daysHeld),
          permanent: false,
        };
      }
    }

    const rate = term === "long" ? rates.lt : rates.st;
    const estTax = cents((realized + (wash?.disallowed ?? 0)) * rate);
    return { realized, term, estTax, wash };
  },
};
