import type { Lot } from "@/lib/engine";
import type { AccountId } from "./accounts";

/** Open lots held on DEMO_DATE. */
export const LOTS = {
  /** The hero position: 100 NVDA in Brokerage One, underwater. */
  nvda: { id: "b1-nvda-1", account: "brokerage-one", symbol: "NVDA", qty: 100, costPerShare: 148.2, acquired: "2026-03-12" },
  /** Turns long-term 9 days after DEMO_DATE; waiting saves $410 (findings tape). */
  aapl: { id: "b1-aapl-1", account: "brokerage-one", symbol: "AAPL", qty: 40, costPerShare: 117.51, acquired: "2025-10-23" },
  /** Two VTI lots in Brokerage One: the cheap January lot and the Oct 9 buy (t4). HIFO vs FIFO. */
  vtiJan: { id: "b1-vti-1", account: "brokerage-one", symbol: "VTI", qty: 10, costPerShare: 248.0, acquired: "2026-01-12" },
  vtiOct: { id: "b1-vti-2", account: "brokerage-one", symbol: "VTI", qty: 10, costPerShare: 287.6, acquired: "2026-10-09" },
  /** The better harvest: a clean loss with no replacement purchase anywhere. */
  amd: { id: "b2-amd-1", account: "brokerage-two", symbol: "AMD", qty: 80, costPerShare: 172.0, acquired: "2026-02-04" },
  /** Agent-transcript example. */
  xyz: { id: "b2-xyz-1", account: "brokerage-two", symbol: "XYZ", qty: 100, costPerShare: 50.0, acquired: "2026-05-19" },
  msft: { id: "ira-msft-1", account: "roth-ira", symbol: "MSFT", qty: 15, costPerShare: 380.1, acquired: "2024-06-03" },
  spy: { id: "ira-spy-1", account: "roth-ira", symbol: "SPY", qty: 12, costPerShare: 498.75, acquired: "2023-11-20" },
} as const satisfies Record<string, Lot>;

export type TradeSide = "buy" | "sell";

export interface Trade {
  id: string;
  account: AccountId;
  date: string;
  side: TradeSide;
  symbol: string;
  /** Shares, or contracts for options. */
  qty: number;
  price: number;
  /** Options only. One contract = 100 shares of exposure. */
  option?: { type: "call" | "put"; multiplier: 100 };
}

/** Recent activity across all three accounts (the convergence ledger), grouped by account. */
export const TRADES: readonly Trade[] = [
  // Brokerage One
  { id: "t1", account: "brokerage-one", date: "2026-08-14", side: "buy", symbol: "COST", qty: 5, price: 902.4 },
  { id: "t2", account: "brokerage-one", date: "2026-09-02", side: "sell", symbol: "TSLA", qty: 20, price: 241.1 },
  { id: "t3", account: "brokerage-one", date: "2026-09-28", side: "sell", symbol: "INTC", qty: 100, price: 21.2 },
  { id: "t4", account: "brokerage-one", date: "2026-10-09", side: "buy", symbol: "VTI", qty: 10, price: 287.6 },
  // Brokerage Two
  { id: "t5", account: "brokerage-two", date: "2026-08-21", side: "buy", symbol: "AMD", qty: 30, price: 165.2 },
  { id: "t6", account: "brokerage-two", date: "2026-09-16", side: "sell", symbol: "META", qty: 8, price: 588.0 },
  { id: "t7", account: "brokerage-two", date: "2026-10-03", side: "buy", symbol: "NVDA", qty: 2, price: 6.4, option: { type: "call", multiplier: 100 } },
  { id: "t8", account: "brokerage-two", date: "2026-10-08", side: "buy", symbol: "GOOGL", qty: 12, price: 164.9 },
  // Roth IRA
  { id: "t9", account: "roth-ira", date: "2026-08-30", side: "buy", symbol: "SCHD", qty: 40, price: 27.9 },
  { id: "t10", account: "roth-ira", date: "2026-09-19", side: "buy", symbol: "MSFT", qty: 3, price: 418.2 },
  { id: "t11", account: "roth-ira", date: "2026-10-06", side: "buy", symbol: "INTC", qty: 100, price: 21.9 },
  { id: "t12", account: "roth-ira", date: "2026-10-12", side: "sell", symbol: "SPY", qty: 4, price: 569.0 },
];

/** Closed lot behind t3, so the IRA trap is computed rather than asserted. */
export const CLOSED_LOTS = {
  intc: { id: "b1-intc-1", account: "brokerage-one", symbol: "INTC", qty: 100, costPerShare: 27.4, acquired: "2026-01-15" },
} as const satisfies Record<string, Lot>;

export function trade(id: string): Trade {
  const t = TRADES.find((x) => x.id === id);
  if (!t) throw new Error(`Unknown trade ${id}`);
  return t;
}

/** Share-equivalent exposure of a purchase (options count contracts times the multiplier). */
export function shareEquivalent(t: Trade): number {
  return t.option ? t.qty * t.option.multiplier : t.qty;
}
