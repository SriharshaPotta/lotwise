// Features bento (§4.5). Every number the four looping visuals show comes from the engine.
import { DEFAULT_RATES, daysBetween, engine, longTermDate, recognized, section1256Tax } from "@/lib/engine";
import type { Lot } from "@/lib/engine";
import { DEMO_DATE, PRICES } from "./prices";
import { HERO_REPLACEMENT } from "./scenarios";
import { LOTS, shareEquivalent } from "./trades";
import { SPY_CALLS_GAIN, longTermSaving } from "./findings";

/* ── Pre-trade simulator: scrubbing "shares to sell" on the AAPL lot ─────────────────────── */

export interface SimRow {
  shares: number;
  proceeds: number;
  gain: number;
  estTax: number;
}

export const SIM_LOT = LOTS.aapl;
export const SIM_PRICE = PRICES.AAPL;

/** One row per whole share, 0..lot size, so a scrub only ever looks numbers up. */
export function simulatorTable(): SimRow[] {
  const lot = SIM_LOT;
  return Array.from({ length: lot.qty + 1 }, (_, shares) => {
    if (shares === 0) return { shares, proceeds: 0, gain: 0, estTax: 0 };
    const r = engine.simulateSale({ lot, qty: shares, price: SIM_PRICE, date: DEMO_DATE });
    return { shares, proceeds: round(SIM_PRICE * shares), gain: r.realized, estTax: r.estTax };
  });
}

/* ── Loss harvesting: a grid of lots; losses flip to harvested, one washes ──────────────── */

/** Illustrative underwater lots beside the demo's AMD lot. Prices are last prices on DEMO_DATE. */
const EXTRA_LOSSES: readonly (Lot & { price: number })[] = [
  { id: "b2-pypl-1", account: "brokerage-two", symbol: "PYPL", qty: 60, costPerShare: 78.4, acquired: "2026-04-08", price: 71.1 },
  { id: "b1-nke-1", account: "brokerage-one", symbol: "NKE", qty: 25, costPerShare: 96.3, acquired: "2026-02-19", price: 81.9 },
  { id: "b2-dis-1", account: "brokerage-two", symbol: "DIS", qty: 30, costPerShare: 112.5, acquired: "2026-05-27", price: 101.2 },
  { id: "b1-sbux-1", account: "brokerage-one", symbol: "SBUX", qty: 40, costPerShare: 98.6, acquired: "2026-06-30", price: 91.35 },
  { id: "b2-intu-1", account: "brokerage-two", symbol: "INTU", qty: 6, costPerShare: 702.0, acquired: "2026-03-03", price: 655.4 },
];

export type HarvestCell =
  | { kind: "hold" }
  /** A loss worth taking: `saved` is the tax it takes off this year's bill. */
  | { kind: "harvest"; symbol: string; saved: number; order: number }
  /** A loss that would be disallowed because of a replacement buy (the hero NVDA lot). */
  | { kind: "wash"; symbol: string; disallowed: number; order: number };

export const HARVEST_COLS = 7;
export const HARVEST_ROWS = 4;
/** Grid slots of the loss lots, in the order the visual works through them. */
const LOSS_SLOTS = [2, 8, 11, 15, 17, 22, 26] as const;
/** Which of those slots is the NVDA lot that would wash. */
const WASH_AT = 3;

export function harvestGrid(): HarvestCell[] {
  const harvests = [
    { symbol: LOTS.amd.symbol, saved: savedBy(LOTS.amd, PRICES.AMD) },
    ...EXTRA_LOSSES.map((l) => ({ symbol: l.symbol, saved: savedBy(l, l.price) })),
  ];
  const nvda = engine.simulateSale({
    lot: LOTS.nvda, qty: LOTS.nvda.qty, price: PRICES.NVDA, date: DEMO_DATE,
    rebuy: { date: HERO_REPLACEMENT.date, qty: shareEquivalent(HERO_REPLACEMENT), price: HERO_REPLACEMENT.price, account: HERO_REPLACEMENT.account },
  });
  const cells: HarvestCell[] = Array.from({ length: HARVEST_COLS * HARVEST_ROWS }, () => ({ kind: "hold" }));
  let h = 0;
  LOSS_SLOTS.forEach((slot, order) => {
    cells[slot] = order === WASH_AT
      ? { kind: "wash", symbol: LOTS.nvda.symbol, disallowed: nvda.wash!.disallowed, order }
      : { kind: "harvest", ...harvests[h++], order };
  });
  return cells;
}

/** Tax a clean loss sale takes off this year's bill. */
function savedBy(lot: Lot, price: number) {
  const r = engine.simulateSale({ lot, qty: lot.qty, price, date: DEMO_DATE });
  return round(-recognized(r) * DEFAULT_RATES.st);
}

/* ── Long-term countdown: the AAPL lot's holding period ───────────────────────────────────── */

export function countdown() {
  const lot = LOTS.aapl;
  const ltDate = longTermDate(lot.acquired);
  const total = daysBetween(lot.acquired, ltDate);
  const daysAway = daysBetween(DEMO_DATE, ltDate);
  return { symbol: lot.symbol, total, held: total - daysAway, daysAway, ltDate, save: longTermSaving().save };
}

/* ── Section 1256: the same call trade on SPY vs XSP ─────────────────────────────────────── */

export function sec1256Compare() {
  const gain = SPY_CALLS_GAIN;
  const spyTax = round(gain * DEFAULT_RATES.st);
  const xspTax = section1256Tax(gain);
  return {
    gain,
    spyTax,
    xspTax,
    save: round(spyTax - xspTax),
    /** XSP: 60% of the gain at the long-term rate, 40% at the short-term rate. */
    ltPart: round(gain * 0.6 * DEFAULT_RATES.lt),
    stPart: round(gain * 0.4 * DEFAULT_RATES.st),
    rates: DEFAULT_RATES,
  };
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}
