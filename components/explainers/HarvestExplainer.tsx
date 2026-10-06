"use client";

import { m } from "motion/react";
import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Marker } from "@/components/ui/Marker";
import { MoneyTween, formatInt } from "@/components/viz/MoneyTween";
import { cn } from "@/lib/cn";
import { harvestLots, harvestTotals, type HarvestLot } from "@/lib/demo";
import { money, shortDate } from "@/lib/format";
import { spring } from "@/lib/motion";
import { ExplainerFrame, Readout, Readouts, useSettled } from "./parts";

const LOTS_ = harvestLots();
const HARVESTABLE = LOTS_.filter((l) => l.kind === "harvest");
const BLOCKED = LOTS_.find((l): l is Extract<HarvestLot, { kind: "blocked" }> => l.kind === "blocked")!;
const whole = (n: number) => money(n, { whole: true });

function summary(picked: string[]) {
  const t = harvestTotals(picked);
  const lead =
    t.count === 0
      ? "No lots harvested yet."
      : `Harvested ${t.count} of ${HARVESTABLE.length} losing lots: ${money(-t.losses)} of losses, saving about ${money(t.saved)} in tax.`;
  return `${lead} ${BLOCKED.symbol} is blocked: selling it now would be a wash sale. It's safe from ${shortDate(BLOCKED.safeFrom)}.`;
}

/** §5 tax-loss-harvesting: click losing lots to harvest them; the blocked lot shows its first safe day. */
export function HarvestExplainer() {
  const [picked, setPicked] = useState<string[]>([]);
  const totals = useMemo(() => harvestTotals(picked), [picked]);
  const spoken = useSettled(summary(picked), 250);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  // Arrow keys move between lots, like a grid of cells.
  const onKeyDown = (e: KeyboardEvent, i: number) => {
    const cols = window.matchMedia("(min-width: 1024px)").matches ? 5 : window.matchMedia("(min-width: 640px)").matches ? 3 : 2;
    const to = { ArrowRight: i + 1, ArrowLeft: i - 1, ArrowDown: i + cols, ArrowUp: i - cols, Home: 0, End: LOTS_.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    refs.current[Math.min(LOTS_.length - 1, Math.max(0, to))]?.focus();
  };

  return (
    <ExplainerFrame
      label="Tax-loss harvesting"
      title={<>Open lots · {LOTS_.length} positions · {shortDate("2026-10-15")}</>}
      hint="Click or press Enter to harvest; arrows move between lots"
      controls={
        <>
          <Button size="sm" variant="outline" onClick={() => setPicked(HARVESTABLE.map((l) => l.id))} disabled={picked.length === HARVESTABLE.length}>
            Harvest every safe loss
          </Button>
          <Button size="sm" variant="quiet" onClick={() => setPicked([])} disabled={picked.length === 0}>
            Reset
          </Button>
        </>
      }
      spoken={spoken}
    >
      <ul className="grid grid-cols-2 gap-3 px-5 pt-2 pb-8 sm:grid-cols-3 sm:px-8 lg:grid-cols-5">
        {LOTS_.map((l, i) => (
          <li key={l.id}>
            <LotCell
              lot={l}
              picked={picked.includes(l.id)}
              onClick={() => l.kind === "harvest" && toggle(l.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
              buttonRef={(el) => {
                refs.current[i] = el;
              }}
            />
          </li>
        ))}
      </ul>

      <Readouts>
        <Readout label="Lots harvested">
          <span>
            <MoneyTween value={totals.count} format={formatInt} /> <span className="text-meta text-muted">of {HARVESTABLE.length}</span>
          </span>
        </Readout>
        <Readout label="Losses taken">
          <MoneyTween value={-totals.losses} className={totals.count ? "text-loss" : undefined} />
        </Readout>
        <Readout label="Tax saved">
          <MoneyTween value={totals.saved} className={totals.count ? "text-accent" : undefined} />
        </Readout>
        <Readout label="Blocked">
          <span className="inline-flex items-center gap-2">
            <Marker tone="wash" /> {BLOCKED.symbol} <span className="text-meta text-muted">until {shortDate(BLOCKED.safeFrom)}</span>
          </span>
        </Readout>
      </Readouts>
    </ExplainerFrame>
  );
}

function LotCell({
  lot,
  picked,
  onClick,
  onKeyDown,
  buttonRef,
}: {
  lot: HarvestLot;
  picked: boolean;
  onClick: () => void;
  onKeyDown: (e: KeyboardEvent) => void;
  buttonRef: (el: HTMLButtonElement | null) => void;
}) {
  const status =
    lot.kind === "harvest"
      ? `saves ${whole(lot.saved)}`
      : lot.kind === "blocked"
        ? `safe from ${shortDate(lot.safeFrom)}`
        : "a gain";
  const label =
    lot.kind === "harvest"
      ? `${lot.symbol}, ${lot.account}, down ${money(-lot.pnl)}. ${picked ? "Harvested" : "Harvest"}: saves ${money(lot.saved)}.`
      : lot.kind === "blocked"
        ? `${lot.symbol}, ${lot.account}, down ${money(-lot.pnl)}. Blocked by ${lot.reason}: selling now would disallow ${money(lot.disallowed)}. Safe from ${shortDate(lot.safeFrom)}.`
        : `${lot.symbol}, ${lot.account}, up ${money(lot.pnl)}. A gain, nothing to harvest.`;

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      onKeyDown={onKeyDown}
      aria-pressed={lot.kind === "harvest" ? picked : undefined}
      aria-disabled={lot.kind !== "harvest" || undefined}
      aria-label={label}
      className={cn(
        "group relative isolate flex h-36 w-full flex-col justify-between rounded-md border bg-bg p-3 text-left transition-transform duration-(--motion-fast) ease-ui is-active:scale-[0.98]",
        lot.kind === "gain" ? "cursor-default border-border opacity-55" : "cursor-pointer border-border",
      )}
    >
      {/* picked: emerald hairline and wash of colour, faded in (opacity only) */}
      <m.span
        aria-hidden
        className="absolute -inset-px -z-10 rounded-[inherit] border border-accent bg-[color-mix(in_oklch,var(--accent)_10%,transparent)]"
        initial={false}
        animate={{ opacity: picked ? 1 : 0 }}
        transition={{ duration: 0.16 }}
      />
      {lot.kind !== "gain" && (
        <span aria-hidden className="absolute inset-0 -z-10 rounded-[inherit] opacity-0 shadow-[inset_0_0_0_1px_var(--rule-strong)] transition-opacity duration-(--motion-fast) ease-ui group-is-hover:opacity-100" />
      )}
      <span aria-hidden className="flex items-start justify-between gap-2">
        <span>
          <span className="num block text-[17px] leading-6 text-fg">{lot.symbol}</span>
          <span className="num block text-[12px] leading-5 text-muted">
            <span className="max-sm:hidden">{lot.account}</span>
            <span className="sm:hidden">{lot.account.replace("Brokerage ", "")}</span>
          </span>
        </span>
        {lot.kind === "blocked" && <Marker tone="wash" className="mt-1.5" />}
        {lot.kind === "harvest" && (
          <m.svg viewBox="0 0 12 12" className="mt-1 size-3.5" initial={false} animate={{ opacity: picked ? 1 : 0, scale: picked ? 1 : 0.5 }} transition={spring.paper}>
            <path d="M2.5 6.5l2.2 2.2L9.5 3.8" fill="none" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </m.svg>
        )}
      </span>
      <span aria-hidden>
        <span className={cn("num block text-[15px] leading-6", lot.pnl < 0 ? "text-loss" : "text-fg")}>
          {lot.pnl < 0 ? "" : "+"}
          {money(lot.pnl, { whole: true })}
        </span>
        <span className="num block text-[12px] leading-5 text-muted">{status}</span>
        {lot.kind === "blocked" && <span className="num block text-[12px] leading-5 text-muted">wash if sold now</span>}
      </span>
    </button>
  );
}
