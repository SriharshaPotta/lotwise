import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";

interface LedgerRulesProps {
  /** Draw the double vertical margin rule on the left. */
  margin?: boolean;
  /** Where the margin rule sits from the left edge. Defaults to just inside the gutter. */
  marginInset?: string;
  /** Shift the rules vertically so a baseline lands on a row (px). */
  offset?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * The ruled background of accounting paper (§2.6.1): a hairline every --ledger-row and a
 * double margin rule. Purely decorative: absolutely fills its nearest positioned ancestor.
 * Colors come from the --ctx-rule tokens, so it works on ink and inside `.paper`.
 */
export function LedgerRules({ margin = true, marginInset = "calc(var(--gutter) * 0.5)", offset = 0, className, style }: LedgerRulesProps) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} style={style}>
      <div className="ledger-rules absolute inset-0" style={{ ["--ledger-offset" as string]: `${offset}px` }} />
      {margin && <div className="ledger-margin absolute inset-y-0 w-[5px]" style={{ left: marginInset }} />}
    </div>
  );
}
