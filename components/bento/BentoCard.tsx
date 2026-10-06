"use client";

import { m, type MotionValue } from "motion/react";
import type { ReactNode } from "react";
import { useInViewLoop } from "@/components/effects/useInViewLoop";
import { LedgerRules } from "@/components/ledger/LedgerRules";
import { Lead } from "@/components/ui/Lead";
import { cn } from "@/lib/cn";
import { revealItem } from "@/lib/motion";

/** Hovering a card plays its visual faster (§4.5). */
const HOVER_SPEED = 1.5;

interface BentoCardProps {
  title: string;
  /** The description's key clause (--fg); `copy` is the rest of it (--muted). */
  strong: string;
  copy: string;
  /** What the visual shows, for screen readers (the visual itself is decorative). */
  summary: string;
  /** Loop time (s) of the visual's designed final state, shown under reduced motion. */
  poster: number;
  wide?: boolean;
  /** Height of the visual, in ledger rows (lg+), and below lg if it differs. */
  rows: number;
  mobileRows?: number;
  className?: string;
  children: (time: MotionValue<number>) => ReactNode;
}

/**
 * A dark ruled feature card with a small looping visual. The loop only runs while the card is on
 * screen; hover eases it to 1.5× and brightens the border one step.
 */
export function BentoCard({ title, strong, copy, summary, poster, wide, rows, mobileRows = rows, className, children }: BentoCardProps) {
  const { ref, time, setSpeed } = useInViewLoop<HTMLElement>({ poster });
  return (
    <m.article
      ref={ref}
      variants={revealItem}
      onPointerEnter={(e) => e.pointerType === "mouse" && setSpeed(HOVER_SPEED)}
      onPointerLeave={() => setSpeed(1)}
      className={cn(
        "group relative overflow-hidden rounded-md border border-border bg-surface px-6 py-8 lg:px-8",
        wide && "lg:grid lg:grid-cols-12 lg:gap-x-8",
        className,
      )}
    >
      <LedgerRules margin={false} />
      {/* The brighter border fades in on hover (opacity only). */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] border border-[color-mix(in_oklch,var(--fg)_20%,transparent)] opacity-0 transition-opacity duration-(--motion-fast) ease-ui group-is-hover:opacity-100"
      />
      <div className={cn("relative", wide && "lg:col-span-4")}>
        <h3 className="text-[26px] leading-[1.15] tracking-[-0.01em]">{title}</h3>
        <Lead size="body" strong={strong} className={cn("mt-3", wide && "lg:mt-4 lg:max-w-[28ch]")}>
          {copy}
        </Lead>
      </div>
      <div
        aria-hidden
        className={cn(
          "relative mt-8 h-[calc(var(--rows-sm)*var(--ledger-row))] lg:h-[calc(var(--rows)*var(--ledger-row))]",
          wide && "lg:col-span-8 lg:mt-0",
        )}
        style={{ "--rows": rows, "--rows-sm": mobileRows } as React.CSSProperties}
      >
        {children(time)}
      </div>
      <p className="sr-only">{summary}</p>
    </m.article>
  );
}
