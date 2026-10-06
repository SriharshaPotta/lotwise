"use client";

import { motion, useTransform, type MotionValue } from "motion/react";
import { cn } from "@/lib/cn";

interface RingProps {
  /** 0–1, how much of the ring is drawn (clockwise from 12 o'clock). */
  progress: MotionValue<number>;
  opacity?: MotionValue<number>;
  size: number;
  stroke?: number;
  /** CSS color of the arc. */
  color: string;
  /** Draw a tick across the ring at 12 o'clock (the end of the period, e.g. the long-term date). */
  endTick?: boolean;
  className?: string;
}

/**
 * A period filling up (§2.6.7): a hairline track with an arc drawn by stroke-dashoffset, so a
 * moving ring only touches SVG stroke attributes. Decorative; pair it with text.
 */
export function Ring({ progress, opacity, size, stroke = 6, color, endTick, className }: RingProps) {
  const r = (size - stroke) / 2 - 4;
  const c = size / 2;
  const offset = useTransform(progress, (p) => 1 - Math.min(Math.max(p, 0), 1));
  return (
    <svg aria-hidden width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={cn("overflow-visible", className)}>
      <circle cx={c} cy={c} r={r} fill="none" stroke="var(--ctx-line)" strokeWidth={1} />
      <motion.circle
        cx={c}
        cy={c}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray="1 1"
        transform={`rotate(-90 ${c} ${c})`}
        style={{ strokeDashoffset: offset, opacity }}
      />
      {endTick && <line x1={c} x2={c} y1={c - r - stroke - 2} y2={c - r + stroke + 2} stroke={color} strokeWidth={2} strokeLinecap="round" />}
    </svg>
  );
}
