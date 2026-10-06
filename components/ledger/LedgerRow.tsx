import { cn } from "@/lib/cn";
import { account, type LedgerEntry } from "@/lib/demo";
import { money, shortDate } from "@/lib/format";

interface LedgerRowProps {
  entry: LedgerEntry;
  /** Realized estimate shown on the proposed sale. */
  proposedRealized?: number;
  className?: string;
}

/** One ledger line, one row tall: date, trade, and for the proposed sale its estimated loss. */
export function LedgerRow({ entry, proposedRealized, className }: LedgerRowProps) {
  return (
    <div className={cn("num flex h-8 items-center text-meta whitespace-nowrap", className)}>
      <span className="w-16 shrink-0 text-muted">{shortDate(entry.date)}</span>
      <span className="text-fg">{entry.label}</span>
      {entry.proposed && (
        <>
          {proposedRealized !== undefined && <span className="ml-3 text-loss">{money(proposedRealized, { whole: true })}</span>}
          <span className="ml-3 hidden text-muted sm:inline">proposed</span>
        </>
      )}
    </div>
  );
}

/** The account a row came from, shown once the ledgers are merged. */
export function AccountTag({ entry, className }: { entry: LedgerEntry; className?: string }) {
  return <span className={cn("num text-[12px] text-muted", className)}>{account(entry.account).name}</span>;
}
