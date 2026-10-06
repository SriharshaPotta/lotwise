// The trade ticket + pre-trade receipt (§4.2). Everything the showcase prints comes from here.
import {
  addDays,
  costBasis,
  engine,
  firstSafeRebuyAfter,
  firstSafeSaleAfter,
  isInWashWindow,
  recognized,
} from "@/lib/engine";
import type { Lot, SaleResult } from "@/lib/engine";
import { account, type Account, type AccountId } from "./accounts";
import { DEMO_DATE, PRICES, type Ticker } from "./prices";
import { LOTS, TRADES, shareEquivalent, type Trade } from "./trades";

export interface Position {
  account: Account;
  lot: Lot;
  price: number;
  unrealized: number;
}

const POSITION_LOTS: Record<AccountId, Lot> = {
  "brokerage-one": LOTS.nvda,
  "brokerage-two": LOTS.amd,
  "roth-ira": LOTS.msft,
};

export function position(id: AccountId): Position {
  const lot = POSITION_LOTS[id];
  const price = PRICES[lot.symbol as Ticker];
  return { account: account(id), lot, price, unrealized: round((price - lot.costPerShare) * lot.qty) };
}

/** Purchases of the same symbol, in any account, inside the ±30-day window around the sale. */
export function washTriggers(symbol: string, saleDate = DEMO_DATE): Trade[] {
  return TRADES.filter((t) => t.side === "buy" && t.symbol === symbol && isInWashWindow(saleDate, t.date));
}

export type CouponModel =
  | { kind: "wait-to-sell"; date: string; keep: number }
  | { kind: "wait-to-rebuy"; date: string; keep: number }
  | { kind: "harvest-instead"; symbol: string; deductible: number };

export interface TradeReceipt {
  position: Position;
  shares: number;
  date: string;
  proceeds: number;
  basis: number;
  realized: number;
  term: SaleResult["term"];
  /** IRA sales are not taxed at all; the receipt says so instead of listing deductions. */
  taxFree: boolean;
  deductible: number;
  disallowed: number;
  /** What caused the wash, e.g. the NVDA calls bought Oct 3 in Brokerage Two. */
  cause: { trade: Trade; account: Account } | null;
  /** Present when "Buy back next week" is on. */
  rebuy: { date: string; triggers: boolean } | null;
  stamp: "WASH SALE" | null;
  coupons: CouponModel[];
}

/** The receipt for selling `shares` of the position held in `accountId` on the demo date. */
export function tradeReceipt(accountId: AccountId, shares: number, buyBackNextWeek = false): TradeReceipt {
  const pos = position(accountId);
  const { lot, price } = pos;
  const qty = Math.max(0, Math.min(Math.round(shares), lot.qty));
  const rebuyDate = addDays(DEMO_DATE, 7);
  const isIra = pos.account.isIra;

  const empty: TradeReceipt = {
    position: pos, shares: 0, date: DEMO_DATE, proceeds: 0, basis: 0, realized: 0, term: "short", taxFree: isIra,
    deductible: 0, disallowed: 0, cause: null, rebuy: buyBackNextWeek ? { date: rebuyDate, triggers: false } : null,
    stamp: null, coupons: [],
  };
  if (qty === 0) return empty;

  const base = { lot, qty, price, date: DEMO_DATE };
  const plain = engine.simulateSale(base);

  // An IRA sale is never taxed, so nothing can be disallowed.
  if (isIra) {
    return {
      ...empty, shares: qty, proceeds: round(price * qty), basis: costBasis(lot, qty), realized: plain.realized, term: plain.term,
    };
  }

  // Existing purchases anywhere that already wash this sale (largest exposure first).
  const triggers = washTriggers(lot.symbol).sort((a, b) => shareEquivalent(b) - shareEquivalent(a));
  const trigger = triggers[0];
  const existing = trigger
    ? engine.simulateSale({
        ...base,
        rebuy: { date: trigger.date, qty: shareEquivalent(trigger), price: trigger.price, account: trigger.account, isIra: account(trigger.account).isIra },
      })
    : plain;

  let result = existing;
  let rebuy: TradeReceipt["rebuy"] = null;
  if (buyBackNextWeek) {
    const alt = engine.simulateSale({ ...base, rebuy: { date: rebuyDate, qty, price, account: lot.account } });
    rebuy = { date: rebuyDate, triggers: alt.wash !== null };
    if (!existing.wash && alt.wash) result = alt;
  }

  const kept = recognized(result);
  const disallowed = result.wash?.disallowed ?? 0;
  const cause = existing.wash && trigger ? { trade: trigger, account: account(trigger.account) } : null;

  const coupons: CouponModel[] = [];
  if (disallowed > 0) {
    if (cause) coupons.push({ kind: "wait-to-sell", date: firstSafeSaleAfter(cause.trade.date), keep: -result.realized });
    else coupons.push({ kind: "wait-to-rebuy", date: firstSafeRebuyAfter(DEMO_DATE), keep: -result.realized });
    const alt = bestCleanHarvest(accountId);
    if (alt) coupons.push(alt);
  }

  return {
    ...empty,
    shares: qty,
    proceeds: round(price * qty),
    basis: costBasis(lot, qty),
    realized: result.realized,
    term: result.term,
    deductible: kept < 0 ? -kept : 0,
    disallowed,
    cause,
    rebuy,
    stamp: disallowed > 0 ? "WASH SALE" : null,
    coupons,
  };
}

/** The largest loss in another taxable account that nothing would wash. */
function bestCleanHarvest(excluding: AccountId): CouponModel | null {
  let best: CouponModel | null = null;
  for (const id of Object.keys(POSITION_LOTS) as AccountId[]) {
    if (id === excluding || account(id).isIra) continue;
    const pos = position(id);
    if (pos.unrealized >= 0 || washTriggers(pos.lot.symbol).length) continue;
    const r = engine.simulateSale({ lot: pos.lot, qty: pos.lot.qty, price: pos.price, date: DEMO_DATE });
    const deductible = recognized(r);
    if (!best || (best.kind === "harvest-instead" && deductible < best.deductible)) {
      best = { kind: "harvest-instead", symbol: pos.lot.symbol, deductible };
    }
  }
  return best;
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}

/** Receipt serial number for the nth print of the session. The first one is #00042. */
export function receiptSerial(printIndex: number): string {
  return `#${String(42 + printIndex).padStart(5, "0")}`;
}
