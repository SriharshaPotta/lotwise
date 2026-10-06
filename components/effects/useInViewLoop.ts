"use client";

import { useMotionValue, useReducedMotion, type MotionValue } from "motion/react";
import { useEffect, useRef, useState } from "react";

/** How quickly playback speed eases toward its target (per second), so hover never jerks. */
const SPEED_EASE = 6;
/** A long frame (tab switch, debugger) never advances the loop by more than this. */
const MAX_STEP = 0.1;

interface InViewLoop<T extends Element> {
  ref: React.RefObject<T | null>;
  /** Loop time in seconds. Only advances while the element is on screen and the tab is visible. */
  time: MotionValue<number>;
  /** Set the playback rate (e.g. 1.5 on hover). Eased; never a jump. */
  setSpeed: (speed: number) => void;
  reduce: boolean;
}

/**
 * Drives an ambient loop (§4.5): a clock that runs only while `ref` is in view and the tab is
 * visible. Under reduced motion it parks at `poster` (the visual's designed final state) and
 * never ticks. Frames write a motion value, so a running loop never re-renders React.
 */
export function useInViewLoop<T extends Element>({ poster = 0 }: { poster?: number } = {}): InViewLoop<T> {
  const ref = useRef<T>(null);
  const time = useMotionValue(0);
  const speed = useRef({ current: 1, target: 1 });
  const reduce = useReducedMotion() ?? false;
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (reduce) {
      time.set(poster);
      return;
    }
    if (!inView) return;

    let raf = 0;
    let last = 0;
    const tick = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, MAX_STEP) : 0;
      last = now;
      const s = speed.current;
      s.current += (s.target - s.current) * Math.min(1, dt * SPEED_EASE);
      time.set(time.get() + dt * s.current);
      raf = requestAnimationFrame(tick);
    };
    const start = () => {
      cancelAnimationFrame(raf);
      last = 0;
      if (!document.hidden) raf = requestAnimationFrame(tick);
    };
    start();
    document.addEventListener("visibilitychange", start);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", start);
    };
  }, [inView, reduce, poster, time]);

  return {
    ref,
    time,
    setSpeed: (s: number) => {
      speed.current.target = s;
    },
    reduce,
  };
}
