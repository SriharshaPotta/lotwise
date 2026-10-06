"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Surface } from "@/components/ui/Surface";
import { cn } from "@/lib/cn";

/**
 * The shell every explainer interactive sits in (§5): a full-width dark ruled card with a mono
 * header (what's being simulated, and how to drive it) and a polite live region outside it.
 */
export function ExplainerFrame({
  label,
  title,
  hint,
  controls,
  spoken,
  children,
}: {
  /** Accessible name of the whole figure. */
  label: string;
  title: ReactNode;
  hint: string;
  /** Optional controls shown under the header (toggles, segmented controls). */
  controls?: ReactNode;
  /** One-sentence summary of the current state, announced politely. */
  spoken: string;
  children: ReactNode;
}) {
  return (
    <figure className="breakout not-prose my-16" aria-label={label}>
      <Surface className="overflow-hidden">
        <div className="relative">
          <header className="num flex min-h-16 flex-wrap items-center justify-between gap-x-6 gap-y-1 px-5 py-4 text-meta sm:px-8">
            <span className="text-fg">{title}</span>
            <span className="text-muted">{hint}</span>
          </header>
          {controls && <div className="flex flex-wrap items-center gap-x-6 gap-y-4 px-5 pb-4 sm:px-8">{controls}</div>}
          {children}
        </div>
      </Surface>
      <p className="sr-only" aria-live="polite">
        {spoken}
      </p>
    </figure>
  );
}

/** A summary sentence that only updates once input settles, so a drag isn't read out day by day. */
export function useSettled(text: string, delay = 450): string {
  const [settled, setSettled] = useState(text);
  useEffect(() => {
    const id = window.setTimeout(() => setSettled(text), delay);
    return () => clearTimeout(id);
  }, [text, delay]);
  return settled;
}

/** The ledger footer of an explainer: labelled readouts, two per row on phones. */
export function Readouts({ children, cols = 4 }: { children: ReactNode; cols?: 2 | 3 | 4 }) {
  return (
    <dl
      className={cn(
        "readouts grid grid-cols-2 border-t border-hairline",
        cols === 4 && "md:grid-cols-4",
        cols === 3 && "md:grid-cols-3",
      )}
    >
      {children}
    </dl>
  );
}

export function Readout({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-border px-5 py-4 sm:px-8">
      <dt className="num flex h-8 items-center text-meta text-muted">{label}</dt>
      <dd className="num flex h-8 items-center text-[20px] whitespace-nowrap text-fg">{children}</dd>
    </div>
  );
}
