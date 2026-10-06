import { ANNOTATIONS } from "@/lib/annotations";
import { cn } from "@/lib/cn";

/** The hand-drawn mark (public/annotations/underline.svg), or its placeholder. See scripts/annotations.mjs. */
export const UNDERLINE = ANNOTATIONS.underline;

interface HandUnderlineProps {
  d?: string;
  viewBox?: string;
  className?: string;
  /** Draw state: "hover" draws on when the nearest `.group` is hovered or focused; "on" is always drawn. */
  trigger?: "hover" | "on";
}

/**
 * A hand-drawn underline (§2.6.6) that draws on with ink easing. Sits under its positioned parent;
 * stretches to the parent's width while the stroke weight stays constant.
 */
export function HandUnderline({ d = UNDERLINE.d, viewBox = UNDERLINE.viewBox, className, trigger = "hover" }: HandUnderlineProps) {
  return (
    <svg
      aria-hidden
      viewBox={viewBox}
      preserveAspectRatio="none"
      className={cn("pointer-events-none absolute inset-x-0 -bottom-1.5 h-2.5 w-full overflow-visible", className)}
    >
      <path
        d={d}
        pathLength={1}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        className={cn(
          "[stroke-dasharray:1_1.01] transition-[stroke-dashoffset] duration-(--motion-reveal) ease-ink",
          trigger === "on" ? "[stroke-dashoffset:0]" : "[stroke-dashoffset:1] group-is-hover:[stroke-dashoffset:0] group-is-focus:[stroke-dashoffset:0]",
        )}
      />
    </svg>
  );
}
