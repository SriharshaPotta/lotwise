"use client";

import { motion } from "motion/react";
import Link from "next/link";
import type { ReactNode } from "react";
import { HandUnderline } from "@/components/annotate/HandUnderline";
import { LedgerRules } from "@/components/ledger/LedgerRules";
import { Button } from "@/components/ui/Button";
import { Hatch } from "@/components/viz/Hatch";
import { iraTrap } from "@/lib/demo";
import { money } from "@/lib/format";
import { reveal, revealGroup, revealItem } from "@/lib/motion";

const IRA_LOSS = iraTrap().result.wash!.disallowed;

const CARDS = [
  { n: "01", slug: "the-wash-sale", title: "The wash sale", visual: <WashSaleMini /> },
  { n: "02", slug: "short-vs-long-term", title: "Short vs long term", visual: <TermMini /> },
  { n: "03", slug: "the-ira-trap", title: "The IRA trap", visual: <IraMini /> },
] as const;

/** §4.8. Three cards in a row; a snap-scrolling strip on phones. */
export function LearnTeaser() {
  return (
    <section id="learn" aria-labelledby="learn-title" className="relative scroll-mt-24">
      <div className="page-container flex flex-wrap items-end justify-between gap-x-8 gap-y-6">
        <motion.h2 id="learn-title" {...reveal} className="max-w-[16ch] text-h2 lg:max-w-[22ch]">
          Taxes, explained by playing with them.
        </motion.h2>
        <Button href="/learn" variant="quiet" className="mb-2">
          All explainers →
        </Button>
      </div>
      <motion.ul
        variants={revealGroup}
        initial="hidden"
        whileInView="shown"
        viewport={{ once: true, amount: 0.2 }}
        className="learn-strip page-container mt-12 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:gap-8 md:overflow-visible lg:mt-16"
      >
        {CARDS.map((c) => (
          <motion.li key={c.slug} variants={revealItem} className="w-[82%] shrink-0 snap-start md:w-auto">
            <Card {...c} />
          </motion.li>
        ))}
      </motion.ul>
    </section>
  );
}

function Card({ n, slug, title, visual }: { n: string; slug: string; title: string; visual: ReactNode }) {
  return (
    <Link
      href={`/learn/${slug}`}
      className="group relative block overflow-hidden rounded-md border border-border bg-surface px-6 py-8 lg:px-8"
    >
      <LedgerRules margin={false} />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] border border-[color-mix(in_oklch,var(--fg)_20%,transparent)] opacity-0 transition-opacity duration-(--motion-fast) ease-ui group-is-hover:opacity-100 group-is-focus:opacity-100"
      />
      <div className="relative scroll-mt-24">
        <span className="num block text-meta leading-8 text-muted">{n}</span>
        <h3 className="text-[26px] leading-8 tracking-[-0.01em]">{title}</h3>
        <div aria-hidden className="mt-8 h-[calc(var(--ledger-row)*4)]">
          {visual}
        </div>
        <span className="relative mt-8 inline-block leading-8 text-fg">
          Explore →
          <HandUnderline />
        </span>
      </div>
    </Link>
  );
}

/* Tiny static versions of each explainer's hero visual (§5). Decorative. */

const DAYS = 25;

function Calendar({ children }: { children?: ReactNode }) {
  return (
    <div className="relative h-full">
      <div className="absolute inset-x-0 bottom-8 flex justify-between">
        {Array.from({ length: DAYS }, (_, i) => (
          <span key={i} className={i % 6 === 0 ? "h-3 w-px bg-border" : "h-1.5 w-px bg-border"} />
        ))}
      </div>
      <span className="absolute inset-x-0 bottom-8 h-px bg-border" />
      {children}
    </div>
  );
}

function WashSaleMini() {
  return (
    <Calendar>
      <Hatch variant="wash" as="div" className="absolute bottom-8 left-[22%] h-14 w-[56%] rounded-[3px]" />
      {/* the loss sale, mid-window */}
      <span className="absolute bottom-8 left-1/2 h-14 w-0.5 -translate-x-1/2 rounded-full bg-loss" />
      <span className="num absolute bottom-0 left-1/2 -translate-x-1/2 text-[12px] text-muted">sale</span>
      {/* the buy-back marker, dragged inside */}
      <span className="absolute bottom-[2.6rem] left-[68%] size-3.5 -translate-x-1/2 rounded-full border-2 border-fg bg-surface" />
      <span className="num absolute top-0 left-[68%] -translate-x-1/2 text-[12px] whitespace-nowrap text-muted">buy back</span>
      <span className="num absolute top-0 left-[22%] text-[12px] whitespace-nowrap text-muted">61 days</span>
    </Calendar>
  );
}

function TermMini() {
  return (
    <Calendar>
      {/* a lot held across the one-year line */}
      <span className="absolute bottom-[3.25rem] left-0 h-2 w-[84%] rounded-full bg-[color-mix(in_oklch,var(--muted)_45%,transparent)]" />
      <span className="absolute bottom-8 left-[72%] h-16 w-0.5 rounded-full bg-longterm" />
      <span className="num absolute bottom-0 left-[72%] -translate-x-1/2 text-[12px] text-muted">1 year</span>
      <span className="num absolute top-0 left-0 text-[12px] text-muted">short</span>
      <span className="num absolute top-0 left-[75%] text-[12px] text-longterm">long</span>
    </Calendar>
  );
}

function IraMini() {
  return (
    <div className="relative h-full">
      <span className="num absolute top-1 left-0 inline-flex h-7 items-center rounded-pill border border-[color-mix(in_oklch,var(--loss)_45%,transparent)] bg-[color-mix(in_oklch,var(--loss)_12%,transparent)] px-3 text-meta text-fg">
        {money(-IRA_LOSS, { whole: true })} loss
      </span>
      <svg viewBox="0 0 200 128" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
        <path d="M70 26C120 24 148 46 150 78" fill="none" stroke="var(--border)" strokeWidth={1.25} strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="absolute right-0 bottom-0 flex h-14 w-[46%] items-end justify-center rounded-b-md border border-t-0 border-dashed border-border pb-2">
        <span className="num text-[12px] text-muted">Roth IRA · gone</span>
      </div>
    </div>
  );
}
