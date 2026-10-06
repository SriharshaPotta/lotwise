// The convergence ledger (§4.4): every account's recent trades plus the sale you're about to make,
// first as three broker ledgers, then as the one chronological ledger the IRS sees.
import { addDays, isInWashWindow, WASH_WINDOW_DAYS } from "@/lib/engine";
import { ACCOUNTS, account, type AccountId } from "./accounts";
import { DEMO_DATE } from "./prices";
import { LOTS, TRADES, trade, type Trade } from "./trades";
import { heroReceipt, iraTrap } from "./scenarios";

export interface LedgerEntry {
  id: string;
  account: AccountId;
  date: string;
  /** "BUY 2 NVDA calls", "SELL 100 INTC" */
  label: string;
  /** The not-yet-placed trade from the hero. */
  proposed?: boolean;
  /** Position on its own account's page. */
  accountIndex: number;
  /** Position in the merged chronological ledger. */
  rank: number;
}

const PROPOSED_SALE = {
  id: "proposed-nvda",
  account: "brokerage-one" as AccountId,
  date: DEMO_DATE,
  label: `SELL ${LOTS.nvda.qty} ${LOTS.nvda.symbol}`,
  proposed: true,
};

function label(t: Trade): string {
  const what = t.option ? ` ${t.option.type}${t.qty === 1 ? "" : "s"}` : "";
  return `${t.side.toUpperCase()} ${t.qty} ${t.symbol}${what}`;
}

/** Every row, with both its per-account slot and its merged rank. */
export function ledgerEntries(): LedgerEntry[] {
  const raw = [
    ...TRADES.map((t) => ({ id: t.id, account: t.account, date: t.date, label: label(t) })),
    PROPOSED_SALE,
  ];
  const byDate = (a: { date: string; id: string }, b: { date: string; id: string }) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id);
  const merged = [...raw].sort(byDate);
  return raw.map((e) => ({
    ...e,
    accountIndex: raw.filter((x) => x.account === e.account).sort(byDate).indexOf(e),
    rank: merged.indexOf(e),
  }));
}

export function entriesFor(id: AccountId) {
  return ledgerEntries().filter((e) => e.account === id).sort((a, b) => a.accountIndex - b.accountIndex);
}

export const LEDGER_ACCOUNTS = ACCOUNTS;

/** What the merged ledger reveals. */
export function convergence() {
  const entries = ledgerEntries();
  const sale = entries.find((e) => e.id === PROPOSED_SALE.id)!;
  const replacement = entries.find((e) => e.id === "t7")!;
  const windowStart = addDays(DEMO_DATE, -WASH_WINDOW_DAYS);
  const windowEnd = addDays(DEMO_DATE, WASH_WINDOW_DAYS);
  const inWindow = entries.filter((e) => isInWashWindow(DEMO_DATE, e.date)).map((e) => e.rank);
  const trap = iraTrap();
  return {
    entries,
    sale,
    replacement,
    replacementAccount: account(trade("t7").account),
    window: { start: windowStart, end: windowEnd, firstRank: Math.min(...inWindow), lastRank: Math.max(...inWindow) },
    disallowed: heroReceipt(LOTS.nvda.qty).disallowed,
    saleRealized: heroReceipt(LOTS.nvda.qty).result!.realized,
    iraTrap: { saleId: trap.sale.id, buyId: trap.buy.id, lost: trap.result.wash!.disallowed, permanent: trap.result.wash!.permanent },
  };
}
