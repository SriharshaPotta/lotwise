import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Marker, toneColor, type Tone } from "./Marker";

interface BadgeProps {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}

/** A status line on a ledger ("No issues found", "1 wash sale · $1,840 disallowed"). Not interactive. */
export function Badge({ tone = "neutral", children, className }: BadgeProps) {
  const color = toneColor(tone);
  return (
    <span
      className={cn(
        "num inline-flex h-7 items-center gap-2 rounded-sm border px-2.5 text-meta whitespace-nowrap",
        tone === "neutral" ? "text-ctx-muted" : "text-ctx-fg",
        className,
      )}
      style={{
        borderColor: `color-mix(in oklch, ${color} ${tone === "neutral" ? 45 : 40}%, transparent)`,
        backgroundColor: tone === "neutral" ? "transparent" : `color-mix(in oklch, ${color} 10%, transparent)`,
      }}
    >
      <Marker tone={tone} />
      <span style={tone === "neutral" ? undefined : { color }}>{children}</span>
    </span>
  );
}
