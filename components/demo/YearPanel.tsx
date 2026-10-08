"use client";

import { Surface } from "@/components/ui/Surface";
import type { Portfolio, YearSummary } from "@/lib/engine/portfolio";
import { money } from "@/lib/format";
import { Empty, Money, Panel, Table, TermChip, WashFlag, dateText, num, qtyText } from "./parts";

/** Realized gains for the year: short, long, §1256, disallowed, and the estimated bill. */
export function YearPanel({ portfolio, summary: s }: { portfolio: Portfolio; summary: YearSummary }) {
  const name = (id: string) => portfolio.accounts.find((a) => a.id === id)?.name ?? id;
  const rates = portfolio.settings ?? {};
  const stats: [string, React.ReactNode, string?][] = [
    ["Short-term", <Money key="s" value={s.netShort} signed />, `${s.shortTerm.count} sale${s.shortTerm.count === 1 ? "" : "s"}${num(s.section1256.recognized) ? " · incl. 40% of §1256" : ""}`],
    ["Long-term", <Money key="l" value={s.netLong} signed />, `${s.longTerm.count} sale${s.longTerm.count === 1 ? "" : "s"}${num(s.section1256.recognized) ? " · incl. 60% of §1256" : ""}`],
    ["Disallowed, deferred", <Money key="d" value={s.disallowedTemporary} />, "moved into replacement lots"],
    ["Disallowed for good", <Money key="p" value={s.disallowedPermanent} />, "replacements bought in an IRA/Roth"],
  ];

  return (
    <Panel
      title={
        <>
          {s.year}, <em>so far</em>.
        </>
      }
      strong="What's already locked in for this tax year."
      lead={`Short-term at ${Math.round(num(rates.stRate ?? 0.24) * 100)}%, long-term at ${Math.round(num(rates.ltRate ?? 0.15) * 100)}% (change the rates on the Data tab).`}
      notes={[
        `${s.realizations.length} lot sales in ${s.year}`,
        num(s.taxExempt.realized) ? `${money(num(s.taxExempt.realized))} realized inside IRAs, not taxed` : "No sales inside IRAs",
        "Estimates only, not tax advice",
      ]}
    >
      <div className="space-y-8">
        <Surface>
          <dl className="grid gap-x-8 gap-y-6 p-5 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map(([k, v, note]) => (
              <div key={k}>
                <dt className="text-[13px] text-muted">{k}</dt>
                <dd className="num mt-1 text-[22px] leading-8 text-fg">{v}</dd>
                {note && <dd className="num text-[12px] text-muted">{note}</dd>}
              </div>
            ))}
          </dl>
          <div className="num flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 px-5 pt-2 pb-5 text-[13px]">
            <p className="text-muted">
              Net <Money value={s.net} signed className="text-fg" />
              {num(s.deductibleLoss) > 0 && (
                <>
                  {" "}
                  · {money(num(s.deductibleLoss))} deducted from income
                  {num(s.carryforward) > 0 && <> · {money(num(s.carryforward))} carried forward</>}
                </>
              )}
            </p>
            <p className="text-[15px] text-fg">
              Est. tax <Money value={s.estTax} signed />
            </p>
          </div>
        </Surface>

        <Surface className="overflow-hidden pt-5">
          {s.realizations.length === 0 ? (
            <Empty>No sales in {s.year} yet.</Empty>
          ) : (
            <Table caption={`Sales in ${s.year}`} head={["Sale", "Qty", "Proceeds", "Basis", "Realized", "Disallowed", "Counts", "Term"]}>
              {s.realizations.map((r) => (
                <tr key={`${r.saleId}-${r.lotId}`}>
                  <td className="text-fg">
                    <span className="block">{r.label}</span>
                    <span className="block text-[12px] text-muted">
                      {dateText(r.date)} · {name(r.account)}
                    </span>
                  </td>
                  <td>{qtyText(r.qty)}</td>
                  <td>{money(num(r.proceeds))}</td>
                  <td>{money(num(r.basis))}</td>
                  <td>
                    <Money value={r.realized} signed />
                  </td>
                  <td>
                    {num(r.disallowed) > 0 ? <WashFlag permanent={num(r.disallowedPermanent) > 0}>{money(num(r.disallowed))}</WashFlag> : <span className="text-muted">—</span>}
                  </td>
                  <td>{r.taxExempt ? <span className="text-muted">not taxed</span> : <Money value={r.recognized} signed />}</td>
                  <td>
                    <TermChip term={r.term} />
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </Surface>
      </div>
    </Panel>
  );
}
