// The Lotwise MCP server: tools an agent calls before it trades.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Coupon, EngineLot, PortfolioAccount, Prices, TradeReceipt } from "../../lib/engine/portfolio";
import { loadData, type DataOptions, type LoadedData } from "./data";
import { getEngine } from "./engine";

export const VERSION = "0.1.0";
export const DISCLAIMER = "Estimates only, not tax advice. US federal capital-gains rules, simplified.";

const ISO_DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD");
const DECIMAL = z.union([z.number(), z.string().regex(/^-?\d*\.?\d+$/)]);

const MINUS = "−";
export function usd(s: string | number): string {
  const n = Number(s);
  const body = Math.abs(n).toLocaleString("en-US", { style: "currency", currency: "USD" });
  return n <= -0.005 ? MINUS + body : body;
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

class ToolError extends Error {}

function ok(data: Record<string, unknown>) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }], structuredContent: data };
}

function fail(e: unknown) {
  const message = e instanceof Error ? e.message : String(e);
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

function accountOf(accounts: PortfolioAccount[], ref: string | undefined): PortfolioAccount | undefined {
  if (!ref) return undefined;
  const r = ref.trim().toLowerCase();
  return accounts.find((a) => a.id.toLowerCase() === r || a.name.toLowerCase() === r);
}

function describeAccount(a: PortfolioAccount) {
  return { id: a.id, name: a.name, kind: a.kind };
}

/** Lots of `symbol` (or an option label) held as of `date`. */
function heldLots(data: LoadedData, date: string) {
  return getEngine().replay(data.portfolio, date).lots;
}

function couponText(c: Coupon, accounts: PortfolioAccount[]): string {
  const name = (id: string) => accounts.find((a) => a.id === id)?.name ?? id;
  switch (c.kind) {
    case "longTerm":
      return `Sell on or after ${c.date} (${c.daysAway} days) for long-term treatment: saves about ${usd(c.saves)}.`;
    case "avoidWash":
      return `Sell on or after ${c.date} instead: no wash sale, keeps the full ${usd(c.keeps)} deduction.`;
    case "safeRebuy":
      return `Rebuy on or after ${c.date} instead: keeps ${usd(c.keeps)} deductible.`;
    case "harvestInstead":
      return `Harvest ${c.qty} ${c.symbol} in ${name(c.account)} instead: ${usd(c.loss)} deductible, no wash sale.`;
  }
}

export function receiptSummary(r: TradeReceipt, accounts: PortfolioAccount[]) {
  const name = (id: string) => accounts.find((a) => a.id === id)?.name ?? id;
  const disallowed = Number(r.disallowed);
  const loss = Number(r.realized) < 0;
  const risk = disallowed > 0 ? "HIGH" : "NONE";
  const causes = r.causes
    .filter((c) => Number(c.disallowed) > 0)
    .map((c) => ({
      trade_id: c.tradeId,
      what: `${c.qty} ${c.label}`,
      account: name(c.account),
      date: c.date,
      before_sale: c.beforeSale,
      disallowed: c.disallowed,
      permanent: c.permanent,
    }));
  const lastPriorCause = r.causes.filter((c) => c.beforeSale).map((c) => c.date).sort().at(-1);
  const rebuySafeFrom = addDays(r.date, 31);
  let summary = `SELL ${r.qty} ${r.label} in ${name(r.account)} on ${r.date}: realized ${usd(r.realized)} (${r.term === "1256" ? "Section 1256, 60/40" : `${r.term}-term`}).`;
  if (r.taxExempt) summary += " Inside a tax-advantaged account: not taxed, and no wash-sale rule.";
  else if (disallowed > 0) {
    summary += ` WASH-SALE RISK HIGH: ${usd(r.disallowed)} of the loss is disallowed`;
    summary += Number(r.disallowedPermanent) > 0 ? ` (${usd(r.disallowedPermanent)} permanently, replacement bought in an IRA/Roth).` : " (added to the replacement's basis).";
    if (causes.length) summary += ` Caused by: ${causes.map((c) => `${c.what} ${c.before_sale ? "bought" : "buying"} ${c.date} in ${c.account}`).join("; ")}.`;
    if (r.rebuy?.triggers) summary += ` The planned rebuy on ${r.rebuy.date} washes ${usd(r.rebuy.disallowed)}.`;
  } else if (loss) summary += ` No wash sale: ${usd(r.deductible)} deductible.`;
  if (loss && !r.taxExempt) summary += ` Rebuy safe from ${rebuySafeFrom}.`;
  summary += ` Est. tax impact ${usd(r.estTax)}.`;

  return {
    summary,
    trade: { account: describeAccount(accounts.find((a) => a.id === r.account) ?? { id: r.account, name: r.account, kind: "taxable" }), symbol: r.label, quantity: r.qty, price: r.price, date: r.date },
    proceeds: r.proceeds,
    cost_basis: r.basis,
    realized: r.realized,
    term: r.term,
    short_term_part: r.shortTerm,
    long_term_part: r.longTerm,
    wash_sale_risk: r.taxExempt ? "NONE" : risk,
    disallowed: r.disallowed,
    permanently_disallowed: r.disallowedPermanent,
    deductible_loss: r.deductible,
    recognized_this_year: r.recognized,
    est_tax: r.estTax,
    tax_exempt_account: r.taxExempt,
    wash_sale_causes: causes,
    rebuy: r.rebuy
      ? { date: r.rebuy.date, account: name(r.rebuy.account), triggers_wash_sale: r.rebuy.triggers, disallowed: r.rebuy.disallowed, permanent: r.rebuy.permanent, new_basis: r.rebuy.replacementBasis, holding_period_starts: r.rebuy.holdingStart }
      : null,
    rebuy_safe_from: loss && !r.taxExempt ? rebuySafeFrom : null,
    sell_safe_from: lastPriorCause && disallowed > 0 ? addDays(lastPriorCause, 31) : null,
    alternatives: r.coupons.map((c) => couponText(c, accounts)),
    lots_sold: r.lots.map((l) => ({ lot_id: l.lotId, quantity: l.qty, acquired: l.acquired, holding_start: l.holdingStart, term: l.term, cost_basis: l.basis, realized: l.realized, disallowed: l.disallowed })),
    disclaimer: DISCLAIMER,
  };
}

function lotView(l: EngineLot, accounts: PortfolioAccount[], prices: Prices, date: string) {
  const a = accounts.find((x) => x.id === l.account);
  const price = prices[l.label] ?? prices[l.symbol.toUpperCase()];
  const value = price == null ? null : Number(price) * Number(l.qty) * Number(l.multiplier);
  const days = Math.round((Date.parse(l.longTermFrom) - Date.parse(date)) / 86_400_000);
  return {
    lot_id: l.id,
    account: a ? a.name : l.account,
    account_kind: a?.kind ?? "taxable",
    symbol: l.label,
    quantity: l.qty,
    cost_per_share: l.costPerShare,
    cost_basis: l.basis,
    acquired: l.acquired,
    holding_period_start: l.holdingStart,
    term_today: l.section1256 ? "1256" : days <= 0 ? "long" : "short",
    long_term_from: l.section1256 ? null : l.longTermFrom,
    days_until_long_term: l.section1256 ? null : Math.max(0, days),
    last_price: price == null ? null : String(price),
    unrealized: value == null ? null : (value - Number(l.basis)).toFixed(2),
    wash_sale_basis_adjustment: Number(l.washAdjustment) ? l.washAdjustment : undefined,
  };
}

export function createLotwiseServer(options: DataOptions & { load?: () => LoadedData } = {}) {
  const load = options.load ?? (() => loadData(options));
  const server = new McpServer(
    { name: "lotwise", version: VERSION },
    {
      instructions:
        "Lotwise estimates US capital-gains tax for the user's own trades, across every account they own (wash sales across accounts, IRA/Roth traps, short vs long term, Section 1256). " +
        "Call check_trade_tax_impact BEFORE placing any sell order, and before rebuying something sold at a loss in the last 30 days. Everything is computed locally from the user's trade file. " +
        DISCLAIMER,
    },
  );

  const run = <T>(fn: (data: LoadedData) => T) => {
    try {
      return ok(fn(load()) as Record<string, unknown>);
    } catch (e) {
      return fail(e);
    }
  };

  server.registerTool(
    "check_trade_tax_impact",
    {
      title: "Check the tax impact of a sale before placing it",
      description:
        "Simulates selling a position (optionally with a planned rebuy) against the user's whole trade history in every account, and returns the realized gain/loss, short/long term, wash-sale risk with the exact purchases that cause it, the estimated tax, the first safe rebuy date, and cheaper alternatives. Call this before any sell.",
      inputSchema: {
        symbol: z.string().min(1).describe('Ticker, e.g. "NVDA". For an option, its label as list_lots shows it, e.g. "NVDA 2026-11-20 140 C".'),
        quantity: DECIMAL.describe("Shares (or contracts) to sell."),
        price: DECIMAL.optional().describe("Expected sale price per share. Defaults to the last known price."),
        account: z.string().optional().describe("Account id or name. Optional when the symbol is held in only one account."),
        date: ISO_DATE.optional().describe("Sale date, YYYY-MM-DD. Defaults to today."),
        lot_method: z.enum(["fifo", "hifo", "lifo"]).optional().describe("Which lots to sell first. Default FIFO (the broker default)."),
        lot_id: z.string().optional().describe("Sell this specific lot (from list_lots) instead of using lot_method."),
        rebuy: z
          .object({
            date: ISO_DATE.describe("Planned rebuy date."),
            account: z.string().optional().describe("Account to rebuy in (an IRA/Roth rebuy makes a washed loss permanent). Defaults to the sale's account."),
            quantity: DECIMAL.optional(),
            price: DECIMAL.optional(),
          })
          .optional()
          .describe("A planned purchase of the same security, to check whether it would trigger a wash sale."),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    (args) =>
      run((data) => {
        const { portfolio, prices, asOf } = data;
        const date = args.date ?? asOf;
        const lots = heldLots(data, date);
        const key = args.symbol.trim().toUpperCase();
        const matching = lots.filter((l) => l.label.toUpperCase() === key);
        if (!matching.length) {
          const held = [...new Set(lots.map((l) => l.label))].sort().join(", ");
          throw new ToolError(`No open position in ${args.symbol} on ${date}. Held: ${held || "nothing"}.`);
        }
        let account = accountOf(portfolio.accounts, args.account);
        if (args.account && !account) throw new ToolError(`Unknown account "${args.account}". Accounts: ${portfolio.accounts.map((a) => a.name).join(", ")}.`);
        if (!account) {
          const ids = [...new Set(matching.map((l) => l.account))];
          if (ids.length > 1) {
            throw new ToolError(
              `${args.symbol} is held in ${ids.length} accounts (${ids.map((id) => accountOf(portfolio.accounts, id)?.name ?? id).join(", ")}); pass "account".`,
            );
          }
          account = accountOf(portfolio.accounts, ids[0]);
        }
        const lot = matching.find((l) => l.account === account!.id);
        if (!lot) throw new ToolError(`${account!.name} holds no ${args.symbol} on ${date}.`);
        const price = args.price ?? prices[lot.label] ?? prices[lot.symbol];
        if (price == null) throw new ToolError(`No price for ${lot.label}: pass "price".`);
        const rebuyAccount = args.rebuy?.account ? accountOf(portfolio.accounts, args.rebuy.account) : account;
        if (args.rebuy?.account && !rebuyAccount) throw new ToolError(`Unknown rebuy account "${args.rebuy.account}".`);
        const receipt = getEngine().simulate({
          portfolio,
          prices,
          proposal: {
            account: account!.id,
            symbol: lot.symbol,
            option: lot.option,
            qty: args.quantity,
            price,
            date,
            ...(args.lot_id ? { method: "specific" as const, lots: [{ lotId: args.lot_id, qty: args.quantity }] } : { method: args.lot_method ?? "fifo" }),
            ...(args.rebuy ? { rebuy: { date: args.rebuy.date, account: rebuyAccount!.id, qty: args.rebuy.quantity, price: args.rebuy.price } } : {}),
          },
        });
        return receiptSummary(receipt, portfolio.accounts);
      }),
  );

  server.registerTool(
    "list_lots",
    {
      title: "List open tax lots",
      description:
        "Lists the user's open tax lots (one per purchase, split by partial sales and wash-sale adjustments) with cost basis, holding period, days until long-term, last price and unrealized gain. Filter by account or symbol.",
      inputSchema: {
        account: z.string().optional().describe("Account id or name."),
        symbol: z.string().optional().describe("Ticker or option label."),
        as_of: ISO_DATE.optional().describe("Date to list lots as of. Defaults to today."),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    (args) =>
      run((data) => {
        const date = args.as_of ?? data.asOf;
        const account = accountOf(data.portfolio.accounts, args.account);
        if (args.account && !account) throw new ToolError(`Unknown account "${args.account}".`);
        const sym = args.symbol?.trim().toUpperCase();
        const lots = heldLots(data, date)
          .filter((l) => (!account || l.account === account.id) && (!sym || l.symbol === sym || l.label.toUpperCase() === sym))
          .map((l) => lotView(l, data.portfolio.accounts, data.prices, date));
        return { as_of: date, source: data.source, accounts: data.portfolio.accounts.map(describeAccount), lots, disclaimer: DISCLAIMER };
      }),
  );

  server.registerTool(
    "find_harvestable_losses",
    {
      title: "Find tax-loss harvesting candidates",
      description:
        "Ranks lots in taxable accounts with unrealized losses, and for each says whether selling today would be a wash sale (because of purchases in the last 30 days in ANY account, or planned ones) and the first date it would be safe.",
      inputSchema: {
        prices: z.record(z.string(), DECIMAL).optional().describe('Current prices by symbol, e.g. {"NVDA": 129.8}. Merged over the known prices.'),
        date: ISO_DATE.optional().describe("Defaults to today."),
        min_loss: z.number().nonnegative().optional().describe("Only losses at least this big, in dollars."),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    (args) =>
      run((data) => {
        const date = args.date ?? data.asOf;
        const prices = { ...data.prices, ...(args.prices ?? {}) };
        const name = (id: string) => accountOf(data.portfolio.accounts, id)?.name ?? id;
        const rows = getEngine()
          .harvestScan({ portfolio: data.portfolio, prices, date })
          .filter((c) => -Number(c.unrealized) >= (args.min_loss ?? 0))
          .map((c) => ({
            lot_id: c.lotId,
            account: name(c.account),
            symbol: c.label,
            quantity: c.qty,
            acquired: c.acquired,
            term: c.term,
            unrealized_loss: c.unrealized,
            deductible_if_sold_today: c.recognized,
            est_tax_saving: (-Number(c.estTax)).toFixed(2),
            wash_sale: !c.clean,
            disallowed_if_sold_today: c.disallowed,
            caused_by: c.causes.map((x) => `${x.qty} ${x.label} ${x.beforeSale ? "bought" : "buying"} ${x.date} in ${name(x.account)}`),
            safe_to_sell_from: c.safeFrom,
          }));
        const missing = [...new Set(heldLots(data, date).filter((l) => !(l.label in prices) && !(l.symbol in prices)).map((l) => l.label))];
        return {
          as_of: date,
          candidates: rows,
          clean_total: rows.filter((r) => !r.wash_sale).reduce((s, r) => s + Number(r.deductible_if_sold_today), 0).toFixed(2),
          ...(missing.length ? { no_price_for: missing } : {}),
          note: "Losses inside IRAs/Roths can't be harvested. Rebuying the same security within 30 days after selling would undo the deduction.",
          disclaimer: DISCLAIMER,
        };
      }),
  );

  server.registerTool(
    "days_until_long_term",
    {
      title: "Days until lots turn long-term",
      description: "For each short-term lot in a taxable account: the first date it counts as long-term, days away, and the estimated tax saved by waiting to sell a gain.",
      inputSchema: {
        symbol: z.string().optional().describe("Ticker or option label."),
        account: z.string().optional().describe("Account id or name."),
        date: ISO_DATE.optional().describe("Defaults to today."),
        prices: z.record(z.string(), DECIMAL).optional().describe("Current prices by symbol, to estimate the saving."),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    (args) =>
      run((data) => {
        const date = args.date ?? data.asOf;
        const account = accountOf(data.portfolio.accounts, args.account);
        if (args.account && !account) throw new ToolError(`Unknown account "${args.account}".`);
        const sym = args.symbol?.trim().toUpperCase();
        const name = (id: string) => accountOf(data.portfolio.accounts, id)?.name ?? id;
        const rows = getEngine()
          .countdown({ portfolio: data.portfolio, prices: { ...data.prices, ...(args.prices ?? {}) }, date })
          .filter((r) => (!account || r.account === account.id) && (!sym || r.symbol === sym || r.label.toUpperCase() === sym))
          .map((r) => ({
            lot_id: r.lotId,
            account: name(r.account),
            symbol: r.label,
            quantity: r.qty,
            holding_period_start: r.holdingStart,
            long_term_from: r.longTermFrom,
            days_away: r.daysAway,
            unrealized: r.unrealized,
            tax_saved_by_waiting: r.taxSavedByWaiting,
          }));
        return { as_of: date, lots: rows, disclaimer: DISCLAIMER };
      }),
  );

  server.registerTool(
    "summarize_tax_year",
    {
      title: "Summarize realized gains for a tax year",
      description: "Realized short-term, long-term and Section 1256 gains for a calendar year, wash-sale disallowances (deferred vs permanent), net, deductible loss, carryforward and estimated tax.",
      inputSchema: { year: z.number().int().min(1990).max(2100).optional().describe("Defaults to this year.") },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    (args) =>
      run((data) => {
        const year = args.year ?? Number(data.asOf.slice(0, 4));
        const s = getEngine().yearSummary(data.portfolio, year);
        return {
          year,
          net_short_term: s.netShort,
          net_long_term: s.netLong,
          net: s.net,
          section_1256: s.section1256.recognized,
          disallowed_deferred: s.disallowedTemporary,
          disallowed_permanently: s.disallowedPermanent,
          deductible_loss: s.deductibleLoss,
          carryforward: s.carryforward,
          est_tax: s.estTax,
          sales: s.realizations.length,
          realized_in_tax_advantaged_accounts: s.taxExempt.realized,
          disclaimer: DISCLAIMER,
        };
      }),
  );

  return server;
}
