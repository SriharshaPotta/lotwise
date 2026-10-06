import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { Hatch } from "./Hatch";

/**
 * A wash window in a vertical ledger (§2.6.7): an amber hatched band in the date gutter beside
 * the rows it covers, so the hatch never sits under text. Size it with className/style.
 */
export function WashWindow({ className, style }: { className?: string; style?: CSSProperties }) {
  return <Hatch variant="wash" as="div" className={cn("w-2.5 rounded-[3px]", className)} style={style} />;
}
