// The demo's saved state: one localStorage entry, in this browser only. Nothing is ever sent anywhere.
import type { Portfolio, Prices } from "@/lib/engine/portfolio";
import { DEMO_AS_OF, DEMO_PORTFOLIO, DEMO_PRICES } from "./demo";

export const STORAGE_KEY = "lotwise:v1";

export interface DemoState {
  version: 1;
  /** "demo" until the visitor edits or imports anything. */
  source: "demo" | "custom";
  portfolio: Portfolio;
  prices: Prices;
  /** "Today" for positions, scans and the receipt's default sale date. */
  asOf: string;
}

export function demoState(): DemoState {
  return { version: 1, source: "demo", portfolio: structuredClone(DEMO_PORTFOLIO), prices: { ...DEMO_PRICES }, asOf: DEMO_AS_OF };
}

/** A blank slate: no accounts, no trades, today's date. */
export function emptyState(today: string): DemoState {
  return { version: 1, source: "custom", portfolio: { version: 1, accounts: [], trades: [], settings: DEMO_PORTFOLIO.settings }, prices: {}, asOf: today };
}

function isState(x: unknown): x is DemoState {
  const s = x as DemoState;
  return !!s && s.version === 1 && !!s.portfolio && Array.isArray(s.portfolio.accounts) && Array.isArray(s.portfolio.trades) && typeof s.asOf === "string";
}

export function loadState(): DemoState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveState(s: DemoState) {
  try {
    if (s.source === "demo") window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // Private mode or storage full: the session still works, it just won't be remembered.
  }
}

export function clearState() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // nothing to clear
  }
}

/** Local calendar date, ISO. */
export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
