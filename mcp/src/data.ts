// Where the server's portfolio comes from: a local file (re-read on every call, so edits and
// fresh exports are picked up), or the built-in demo portfolio. Never the network.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Portfolio, Prices } from "../../lib/engine/portfolio";
import { guessKind, parseTradeFile } from "../../lib/portfolio/csv";
import { DEMO_AS_OF, DEMO_PORTFOLIO, DEMO_PRICES } from "../../lib/portfolio/demo";

export interface DataOptions {
  /** Lotwise JSON, Lotwise CSV or a Schwab transactions CSV. */
  dataPath?: string;
  /** Optional JSON file of last prices: {"NVDA": "129.80", ...}. */
  pricesPath?: string;
  /** Use the built-in demo portfolio. */
  demo?: boolean;
  /** Account name for a Schwab export (one account per file). */
  schwabAccount?: string;
  /** "Today" (ISO). Defaults to the demo's date with --demo, else the local date. */
  asOf?: string;
}

export interface LoadedData {
  portfolio: Portfolio;
  prices: Prices;
  asOf: string;
  source: string;
}

export const NO_DATA =
  "No portfolio configured. Start the server with --data /path/to/trades.csv (or .json, exported from https://lotwise-seven.vercel.app/demo), or --demo to try it on the demo portfolio.";

export function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const slug = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "schwab";

export function loadData(o: DataOptions): LoadedData {
  let portfolio: Portfolio;
  let prices: Prices = {};
  let source: string;
  if (o.dataPath) {
    const path = resolve(o.dataPath);
    let text: string;
    try {
      text = readFileSync(path, "utf8");
    } catch (e) {
      throw new Error(`Can't read the data file ${path}: ${(e as Error).message}`);
    }
    const name = o.schwabAccount ?? "Schwab";
    const parsed = parseTradeFile(text, { schwabAccount: { id: slug(name), name, kind: guessKind(name) } });
    portfolio = parsed.portfolio;
    prices = { ...parsed.prices };
    source = path;
  } else if (o.demo) {
    portfolio = DEMO_PORTFOLIO;
    prices = { ...DEMO_PRICES };
    source = "built-in demo portfolio";
  } else {
    throw new Error(NO_DATA);
  }
  if (o.pricesPath) {
    try {
      Object.assign(prices, JSON.parse(readFileSync(resolve(o.pricesPath), "utf8")) as Prices);
    } catch (e) {
      throw new Error(`Can't read the prices file ${o.pricesPath}: ${(e as Error).message}`);
    }
  }
  const asOf = o.asOf ?? (o.demo && !o.dataPath ? DEMO_AS_OF : localToday());
  return { portfolio, prices, asOf, source };
}
