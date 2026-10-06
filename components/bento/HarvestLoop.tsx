"use client";

import { cubicBezier, m, useTransform, type MotionValue } from "motion/react";
import { HARVEST_COLS, harvestGrid, type HarvestCell } from "@/lib/demo";
import { money } from "@/lib/format";
import { keyframes, progress, wrap } from "@/lib/loop";
import { ease } from "@/lib/motion";

const CELLS = harvestGrid();
type LossCell = Exclude<HarvestCell, { kind: "hold" }>;
const LOSSES = CELLS.filter((c): c is LossCell => c.kind !== "hold");
const WASH = LOSSES.find((c) => c.kind === "wash")!;
const TOTAL = LOSSES.reduce((s, c) => s + (c.kind === "harvest" ? c.saved : 0), 0);

const PERIOD = 8.4;
const FIRST_FLIP = 0.8;
const FLIP_GAP = 0.7;
const FLIP = 0.45;
/** Everything flips onward (180° → 360°), back to red, before the loop wraps. */
const RESET: [number, number] = [7.4, 8.0];
/** Every lot worked through, the counter full. */
export const HARVEST_POSTER = 6.6;

const settle = cubicBezier(...ease.settle);
const inOut = cubicBezier(...ease.ink);
const flipAt = (order: number) => FIRST_FLIP + order * FLIP_GAP;

export const harvestSummary = `${LOSSES.length - 1} losing lots harvested, saving ${money(TOTAL)} in tax this year; ${WASH.symbol} is skipped because selling it would be a wash sale (${money(
  (WASH as Extract<HarvestCell, { kind: "wash" }>).disallowed,
  { whole: true },
)} disallowed).`;

/** A grid of lots: losing ones flip from red to emerald one by one; one flips to a hatched wash. */
export function HarvestLoop({ time }: { time: MotionValue<number> }) {
  const t = useTransform(time, (v) => wrap(v, PERIOD));
  const saved = useTransform(t, (u) => {
    const back = 1 - progress(u, RESET[0], RESET[1], inOut);
    const sum = LOSSES.reduce((s, c) => (c.kind === "harvest" ? s + c.saved * progress(u, flipAt(c.order), flipAt(c.order) + FLIP, settle) : s), 0);
    return money(sum * back);
  });
  const washNote = useTransform(t, (u) => keyframes(u, [[flipAt(WASH.order) + FLIP * 0.6, 0], [flipAt(WASH.order) + FLIP + 0.2, 1], [RESET[0], 1], [RESET[0] + 0.3, 0]]));

  return (
    <div className="flex flex-col md:flex-row md:items-start md:justify-between md:gap-8">
      <div className="shrink-0">
        <div className="num flex h-8 items-baseline gap-3">
          <m.span className="inline-block w-[7ch] text-[22px] text-accent">{saved}</m.span>
          <span className="text-meta text-muted">saved this year</span>
        </div>
        <m.div className="num flex h-8 items-center gap-2 text-meta text-muted" style={{ opacity: washNote }}>
          <span className="hatch-wash inline-block h-2.5 w-4 rounded-[2px]" />
          {WASH.symbol} skipped: it would wash
        </m.div>
        {/* The key to the grid (md+, where the counter has a column of its own). */}
        <ul className="num mt-8 hidden space-y-3 text-meta text-muted md:block">
          <li className="flex items-center gap-2.5"><span className="size-3 rounded-[3px] bg-loss" />loss, not yet taken</li>
          <li className="flex items-center gap-2.5"><span className="size-3 rounded-[3px] bg-accent" />harvested</li>
          <li className="flex items-center gap-2.5"><span className="hatch-wash size-3 rounded-[3px]" />would wash: skipped</li>
          <li className="flex items-center gap-2.5"><span className="ring-hairline size-3 rounded-[3px] bg-surface-2" />gain: held</li>
        </ul>
      </div>
      {/* Cells scale with the card (up to 48px); the last row runs into the Surface's fade. */}
      <div className="mt-6 grid w-full max-w-[500px] gap-2 sm:gap-3 md:mt-0" style={{ gridTemplateColumns: `repeat(${HARVEST_COLS}, minmax(0, 1fr))` }}>
        {CELLS.map((c, i) =>
          c.kind === "hold" ? (
            <span key={i} className="ring-hairline aspect-square rounded-[6px] bg-surface-2" />
          ) : (
            <Flip key={i} cell={c} t={t} />
          ),
        )}
      </div>
    </div>
  );
}

function Flip({ cell, t }: { cell: LossCell; t: MotionValue<number> }) {
  const start = flipAt(cell.order);
  const rotateY = useTransform(t, (u) => keyframes(u, [[start, 0], [start + FLIP, 180], [RESET[0], 180], [RESET[1], 360]], inOut));
  return (
    <span className="relative aspect-square [perspective:240px]">
      <m.span className="absolute inset-0 [transform-style:preserve-3d]" style={{ rotateY }}>
        <span className="absolute inset-0 rounded-[6px] bg-loss [backface-visibility:hidden]" />
        <span
          className={
            cell.kind === "wash"
              ? "hatch-wash absolute inset-0 rounded-[6px] border border-wash [backface-visibility:hidden] [transform:rotateY(180deg)]"
              : "absolute inset-0 rounded-[6px] bg-accent [backface-visibility:hidden] [transform:rotateY(180deg)]"
          }
        />
      </m.span>
    </span>
  );
}
