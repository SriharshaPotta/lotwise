"use client";

import Lenis from "lenis";
import { MotionConfig } from "motion/react";
import { useEffect, type ReactNode } from "react";
import { lenisOptions } from "@/lib/motion";

const REDUCED = "(prefers-reduced-motion: reduce)";

let current: Lenis | null = null;

/** The active Lenis instance, or null under reduced motion (native scrolling). */
export function getLenis(): Lenis | null {
  return current;
}

/** Motion honours the OS reduced-motion setting; Lenis only runs when motion is allowed. */
export function MotionProvider({ children }: { children: ReactNode }) {
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

  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
