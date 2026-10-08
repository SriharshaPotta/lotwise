// The real engine's receipt, shaped for the paper <Receipt> the landing page prints.
import type { ReceiptModel } from "@/components/receipt/Receipt";
import type { Coupon, PortfolioAccount, TradeReceipt } from "@/lib/engine/portfolio";

const n = (s: string) => Number(s) + 0;

export function receiptModel(r: TradeReceipt, accounts: PortfolioAccount[], shares: number): ReceiptModel {
  const name = (id: string) => accounts.find((a) => a.id === id)?.name ?? id;
  const causes = r.causes.filter((c) => n(c.disallowed) > 0).sort((a, b) => n(b.disallowed) - n(a.disallowed));
  const top = causes[0];
  const permanent = n(r.disallowedPermanent) > 0;
  const longTerm = r.coupons.find((c) => c.kind === "longTerm");
  let stamp: string | null = null;
  if (permanent) stamp = "PERMANENT";
  else if (n(r.disallowed) > 0) stamp = "WASH SALE";
  else if (longTerm && longTerm.daysAway <= 60) stamp = `LONG-TERM IN ${longTerm.daysAway} DAY${longTerm.daysAway === 1 ? "" : "S"}`;

  return {
    position: { lot: { symbol: r.label }, price: n(r.price), account: { name: name(r.account) } },
    shares,
    date: r.date,
    proceeds: n(r.proceeds),
    basis: n(r.basis),
    realized: n(r.realized),
    term: r.term === "1256" ? "60/40 (§1256)" : r.term === "none" ? "—" : r.term,
    taxFree: r.taxExempt,
    deductible: n(r.deductible),
    disallowed: n(r.disallowed),
    cause: top
      ? {
          trade: { symbol: top.symbol, qty: n(top.qty), date: top.date, option: top.option },
          account: { name: name(top.account) + (top.permanent ? " (gone for good)" : "") },
          more: causes.length - 1,
        }
      : null,
    rebuy: r.rebuy ? { date: r.rebuy.date, triggers: r.rebuy.triggers } : null,
    stamp,
  };
}

/** Coupons worth printing (savings of at least a dollar). */
export function usefulCoupons(r: TradeReceipt): Coupon[] {
  return r.coupons.filter((c) => {
    if (c.kind === "longTerm") return n(c.saves) >= 1;
    if (c.kind === "avoidWash" || c.kind === "safeRebuy") return n(c.keeps) >= 1;
    return n(c.loss) <= -1;
  });
}
