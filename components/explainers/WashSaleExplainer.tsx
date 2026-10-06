"use client";

import { motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { LedgerRules } from "@/components/ledger/LedgerRules";
import { Chip } from "@/components/ui/Chip";
import { Marker } from "@/components/ui/Marker";
import { Hatch } from "@/components/viz/Hatch";
import { MoneyTween } from "@/components/viz/MoneyTween";
import { cn } from "@/lib/cn";
import { WASH_EXPLAINER as X, calendarDate, calendarDay, washState, type WashState } from "@/lib/demo";
import { money, shortDate } from "@/lib/format";
import { ease, spring } from "@/lib/motion";

const LAST = X.calendarDays - 1;
const SALE_DAY = calendarDay(X.saleDate);
const WINDOW = [calendarDay(X.windowStart), calendarDay(X.windowEnd)] as const;
const MONTH_STARTS = Array.from({ length: X.calendarDays }, (_, d) => d).filter((d) => calendarDate(d).endsWith("-01"));
const pct = (day: number) => (day / LAST) * 100;
const clampDay = (d: number) => Math.min(LAST, Math.max(0, Math.round(d)));

/** The chip lands, then the new lot's numbers move (§5). */
const LAND_AFTER = 0.55;
const LOSS = washState(X.defaultRebuy).loss;
const PURCHASE = X.rebuyPrice * X.qty;
const MAX_BASIS = PURCHASE - LOSS;

/** Holding-period strip under the new lot: from just before the old lot was bought to the calendar's end. */
const HOLD_FROM = calendarDay(X.lot.acquired) - 10;
const HOLD_SPAN = LAST - HOLD_FROM;
const holdPct = (day: number) => ((day - HOLD_FROM) / HOLD_SPAN) * 100;

const dayText = (n: number) => shortDate(calendarDate(Math.round(n)));

function summary(s: WashState) {
  const when = `Buying back on ${shortDate(s.rebuyDate)}`;
  return s.inWindow
    ? `${when} is inside the wash-sale window. The ${money(-s.loss, { whole: true })} loss is disallowed and added to the new shares' basis, now ${money(s.newBasis, { whole: true })}. Their holding period starts ${shortDate(s.holdingStart)}.`
    : `${when} is outside the wash-sale window. The ${money(-s.loss, { whole: true })} loss is deductible this year. The new shares' basis is ${money(s.newBasis, { whole: true })} and their holding period starts ${shortDate(s.holdingStart)}.`;
}

/**
 * The flagship explainer (§5): drag a buy-back date along a calendar around a loss sale. Inside
 * the 61-day window the loss chip flies out of "Deductible" into the new lot, whose basis tweens
 * up and whose holding start slides earlier. All numbers come from the engine.
 */
export function WashSaleExplainer() {
  const [day, setDay] = useState(() => calendarDay(X.defaultRebuy));
  const state = useMemo(() => washState(calendarDate(day)), [day]);
  const reduce = useReducedMotion();

  // The lot's readouts follow the chip: when the date crosses the window edge they wait for it to land.
  const [shown, setShown] = useState(state);
  useEffect(() => {
    if (reduce || shown.inWindow === state.inWindow) {
      setShown(state);
      return;
    }
    const id = window.setTimeout(() => setShown(state), LAND_AFTER * 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, reduce]);

  // Screen readers get one sentence once the marker settles, not one per day dragged.
  const [spoken, setSpoken] = useState(() => summary(state));
  useEffect(() => {
    const id = window.setTimeout(() => setSpoken(summary(state)), 450);
    return () => clearTimeout(id);
  }, [state]);

  return (
    <figure className="breakout not-prose my-16" aria-label="Wash sale calculator">
      <div className="relative overflow-hidden rounded-md border border-border bg-surface">
        <LedgerRules margin={false} />
        <div className="relative">
          <header className="num flex min-h-16 flex-wrap items-center justify-between gap-x-6 gap-y-1 px-5 py-4 text-meta sm:px-8">
            <span className="text-fg">
              Sell {X.qty} {X.lot.symbol} · {shortDate(X.saleDate)} · <span className="text-loss">{money(LOSS, { whole: true })}</span> loss
            </span>
            <span className="text-muted">Drag the buy-back date, or use the arrow keys</span>
          </header>

          <Calendar day={day} setDay={setDay} state={state} />

          <Buckets state={state} shown={shown} />

          <Readouts state={shown} />
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {spoken}
      </p>
    </figure>
  );
}

/* ───────────────────────────────── Calendar ───────────────────────────────── */

function Calendar({ day, setDay, state }: { day: number; setDay: (d: number) => void; state: WashState }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const dayAt = useCallback((clientX: number) => {
    const r = trackRef.current!.getBoundingClientRect();
    return clampDay(((clientX - r.left) / r.width) * LAST);
  }, []);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDay(dayAt(e.clientX));
    handleRef.current?.focus({ preventScroll: true });
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging.current) setDay(dayAt(e.clientX));
  };
  const onPointerUp = () => {
    dragging.current = false;
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 7 : 1;
    const next =
      e.key === "ArrowRight" || e.key === "ArrowUp" ? day + step
      : e.key === "ArrowLeft" || e.key === "ArrowDown" ? day - step
      : e.key === "PageUp" ? day + 7
      : e.key === "PageDown" ? day - 7
      : e.key === "Home" ? 0
      : e.key === "End" ? LAST
      : null;
    if (next === null) return;
    e.preventDefault();
    setDay(clampDay(next));
  };

  const label = `${shortDate(state.rebuyDate)}, ${state.inWindow ? "inside" : "outside"} the wash-sale window`;
  const nearRight = day > LAST - 12;
  const nearLeft = day < 12;

  return (
    <div className="px-5 pt-8 pb-4 sm:px-8">
      <div
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative h-40 cursor-ew-resize touch-pan-y select-none"
      >
        {/* 61-day window */}
        <div className="absolute top-8 h-20" style={{ left: `${pct(WINDOW[0])}%`, width: `${pct(WINDOW[1]) - pct(WINDOW[0])}%` }}>
          <Hatch variant="wash" as="div" className="size-full rounded-[3px]" />
          <span className="num absolute -top-7 left-0 text-[12px] whitespace-nowrap text-muted">
            61-day<span className="max-sm:hidden"> window · {shortDate(X.windowStart)} – {shortDate(X.windowEnd)}</span>
          </span>
        </div>

        {/* axis + day ticks */}
        <div aria-hidden className="absolute inset-x-0 top-28 h-px bg-border" />
        {Array.from({ length: X.calendarDays }, (_, d) => (
          <span
            key={d}
            aria-hidden
            className={cn("absolute top-28 w-px", MONTH_STARTS.includes(d) ? "h-3 bg-muted" : "h-1.5 bg-border")}
            style={{ left: `${pct(d)}%` }}
          />
        ))}
        {MONTH_STARTS.map((d) => (
          <span key={d} aria-hidden className="num absolute top-32 -translate-x-1/2 text-[12px] text-muted" style={{ left: `${pct(d)}%` }}>
            {shortDate(calendarDate(d)).split(" ")[0]}
          </span>
        ))}

        {/* the loss sale */}
        <div aria-hidden className="absolute top-6 h-[5.5rem] w-0.5 -translate-x-1/2 rounded-full bg-loss" style={{ left: `${pct(SALE_DAY)}%` }} />
        <span aria-hidden className="num absolute top-0 -translate-x-1/2 text-[12px] whitespace-nowrap text-fg" style={{ left: `${pct(SALE_DAY)}%` }}>
          sale
        </span>

        {/* the buy-back marker: a full-width layer moved by transform, so dragging never touches layout */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          initial={false}
          animate={{ x: `${pct(day)}%` }}
          transition={{ type: "spring", stiffness: 900, damping: 60, mass: 0.6 }}
        >
          <div className="absolute top-10 left-0 h-[4.5rem] w-px -translate-x-1/2 bg-fg" />
          <span
            className={cn(
              "num absolute top-[8.75rem] text-[12px] whitespace-nowrap text-fg",
              nearRight ? "-translate-x-full" : nearLeft ? "" : "-translate-x-1/2",
            )}
          >
            buy back {shortDate(state.rebuyDate)}
          </span>
        </motion.div>
        <motion.div
          className="pointer-events-none absolute inset-0"
          initial={false}
          animate={{ x: `${pct(day)}%` }}
          transition={{ type: "spring", stiffness: 900, damping: 60, mass: 0.6 }}
        >
          <div
            ref={handleRef}
            role="slider"
            tabIndex={0}
            aria-label="Buy-back date"
            aria-valuemin={0}
            aria-valuemax={LAST}
            aria-valuenow={day}
            aria-valuetext={label}
            aria-orientation="horizontal"
            onKeyDown={onKeyDown}
            className="group pointer-events-auto absolute top-28 left-0 grid size-11 -translate-1/2 cursor-grab touch-none place-items-center rounded-full outline-none active:cursor-grabbing"
          >
            <span className="size-[18px] rounded-full border-2 border-fg bg-surface shadow-[0_0_0_3px_var(--surface)] transition-transform duration-(--motion-fast) ease-ui group-hover:scale-110 group-focus-visible:outline-2 group-focus-visible:outline-offset-3 group-focus-visible:outline-accent group-active:scale-125" />
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/* ───────────────────────────────── Buckets ───────────────────────────────── */

type Point = { x: number; y: number };

function Buckets({ state, shown }: { state: WashState; shown: WashState }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const dedRef = useRef<HTMLDivElement>(null);
  const lotRef = useRef<HTMLDivElement>(null);
  const lotRefPhone = useRef<HTMLDivElement>(null);
  const [slots, setSlots] = useState<{ ded: Point; lot: Point } | null>(null);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const measure = () => {
      const b = box.getBoundingClientRect();
      const at = (...els: (HTMLElement | null)[]): Point => {
        // the first slot that is laid out (the lot's slot moves under the bars on phones)
        const r = els.map((el) => el?.getBoundingClientRect()).find((rect) => rect && rect.width > 0)!;
        return { x: r.left - b.left + r.width / 2, y: r.top - b.top + r.height / 2 };
      };
      setSlots({ ded: at(dedRef.current), lot: at(lotRef.current, lotRefPhone.current) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    return () => ro.disconnect();
  }, []);

  const target = slots && (state.inWindow ? slots.lot : slots.ded);
  const lift = slots ? Math.min(slots.ded.y, slots.lot.y) - 44 : 0;

  return (
    <div ref={boxRef} className="relative grid gap-6 border-t border-border px-5 py-8 sm:px-8 md:grid-cols-12 md:gap-8">
      {/* Deductible this year */}
      <div className="md:col-span-4">
        <BucketLabel>Deductible this year</BucketLabel>
        <div className="mt-2 flex h-24 items-center justify-center rounded-md border border-border bg-bg">
          <div ref={dedRef} className="grid h-7 w-36 place-items-center rounded-pill border border-dashed border-border">
            <span className={cn("num text-[12px] text-muted transition-opacity duration-(--motion-fast)", state.inWindow ? "opacity-100" : "opacity-0")}>
              nothing this year
            </span>
          </div>
        </div>
      </div>

      {/* New lot */}
      <div className="min-w-0 md:col-span-8">
        <BucketLabel>
          New lot · {X.qty} {X.lot.symbol} bought {shortDate(state.rebuyDate)}
        </BucketLabel>
        <div className="mt-2 rounded-md border border-border bg-bg px-4 py-4">
          <div className="flex items-center gap-4">
            <span className="num w-24 shrink-0 text-meta text-muted">basis</span>
            <LotBar disallowed={shown.disallowed} />
            <div ref={lotRef} className="h-7 w-36 shrink-0 max-sm:hidden" />
          </div>
          <div className="mt-3 flex items-center gap-4">
            <span className="num w-24 shrink-0 text-meta text-muted">held since</span>
            <HoldingStrip state={shown} />
            <Carried state={shown} className="w-36 shrink-0 max-sm:hidden" />
          </div>
          {/* phones: the chip lands under the bars */}
          <div className="mt-3 flex h-7 items-center justify-between gap-4 sm:hidden">
            <div ref={lotRefPhone} className="h-7 w-36" />
            <Carried state={shown} className="text-right" />
          </div>
        </div>
      </div>

      {target && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute top-0 left-0"
          initial={{ x: target.x, y: target.y }}
          animate={{ x: [null, target.x], y: [null, lift, target.y] }}
          transition={{ duration: 0.7, ease: ease.settle, y: { duration: 0.7, times: [0, 0.4, 1], ease: ["easeOut", ease.settle] } }}
        >
          <div className="-translate-1/2">
            <Chip tone="loss">{money(LOSS, { whole: true })} loss</Chip>
          </div>
        </motion.div>
      )}
    </div>
  );
}

/** How much of the old lot's holding period the new shares inherit. */
function Carried({ state, className }: { state: WashState; className?: string }) {
  const days = calendarDay(state.rebuyDate) - calendarDay(state.holdingStart);
  return (
    <span className={cn("num text-[12px] whitespace-nowrap text-muted", className)}>
      {days > 0 ? `inherits ${days} days` : "starts fresh"}
    </span>
  );
}

function BucketLabel({ children }: { children: ReactNode }) {
  return <div className="num flex h-8 items-center text-meta text-muted">{children}</div>;
}

/** The new lot as a bar: what was paid, plus the disallowed loss added on when the sale washes. */
function LotBar({ disallowed }: { disallowed: number }) {
  const paid = (PURCHASE / MAX_BASIS) * 100;
  return (
    <div className="relative h-2.5 min-w-0 flex-1">
      <span className="absolute inset-y-0 left-0 rounded-l-full bg-[color-mix(in_oklch,var(--fg)_45%,transparent)]" style={{ width: `${paid}%` }} />
      <motion.span
        className="absolute inset-y-0 origin-left rounded-r-full bg-loss"
        style={{ left: `calc(${paid}% + 1px)`, right: 0 }}
        initial={false}
        animate={{ scaleX: disallowed > 0 ? 1 : 0 }}
        transition={spring.paper}
      />
    </div>
  );
}

/** Where the new shares' holding period starts, on a strip running back to the old lot's purchase. */
function HoldingStrip({ state }: { state: WashState }) {
  const start = holdPct(calendarDay(state.holdingStart));
  const end = holdPct(calendarDay(state.rebuyDate));
  return (
    <div className="relative h-7 min-w-0 flex-1">
      <span className="absolute inset-x-0 top-1/2 h-px bg-border" />
      <motion.span
        className="absolute inset-y-0 left-0 w-full"
        initial={false}
        animate={{ x: `${start}%` }}
        transition={spring.paper}
      >
        <span className="absolute top-1/2 left-0 h-2.5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg" />
      </motion.span>
      <motion.span
        className="absolute top-1/2 left-0 h-1 w-full origin-left -translate-y-1/2 rounded-full bg-[color-mix(in_oklch,var(--fg)_45%,transparent)]"
        initial={false}
        animate={{ x: `${start}%`, scaleX: Math.max(0, end - start) / 100 }}
        transition={spring.paper}
      />
    </div>
  );
}

/* ───────────────────────────────── Readouts ───────────────────────────────── */

function Readouts({ state }: { state: WashState }) {
  const holdingDay = calendarDay(state.holdingStart);
  return (
    <dl className="grid grid-cols-2 border-t border-border md:grid-cols-4">
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
        <MoneyTween value={holdingDay} format={dayText} />
      </Readout>
    </dl>
  );
}

function Readout({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-border px-5 py-4 not-last:border-r max-md:[&:nth-child(2)]:border-r-0 max-md:[&:nth-child(-n+2)]:border-b sm:px-8">
      <dt className="num flex h-8 items-center text-meta text-muted">{label}</dt>
      <dd className="num flex h-8 items-center text-[20px] whitespace-nowrap text-fg">{children}</dd>
    </div>
  );
}
