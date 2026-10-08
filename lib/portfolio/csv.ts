// Trade files: the Lotwise CSV format (what the demo exports, and what the MCP server reads), the
// Lotwise JSON format (an engine Portfolio plus prices), and Schwab's transaction-history export.
// No browser or Node APIs here: the demo and the MCP server share this file.
import type { AccountKind, OptionSpec, Portfolio, PortfolioAccount, PortfolioTrade, Prices } from "@/lib/engine/portfolio";

/** Columns of the Lotwise CSV format, in export order. Only the first six are required. */
export const LOTWISE_COLUMNS = [
  "date",
  "account",
  "side",
  "symbol",
  "qty",
  "price",
  "fees",
  "option_type",
  "strike",
  "expiry",
  "multiplier",
  "deep_itm",
  "account_name",
  "account_type",
  "id",
] as const;

export const LOTWISE_REQUIRED = LOTWISE_COLUMNS.slice(0, 6);

/** A file the demo can save and load back losslessly. */
export interface LotwiseFile {
  format: "lotwise";
  version: 1;
  asOf?: string;
  portfolio: Portfolio;
  prices: Prices;
}

export interface ParseResult {
  portfolio: Portfolio;
  prices: Prices;
  asOf?: string;
  /** Rows skipped (not trades, e.g. dividends) or rejected, with a reason. */
  skipped: { line: number; reason: string }[];
  format: "lotwise-csv" | "lotwise-json" | "schwab";
}

// ---------------------------------------------------------------------------------------------
// CSV primitives (RFC 4180: quotes, doubled quotes, commas and newlines inside quotes).

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}

const escape = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
export const toCsv = (rows: string[][]) => rows.map((r) => r.map(escape).join(",")).join("\n") + "\n";

// ---------------------------------------------------------------------------------------------
// Values

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** ISO date from "2026-10-03", "10/03/2026", "10/3/26" or "10/03/2026 as of 10/02/2026". */
export function parseDate(raw: string): string | null {
  const s = raw.trim().split(/\s+as of\s+/i)[0].trim();
  if (ISO.test(s.slice(0, 10))) return s.slice(0, 10);
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(s);
  if (!m) return null;
  const y = m[3].length === 2 ? `20${m[3]}` : m[3];
  return `${y}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
}

/** "1,234.50", "$1,234.50", "(12.00)" → "1234.50" / "-12.00"; empty → null. */
export function parseNumber(raw: string | undefined): string | null {
  if (raw == null) return null;
  let s = raw.trim().replace(/[$,\s]/g, "");
  if (!s) return null;
  let neg = false;
  if (/^\(.*\)$/.test(s)) {
    neg = true;
    s = s.slice(1, -1);
  }
  if (s.startsWith("-")) {
    neg = !neg;
    s = s.slice(1);
  }
  if (!/^\d*\.?\d+$/.test(s)) return null;
  return (neg ? "-" : "") + s;
}

const slug = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "account";

function kindOf(raw: string | undefined): AccountKind | null {
  const s = (raw ?? "").trim().toLowerCase();
  if (!s) return null;
  if (/\broth\b/.test(s)) return "roth";
  if (/\b(ira|401k|403b|sep|tax-deferred)\b/.test(s)) return "ira";
  if (s === "taxable" || s.includes("individual") || s.includes("brokerage") || s.includes("joint")) return "taxable";
  return null;
}

/** Account kind guessed from a name: "Roth IRA" → roth, "Rollover IRA" → ira, else taxable. */
export function guessKind(name: string): AccountKind {
  const k = kindOf(name);
  return k === "roth" || k === "ira" ? k : "taxable";
}

// ---------------------------------------------------------------------------------------------
// Lotwise CSV

export function exportLotwiseCsv(p: Portfolio): string {
  const accounts = new Map(p.accounts.map((a) => [a.id, a]));
  const rows = p.trades.map((t) => {
    const a = accounts.get(t.account);
    const o = t.option;
    const v: Record<(typeof LOTWISE_COLUMNS)[number], string> = {
      date: t.date,
      account: t.account,
      side: t.side,
      symbol: t.symbol,
      qty: String(t.qty),
      price: String(t.price),
      fees: t.fees != null && Number(t.fees) !== 0 ? String(t.fees) : "",
      option_type: o?.type ?? "",
      strike: o?.strike != null ? String(o.strike) : "",
      expiry: o?.expiry ?? "",
      multiplier: o ? String(o.multiplier ?? 100) : "",
      deep_itm: o?.deepItm ? "true" : "",
      account_name: a?.name ?? "",
      account_type: a?.kind ?? "",
      id: t.id,
    };
    return LOTWISE_COLUMNS.map((c) => v[c]);
  });
  return toCsv([[...LOTWISE_COLUMNS], ...rows]);
}

function parseLotwiseCsv(rows: string[][], offset = 0): ParseResult {
  const header = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const col = (name: string) => header.indexOf(name);
  const missing = LOTWISE_REQUIRED.filter((c) => col(c) < 0);
  if (missing.length) throw new Error(`Missing column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}`);
  const accounts = new Map<string, PortfolioAccount>();
  const trades: PortfolioTrade[] = [];
  const skipped: ParseResult["skipped"] = [];
  const ids = new Set<string>();
  rows.slice(1).forEach((r, i) => {
    const line = i + 2 + offset;
    const get = (name: string) => (col(name) >= 0 ? (r[col(name)] ?? "").trim() : "");
    const date = parseDate(get("date"));
    const side = get("side").toLowerCase();
    const symbol = get("symbol").toUpperCase();
    const qty = parseNumber(get("qty"));
    const price = parseNumber(get("price"));
    const accountRaw = get("account");
    if (!date) return skipped.push({ line, reason: `bad date "${get("date")}"` });
    if (side !== "buy" && side !== "sell") return skipped.push({ line, reason: `side must be buy or sell, got "${get("side")}"` });
    if (!symbol) return skipped.push({ line, reason: "missing symbol" });
    if (!qty || Number(qty) <= 0) return skipped.push({ line, reason: `bad qty "${get("qty")}"` });
    if (price == null || Number(price) < 0) return skipped.push({ line, reason: `bad price "${get("price")}"` });
    if (!accountRaw) return skipped.push({ line, reason: "missing account" });

    const accountId = slug(accountRaw);
    if (!accounts.has(accountId)) {
      const name = get("account_name") || accountRaw;
      accounts.set(accountId, { id: accountId, name, kind: kindOf(get("account_type")) ?? guessKind(name) });
    }
    const optType = get("option_type").toLowerCase();
    let option: OptionSpec | undefined;
    if (optType === "call" || optType === "put" || optType === "c" || optType === "p") {
      option = { type: optType.startsWith("c") ? "call" : "put", multiplier: parseNumber(get("multiplier")) ?? "100" };
      const strike = parseNumber(get("strike"));
      const expiry = parseDate(get("expiry"));
      if (strike) option.strike = strike;
      if (expiry) option.expiry = expiry;
      if (/^(true|yes|1|y)$/i.test(get("deep_itm"))) option.deepItm = true;
    }
    let id = get("id") || `row-${line}`;
    while (ids.has(id)) id += "'";
    ids.add(id);
    const fees = parseNumber(get("fees"));
    trades.push({
      id,
      account: accountId,
      date,
      side,
      symbol,
      qty,
      price,
      ...(fees && Number(fees) > 0 ? { fees } : {}),
      ...(option ? { option } : {}),
    });
  });
  return { portfolio: { version: 1, accounts: [...accounts.values()], trades }, prices: {}, skipped, format: "lotwise-csv" };
}

// ---------------------------------------------------------------------------------------------
// Schwab "Transactions" export: Date, Action, Symbol, Description, Quantity, Price, Fees & Comm, Amount.

const SCHWAB_HEADER = ["date", "action", "symbol", "quantity", "price"];

function isSchwab(header: string[]) {
  const h = header.map((x) => x.trim().toLowerCase());
  return SCHWAB_HEADER.every((c) => h.includes(c));
}

/** "NVDA 11/20/2026 140.00 C" → underlying + option spec. */
export function parseOccLike(symbol: string): { symbol: string; option?: OptionSpec } {
  const m = /^([A-Z.$]+)\s+(\d{1,2}\/\d{1,2}\/\d{2,4})\s+([\d.]+)\s+([CP])$/i.exec(symbol.trim());
  if (!m) return { symbol: symbol.trim().toUpperCase() };
  return {
    symbol: m[1].toUpperCase().replace(/^\$/, ""),
    option: { type: m[4].toUpperCase() === "C" ? "call" : "put", multiplier: "100", strike: m[3], expiry: parseDate(m[2]) ?? undefined },
  };
}

function parseSchwab(rows: string[][], account: PortfolioAccount, offset = 0): ParseResult {
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (n: string) => header.indexOf(n);
  const feesCol = header.findIndex((h) => h.startsWith("fees"));
  const trades: PortfolioTrade[] = [];
  const skipped: ParseResult["skipped"] = [];
  // Schwab lists newest first; same-day order matters to the engine, so read bottom-up.
  const body = rows.slice(1).map((r, i) => ({ r, line: i + 2 + offset })).reverse();
  for (const { r, line } of body) {
    const get = (i: number) => (i >= 0 ? (r[i] ?? "").trim() : "");
    const action = get(col("action")).toLowerCase();
    let side: "buy" | "sell" | null = null;
    if (action === "buy" || action === "buy to open" || action === "buy to close" || action === "reinvest shares") side = "buy";
    else if (action === "sell" || action === "sell to close" || action === "sell to open" || action === "sell short") side = "sell";
    if (!side) {
      if (get(0).toLowerCase().startsWith("transactions total")) continue;
      skipped.push({ line, reason: `not a trade ("${get(col("action")) || "blank"}")` });
      continue;
    }
    const date = parseDate(get(col("date")));
    const qty = parseNumber(get(col("quantity")))?.replace(/^-/, "");
    const price = parseNumber(get(col("price")));
    const { symbol, option } = parseOccLike(get(col("symbol")));
    if (!date || !qty || !price || !symbol) {
      skipped.push({ line, reason: "missing date, quantity, price or symbol" });
      continue;
    }
    if (option && action === "sell to open" && option.type === "put") {
      // A written put only matters for wash sales when deep in the money; the user can flag it.
      option.deepItm = false;
    }
    const fees = parseNumber(get(feesCol));
    trades.push({
      id: `schwab-${line}`,
      account: account.id,
      date,
      side,
      symbol,
      qty,
      price,
      ...(fees && Number(fees) > 0 ? { fees } : {}),
      ...(option ? { option } : {}),
    });
  }
  return { portfolio: { version: 1, accounts: [account], trades }, prices: {}, skipped, format: "schwab" };
}

// ---------------------------------------------------------------------------------------------

export function exportLotwiseJson(file: Omit<LotwiseFile, "format" | "version">): string {
  return JSON.stringify({ format: "lotwise", version: 1, ...file } satisfies LotwiseFile, null, 2) + "\n";
}

/**
 * Reads a trade file: Lotwise JSON, Lotwise CSV, or a Schwab export (which has no account column:
 * its trades go to `schwabAccount`, default "Schwab", taxable).
 */
export function parseTradeFile(text: string, opts: { schwabAccount?: PortfolioAccount } = {}): ParseResult {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("The file is empty.");
  if (trimmed.startsWith("{")) {
    let data: unknown;
    try {
      data = JSON.parse(trimmed);
    } catch {
      throw new Error("That looks like JSON but doesn't parse.");
    }
    const d = data as Partial<LotwiseFile> & Partial<Portfolio>;
    const portfolio = (d.portfolio ?? (d.accounts && d.trades ? (d as Portfolio) : null)) as Portfolio | null;
    if (!portfolio || !Array.isArray(portfolio.accounts) || !Array.isArray(portfolio.trades)) {
      throw new Error("JSON needs {portfolio: {accounts, trades}} or {accounts, trades}.");
    }
    return { portfolio, prices: d.prices ?? {}, asOf: d.asOf, skipped: [], format: "lotwise-json" };
  }
  const rows = parseCsv(trimmed);
  // Schwab files start with a title line ("Transactions for account ..."): find the header row.
  const headerAt = rows.findIndex((r) => isSchwab(r) || LOTWISE_REQUIRED.every((c) => r.map((h) => h.trim().toLowerCase()).includes(c)));
  if (headerAt < 0) throw new Error(`No header row found. Lotwise CSV needs: ${LOTWISE_REQUIRED.join(", ")}.`);
  const data = rows.slice(headerAt);
  if (isSchwab(data[0])) return parseSchwab(data, opts.schwabAccount ?? { id: "schwab", name: "Schwab", kind: "taxable" }, headerAt);
  return parseLotwiseCsv(data, headerAt);
}

/**
 * Adds imported trades to a portfolio. Accounts are matched by id or name; trade ids are kept
 * unique.
 */
export function mergePortfolios(base: Portfolio, add: Portfolio): Portfolio {
  const accounts = [...base.accounts];
  const remap = new Map<string, string>();
  for (const a of add.accounts) {
    const same = accounts.find((x) => x.id === a.id || x.name.toLowerCase() === a.name.toLowerCase());
    if (same) remap.set(a.id, same.id);
    else {
      accounts.push(a);
      remap.set(a.id, a.id);
    }
  }
  const ids = new Set(base.trades.map((t) => t.id));
  const trades = [...base.trades];
  for (const t of add.trades) {
    let id = t.id;
    while (ids.has(id)) id = `${t.id}-${ids.size}`;
    ids.add(id);
    trades.push({ ...t, id, account: remap.get(t.account) ?? t.account });
  }
  return { ...base, accounts, trades };
}
