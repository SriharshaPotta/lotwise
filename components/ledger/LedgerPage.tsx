import type { CSSProperties, ReactNode } from "react";
import { Surface } from "@/components/ui/Surface";

interface LedgerPageProps {
  title?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * A broker's ledger as a Surface (§2.4, §4.4, §4.7). The header and footer are each two rows
 * tall and every line item is one row, but no rules are drawn inside: rules belong to the page.
 */
export function LedgerPage({ title, children, footer, className, style }: LedgerPageProps) {
  return (
    <Surface className={className} style={style}>
      {title !== undefined && <div className="num relative flex h-16 items-center px-5 text-meta text-muted">{title}</div>}
      {children !== undefined && <div className="relative">{children}</div>}
      {footer !== undefined && <div className="relative flex min-h-16 flex-col justify-center gap-2 px-5 py-3">{footer}</div>}
    </Surface>
  );
}
