"use client";

import { motion, useTransform, type MotionValue } from "motion/react";
import type { ReactNode } from "react";

interface Point {
  x: number;
  y: number;
}

interface FlyingChipProps {
  /** 0 → at `from`, 1 → at `to`. Drive it with any motion value (scroll, time). */
  t: MotionValue<number>;
  from: Point;
  to: Point;
  /** How far the curve bows out sideways, in px (positive = right). */
  bulge?: number;
  opacity?: MotionValue<number>;
  children: ReactNode;
}

/**
 * Money moving between buckets (§2.6.7): a chip travelling a curved path. Position comes from a
 * quadratic Bézier evaluated on motion values, so it never re-renders React.
 */
export function FlyingChip({ t, from, to, bulge = 60, opacity, children }: FlyingChipProps) {
  const c = { x: Math.max(from.x, to.x) + bulge, y: (from.y + to.y) / 2 };
  const x = useTransform(t, (u) => (1 - u) ** 2 * from.x + 2 * (1 - u) * u * c.x + u * u * to.x);
  const y = useTransform(t, (u) => (1 - u) ** 2 * from.y + 2 * (1 - u) * u * c.y + u * u * to.y);
  return (
    <motion.div aria-hidden className="pointer-events-none absolute top-0 left-0" style={{ x, y, opacity }}>
      <div className="-translate-x-1/2 -translate-y-1/2">{children}</div>
    </motion.div>
  );
}
