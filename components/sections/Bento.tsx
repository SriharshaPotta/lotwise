"use client";

import { m } from "motion/react";
import { COUNTDOWN_POSTER, CountdownLoop, countdownSummary } from "@/components/bento/CountdownLoop";
import { FeatureCard, FeatureRow } from "@/components/bento/Feature";
import { HARVEST_POSTER, HarvestLoop, harvestSummary } from "@/components/bento/HarvestLoop";
import { SEC1256_POSTER, Sec1256Loop, sec1256Summary } from "@/components/bento/Sec1256Loop";
import { SIMULATOR_POSTER, SimulatorLoop, simulatorSummary } from "@/components/bento/SimulatorLoop";
import { reveal, revealGroup } from "@/lib/motion";

/**
 * §4.5. Three rows on the 12-column grid, each a different shape:
 *   A  text 1–4 · simulator visual 5–12
 *   B  harvesting visual 1–8 · text 9–12 (mirrored)
 *   C  two shorter cards side by side, 6 + 6 columns
 */
export function Bento() {
  return (
    <section id="features" aria-labelledby="bento-title" className="page-container relative scroll-mt-24">
      <m.h2 id="bento-title" {...reveal} className="max-w-[18ch] text-h2 lg:max-w-[20ch]">
        Every trade, checked before it happens.
      </m.h2>

      <div className="mt-12 space-y-20 lg:mt-16 lg:space-y-28">
        <FeatureRow
          title="Pre-trade simulator"
          strong="Drag, see the tax hit, change your mind."
          copy="Before anything is real."
          items={["Live tax estimate", "Wash-sale check", "Better alternatives"]}
          visualClassName="h-[470px] md:h-[340px]"
          summary={simulatorSummary}
          poster={SIMULATOR_POSTER}
        >
          {(t) => <SimulatorLoop time={t} />}
        </FeatureRow>

        <FeatureRow
          flip
          title="Loss harvesting"
          strong="Find losses worth taking,"
          copy="and the ones that would trigger a wash sale."
          items={["Losing lots, ranked", "Wash sales skipped", "Savings this tax year"]}
          visualClassName="h-[300px] sm:h-[400px] md:h-[300px]"
          summary={harvestSummary}
          poster={HARVEST_POSTER}
        >
          {(t) => <HarvestLoop time={t} />}
        </FeatureRow>

        <m.div
          variants={revealGroup}
          initial="hidden"
          whileInView="shown"
          viewport={{ once: true, amount: 0.2 }}
          className="grid gap-8 lg:grid-cols-12"
        >
          <FeatureCard
            className="lg:col-span-6"
            title="Long-term countdown"
            strong="Some trades get much cheaper if you wait."
            copy="We tell you which, and by how much."
            visualClassName="h-[248px]"
            summary={countdownSummary}
            poster={COUNTDOWN_POSTER}
          >
            {(t) => <CountdownLoop time={t} />}
          </FeatureCard>
          <FeatureCard
            className="lg:col-span-6"
            title="Section 1256"
            strong="The same trade on a different ticker"
            copy="can be taxed very differently."
            visualClassName="h-[248px]"
            summary={sec1256Summary}
            poster={SEC1256_POSTER}
          >
            {(t) => <Sec1256Loop time={t} />}
          </FeatureCard>
        </m.div>
      </div>
    </section>
  );
}
