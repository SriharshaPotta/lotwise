import { cn } from "@/lib/cn";

/**
 * PLACEHOLDER stroke. Replace with the hand-drawn, vectorized mark (public/annotations/underline.svg):
 * keep the 0 0 120 12 viewBox, or pass `viewBox` alongside your own `d`.
 */
export const PLACEHOLDER_UNDERLINE = "M2.5 8.2C14 6.9 25.5 8.9 38 8.1S62 5.6 76 6.6 101 9.1 117.5 6.2";

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
export function HandUnderline({ d = PLACEHOLDER_UNDERLINE, viewBox = "0 0 120 12", className, trigger = "hover" }: HandUnderlineProps) {
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
        strokeWidth={1.5}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        className={cn(
          "[stroke-dasharray:1_1] transition-[stroke-dashoffset] duration-(--motion-reveal) ease-ink",
          trigger === "on" ? "[stroke-dashoffset:0]" : "[stroke-dashoffset:1] group-is-hover:[stroke-dashoffset:0] group-is-focus:[stroke-dashoffset:0]",
        )}
      />
    </svg>
  );
}
