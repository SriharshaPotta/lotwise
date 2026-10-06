import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface CouponProps {
  /** The condition, e.g. "Sell on or after Nov 3". */
  when: ReactNode;
  /** The payoff, e.g. "keep the full $1,840 deduction". */
  then: ReactNode;
  className?: string;
  /** The left edge sits under the receipt (wide layout): pad the copy clear of it. */
  tucked?: boolean;
}

/**
 * A better alternative as a tear-off coupon (§2.6.4): paper, a dashed inner border and notched
 * left and right edges. The shadow lives on a wrapper because the notch mask would clip it.
 */
export function Coupon({ when, then, className, tucked }: CouponProps) {
  return (
    <div className={cn("paper-shadow-sm", className)}>
      <div className="paper paper-fiber coupon-notch rounded-[4px] p-1.5">
        <div className={cn("rounded-[2px] border border-dashed border-[color-mix(in_oklch,var(--ink)_32%,transparent)] px-5 py-3", tucked && "xl:pl-10")}>
          <p className="num text-[12px] leading-5 text-ink-muted">{when}</p>
          <p className="mt-0.5 text-[14px] leading-5 text-ink">
            <span aria-hidden className="mr-1.5 text-ink-muted">→</span>
            {then}
          </p>
        </div>
      </div>
    </div>
  );
}
