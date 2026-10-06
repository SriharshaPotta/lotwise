"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";
import { stampIn } from "@/lib/motion";

/**
 * PLACEHOLDER outline. Replace with the hand-drawn, vectorized stamp border (public/annotations/stamp.svg),
 * keeping the 0 0 200 56 viewBox. The small dash gaps stand in for where the rubber didn't take ink.
 */
const OUTLINE =
  "M9.5 4.2C48 2.9 104 3.6 190.8 4.4c3.2.1 5 2 5.1 5.3.3 12.4.2 25.1-.2 37.4-.1 3.2-2.1 5-5.3 5C141 52.6 63 53.4 9.6 52.3c-3.3-.1-5.2-2-5.3-5.2-.4-12.7-.3-25.4.2-37.9.1-3.1 1.9-4.9 5-5z";

interface StampProps {
  children: string;
  className?: string;
  /** false: render the mark only and let a parent drive the landing (e.g. a scroll threshold). */
  entrance?: boolean;
}

/**
 * A rubber-stamp mark in --stamp ink (§2.6.3): rounded-rect outline, uppercase mono, rotated −8°.
 * Lands with a thunk: scale 1.35 → 1 and opacity in 120ms, then a tiny 2px settle.
 */
export function Stamp({ children, className, entrance = true }: StampProps) {
  const reduce = useReducedMotion();
  const classes = cn("pointer-events-none relative inline-grid place-items-center px-3 py-1.5 stamp-ink text-(--stamp) sm:px-4 sm:py-2", className);
  if (!entrance) {
    return (
      <div className={classes}>
        <StampMark>{children}</StampMark>
      </div>
    );
  }
  return (
    <motion.div
      initial={stampIn.initial}
      animate={reduce ? { opacity: 1, scale: 1, rotate: -8, y: 0, transition: { duration: 0 } } : stampIn.animate}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      className={classes}
    >
      <StampMark>{children}</StampMark>
    </motion.div>
  );
}

function StampMark({ children }: { children: string }) {
  return (
    <>
      <svg aria-hidden viewBox="0 0 200 56" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
        <path d={OUTLINE} fill="none" stroke="currentColor" strokeWidth={2.4} vectorEffect="non-scaling-stroke" strokeDasharray="70 1.6 38 2.2 90 1.4 54 2 120 1.8" />
        <path d={OUTLINE} fill="none" stroke="currentColor" strokeWidth={0.9} vectorEffect="non-scaling-stroke" opacity={0.55} transform="translate(100 28) scale(0.94 0.84) translate(-100 -28)" />
      </svg>
      <span className="receipt-caps relative text-[13px] leading-none font-semibold tracking-[0.14em] opacity-90 sm:text-[15px]">{children}</span>
    </>
  );
}
