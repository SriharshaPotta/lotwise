"use client";

import { cubicBezier, m, useTransform, type MotionValue } from "motion/react";
import { sec1256Compare } from "@/lib/demo";
import { money } from "@/lib/format";
import { keyframes, wrap } from "@/lib/loop";
import { ease } from "@/lib/motion";

const S = sec1256Compare();
const PERIOD = 7.5;
/** XSP restacked into 60/40, the saving shown. */
export const SEC1256_POSTER = 4;
const inOut = cubicBezier(...ease.ink);
const LT_SHARE = 0.6;

const pct = (n: number) => `${Math.round(n * 100)}%`;

export const sec1256Summary = `The same ${money(S.gain, { whole: true })} short-term call gain: on SPY it is all taxed at ${pct(S.rates.st)}, about ${money(
  S.spyTax,
  { whole: true },
)}; on XSP, a Section 1256 contract, 60% is taxed as long-term and 40% as short-term, about ${money(S.xspTax, { whole: true })}. Saving ${money(S.save, { whole: true })}.`;

/** The same gain on SPY and XSP; the XSP bar restacks into 60/40 and its tax tweens down. */
export function Sec1256Loop({ time }: { time: MotionValue<number> }) {
  const split = useTransform(time, (v) => keyframes(wrap(v, PERIOD), [[0, 0], [1.0, 0], [2.4, 1], [6.0, 1], [7.0, 0]], inOut));
  const xspTax = useTransform(split, (p) => money(S.spyTax + (S.xspTax - S.spyTax) * p, { whole: true }));
  // The two split labels hand over in sequence (out, then in), never overlapping mid-fade.
  const fade = useTransform(split, (p) => Math.max(0, 1 - p * 2));
  const splitLabel = useTransform(split, (p) => Math.max(0, p * 2 - 1));
  const ltScale = useTransform(split, (p) => p);

  // Six fixed 32px rows; every cell is one line that clips rather than wraps, so labels and bars
  // can never collide at any width.
  return (
    <div className="num grid h-full grid-rows-[repeat(6,32px)] content-center text-meta [&>*]:min-w-0 [&>*]:overflow-hidden [&>*]:whitespace-nowrap">
      <div className="flex items-center text-muted">same call trade · gain {money(S.gain, { whole: true })}</div>

      <Row label="SPY" tax={<span>{money(S.spyTax, { whole: true })}</span>}>
        <span className="absolute inset-0 rounded-full bg-[color-mix(in_oklch,var(--muted)_45%,transparent)]" />
      </Row>
      <div className="flex items-center pl-12 text-muted">100% short-term</div>

      <Row label="XSP" tax={<m.span>{xspTax}</m.span>}>
        <span className="absolute inset-0 rounded-full bg-[color-mix(in_oklch,var(--muted)_45%,transparent)]" />
        <m.span
          className="absolute inset-y-0 left-0 origin-left rounded-l-full bg-sec1256"
          style={{ width: `calc(${LT_SHARE * 100}% - 1px)`, scaleX: ltScale }}
        />
        <m.span
          className="absolute inset-y-0 right-0 rounded-r-full bg-[color-mix(in_oklch,var(--sec1256)_50%,transparent)]"
          style={{ width: `calc(${(1 - LT_SHARE) * 100}% - 1px)`, opacity: split }}
        />
      </Row>
      <div className="grid items-center pl-12 text-muted [&>*]:[grid-area:1/1]">
        <m.span style={{ opacity: fade }}>100% short-term</m.span>
        <m.span style={{ opacity: splitLabel }}>60% long · 40% short</m.span>
      </div>

      <m.div className="flex items-center text-fg" style={{ opacity: split }}>
        XSP saves {money(S.save, { whole: true })}
      </m.div>
    </div>
  );
}

function Row({ label, tax, children }: { label: string; tax: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-9 shrink-0 text-fg">{label}</span>
      <span className="relative h-2.5 min-w-0 flex-1 overflow-hidden rounded-full">{children}</span>
      <span className="w-[8ch] shrink-0 text-right text-fg">{tax}</span>
    </div>
  );
}
