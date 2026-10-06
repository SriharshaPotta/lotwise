"use client";

import { animate, m, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, type CSSProperties } from "react";
import { Chip } from "@/components/ui/Chip";
import { ease, reveal, spring } from "@/lib/motion";

const COPY =
  "The tax engine is written in Rust and compiled to WebAssembly. It runs on your device. There is no backend to send your trades to.";

/** Data dots circling the engine: [orbit radius px, seconds per turn, direction, dot angles°]. */
const ORBITS = [
  { r: 72, period: 26, dir: 1, dots: [20, 150, 260] },
  { r: 106, period: 38, dir: -1, dots: [70, 200, 320] },
  { r: 132, period: 52, dir: 1, dots: [110, 235] },
] as const;

/** Dots that try to leave: start offsets from the window centre (px). */
const ESCAPEES = [
  { x: 54, y: -34, delay: 0 },
  { x: 86, y: 22, delay: 0.18 },
  { x: 30, y: 58, delay: 0.34 },
] as const;

/** §4.6. */
export function Private() {
  return (
    <section id="private" aria-labelledby="private-title" className="page-container relative scroll-mt-24">
      <m.h2 id="private-title" {...reveal} className="max-w-[16ch] text-h2 lg:max-w-[20ch]">
        Your trades never leave your browser.
      </m.h2>
      <div className="mt-12 grid gap-12 lg:mt-16 lg:grid-cols-12 lg:gap-8">
        <m.p {...reveal} className="max-w-[44ch] text-lead text-muted lg:col-span-4">
          {COPY}
        </m.p>
        <m.div {...reveal} className="lg:col-span-8">
          <Sandbox />
          <p className="sr-only">The engine runs inside your browser. Our servers have received 0 bytes.</p>
        </m.div>
      </div>
    </section>
  );
}

function Sandbox() {
  const rootRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const dotRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const inView = useInView(rootRef, { amount: 0.4 });
  const reduce = useReducedMotion();

  // Each time the section comes into view, a few dots drift for the window's edge (toward our
  // servers) and spring back. The edge is measured, so the drift fits any width.
  useEffect(() => {
    const inner = innerRef.current;
    if (!inView || reduce || !inner) return;
    const sideways = window.matchMedia("(min-width: 1024px)").matches;
    const box = inner.getBoundingClientRect();
    const runs = dotRefs.current.map((el, i) => {
      if (!el) return null;
      const d = el.getBoundingClientRect();
      const to = sideways ? { x: box.right - d.right - 4, y: 0 } : { x: 0, y: box.bottom - d.bottom - 4 };
      const delay = 0.25 + ESCAPEES[i].delay;
      const run: { out: ReturnType<typeof animate>; back?: ReturnType<typeof animate> } = {
        out: animate(el, to, { duration: 1.1, ease: ease.settle, delay }),
      };
      run.out.then(() => {
        run.back = animate(el, { x: 0, y: 0 }, spring.paper);
      });
      return run;
    });
    return () => runs.forEach((r) => {
      r?.out.stop();
      r?.back?.stop();
    });
  }, [inView, reduce]);

  return (
    <div ref={rootRef} aria-hidden className="flex flex-col items-stretch gap-8 lg:flex-row lg:items-center">
      {/* The browser: a hairline window, no chrome beyond a label strip. */}
      <div className="relative h-80 min-w-0 flex-1 overflow-hidden rounded-lg border border-[color-mix(in_oklch,var(--fg)_22%,transparent)] bg-bg">
        <div className="num flex h-8 items-center justify-between border-b border-border px-4 text-meta text-muted">
          <span>your browser</span>
          <span>on this device</span>
        </div>
        <div ref={innerRef} className="relative h-72 overflow-hidden">
          {ORBITS.map((o, i) => (
            <div
              key={i}
              className="absolute top-1/2 left-1/2 rounded-full border border-rule"
              style={{ width: o.r * 2, height: o.r * 2, marginLeft: -o.r, marginTop: -o.r }}
            >
              <div
                className="orbit absolute inset-0"
                data-paused={inView ? undefined : ""}
                style={{ "--orbit-dur": `${o.period}s`, "--orbit-dir": o.dir === 1 ? "normal" : "reverse" } as CSSProperties}
              >
                {o.dots.map((a) => (
                  <span
                    key={a}
                    className="absolute top-1/2 left-1/2 -mt-[2.5px] -ml-[2.5px] size-[5px] rounded-full bg-[color-mix(in_oklch,var(--fg)_70%,transparent)]"
                    style={{ transform: `rotate(${a}deg) translateX(${o.r}px)` }}
                  />
                ))}
              </div>
            </div>
          ))}
          {ESCAPEES.map((e, i) => (
            <span
              key={i}
              ref={(el) => {
                dotRefs.current[i] = el;
              }}
              className="absolute top-1/2 left-1/2 -mt-[2.5px] -ml-[2.5px] size-[5px] rounded-full bg-[color-mix(in_oklch,var(--fg)_70%,transparent)]"
              style={{ translate: `${e.x}px ${e.y}px` }}
            />
          ))}
          <div className="absolute inset-0 flex items-center justify-center">
            <Chip tone="neutral" className="h-8 bg-surface px-4">Rust → WebAssembly</Chip>
          </div>
        </div>
      </div>

      {/* Our servers: nothing arrives. */}
      <div className="num flex h-40 shrink-0 flex-col justify-center rounded-lg border border-dashed border-border px-6 lg:w-52">
        <span className="text-meta text-muted">our servers</span>
        <span className="mt-2 text-[40px] leading-none text-accent">0</span>
        <span className="mt-2 text-meta text-muted">bytes received</span>
      </div>
    </div>
  );
}
