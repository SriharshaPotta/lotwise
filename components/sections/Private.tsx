"use client";

import { m, useInView, useReducedMotion } from "motion/react";
import { useRef, type ReactNode } from "react";
import { Lead } from "@/components/ui/Lead";
import { Surface } from "@/components/ui/Surface";
import { LEDGER_ACCOUNTS, convergence } from "@/lib/demo";
import { print, reveal } from "@/lib/motion";

const COPY = {
  strong: "The tax engine runs on your device.",
  rest: "It’s written in Rust and compiled to WebAssembly. There is no backend to send your trades to.",
};

const data = convergence();
/** What the engine just did, on this device. Same demo portfolio as the convergence section. */
const LINES: [string, string][] = [
  ["Accounts read", String(LEDGER_ACCOUNTS.length)],
  ["Trades checked", String(data.entries.length)],
  ["Wash sales found", "1"],
  ["Sent to a server", "0 bytes"],
];

/** §4.6. */
export function Private() {
  return (
    <section id="private" aria-labelledby="private-title" className="page-container relative scroll-mt-24">
      <m.h2 id="private-title" {...reveal} className="max-w-[16ch] text-h2 lg:max-w-[20ch]">
        Your trades never leave your browser.
      </m.h2>
      <div className="mt-12 grid gap-12 lg:mt-16 lg:grid-cols-12 lg:gap-8">
        <m.div {...reveal} className="lg:col-span-4">
          <Lead strong={COPY.strong}>{COPY.rest}</Lead>
        </m.div>
        <m.div {...reveal} className="lg:col-span-8">
          <Sandbox />
          <p className="sr-only">The engine runs inside your browser. Our servers have received 0 bytes.</p>
        </m.div>
      </div>
    </section>
  );
}

/**
 * The browser: a Surface with a small receipt printing inside it, line items typing in, once, when
 * it comes into view. Beside it, the dashed box for our servers, where nothing arrives.
 */
function Sandbox() {
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef, { once: true, amount: 0.4 });
  const reduce = useReducedMotion() ?? false;
  const printing = inView || reduce;

  return (
    <div ref={rootRef} aria-hidden className="flex flex-col items-stretch gap-8 lg:flex-row lg:items-center">
      <Surface className="h-80 min-w-0 flex-1 overflow-hidden">
        <div className="num flex h-10 items-center justify-between px-4 text-meta text-muted shadow-[0_1px_0_var(--hairline)]">
          <span>your browser</span>
          <span>on this device</span>
        </div>
        <div className="relative flex h-[calc(100%-2.5rem)] justify-center px-6 pt-8">
          {/* the slot the receipt feeds out of */}
          <span className="absolute inset-x-[max(1.5rem,calc(50%-11rem))] top-8 h-px rounded-full bg-rule-strong" />
          <div className="relative w-full max-w-[20rem] overflow-hidden">
            <m.div
              initial={{ y: reduce ? "0%" : "-100%" }}
              animate={printing ? (reduce ? { y: "0%" } : { y: [...print.feedY] }) : undefined}
              transition={reduce ? { duration: 0 } : { duration: print.feedDuration, times: [...print.feedTimes], ease: "linear" }}
              className="paper-shadow-sm px-1 pb-4"
            >
              <div className="paper paper-fiber perforated num px-4 py-4 text-[12px] leading-6 text-ink">
                <Line i={0} shown={printing} instant={reduce} className="receipt-caps flex justify-between text-[11px] text-ink-muted">
                  <span>lotwise · engine</span>
                  <span>wasm</span>
                </Line>
                {LINES.map(([label, value], i) => (
                  <Line key={label} i={i + 1} shown={printing} instant={reduce} className="flex items-end gap-1.5">
                    <span className="receipt-caps whitespace-nowrap">{label}</span>
                    <span className="receipt-leader min-w-4 flex-1 self-stretch" />
                    <span className="receipt-caps whitespace-nowrap">{value}</span>
                  </Line>
                ))}
              </div>
            </m.div>
          </div>
        </div>
      </Surface>

      {/* Our servers: nothing arrives. */}
      <div className="num flex h-40 shrink-0 flex-col justify-center rounded-lg border border-dashed border-border px-6 lg:w-52">
        <span className="text-meta text-muted">our servers</span>
        <span className="mt-2 text-[40px] leading-none text-accent">0</span>
        <span className="mt-2 text-meta text-muted">bytes received</span>
      </div>
    </div>
  );
}

/** One receipt line: fades in after the feed, 40ms after the one before (§2.6.2). */
function Line({ i, shown, instant, className, children }: { i: number; shown: boolean; instant: boolean; className?: string; children: ReactNode }) {
  return (
    <m.div
      initial={{ opacity: instant ? 1 : 0 }}
      animate={{ opacity: shown ? 1 : 0 }}
      transition={instant ? { duration: 0 } : { duration: print.lineFade, delay: print.feedDuration + i * print.lineGap }}
      className={className}
    >
      {children}
    </m.div>
  );
}
