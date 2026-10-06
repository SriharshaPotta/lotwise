"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

/**
 * prefers-reduced-motion, but false until after hydration so the first client render matches the
 * server HTML. Use this whenever the value changes what renders (initial styles, markup).
 */
export function useReducedMotionSafe(): boolean {
  const reduce = useReducedMotion() ?? false;
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated && reduce;
}
