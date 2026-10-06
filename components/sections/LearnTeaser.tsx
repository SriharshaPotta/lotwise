"use client";

import { m } from "motion/react";
import { ExplainerCard } from "@/components/learn/ExplainerCard";
import { Button } from "@/components/ui/Button";
import { explainer } from "@/lib/learn";
import { reveal, revealGroup, revealItem } from "@/lib/motion";

const TEASED = ["the-wash-sale", "short-vs-long-term", "the-ira-trap"].map((slug) => explainer(slug)!);

/** §4.8. Three cards in a row; a snap-scrolling strip on phones. */
export function LearnTeaser() {
  return (
    <section id="learn" aria-labelledby="learn-title" className="relative scroll-mt-24">
      <div className="page-container flex flex-wrap items-end justify-between gap-x-8 gap-y-6">
        <m.h2 id="learn-title" {...reveal} className="max-w-[16ch] text-h2 lg:max-w-[22ch]">
          Taxes, explained by playing with them.
        </m.h2>
        <Button href="/learn" variant="quiet" className="mb-2">
          All explainers →
        </Button>
      </div>
      <m.ul
        variants={revealGroup}
        initial="hidden"
        whileInView="shown"
        viewport={{ once: true, amount: 0.2 }}
        className="learn-strip page-container mt-12 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:gap-8 md:overflow-visible lg:mt-16"
      >
        {TEASED.map((e) => (
          <m.li key={e.slug} variants={revealItem} className="w-[82%] shrink-0 snap-start md:w-auto">
            <ExplainerCard e={e} />
          </m.li>
        ))}
      </m.ul>
    </section>
  );
}
