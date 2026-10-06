"use client";

import { motion, useReducedMotion } from "motion/react";
import { ANNOTATIONS } from "@/lib/annotations";
import { cn } from "@/lib/cn";
import { stampIn } from "@/lib/motion";

/** The stamp border (public/annotations/stamp.svg), or its placeholder. See scripts/annotations.mjs. */
const OUTLINE = ANNOTATIONS.stamp;
const [VX, VY, VW, VH] = OUTLINE.viewBox.split(/[\s,]+/).map(Number);
const CX = VX + VW / 2;
const CY = VY + VH / 2;
/** The placeholder fakes where the rubber didn't take ink with dash gaps; a real drawing has its own. */
const INK_GAPS = OUTLINE.source === "placeholder" ? "70 1.6 38 2.2 90 1.4 54 2 120 1.8" : undefined;

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
      <svg aria-hidden viewBox={OUTLINE.viewBox} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
        <path d={OUTLINE.d} fill="none" stroke="currentColor" strokeWidth={2.4} vectorEffect="non-scaling-stroke" strokeDasharray={INK_GAPS} />
        <path d={OUTLINE.d} fill="none" stroke="currentColor" strokeWidth={0.9} vectorEffect="non-scaling-stroke" opacity={0.55} transform={`translate(${CX} ${CY}) scale(0.94 0.84) translate(${-CX} ${-CY})`} />
      </svg>
      <span className="receipt-caps relative text-[13px] leading-none font-semibold tracking-[0.14em] opacity-90 sm:text-[15px]">{children}</span>
    </>
  );
}
