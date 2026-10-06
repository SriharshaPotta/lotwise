"use client";

import { useMemo, useState } from "react";
import { MoneyTween, formatInt } from "@/components/viz/MoneyTween";
import { TaxBar } from "@/components/viz/TaxBar";
import { cn } from "@/lib/cn";
import { TERM_EXPLAINER as X, termCliff, termDate, termDay, termState, type TermState } from "@/lib/demo";
import { money, shortDate } from "@/lib/format";
import { DayScrubber, StripEvent } from "./DayScrubber";
import { ExplainerFrame, Readout, Readouts, useSettled } from "./parts";

const LT_DAY = termDay(X.ltDate);
const TODAY = termDay(X.today);
const CLIFF = termCliff();
const MAX_TAX = CLIFF.short.estTax;
const pctText = (r: number) => `${Math.round(r * 100)}%`;

function summary(s: TermState) {
  const base = `Selling on ${shortDate(s.saleDate)}, after ${s.daysHeld} days, the ${money(s.gain)} gain is ${s.term}-term: taxed at ${pctText(s.rate)}, about ${money(s.estTax, { whole: true })}.`;
  return s.term === "short"
    ? `${base} Waiting ${s.daysToLong} more ${s.daysToLong === 1 ? "day" : "days"}, until ${shortDate(X.ltDate)}, makes it long-term: about ${money(CLIFF.long.estTax, { whole: true })}.`
    : `${base} That's ${money(CLIFF.save, { whole: true })} less than selling a day before the line.`;
}

/** §5 short-vs-long-term: a "days held" scrubber; the tax bar drops the moment the lot turns one year old. */
export function ShortVsLongTermExplainer() {
  const [day, setDay] = useState(TODAY);
  const s = useMemo(() => termState(termDate(day)), [day]);
  const spoken = useSettled(summary(s));
  const long = s.term === "long";

  return (
    <ExplainerFrame
      label="Short-term versus long-term calculator"
      title={
        <>
          {X.qty} {X.lot.symbol} · bought {shortDate(X.lot.acquired)} {X.lot.acquired.slice(0, 4)} · gain {money(s.gain, { whole: true })}
        </>
      }
      hint="Drag the sale date, or use the arrow keys"
      spoken={spoken}
    >
      <DayScrubber
        days={X.calendarDays}
        value={day}
        onChange={setDay}
        dateOf={termDate}
        label="Sale date"
        valueText={`${shortDate(s.saleDate)}, held ${s.daysHeld} days, ${s.term}-term`}
        markerLabel={`sell ${shortDate(s.saleDate)}`}
      >
        {(pct) => (
          <>
            {/* the long-term side of the line */}
            <div className="absolute top-8 right-0 h-20 rounded-[3px] bg-[color-mix(in_oklch,var(--longterm)_10%,transparent)]" style={{ left: `${pct(LT_DAY)}%` }} />
            <span className="num absolute top-1 text-[12px] whitespace-nowrap text-muted" style={{ left: `calc(${pct(LT_DAY)}% + 8px)` }}>
              long-term
            </span>
            <span className="num absolute top-1 -translate-x-full text-[12px] whitespace-nowrap text-muted" style={{ left: `calc(${pct(LT_DAY)}% - 8px)` }}>
              short-term
            </span>
            <StripEvent at={pct(LT_DAY)} className="bg-longterm" />
            <div aria-hidden className="absolute top-[7rem] h-3 w-px -translate-x-1/2 bg-muted" style={{ left: `${pct(TODAY)}%` }} />
            {/* left of its tick, so the marker line never runs through it */}
            <span aria-hidden className="num absolute top-[5.4rem] -translate-x-full pr-2 text-[12px] text-muted" style={{ left: `${pct(TODAY)}%` }}>
              today
            </span>
          </>
        )}
      </DayScrubber>

      <div className="border-t border-border px-5 py-8 sm:px-8">
        <div className="num flex h-8 items-center justify-between text-meta">
          <span className="text-muted">Estimated tax</span>
          <span className={cn("transition-opacity duration-(--motion-fast)", long ? "text-fg opacity-100" : "opacity-0")}>
            waiting saved {money(CLIFF.save, { whole: true })}
          </span>
        </div>
        <TaxBar value={s.estTax} max={MAX_TAX} ghost className="mt-2" color={long ? "var(--longterm)" : undefined} />
        <div className="num mt-2 flex h-8 items-center justify-between text-[12px] text-muted">
          <span>$0</span>
          <span>{money(MAX_TAX, { whole: true })} at the short-term rate</span>
        </div>
      </div>

      <Readouts>
        <Readout label="Days held">
          <MoneyTween value={s.daysHeld} format={formatInt} />
        </Readout>
        <Readout label="Term">
          <span className="inline-flex items-center gap-2">
            {long && <span className="inline-block h-3.5 w-0.5 rounded-full bg-longterm" />}
            {long ? "Long" : "Short"}
          </span>
        </Readout>
        <Readout label="Rate">
          <MoneyTween value={s.rate * 100} format={(n) => `${Math.round(n)}%`} />
        </Readout>
        <Readout label="Estimated tax">
          <MoneyTween value={s.estTax} />
        </Readout>
      </Readouts>
    </ExplainerFrame>
  );
}
