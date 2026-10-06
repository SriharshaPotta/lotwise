import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { LedgerRules } from "./LedgerRules";

interface LedgerPageProps {
  title?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * A dark ruled ledger card (§2.4, §4.4, §4.7): hairline border, small radius, faint rules every
 * --ledger-row. The header and footer are each two rows tall, so every line item sits on a rule.
 */
export function LedgerPage({ title, children, footer, className, style }: LedgerPageProps) {
  return (
    <div className={cn("relative overflow-hidden rounded-md border border-border bg-surface", className)} style={style}>
      <LedgerRules margin={false} />
      {title !== undefined && <div className="num relative flex h-16 items-center px-5 text-meta text-muted">{title}</div>}
      {children !== undefined && <div className="relative">{children}</div>}
      {footer !== undefined && <div className="relative flex min-h-16 flex-col justify-center gap-2 px-5 py-3">{footer}</div>}
    </div>
  );
}
