"use client";

import { motion, useInView } from "motion/react";
import { useReducedMotionSafe } from "@/components/effects/useReducedMotionSafe";
import { useRef } from "react";
import { ANNOTATIONS } from "@/lib/annotations";
import { cn } from "@/lib/cn";
import { duration, ease } from "@/lib/motion";

/** The hand-drawn loop (public/annotations/circle.svg), or its placeholder. See scripts/annotations.mjs. */
export const CIRCLE = ANNOTATIONS.circle;

interface HandCircleProps {
  d?: string;
  viewBox?: string;
  className?: string;
  /** Seconds after coming into view. */
  delay?: number;
}

/**
 * A hand-drawn loop around a word (§2.6.6). Scales with the word (no non-scaling-stroke: Chrome
 * then applies dashes in screen space and the draw-on breaks). Sits around its positioned parent and draws on with
 * ink easing once, the first time it is mostly in view. Drawn from the start under reduced motion.
 */
export function HandCircle({ d = CIRCLE.d, viewBox = CIRCLE.viewBox, className, delay = 0.25 }: HandCircleProps) {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.8 });
  const reduce = useReducedMotionSafe();
  const drawn = reduce || inView;
  return (
    <svg
      ref={ref}
      aria-hidden
      viewBox={viewBox}
      preserveAspectRatio="none"
      className={cn("pointer-events-none absolute -inset-x-[18%] -inset-y-[22%] h-[144%] w-[136%] overflow-visible", className)}
    >
      <motion.path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: drawn ? 1 : 0, opacity: drawn ? 1 : 0 }}
        transition={reduce ? { duration: 0 } : { duration: duration.inkLine * 0.6, ease: ease.ink, delay, opacity: { duration: 0.01, delay } }}
      />
    </svg>
  );
}
