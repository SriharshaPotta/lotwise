"use client";

import { Surface } from "@/components/ui/Surface";
import type { CountdownRow, Portfolio } from "@/lib/engine/portfolio";
import { daysBetween } from "@/lib/engine/dates";
import { money, shortDate } from "@/lib/format";
import { Empty, Money, Panel, dateText, num, qtyText } from "./parts";
import type { SimRequest } from "./SimulatePanel";
import { priceKey } from "./useDemo";

/** Days until each short-term lot goes long-term, and what waiting saves. */
export function CountdownPanel({
  portfolio,
  asOf,
  rows,
  onSimulate,
}: {
  portfolio: Portfolio;
  asOf: string;
  rows: CountdownRow[];
  onSimulate: (r: SimRequest) => void;
}) {
  const name = (id: string) => portfolio.accounts.find((a) => a.id === id)?.name ?? id;
  const worth = rows.filter((r) => num(r.taxSavedByWaiting) >= 1);
  const total = worth.reduce((s, r) => s + num(r.taxSavedByWaiting), 0);

  return (
    <Panel
      title={
        <>
          Some sales get cheaper if you <em>wait</em>.
        </>
      }
      strong="Held more than a year, a gain is taxed at the long-term rate."
      lead="Each bar is a lot's first year; the violet tick is the day it turns long-term."
      notes={[
        `${rows.length} short-term lots`,
        `${worth.length} would save tax by waiting`,
        `Up to ${money(total, { whole: true })} in all`,
      ]}
    >
      <Surface className="overflow-hidden">
        {rows.length === 0 ? (
          <Empty>Every taxable lot is already long-term.</Empty>
        ) : (
          <ul>
            {rows.map((r) => {
              const span = Math.max(1, daysBetween(r.holdingStart, r.longTermFrom));
              const held = Math.min(span, Math.max(0, daysBetween(r.holdingStart, asOf)));
              const saves = num(r.taxSavedByWaiting);
              return (
                <li key={r.lotId} className="grid gap-x-6 gap-y-3 px-5 py-4 hover:bg-surface-2 md:grid-cols-[13rem_minmax(0,1fr)_7rem_auto] md:items-center">
                  <div className="min-w-0">
                    <p className="num text-[14px] text-fg">
                      {qtyText(r.qty)} {r.label}
                    </p>
                    <p className="num mt-0.5 text-[12px] text-muted">
                      {name(r.account)} · {r.unrealized == null ? "no price" : <Money value={r.unrealized} signed />}
                    </p>
                  </div>
                  <div>
                    <div aria-hidden className="relative h-2 rounded-full bg-[color-mix(in_oklch,var(--fg)_8%,transparent)]">
                      <span className="absolute inset-y-0 left-0 rounded-full bg-[color-mix(in_oklch,var(--fg)_55%,transparent)]" style={{ width: `${(held / span) * 100}%` }} />
                      <span className="absolute -top-1 right-0 h-4 w-0.5 rounded-full bg-longterm" />
                    </div>
                    <p className="num mt-2 flex justify-between text-[12px] text-muted">
                      <span>{dateText(r.holdingStart)}</span>
                      <span className="text-fg">long-term {shortDate(r.longTermFrom)}</span>
                    </p>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 md:block md:text-right">
                    <p className="num text-[15px] text-fg">
                      {r.daysAway} day{r.daysAway === 1 ? "" : "s"}
                    </p>
                    <p className="num text-[12px] text-muted">{saves >= 1 ? <>save {money(saves, { whole: true })}</> : "nothing to save"}</p>
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => onSimulate({ account: r.account, key: priceKey(r), qty: num(r.qty), lotId: r.lotId })}
                      className="h-7 rounded-[6px] px-2 text-[12px] text-accent ring-hairline transition-shadow hover:shadow-[0_0_0_1px_var(--hairline-strong)]"
                      aria-label={`Simulate selling ${r.label} in ${name(r.account)}`}
                    >
                      Simulate
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Surface>
    </Panel>
  );
}
