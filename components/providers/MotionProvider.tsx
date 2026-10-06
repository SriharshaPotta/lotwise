"use client";

import Lenis from "lenis";
import { LazyMotion, MotionConfig } from "motion/react";
import { useEffect, type ReactNode } from "react";
import { lenisOptions } from "@/lib/motion";
import { markAppHydrated } from "@/components/effects/HydrateOnView";

const REDUCED = "(prefers-reduced-motion: reduce)";
const loadFeatures = () => import("./motionFeatures").then((r) => r.default);

let current: Lenis | null = null;

/** The active Lenis instance, or null under reduced motion (native scrolling). */
export function getLenis(): Lenis | null {
  return current;
}

/** Motion honours the OS reduced-motion setting; Lenis only runs when motion is allowed. */
export function MotionProvider({ children }: { children: ReactNode }) {
  // Effects run child-first, so this marks the end of the first hydration of the whole page.
  useEffect(() => markAppHydrated(), []);

  useEffect(() => {
    const query = window.matchMedia(REDUCED);
    let lenis: Lenis | null = null;

    const sync = () => {
      if (query.matches) {
        lenis?.destroy();
        lenis = null;
      } else if (!lenis) {
        lenis = new Lenis({ ...lenisOptions, autoRaf: true });
      }
      current = lenis;
    };

    sync();
    query.addEventListener("change", sync);
    return () => {
      query.removeEventListener("change", sync);
      lenis?.destroy();
      current = null;
    };
  }, []);

  // `m` components everywhere, features loaded async (strict: a stray `motion.*` throws in dev).
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
