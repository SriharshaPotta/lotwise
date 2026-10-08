"use client";

import { useState } from "react";
import { Segmented } from "@/components/ui/Segmented";
import { Surface } from "@/components/ui/Surface";
import type { EngineLot, Portfolio, Prices } from "@/lib/engine/portfolio";
import { daysBetween } from "@/lib/engine/dates";
import { money } from "@/lib/format";
import { Empty, Input, Money, Panel, Table, TermChip, WashFlag, dateText, num, qtyText } from "./parts";
import type { SimRequest } from "./SimulatePanel";
import { priceKey } from "./useDemo";

/** Positions and lots, per account or across all of them, with term and days to long-term. */
export function PositionsPanel({
  portfolio,
  prices,
  asOf,
  lots,
  onPrice,
  onSimulate,
}: {
  portfolio: Portfolio;
  prices: Prices;
  asOf: string;
  lots: EngineLot[];
  onPrice: (key: string, price: string) => void;
  onSimulate: (r: SimRequest) => void;
}) {
  const [filter, setFilter] = useState("all");
  const accounts = portfolio.accounts;
  const shown = accounts.filter((a) => filter === "all" || a.id === filter);
  const value = (l: EngineLot) => {
    const p = prices[priceKey(l)];
    return p == null || p === "" ? null : num(p) * num(l.qty) * num(l.multiplier);
  };
  const totals = (ls: EngineLot[]) => {
    const priced = ls.filter((l) => value(l) != null);
    return { value: priced.reduce((s, l) => s + value(l)!, 0), unrealized: priced.reduce((s, l) => s + value(l)! - num(l.basis), 0) };
  };
  const all = totals(lots);
  const keys = [...new Set(lots.map(priceKey))].sort();

  return (
    <Panel
      title={
        <>
          Every lot, in <em>every</em> account.
        </>
      }
      strong="A position is a stack of lots."
      lead="Each one has its own cost, its own clock to long-term, and its own tax bill when sold."
      notes={[
        `${lots.length} open lots · ${accounts.length} accounts`,
        `Market value ${money(all.value, { whole: true })}`,
        `Unrealized ${money(all.unrealized, { whole: true })}`,
      ]}
      aside={
        <details className="group mt-10">
          <summary className="num cursor-pointer text-meta text-muted hover:text-fg">Last prices · {keys.length} (edit to re-run everything)</summary>
          <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-1">
            {keys.map((k) => (
              <label key={k} className="num flex items-center justify-between gap-3 text-[12px] text-muted">
                <span className="min-w-0 flex-1 truncate" title={k}>
                  {k}
                </span>
                <Input
                  className="h-8 w-24 px-2 text-right text-[13px]"
                  inputMode="decimal"
                  value={prices[k] ?? ""}
                  placeholder="price"
                  onChange={(e) => onPrice(k, e.target.value.replace(/[^0-9.]/g, ""))}
                  aria-label={`Last price of ${k}`}
                />
              </label>
            ))}
          </div>
        </details>
      }
    >
      {accounts.length > 1 && accounts.length <= 4 && (
        <Segmented
          label="Accounts shown"
          options={[{ value: "all", label: "All accounts" }, ...accounts.map((a) => ({ value: a.id, label: a.name }))]}
          value={filter}
          onChange={setFilter}
          className="mb-6 max-w-full overflow-x-auto"
        />
      )}
      <div className="space-y-8">
        {shown.map((a) => {
          const ls = lots.filter((l) => l.account === a.id).sort((x, y) => x.symbol.localeCompare(y.symbol) || x.acquired.localeCompare(y.acquired));
          const t = totals(ls);
          return (
            <Surface key={a.id} className="overflow-hidden">
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-5 pt-5 pb-4">
                <h3 className="text-[20px] leading-7">
                  {a.name} <span className="num ml-2 text-meta text-muted">{a.kind === "taxable" ? "taxable" : a.kind === "roth" ? "Roth · not taxed" : "IRA · not taxed"}</span>
                </h3>
                <p className="num text-meta text-muted">
                  {money(t.value, { whole: true })} · <Money value={t.unrealized} whole signed />
                </p>
              </div>
              {ls.length === 0 ? (
                <Empty>No open lots.</Empty>
              ) : (
                <Table
                  caption={`Open lots in ${a.name} as of ${dateText(asOf)}`}
                  head={["Lot", "Qty", "Cost / sh", "Basis", "Value", "Unrealized", "Term", "Long-term", ""]}
                >
                  {ls.map((l) => {
                    const v = value(l);
                    const days = daysBetween(asOf, l.longTermFrom);
                    const term = l.section1256 ? "1256" : days <= 0 ? "long" : "short";
                    return (
                      <tr key={l.id}>
                        <td className="text-fg">
                          <span className="block">{l.label}</span>
                          <span className="block text-[12px] text-muted">
                            bought {dateText(l.acquired)}
                          </span>
                          {num(l.washAdjustment) > 0 && (
                            <span className="mt-0.5 block text-[12px]">
                              <WashFlag>+{money(num(l.washAdjustment))} washed loss in basis</WashFlag>
                            </span>
                          )}
                        </td>
                        <td>{qtyText(l.qty)}</td>
                        <td>{money(num(l.costPerShare))}</td>
                        <td>{money(num(l.basis))}</td>
                        <td>{v == null ? <span className="text-muted">no price</span> : money(v)}</td>
                        <td>{v == null ? "—" : <Money value={v - num(l.basis)} signed />}</td>
                        <td>
                          <TermChip term={term} />
                        </td>
                        <td className="text-muted">{a.kind !== "taxable" || l.section1256 ? "—" : days <= 0 ? "now" : `in ${days} d`}</td>
                        <td>
                          <button
                            type="button"
                            onClick={() => onSimulate({ account: l.account, key: priceKey(l), qty: num(l.qty), lotId: l.id })}
                            className="rounded-[6px] px-2 py-1 text-[12px] text-accent ring-hairline transition-shadow hover:shadow-[0_0_0_1px_var(--hairline-strong)]"
                            aria-label={`Simulate selling lot ${l.label} bought ${dateText(l.acquired)}`}
                          >
                            Simulate
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </Table>
              )}
            </Surface>
          );
        })}
      </div>
    </Panel>
  );
}
