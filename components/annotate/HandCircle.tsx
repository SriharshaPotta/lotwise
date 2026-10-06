"use client";

import { motion, useInView } from "motion/react";
import { useReducedMotionSafe } from "@/components/effects/useReducedMotionSafe";
import { useRef } from "react";
import { cn } from "@/lib/cn";
import { duration, ease } from "@/lib/motion";

/**
 * PLACEHOLDER stroke. Replace with the hand-drawn, vectorized loop (public/annotations/circle.svg):
 * keep the 0 0 200 120 viewBox, or pass `viewBox` alongside your own `d`. It overshoots its start
 * like a pen loop does.
 */
export const PLACEHOLDER_CIRCLE =
  "M160 14C124 2 52 6 22 30 2 46 8 86 46 102c40 16 112 14 142-8 18-14 14-44-12-62C148 12 104 6 74 12";

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
export function HandCircle({ d = PLACEHOLDER_CIRCLE, viewBox = "0 0 200 120", className, delay = 0.25 }: HandCircleProps) {
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
