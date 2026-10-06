"use client";

import { m, type MotionValue } from "motion/react";
import type { ReactNode } from "react";
import { useInViewLoop } from "@/components/effects/useInViewLoop";
import { Lead } from "@/components/ui/Lead";
import { Surface } from "@/components/ui/Surface";
import { cn } from "@/lib/cn";
import { reveal, revealItem } from "@/lib/motion";

/** Hovering a visual plays it faster (§4.5). */
const HOVER_SPEED = 1.5;

interface FeatureCopy {
  title: string;
  /** The sentence's key clause (--fg); `copy` is the rest of it (--muted). */
  strong: string;
  copy: string;
}

interface LoopVisual {
  /** What the visual shows, for screen readers (the visual itself is decorative). */
  summary: string;
  /** Loop time (s) of the visual's designed final state, shown under reduced motion. */
  poster: number;
  children: (time: MotionValue<number>) => ReactNode;
}

/** The ambient loop clock, plus hover easing it to 1.5× (mouse only). */
function useFeatureLoop(poster: number) {
  const { ref, time, setSpeed } = useInViewLoop<HTMLElement>({ poster });
  const hover = {
    onPointerEnter: (e: React.PointerEvent) => e.pointerType === "mouse" && setSpeed(HOVER_SPEED),
    onPointerLeave: () => setSpeed(1),
  };
  return { ref, time, hover };
}

/**
 * A feature told across the grid (§4.5): plain text in four columns, and in the other eight a
 * Surface holding a cropped product visual that bleeds off its bottom edge. `flip` mirrors it.
 */
export function FeatureRow({
  title, strong, copy, items, flip, visualClassName, summary, poster, children,
}: FeatureCopy & LoopVisual & { items: readonly string[]; flip?: boolean; visualClassName?: string }) {
  const { ref, time, hover } = useFeatureLoop(poster);
  return (
    <m.div {...reveal} className="grid gap-8 lg:grid-cols-12 lg:items-start">
      <div className={cn("lg:col-span-4 lg:row-start-1 lg:pt-8", flip ? "lg:col-start-9" : "lg:col-start-1")}>
        <h3 className="text-[28px] leading-[1.15] tracking-[-0.01em] lg:text-[32px]">{title}</h3>
        <Lead size="body" strong={strong} className="mt-3">
          {copy}
        </Lead>
        <ul className="num mt-6 space-y-2 text-meta text-muted">
          {items.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      </div>
      <Surface
        fade
        ref={ref}
        {...hover}
        className={cn("lg:col-span-8 lg:row-start-1", flip ? "lg:col-start-1" : "lg:col-start-5", visualClassName)}
      >
        <div aria-hidden className="h-full p-6 sm:p-8">
          {children(time)}
        </div>
        <p className="sr-only">{summary}</p>
      </Surface>
    </m.div>
  );
}

/**
 * A compact feature card: visual on top, a hairline, then the title and one two-tone sentence.
 * Used in pairs (row C), deliberately shorter than the full rows.
 */
export function FeatureCard({
  title, strong, copy, visualClassName, className, summary, poster, children,
}: FeatureCopy & LoopVisual & { visualClassName?: string; className?: string }) {
  const { ref, time, hover } = useFeatureLoop(poster);
  return (
    <m.div variants={revealItem} className={className}>
      <Surface as="article" ref={ref} {...hover} className="flex h-full flex-col overflow-hidden">
        <div aria-hidden className={cn("relative px-6 pt-6 pb-6", visualClassName)}>
          {children(time)}
        </div>
        <div aria-hidden className="h-px bg-hairline" />
        <div className="flex-1 p-6">
          <h3 className="text-[22px] leading-[1.2] tracking-[-0.01em]">{title}</h3>
          <Lead size="body" strong={strong} className="mt-2">
            {copy}
          </Lead>
        </div>
        <p className="sr-only">{summary}</p>
      </Surface>
    </m.div>
  );
}
