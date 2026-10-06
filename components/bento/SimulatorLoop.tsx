"use client";

import { cubicBezier, m, useTransform, type MotionValue } from "motion/react";
import type { ReactNode } from "react";
import { SIM_LOT, SIM_PRICE, account, simulatorTable } from "@/lib/demo";
import { money } from "@/lib/format";
import { keyframes, sampleAt, wrap, type Stop } from "@/lib/loop";
import { ease } from "@/lib/motion";

const TABLE = simulatorTable();
const MAX = SIM_LOT.qty;
const PERIOD = 8;
/** All 40 shares on the slider: the full tax hit. */
export const SIMULATOR_POSTER = 3;
/** Drag up, change your mind, try a middle, let go. */
const SCRUB: readonly Stop[] = [[0, 0], [0.4, 0], [2.4, MAX], [3.6, MAX], [4.8, 14], [5.7, 14], [6.5, 26], [7.2, 26], [8, 0]];
const inOut = cubicBezier(...ease.ink);
const THUMB = 14;

export const simulatorSummary = `Scrubbing a sale of up to ${MAX} ${SIM_LOT.symbol} shares at ${money(SIM_PRICE)}: selling all ${MAX} realizes ${money(
  TABLE[MAX].gain,
)} short-term, about ${money(TABLE[MAX].estTax)} in tax.`;

/** A mini trade ticket whose slider scrubs by itself, printing a receipt whose numbers tween along. */
export function SimulatorLoop({ time }: { time: MotionValue<number> }) {
  const shares = useTransform(time, (t) => keyframes(wrap(t, PERIOD), SCRUB, inOut));
  const pick = (f: (r: (typeof TABLE)[number]) => number) => (s: number) => money(sampleAt(TABLE, s, f));

  const count = useTransform(shares, (s) => String(Math.round(s)));
  const fill = useTransform(shares, (s) => s / MAX);
  const thumbX = useTransform(shares, (s) => `${(s / MAX) * 100}%`);
  const proceeds = useTransform(shares, pick((r) => r.proceeds));
  const basis = useTransform(shares, pick((r) => r.proceeds - r.gain));
  const gain = useTransform(shares, pick((r) => r.gain));
  const tax = useTransform(shares, pick((r) => r.estTax));

  return (
    <div className="flex h-full flex-col gap-6 sm:flex-row sm:items-center sm:gap-8">
      {/* Ticket */}
      <div className="relative h-40 w-full min-w-0 rounded-md border border-border bg-bg px-4 sm:max-w-[360px] sm:flex-1">
        <div className="num flex h-8 items-end justify-between text-meta">
          <span className="text-fg">
            {SIM_LOT.symbol} · {SIM_LOT.qty} sh
          </span>
          <span className="text-muted">{account(SIM_LOT.account).name}</span>
        </div>
        <div className="num flex h-8 items-center text-meta text-muted">
          avg {money(SIM_LOT.costPerShare)} · last {money(SIM_PRICE)}
        </div>
        <div className="flex h-8 items-end justify-between">
          <span className="text-[14px] text-fg">Shares to sell</span>
          <span className="num text-meta text-fg">
            <m.span className="inline-block w-[2ch] text-right">{count}</m.span> <span className="text-muted">sh</span>
          </span>
        </div>
        <div className="relative h-8">
          <div className="absolute top-1/2 h-px -translate-y-1/2 bg-border" style={{ left: THUMB / 2, right: THUMB / 2 }} />
          <m.div
            className="absolute top-1/2 -mt-px h-0.5 origin-left rounded-full bg-fg"
            style={{ left: THUMB / 2, right: THUMB / 2, scaleX: fill }}
          />
          <div className="absolute inset-y-0" style={{ left: THUMB / 2, right: THUMB / 2 }}>
            <m.div className="absolute inset-0" style={{ x: thumbX }}>
              <span
                className="absolute top-1/2 -translate-1/2 rounded-full bg-fg shadow-[0_0_0_3px_var(--bg)]"
                style={{ width: THUMB, height: THUMB }}
              />
            </m.div>
          </div>
        </div>
        {/* the slot the receipt prints from */}
        <span className="absolute inset-x-4 bottom-3 h-px rounded-full bg-rule-strong" />
      </div>

      {/* Receipt */}
      <div className="paper-shadow-sm w-full max-w-[320px] shrink-0 -rotate-[1.5deg] self-center sm:w-[320px]">
        <div className="paper paper-fiber perforated num px-5 py-5 text-[12px] leading-6 text-ink">
          <div className="receipt-caps flex justify-between text-[11px] text-ink-muted">
            <span>Pre-trade receipt</span>
            <span>Est.</span>
          </div>
          <div className="receipt-caps">
            Sell <m.span className="inline-block w-[2ch] text-right">{count}</m.span> {SIM_LOT.symbol} @ {SIM_PRICE.toFixed(2)}
          </div>
          <Row label="Proceeds"><m.span>{proceeds}</m.span></Row>
          <Row label="Cost basis"><m.span>{basis}</m.span></Row>
          <Row label="Realized"><m.span className="text-gain-ink">{gain}</m.span></Row>
          <Row label="Term"><span className="receipt-caps">Short</span></Row>
          <span className="my-1.5 block h-[3px] border-y border-ink" />
          <Row label="Est. tax" className="font-medium"><m.span>{tax}</m.span></Row>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={`flex items-end gap-1.5 ${className ?? ""}`}>
      <span>{label}</span>
      <span className="receipt-leader min-w-4 flex-1 self-stretch" />
      <span className="w-[9ch] shrink-0 text-right">{children}</span>
    </div>
  );
}
