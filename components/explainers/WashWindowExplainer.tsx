"use client";

import { m, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Chip } from "@/components/ui/Chip";
import { Marker } from "@/components/ui/Marker";
import { Segmented } from "@/components/ui/Segmented";
import { Hatch } from "@/components/viz/Hatch";
import { MoneyTween } from "@/components/viz/MoneyTween";
import { cn } from "@/lib/cn";
import { WASH_SCENARIOS, account, scenarioDate, scenarioDay, washOutcome, type AccountId, type WashScenario, type WashState } from "@/lib/demo";
import { money, shortDate } from "@/lib/format";
import { ease, spring } from "@/lib/motion";
import { DayScrubber, StripEvent } from "./DayScrubber";
import { ExplainerFrame, Readout, Readouts, useSettled } from "./parts";

/** The chip lands, then the new lot's numbers move (§5). */
const LAND_AFTER = 0.55;

function derive(S: WashScenario) {
  const last = S.calendarDays - 1;
  const loss = washOutcome(S, S.defaultDate).loss;
  const purchase = S.purchase.price * S.purchase.qty;
  const holdFrom = scenarioDay(S, S.lot.acquired) - 10;
  return {
    S,
    loss,
    purchase,
    maxBasis: purchase - loss,
    saleDay: scenarioDay(S, S.saleDate),
    window: [scenarioDay(S, S.windowStart), scenarioDay(S, S.windowEnd)] as const,
    holdPct: (day: number) => ((day - holdFrom) / (last - holdFrom)) * 100,
    hasIra: S.accounts.some((id) => account(id).isIra),
    dayText: (n: number) => shortDate(scenarioDate(S, Math.round(n))),
    date: (day: number) => scenarioDate(S, day),
  };
}
type Derived = ReturnType<typeof derive>;

function summary(d: Derived, s: WashState) {
  const amount = money(-s.loss, { whole: true });
  const where = d.S.accounts.length > 1 ? ` in ${account(s.account).name}` : "";
  const when = `Buying ${d.S.purchase.what}${where} on ${shortDate(s.rebuyDate)}`;
  if (s.where === "deductible")
    return `${when} is outside the wash-sale window. The ${amount} loss is deductible this year.`;
  if (s.where === "gone")
    return `${when} is inside the wash-sale window, and the IRA can't carry the loss. The ${amount} loss is disallowed for good: it isn't deductible and isn't added to any basis.`;
  return `${when} is inside the wash-sale window. The ${amount} loss is disallowed and added to the new basis, now ${money(s.newBasis, { whole: true })}. Its holding period starts ${shortDate(s.holdingStart)}.`;
}

/**
 * Drag a purchase date along a calendar around a loss sale (§5). Inside the 61-day window the loss
 * chip flies out of "Deductible" into the new lot (basis up, holding start earlier) or, if the
 * purchase is in an IRA, into "Gone for good". Every number comes from the engine.
 */
export function WashWindowExplainer({
  scenario,
  readouts = "wash",
  chipMarker = false,
}: {
  scenario: WashScenario["id"];
  readouts?: "wash" | "ira";
  /** Draw the dragged purchase as a chip ("2 NVDA calls · Oct 3") instead of a text label. */
  chipMarker?: boolean;
}) {
  const d = useMemo(() => derive(WASH_SCENARIOS[scenario]), [scenario]);
  const { S } = d;
  const [day, setDay] = useState(() => scenarioDay(S, S.defaultDate));
  const [acct, setAcct] = useState<AccountId>(S.defaultAccount);
  const state = useMemo(() => washOutcome(S, d.date(day), acct), [S, d, day, acct]);
  const reduce = useReducedMotion();

  // The lot's readouts follow the chip: when the loss changes bucket they wait for it to land.
  const [shown, setShown] = useState(state);
  useEffect(() => {
    if (reduce || shown.where === state.where) {
      setShown(state);
      return;
    }
    const id = window.setTimeout(() => setShown(state), LAND_AFTER * 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, reduce]);

  const spoken = useSettled(summary(d, state));
  const accountOptions = S.accounts.map((id) => ({ value: id, label: account(id).name }));

  return (
    <ExplainerFrame
      label="Wash sale calculator"
      title={
        <>
          Sell {S.qty} {S.lot.symbol} · {shortDate(S.saleDate)} · <span className="text-loss">{money(d.loss, { whole: true })}</span> loss
        </>
      }
      hint="Drag the purchase date, or use the arrow keys"
      controls={
        S.accounts.length > 1 ? (
          <>
            <span className="num text-meta text-muted">Buy back in</span>
            <Segmented label="Buy back in" options={accountOptions} value={acct} onChange={setAcct} />
          </>
        ) : undefined
      }
      spoken={spoken}
    >
      <DayScrubber
        days={S.calendarDays}
        value={day}
        onChange={setDay}
        dateOf={d.date}
        label={`${S.purchase.verb === "buy back" ? "Buy-back" : "Purchase"} date`}
        valueText={`${shortDate(state.rebuyDate)}, ${state.inWindow ? "inside" : "outside"} the wash-sale window`}
        markerLabel={
          chipMarker ? (
            <Chip tone="neutral" className="-mt-1.5 bg-surface">
              {S.purchase.what} · {shortDate(state.rebuyDate)}
            </Chip>
          ) : (
            `${S.purchase.verb} ${shortDate(state.rebuyDate)}`
          )
        }
      >
        {(pct) => (
          <>
            <WindowBand d={d} pct={pct} />
            <StripEvent at={pct(d.saleDay)} className="bg-loss" label="sale" />
          </>
        )}
      </DayScrubber>
      <Buckets d={d} state={state} shown={shown} />
      {readouts === "ira" ? <IraReadouts state={shown} /> : <WashReadouts d={d} state={shown} />}
    </ExplainerFrame>
  );
}

/** The 61-day window, hatched, with its dates. */
function WindowBand({ d, pct }: { d: Derived; pct: (day: number) => number }) {
  const [a, b] = d.window;
  return (
    <div className="absolute top-8 h-20" style={{ left: `${pct(a)}%`, width: `${pct(b) - pct(a)}%` }}>
      <Hatch variant="wash" as="div" className="size-full rounded-[3px]" />
      <span className="num absolute -top-7 left-0 text-[12px] whitespace-nowrap text-muted">
        61-day<span className="max-sm:hidden"> window · {shortDate(d.S.windowStart)} – {shortDate(d.S.windowEnd)}</span>
      </span>
    </div>
  );
}

/* ───────────────────────────────── Buckets ───────────────────────────────── */

type Point = { x: number; y: number };
type Slots = Record<WashState["where"], Point>;

function Buckets({ d, state, shown }: { d: Derived; state: WashState; shown: WashState }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const dedRef = useRef<HTMLDivElement>(null);
  const lotRef = useRef<HTMLDivElement>(null);
  const lotRefPhone = useRef<HTMLDivElement>(null);
  const goneRef = useRef<HTMLDivElement>(null);
  const [slots, setSlots] = useState<Slots | null>(null);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const measure = () => {
      const b = box.getBoundingClientRect();
      const at = (...els: (HTMLElement | null)[]): Point => {
        // the first slot that is laid out (the lot's slot moves under the bars on phones)
        const r = els.map((el) => el?.getBoundingClientRect()).find((rect) => rect && rect.width > 0) ?? b;
        return { x: r.left - b.left + r.width / 2, y: r.top - b.top + r.height / 2 };
      };
      setSlots({ deductible: at(dedRef.current), lot: at(lotRef.current, lotRefPhone.current), gone: at(goneRef.current) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    return () => ro.disconnect();
  }, []);

  const target = slots?.[state.where];
  const lift = slots ? Math.min(slots.deductible.y, slots.lot.y, d.hasIra ? slots.gone.y : Infinity) - 44 : 0;
  const lotAccount = d.S.accounts.length > 1 ? ` · ${account(state.account).name}` : "";

  return (
    <div ref={boxRef} className="relative grid gap-6 border-t border-hairline px-5 py-8 sm:px-8 md:grid-cols-12 md:gap-8">
      <div className={d.hasIra ? "md:col-span-3" : "md:col-span-4"}>
        <BucketLabel>Deductible this year</BucketLabel>
        <div className="mt-2 flex h-24 items-center justify-center ring-hairline rounded-[8px] bg-bg">
          <div ref={dedRef} className="grid h-7 w-36 place-items-center rounded-pill border border-dashed border-border">
            <span className={cn("num text-[12px] text-muted transition-opacity duration-(--motion-fast)", state.where !== "deductible" ? "opacity-100" : "opacity-0")}>
              nothing this year
            </span>
          </div>
        </div>
      </div>

      <div className={cn("min-w-0", d.hasIra ? "md:col-span-6" : "md:col-span-8")}>
        <BucketLabel>
          New lot · {d.S.purchase.what}
          {lotAccount} · {shortDate(state.rebuyDate)}
        </BucketLabel>
        <div className="mt-2 ring-hairline rounded-[8px] bg-bg px-4 py-4">
          <div className="flex items-center gap-4">
            <span className="num w-20 shrink-0 text-meta text-muted">basis</span>
            <LotBar d={d} added={shown.where === "lot" ? shown.disallowed : 0} />
            <div ref={lotRef} className="h-7 w-36 shrink-0 max-sm:hidden" />
          </div>
          <div className="mt-3 flex items-center gap-4">
            <span className="num w-20 shrink-0 text-meta text-muted">held since</span>
            <HoldingStrip d={d} state={shown} />
            <Carried d={d} state={shown} className="w-36 shrink-0 max-sm:hidden" />
          </div>
          {/* phones: the chip lands under the bars */}
          <div className="mt-3 flex h-7 items-center justify-between gap-4 sm:hidden">
            <div ref={lotRefPhone} className="h-7 w-36" />
            <Carried d={d} state={shown} className="text-right" />
          </div>
        </div>
      </div>

      {d.hasIra && (
        <div className="md:col-span-3">
          <BucketLabel>Gone for good</BucketLabel>
          <div className="mt-2 flex h-24 items-end justify-center rounded-b-[28px] border border-t-0 border-dashed border-[color-mix(in_oklch,var(--loss)_45%,transparent)] bg-[color-mix(in_oklch,var(--loss)_6%,transparent)] pb-4">
            <div ref={goneRef} className="h-7 w-36" />
          </div>
        </div>
      )}

      {target && (
        <m.div
          aria-hidden
          className="pointer-events-none absolute top-0 left-0"
          initial={{ x: target.x, y: target.y }}
          animate={{ x: [null, target.x], y: [null, lift, target.y] }}
          transition={{ duration: 0.7, ease: ease.settle, y: { duration: 0.7, times: [0, 0.4, 1], ease: ["easeOut", ease.settle] } }}
        >
          <m.div className="-translate-1/2" initial={false} animate={{ opacity: state.where === "gone" ? 0.55 : 1 }} transition={{ duration: 0.3, delay: state.where === "gone" ? LAND_AFTER : 0 }}>
            <Chip tone="loss">{money(d.loss, { whole: true })} loss</Chip>
          </m.div>
        </m.div>
      )}
    </div>
  );
}

/** How much of the old lot's holding period the new purchase inherits. */
function Carried({ d, state, className }: { d: Derived; state: WashState; className?: string }) {
  const days = scenarioDay(d.S, state.rebuyDate) - scenarioDay(d.S, state.holdingStart);
  return (
    <span className={cn("num text-[12px] whitespace-nowrap text-muted", className)}>
      {days > 0 ? `inherits ${days} days` : "starts fresh"}
    </span>
  );
}

function BucketLabel({ children }: { children: ReactNode }) {
  return <div className="num flex h-8 items-center truncate text-meta text-muted">{children}</div>;
}

/** The new lot as a bar: what was paid, plus the disallowed loss added on when the sale washes. */
function LotBar({ d, added }: { d: Derived; added: number }) {
  const paid = (d.purchase / d.maxBasis) * 100;
  return (
    <div className="relative h-2.5 min-w-0 flex-1">
      <span className="absolute inset-y-0 left-0 rounded-l-full bg-[color-mix(in_oklch,var(--fg)_45%,transparent)]" style={{ width: `${paid}%` }} />
      <m.span
        className="absolute inset-y-0 origin-left rounded-r-full bg-loss"
        style={{ left: `calc(${paid}% + 1px)`, right: 0 }}
        initial={false}
        animate={{ scaleX: added > 0 ? 1 : 0 }}
        transition={spring.paper}
      />
    </div>
  );
}

/** Where the new purchase's holding period starts, on a strip running back to the old lot's purchase. */
function HoldingStrip({ d, state }: { d: Derived; state: WashState }) {
  const start = d.holdPct(scenarioDay(d.S, state.holdingStart));
  const end = d.holdPct(scenarioDay(d.S, state.rebuyDate));
  return (
    <div className="relative h-7 min-w-0 flex-1">
      <span className="absolute inset-x-0 top-1/2 h-px bg-border" />
      <m.span className="absolute inset-y-0 left-0 w-full" initial={false} animate={{ x: `${start}%` }} transition={spring.paper}>
        <span className="absolute top-1/2 left-0 h-2.5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg" />
      </m.span>
      <m.span
        className="absolute top-1/2 left-0 h-1 w-full origin-left -translate-y-1/2 rounded-full bg-[color-mix(in_oklch,var(--fg)_45%,transparent)]"
        initial={false}
        animate={{ x: `${start}%`, scaleX: Math.max(0, end - start) / 100 }}
        transition={spring.paper}
      />
    </div>
  );
}

/* ───────────────────────────────── Readouts ───────────────────────────────── */

function WashReadouts({ d, state }: { d: Derived; state: WashState }) {
  return (
    <Readouts>
      <Readout label="Loss">
        <MoneyTween value={state.loss} className="text-loss" />
      </Readout>
      <Readout label="Disallowed">
        <span className="inline-flex items-center gap-2">
          <MoneyTween value={state.disallowed} />
          <Marker tone="wash" className={cn("transition-opacity duration-(--motion-fast)", state.disallowed ? "opacity-100" : "opacity-0")} />
        </span>
      </Readout>
      <Readout label="New lot's basis">
        <MoneyTween value={state.newBasis} />
      </Readout>
      <Readout label="Holding start">
        <MoneyTween value={scenarioDay(d.S, state.holdingStart)} format={d.dayText} />
      </Readout>
    </Readouts>
  );
}

/** Where the loss went: this year, a new basis, or nowhere. */
function IraReadouts({ state }: { state: WashState }) {
  return (
    <Readouts>
      <Readout label="Loss">
        <MoneyTween value={state.loss} className="text-loss" />
      </Readout>
      <Readout label="Deductible this year">
        <MoneyTween value={-state.deductible} />
      </Readout>
      <Readout label="Added to new basis">
        <MoneyTween value={state.where === "lot" ? state.disallowed : 0} />
      </Readout>
      <Readout label="Lost for good">
        <MoneyTween value={state.permanent ? state.disallowed : 0} className={state.permanent ? "text-loss" : undefined} />
      </Readout>
    </Readouts>
  );
}
