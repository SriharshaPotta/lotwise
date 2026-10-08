"use client";

import { useMemo, useState } from "react";
import { Chip } from "@/components/ui/Chip";
import { Surface } from "@/components/ui/Surface";
import type { HarvestCandidate, Portfolio } from "@/lib/engine/portfolio";
import { money, shortDate } from "@/lib/format";
import { Empty, Panel, TermChip, WashFlag, dateText, num, qtyText } from "./parts";
import type { SimRequest } from "./SimulatePanel";
import { priceKey } from "./useDemo";

/** Lots with losses worth taking, ranked, with the ones that would wash flagged and dated. */
export function HarvestPanel({
  portfolio,
  asOf,
  harvest,
  onSimulate,
}: {
  portfolio: Portfolio;
  asOf: string;
  harvest: HarvestCandidate[];
  onSimulate: (r: SimRequest) => void;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const name = (id: string) => portfolio.accounts.find((a) => a.id === id)?.name ?? id;
  const biggest = Math.max(1, ...harvest.map((c) => -num(c.unrealized)));
  const plan = useMemo(() => harvest.filter((c) => picked.includes(c.lotId)), [harvest, picked]);
  const deductible = plan.reduce((s, c) => s - num(c.recognized), 0);
  const saved = plan.reduce((s, c) => s - num(c.estTax), 0);
  const clean = harvest.filter((c) => c.clean);
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <Panel
      title={
        <>
          Losses worth <em>taking</em>.
        </>
      }
      strong="Sell a loser, deduct the loss."
      lead="Unless you bought the same thing within 30 days, in any account. Those are flagged, with the first day they're safe."
      notes={[
        `${harvest.length} lots under water on ${shortDate(asOf)}`,
        `${clean.length} clean · ${harvest.length - clean.length} would wash`,
        "IRA and Roth lots can't be harvested",
      ]}
      aside={
        <div className="mt-10" aria-live="polite">
          <p className="text-[13px] text-muted">Your harvest plan</p>
          <p className="num mt-2 text-[28px] leading-9 text-fg">{money(deductible, { whole: true })}</p>
          <p className="num text-meta text-muted">
            deductible · about {money(saved, { whole: true })} less tax
            {plan.length > 0 && ` · ${plan.length} lot${plan.length === 1 ? "" : "s"}`}
          </p>
        </div>
      }
    >
      <Surface className="overflow-hidden">
        {harvest.length === 0 ? (
          <Empty>No taxable lot is under water at these prices.</Empty>
        ) : (
          <ul className="divide-y-0">
            {harvest.map((c) => {
              const loss = -num(c.unrealized);
              const disallowed = num(c.disallowed);
              return (
                <li key={c.lotId} className="grid gap-x-6 gap-y-3 px-5 py-4 hover:bg-surface-2 md:grid-cols-[17rem_minmax(0,1fr)_12.5rem] md:items-center">
                  <div className="min-w-0">
                    <p className="num text-[14px] text-fg">
                      {qtyText(c.qty)} {c.label}
                    </p>
                    <p className="num mt-0.5 text-[12px] text-muted">
                      {name(c.account)} · bought {dateText(c.acquired)} · <TermChip term={c.term} />
                    </p>
                  </div>

                  <div className="min-w-0">
                    {/* the loss as a lot bar; the part a wash sale would disallow is hatched */}
                    <div aria-hidden className="relative h-2 rounded-full bg-[color-mix(in_oklch,var(--fg)_8%,transparent)]">
                      <div className="absolute inset-y-0 left-0 flex overflow-hidden rounded-full" style={{ width: `${(loss / biggest) * 100}%` }}>
                        <span className="h-full bg-loss" style={{ width: `${((loss - disallowed) / loss) * 100}%` }} />
                        <span className="hatch-wash h-full" style={{ width: `${(disallowed / loss) * 100}%` }} />
                      </div>
                    </div>
                    <p className="num mt-2 text-[12px] leading-5">
                      <span className="text-loss">{money(-loss)}</span>
                      {c.clean ? (
                        <span className="text-muted"> · all deductible</span>
                      ) : (
                        <>
                          {" · "}
                          <WashFlag>
                            {money(disallowed)} would wash
                          </WashFlag>
                          <span className="text-muted">
                            {" "}
                            · {c.causes[0]?.label} {c.causes[0] && shortDate(c.causes[0].date)}
                            {c.causes.length > 1 && ` +${c.causes.length - 1}`}
                            {c.safeFrom && <> · safe from {shortDate(c.safeFrom)}</>}
                          </span>
                        </>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 md:justify-end">
                    <Chip
                      tone={c.clean ? "neutral" : "wash"}
                      selected={picked.includes(c.lotId)}
                      onClick={() => toggle(c.lotId)}
                      aria-label={`${picked.includes(c.lotId) ? "Remove" : "Add"} ${c.label} (${name(c.account)}) ${picked.includes(c.lotId) ? "from" : "to"} the harvest plan`}
                    >
                      {money(num(c.recognized), { whole: true })}
                    </Chip>
                    <button
                      type="button"
                      onClick={() => onSimulate({ account: c.account, key: priceKey(c), qty: num(c.qty), lotId: c.lotId })}
                      className="h-7 rounded-[6px] px-2 text-[12px] text-accent ring-hairline transition-shadow hover:shadow-[0_0_0_1px_var(--hairline-strong)]"
                      aria-label={`Simulate selling ${c.label} in ${name(c.account)}`}
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
