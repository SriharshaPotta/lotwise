import Link from "next/link";
import { Hatch } from "@/components/viz/Hatch";
import { cn } from "@/lib/cn";

/** Lotwise in Newsreader italic 500, 22px, after a 12px square of fine emerald hatching (§4.0). */
export function Wordmark({ className }: { className?: string }) {
  return (
    <Link href="/" aria-label="Lotwise home" className={cn("inline-flex items-center gap-2.5 rounded-[2px]", className)}>
      <Hatch variant="accent" className="size-3 shadow-[inset_0_0_0_1px_var(--accent)]" />
      <span className="font-display text-[22px] leading-none font-medium italic">Lotwise</span>
    </Link>
  );
}
