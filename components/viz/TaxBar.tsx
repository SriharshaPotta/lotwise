"use client";

import { m } from "motion/react";
import { cn } from "@/lib/cn";
import { spring } from "@/lib/motion";

interface TaxBarProps {
  /** Current amount and the amount that fills the bar. */
  value: number;
  max: number;
  /** CSS colour of the bar. */
  color?: string;
  /** Show what's no longer owed as a dashed ghost after the bar. */
  ghost?: boolean;
  className?: string;
}

/**
 * A tax amount as a horizontal bar (§2.6.7). It drops (scaleX, paper spring) rather than resizing,
 * and can leave a dashed ghost of the full amount so the saving is visible.
 */
export function TaxBar({ value, max, color = "color-mix(in oklch, var(--fg) 55%, transparent)", ghost, className }: TaxBarProps) {
  const f = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <div aria-hidden className={cn("relative h-3 w-full", className)}>
      {ghost && <span className="absolute inset-0 rounded-full border border-dashed border-border" />}
      <m.span
        className="absolute inset-0 origin-left rounded-full"
        style={{ background: color }}
        initial={false}
        animate={{ scaleX: f }}
        transition={spring.paper}
      />
    </div>
  );
}
