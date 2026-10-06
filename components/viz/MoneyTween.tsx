"use client";

import { animate, useMotionValue, useMotionValueEvent, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { money } from "@/lib/format";
import { transition } from "@/lib/motion";

interface MoneyTweenProps {
  value: number;
  format?: (n: number) => string;
  className?: string;
}

/**
 * Numbers never jump (§2.5): tweens to each new value over 420ms. Frames write straight to the
 * text node, so a tween never re-renders React. Instant under reduced motion.
 */
export function MoneyTween({ value, format = money, className }: MoneyTweenProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const mv = useMotionValue(value);
  const reduce = useReducedMotion();
  // React renders the first value only; later frames are written directly, so React never
  // overwrites a tween in progress.
  const [initial] = useState(() => format(value));

  useEffect(() => {
    if (reduce) {
      mv.jump(value);
      if (ref.current) ref.current.textContent = format(value);
      return;
    }
    const controls = animate(mv, value, transition.tween);
    return () => controls.stop();
  }, [value, reduce, mv]);

  useMotionValueEvent(mv, "change", (v) => {
    if (ref.current) ref.current.textContent = format(Math.round(v * 100) / 100);
  });

  return (
    <span ref={ref} className={cn("num", className)}>
      {initial}
    </span>
  );
}

export const formatInt = (n: number) => String(Math.round(n));
