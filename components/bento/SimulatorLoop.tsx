"use client";

import { cubicBezier, m, useTransform, type MotionValue } from "motion/react";
import type { ReactNode } from "react";
import { Barcode } from "@/components/receipt/Barcode";
import { SIM_LOT, SIM_PRICE, account, receiptSerial, simulatorTable } from "@/lib/demo";
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
const THUMB = 16;

export const simulatorSummary = `Scrubbing a sale of up to ${MAX} ${SIM_LOT.symbol} shares at ${money(SIM_PRICE)}: selling all ${MAX} realizes ${money(
  TABLE[MAX].gain,
)} short-term, about ${money(TABLE[MAX].estTax)} in tax.`;

/**
 * A mini trade ticket whose slider scrubs by itself, beside the receipt it prints. The receipt sits
 * a little lower and runs past the bottom of its Surface, where the fade crops it.
 */
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
    <div className="flex flex-col md:flex-row md:items-start md:gap-8">
      {/* Ticket */}
      <div className="ring-hairline relative w-full min-w-0 rounded-[8px] bg-bg px-4 pb-6 md:max-w-[360px] md:flex-1 md:pb-3">
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
          <div
            className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-[color-mix(in_oklch,var(--fg)_12%,transparent)]"
            style={{ left: THUMB / 2, right: THUMB / 2 }}
          />
          <m.div
            className="absolute top-1/2 -mt-0.5 h-1 origin-left rounded-full bg-accent"
            style={{ left: THUMB / 2, right: THUMB / 2, scaleX: fill }}
          />
          <div className="absolute inset-y-0" style={{ left: THUMB / 2, right: THUMB / 2 }}>
            <m.div className="absolute inset-0" style={{ x: thumbX }}>
              <span
                className="absolute top-1/2 -translate-1/2 rounded-full bg-fg shadow-[0_0_0_1px_var(--hairline-strong),0_1px_3px_rgb(0_0_0/.4)]"
                style={{ width: THUMB, height: THUMB }}
              />
            </m.div>
          </div>
        </div>
        {/* The buy-back switch, as on the hero ticket (off: a plain sale). Phones overlap it with the receipt. */}
        <div className="hidden h-10 items-center gap-3 text-[14px] text-fg md:flex">
          <span className="ring-hairline relative h-5 w-9 rounded-pill bg-surface-2">
            <span className="absolute top-0.5 left-0.5 size-4 rounded-full bg-fg shadow-[0_1px_2px_rgb(0_0_0/.35)]" />
          </span>
          Buy back next week
        </div>
      </div>

      {/* Receipt: on phones it overlaps the ticket's slot, as if it printed out of it. Est. tax stays
          above the Surface's fade line; the wash check and barcode run off the bottom edge. */}
      <div className="paper-shadow-sm relative -mt-10 w-full max-w-[320px] shrink-0 -rotate-[1.5deg] self-center md:mt-0 md:w-[320px] md:self-start">
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
          {/* A gain can't be a wash sale: the rule only disallows losses. */}
          <Row label="Wash sale" className="mt-2"><span className="receipt-caps">None</span></Row>
          {/* Below the fade line: the footer is what the Surface crops. */}
          <div className="mt-8 text-[11px] text-ink-muted">
            <Barcode seed="simulator" className="h-6 w-auto" />
            <div className="mt-2 flex justify-between">
              <span>computed on device</span>
              <span>{receiptSerial(0)}</span>
            </div>
          </div>
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
