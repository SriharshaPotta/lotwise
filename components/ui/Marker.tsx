import { cn } from "@/lib/cn";

export type Tone = "neutral" | "gain" | "loss" | "wash" | "longterm" | "sec1256";

/** CSS color for a tone in the current context (ink or `.paper`). */
export const toneColor = (tone: Tone) => (tone === "neutral" ? "var(--ctx-muted)" : `var(--ctx-${tone})`);

/**
 * The finance grammar (§2.6.7) at glyph size: a lot is a rounded bar, a wash window is an amber
 * hatched block, the long-term date is a violet tick, Section 1256 is a 60/40 split bar.
 */
export function Marker({ tone, className }: { tone: Tone; className?: string }) {
  if (tone === "neutral") return null;
  const color = toneColor(tone);
  const base = cn("shrink-0", className);

  switch (tone) {
    case "wash":
      return <span aria-hidden className={cn(base, "hatch-wash inline-block h-2.5 w-4 rounded-[2px]")} />;
    case "longterm":
      return <span aria-hidden className={cn(base, "inline-block h-3 w-0.5 rounded-full")} style={{ background: color }} />;
    case "sec1256":
      return (
        <span aria-hidden className={cn(base, "inline-flex h-1 w-3.5 gap-px")}>
          <span className="h-full w-[60%] rounded-l-full" style={{ background: color }} />
          <span className="h-full w-[40%] rounded-r-full opacity-50" style={{ background: color }} />
        </span>
      );
    default:
      return <span aria-hidden className={cn(base, "inline-block h-1 w-3 rounded-full")} style={{ background: color }} />;
  }
}
