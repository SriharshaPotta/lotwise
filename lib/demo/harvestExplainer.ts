// Tax-loss harvesting explainer (§5): the demo portfolio's open lots. Losing lots can be harvested;
// the NVDA lot is blocked by the calls bought Oct 3 until the first safe day; gains are context.
import { DEFAULT_RATES, engine, firstSafeSaleAfter, recognized } from "@/lib/engine";
import type { Lot } from "@/lib/engine";
import { account, type AccountId } from "./accounts";
import { EXTRA_LOSSES } from "./bento";
import { DEMO_DATE, PRICES } from "./prices";
import { HERO_REPLACEMENT } from "./scenarios";
import { LOTS, shareEquivalent } from "./trades";

/** Net capital losses beyond gains can offset up to this much ordinary income a year. */
export const ORDINARY_INCOME_OFFSET = 3000;

export type HarvestLot =
  | { kind: "harvest"; id: string; symbol: string; account: string; pnl: number; saved: number }
  | { kind: "blocked"; id: string; symbol: string; account: string; pnl: number; disallowed: number; safeFrom: string; reason: string }
  | { kind: "gain"; id: string; symbol: string; account: string; pnl: number };

function sell(lot: Lot, price: number, rebuy?: Parameters<typeof engine.simulateSale>[0]["rebuy"]) {
  return engine.simulateSale({ lot, qty: lot.qty, price, date: DEMO_DATE, rebuy });
}

const round = (n: number) => Math.round(n * 100) / 100;

export function harvestLots(): HarvestLot[] {
  const losses: HarvestLot[] = [{ lot: LOTS.amd as Lot, price: PRICES.AMD }, ...EXTRA_LOSSES.map((l) => ({ lot: l as Lot, price: l.price }))].map(
    ({ lot, price }) => {
      const r = sell(lot, price);
      return {
        kind: "harvest", id: lot.id, symbol: lot.symbol, account: account(lot.account as AccountId).name,
        pnl: r.realized, saved: round(-recognized(r) * DEFAULT_RATES.st),
      };
    },
  );
  const nvda = LOTS.nvda;
  const blockedBy = HERO_REPLACEMENT;
  const r = sell(nvda, PRICES.NVDA, { date: blockedBy.date, qty: shareEquivalent(blockedBy), price: blockedBy.price, account: blockedBy.account });
  const blocked: HarvestLot = {
    kind: "blocked", id: nvda.id, symbol: nvda.symbol, account: account(nvda.account).name,
    pnl: r.realized, disallowed: r.wash!.disallowed, safeFrom: firstSafeSaleAfter(blockedBy.date),
    reason: `${blockedBy.qty} ${blockedBy.symbol} calls bought ${blockedBy.date} in ${account(blockedBy.account).name}`,
  };
  const gains: HarvestLot[] = [
    { lot: LOTS.aapl as Lot, price: PRICES.AAPL },
    { lot: LOTS.vtiJan as Lot, price: PRICES.VTI },
    { lot: LOTS.vtiOct as Lot, price: PRICES.VTI },
  ].map(({ lot, price }) => ({ kind: "gain", id: lot.id, symbol: lot.symbol, account: account(lot.account as AccountId).name, pnl: sell(lot, price).realized }));

  // Interleaved the way a real holdings list would be: by account, then symbol.
  return [...losses, blocked, ...gains].sort((a, b) => a.account.localeCompare(b.account) || a.symbol.localeCompare(b.symbol) || a.id.localeCompare(b.id));
}

/** Totals for a set of harvested lot ids. */
export function harvestTotals(ids: readonly string[]) {
  const picked = harvestLots().filter((l): l is Extract<HarvestLot, { kind: "harvest" }> => l.kind === "harvest" && ids.includes(l.id));
  return {
    count: picked.length,
    losses: round(picked.reduce((s, l) => s + l.pnl, 0)),
    saved: round(picked.reduce((s, l) => s + l.saved, 0)),
  };
}
