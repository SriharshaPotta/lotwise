// Across-accounts explainer (§5): the convergence story cut down to the two brokerages.
// Each broker checks only its own account; the IRS checks them together.
import { WASH_WINDOW_DAYS, addDays, daysBetween, engine, isInWashWindow } from "@/lib/engine";
import { account, type AccountId } from "./accounts";
import { convergence, type LedgerEntry } from "./convergence";
import { DEMO_DATE, PRICES } from "./prices";
import { LOTS, TRADES, shareEquivalent, type Trade } from "./trades";

const IDS: AccountId[] = ["brokerage-one", "brokerage-two"];
const SALE_ACCOUNT: AccountId = "brokerage-one";

/** The NVDA sale checked against the purchases one set of accounts can see. */
function check(visible: AccountId[]) {
  const lot = LOTS.nvda;
  const trigger: Trade | undefined = TRADES.find(
    (t) => visible.includes(t.account) && t.side === "buy" && t.symbol === lot.symbol && isInWashWindow(DEMO_DATE, t.date),
  );
  const result = engine.simulateSale({
    lot, qty: lot.qty, price: PRICES.NVDA, date: DEMO_DATE,
    rebuy: trigger && { date: trigger.date, qty: shareEquivalent(trigger), price: trigger.price, account: trigger.account },
  });
  return { trigger, result };
}

export function accountsExplainer() {
  const c = convergence();
  const entries = c.entries.filter((e) => IDS.includes(e.account));
  const merged = [...entries].sort((a, b) => a.rank - b.rank);
  const inWindow = merged.map((e, i) => (isInWashWindow(DEMO_DATE, e.date) ? i : -1)).filter((i) => i >= 0);
  const irs = check(IDS);
  return {
    accounts: IDS.map((id) => ({
      ...account(id),
      entries: entries.filter((e) => e.account === id).sort((a, b) => a.accountIndex - b.accountIndex) as LedgerEntry[],
      // a broker sees a wash only if its own account holds both the sale and the purchase
      washes: id === SALE_ACCOUNT ? check([id]).result.wash !== null : false,
    })),
    merged,
    saleId: c.sale.id,
    replacementId: irs.trigger!.id,
    replacement: irs.trigger!,
    saleAccount: account(SALE_ACCOUNT),
    replacementAccount: account(irs.trigger!.account),
    daysBefore: daysBetween(irs.trigger!.date, DEMO_DATE),
    realized: irs.result.realized,
    disallowed: irs.result.wash!.disallowed,
    window: {
      start: addDays(DEMO_DATE, -WASH_WINDOW_DAYS),
      end: addDays(DEMO_DATE, WASH_WINDOW_DAYS),
      first: Math.min(...inWindow),
      last: Math.max(...inWindow),
    },
  };
}
