"use client";

import { motion } from "motion/react";
import { useMemo, useState, type ReactNode } from "react";
import { Marker } from "@/components/ui/Marker";
import { Slider } from "@/components/ui/Slider";
import { Toggle } from "@/components/ui/Toggle";
import { MoneyTween } from "@/components/viz/MoneyTween";
import { S1256_EXPLAINER as X, s1256State, type S1256State } from "@/lib/demo";
import { money } from "@/lib/format";
import { spring } from "@/lib/motion";
import { ExplainerFrame, Readout, Readouts, useSettled } from "./parts";

const ST = "color-mix(in oklch, var(--fg) 45%, transparent)";
const LT = "var(--longterm)";
const pct = (r: number) => `${Math.round(r * 1000) / 10}%`;
const whole = (n: number) => money(n, { whole: true });

function summary(s: S1256State) {
  const spy = `On SPY options held ${s.heldOverYear ? "over a year" : "a few weeks"}, the ${whole(s.gain)} gain is ${s.spy.term}-term: about ${whole(s.spy.tax)} in tax.`;
  const xsp = `On XSP, a Section 1256 contract, it's taxed 60/40: about ${whole(s.xsp.tax)}.`;
  const diff = s.saving >= 0 ? `XSP saves ${whole(s.saving)}.` : `XSP costs ${whole(-s.saving)} more.`;
  return `${spy} ${xsp} ${diff}`;
}

/** §5 section-1256: the same P&L on SPY and XSP as stacked 60/40 bars, with the difference. */
export function Section1256Explainer() {
  const [gain, setGain] = useState<number>(X.defaultGain);
  const [held, setHeld] = useState(false);
  const s = useMemo(() => s1256State(gain, held), [gain, held]);
  const spoken = useSettled(summary(s));
  const scale = gain / X.max;
  const spyRate = s.spy.term === "long" ? X.rates.lt : X.rates.st;

  return (
    <ExplainerFrame
      label="SPY versus XSP tax calculator"
      title="Same gain · SPY options vs XSP options"
      hint="Use the slider and switch, or the keyboard"
      spoken={spoken}
    >
      <div className="grid gap-x-8 gap-y-6 border-b border-border px-5 pt-2 pb-6 sm:px-8 md:grid-cols-12 md:items-end">
        <Slider
          label="Gain on the trade"
          value={gain}
          onChange={setGain}
          min={X.min}
          max={X.max}
          step={X.step}
          tickEvery={1500}
          format={(v) => money(v, { whole: true })}
          className="md:col-span-7"
        />
        <Toggle checked={held} onChange={setHeld} label="SPY options held longer than a year" className="md:col-span-5 md:mb-1" />
      </div>

      <div className="space-y-8 px-5 py-8 sm:px-8">
        <BarRow
          title={
            <>
              SPY<span className="max-sm:hidden"> calls</span> · held {held ? "over a year" : "a few weeks"}
            </>
          }
          scale={scale}
          segments={[{ share: 1, long: s.spy.term === "long" }]}
          legend={`100% ${s.spy.term}-term × ${pct(spyRate)} = ${whole(s.spy.tax)}`}
          tax={s.spy.tax}
        />
        <BarRow
          title={
            <span className="inline-flex items-center gap-2">
              XSP<span className="max-sm:hidden"> calls</span> · Section 1256 <Marker tone="sec1256" />
            </span>
          }
          scale={scale}
          segments={[
            { share: X.ltShare, long: true },
            { share: 1 - X.ltShare, long: false },
          ]}
          legend={`60% long-term × ${pct(X.rates.lt)} = ${whole(s.xsp.ltTax)} · 40% short-term × ${pct(X.rates.st)} = ${whole(s.xsp.stTax)}`}
          tax={s.xsp.tax}
        />
      </div>

      <Readouts>
        <Readout label="Tax on SPY">
          <MoneyTween value={s.spy.tax} format={whole} />
        </Readout>
        <Readout label="Tax on XSP">
          <MoneyTween value={s.xsp.tax} format={whole} />
        </Readout>
        <Readout label={s.saving >= 0 ? "XSP saves" : "XSP costs more"}>
          <MoneyTween value={Math.abs(s.saving)} format={whole} className={s.saving < 0 ? "text-loss" : undefined} />
        </Readout>
        <Readout label="XSP blended rate">
          <span>
            {pct(s.xsp.blendedRate)} <span className="text-meta text-muted">vs {pct(spyRate)}</span>
          </span>
        </Readout>
      </Readouts>
    </ExplainerFrame>
  );
}

function BarRow({
  title,
  scale,
  segments,
  legend,
  tax,
}: {
  title: ReactNode;
  scale: number;
  segments: { share: number; long: boolean }[];
  legend: string;
  tax: number;
}) {
  return (
    <div>
      <div className="num flex h-8 items-center justify-between gap-4 text-meta">
        <span className="min-w-0 truncate text-fg">{title}</span>
        <span className="shrink-0 whitespace-nowrap text-fg">
          tax <MoneyTween value={tax} format={whole} />
        </span>
      </div>
      {/* the whole gain, split by how it's taxed; scaled (transform only) to the slider */}
      <div className="relative mt-1 h-4 w-full rounded-full bg-[color-mix(in_oklch,var(--fg)_5%,transparent)]">
        <motion.div className="absolute inset-0 flex origin-left gap-px" initial={false} animate={{ scaleX: scale }} transition={spring.paper}>
          {segments.map((g, i) => (
            <span key={i} className="relative h-full overflow-hidden first:rounded-l-full last:rounded-r-full" style={{ width: `${g.share * 100}%`, background: ST }}>
              {/* long-term colour crossfades in (opacity only) */}
              <motion.span className="absolute inset-0" style={{ background: LT }} initial={false} animate={{ opacity: g.long ? 1 : 0 }} transition={{ duration: 0.3 }} />
            </span>
          ))}
        </motion.div>
      </div>
      <p className="num mt-2 text-[12px] leading-6 text-muted">{legend}</p>
    </div>
  );
}
