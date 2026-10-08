"use client";

import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { Lead } from "@/components/ui/Lead";
import { Marker, type Tone } from "@/components/ui/Marker";
import { cn } from "@/lib/cn";
import type { Term } from "@/lib/engine/portfolio";
import { money, shortDate } from "@/lib/format";

export const num = (s: string | number | null | undefined) => (s == null || s === "" ? 0 : Number(s) + 0);

/** Money with a tone: losses in --loss, gains in --fg (the accent is reserved for actions). */
export function Money({ value, whole, className, signed }: { value: string | number; whole?: boolean; className?: string; signed?: boolean }) {
  const v = num(value);
  return (
    <span className={cn("num", signed && v < -0.004 && "text-ctx-loss", className)}>
      {signed && v > 0.004 ? "+" : ""}
      {money(v, { whole })}
    </span>
  );
}

export function qtyText(q: string | number) {
  const v = num(q);
  return Number.isInteger(v) ? v.toLocaleString("en-US") : v.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

/** "Oct 3 2026" for tables (mono). */
export function dateText(iso: string) {
  return `${shortDate(iso)} ${iso.slice(0, 4)}`;
}

/** The panel layout: explanation in a plain column (serif title, two-tone lead, plain list), the product in a wide column. */
export function Panel({
  title,
  strong,
  lead,
  notes,
  aside,
  children,
}: {
  title: ReactNode;
  strong: ReactNode;
  lead?: ReactNode;
  notes?: ReactNode[];
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
      <div className="lg:col-span-4 xl:col-span-3">
        <h2 className="text-[clamp(26px,2.4vw,34px)] leading-[1.1] font-medium tracking-[-0.015em] text-balance">
          {title}
        </h2>
        <Lead strong={strong} size="body" className="mt-4">
          {lead}
        </Lead>
        {notes && notes.length > 0 && (
          <ul className="num mt-6 space-y-2 text-meta text-muted">
            {notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        )}
        {aside}
      </div>
      <div className="min-w-0 lg:col-span-8 xl:col-span-9">{children}</div>
    </div>
  );
}

export function TermChip({ term }: { term: Term | "mixed" | "none" }) {
  const tone: Tone = term === "long" ? "longterm" : term === "1256" ? "sec1256" : "neutral";
  const label = term === "1256" ? "60/40" : term;
  return (
    <span className="num inline-flex items-center gap-1.5 text-meta text-ctx-muted">
      <Marker tone={tone} />
      <span className={term === "long" ? "text-ctx-fg" : undefined}>{label}</span>
    </span>
  );
}

export function WashFlag({ children, permanent }: { children: ReactNode; permanent?: boolean }) {
  return (
    <span className="num inline-flex items-center gap-1.5 text-meta text-ctx-fg">
      <Marker tone={permanent ? "loss" : "wash"} />
      {children}
    </span>
  );
}

const fieldClass =
  "num h-10 w-full rounded-[8px] bg-bg px-3 text-[14px] text-fg ring-hairline transition-shadow duration-(--motion-fast) ease-ui placeholder:text-muted/70 hover:shadow-[0_0_0_1px_var(--hairline-strong)] focus-visible:shadow-[0_0_0_1px_var(--hairline-strong)] disabled:opacity-50";

export function Field({ label, hint, children, className }: { label: string; hint?: ReactNode; children: (id: string) => ReactNode; className?: string }) {
  const id = useId();
  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={id} className="mb-1.5 block text-[13px] text-muted">
        {label}
      </label>
      {children(id)}
      {hint && <p className="num mt-1 text-[12px] leading-5 text-muted">{hint}</p>}
    </div>
  );
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldClass, "[color-scheme:dark]", className)} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cn(fieldClass, "appearance-none pr-9 [color-scheme:dark]", className)} {...rest}>
        {children}
      </select>
      <svg aria-hidden viewBox="0 0 12 12" className="pointer-events-none absolute top-1/2 right-3 size-3 -translate-y-1/2 text-muted">
        <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/** A table on a Surface: mono numbers, muted column heads, no ruled lines; rows lift on hover. */
export function Table({ head, children, caption, className }: { head: ReactNode[]; children: ReactNode; caption: string; className?: string }) {
  return (
    // Focusable so keyboard users can scroll it on narrow screens.
    <div className={cn("overflow-x-auto focus-visible:outline-offset-[-2px]", className)} tabIndex={0} role="region" aria-label={caption}>
      <table className="num w-full min-w-[640px] border-separate border-spacing-0 text-[13px] leading-5">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="text-left text-muted">
            {head.map((h, i) => (
              <th key={i} scope="col" className={cn("px-3 pb-3 font-normal whitespace-nowrap first:pl-5 last:pr-5", i > 0 && "text-right")}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&>tr>td]:px-3 [&>tr>td]:py-2.5 [&>tr>td:first-child]:pl-5 [&>tr>td:last-child]:pr-5 [&>tr>td:not(:first-child)]:text-right [&>tr>td]:whitespace-nowrap [&>tr:hover>td]:bg-surface-2">
          {children}
        </tbody>
      </table>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="px-5 py-10 text-center text-[14px] text-muted">{children}</p>;
}
