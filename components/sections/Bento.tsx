"use client";

import { motion } from "motion/react";
import { BentoCard } from "@/components/bento/BentoCard";
import { COUNTDOWN_POSTER, CountdownLoop, countdownSummary } from "@/components/bento/CountdownLoop";
import { HARVEST_POSTER, HarvestLoop, harvestSummary } from "@/components/bento/HarvestLoop";
import { SEC1256_POSTER, Sec1256Loop, sec1256Summary } from "@/components/bento/Sec1256Loop";
import { SIMULATOR_POSTER, SimulatorLoop, simulatorSummary } from "@/components/bento/SimulatorLoop";
import { reveal, revealGroup } from "@/lib/motion";

/** §4.5. One wide card on top (lg+), three below; one column on phones. */
export function Bento() {
  return (
    <section id="features" aria-labelledby="bento-title" className="page-container relative scroll-mt-24">
      <motion.h2 id="bento-title" {...reveal} className="max-w-[18ch] text-h2 lg:max-w-[20ch]">
        Every trade, checked before it happens.
      </motion.h2>

      <motion.div
        variants={revealGroup}
        initial="hidden"
        whileInView="shown"
        viewport={{ once: true, amount: 0.15 }}
        className="mt-12 grid gap-8 lg:mt-16 lg:grid-cols-12"
      >
        <BentoCard
          wide
          className="lg:col-span-12"
          title="Pre-trade simulator"
          copy="Drag, see the tax hit, change your mind. Before anything is real."
          summary={simulatorSummary}
          poster={SIMULATOR_POSTER}
          rows={8}
          mobileRows={13}
        >
          {(t) => <SimulatorLoop time={t} />}
        </BentoCard>
        <BentoCard
          className="lg:col-span-4"
          title="Loss harvesting"
          copy="Find losses worth taking — and the ones that would trigger a wash sale."
          summary={harvestSummary}
          poster={HARVEST_POSTER}
          rows={6}
        >
          {(t) => <HarvestLoop time={t} />}
        </BentoCard>
        <BentoCard
          className="lg:col-span-4"
          title="Long-term countdown"
          copy="Some trades get much cheaper if you wait. We tell you which, and by how much."
          summary={countdownSummary}
          poster={COUNTDOWN_POSTER}
          rows={6}
        >
          {(t) => <CountdownLoop time={t} />}
        </BentoCard>
        <BentoCard
          className="lg:col-span-4"
          title="Section 1256"
          copy="The same trade on a different ticker can be taxed very differently."
          summary={sec1256Summary}
          poster={SEC1256_POSTER}
          rows={6}
        >
          {(t) => <Sec1256Loop time={t} />}
        </BentoCard>
      </motion.div>
    </section>
  );
}
