import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Marker, toneColor, type Tone } from "./Marker";

interface ChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  tone?: Tone;
  children: ReactNode;
  /** When set, the chip is a toggle button (aria-pressed). Otherwise it is static money-in-motion. */
  selected?: boolean;
  "data-force"?: string;
}

/**
 * Money moving between buckets (§2.6.7): a small rounded chip with a mono amount.
 * Pass `selected` + `onClick` to use it as a toggle (e.g. picking lots to harvest).
 */
export function Chip({ tone = "neutral", children, selected, className, style, ...rest }: ChipProps) {
  const color = toneColor(tone);
  const interactive = selected !== undefined;
  const classes = cn(
    "group num relative isolate inline-flex h-7 items-center gap-2 rounded-pill border px-3 text-meta text-ctx-fg whitespace-nowrap",
    interactive && "cursor-pointer transition-transform duration-(--motion-fast) ease-ui is-active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40",
    className,
  );
  const fill = `color-mix(in oklch, ${color} ${tone === "neutral" ? 8 : 14}%, transparent)`;
  const chipStyle = {
    borderColor: selected ? color : `color-mix(in oklch, ${color} 38%, transparent)`,
    backgroundColor: fill,
    ...style,
  };

  const body = (
    <>
      {interactive && (
        <span
          aria-hidden
          className="absolute inset-0 -z-10 rounded-[inherit] opacity-0 transition-opacity duration-(--motion-fast) ease-ui group-is-hover:opacity-100"
          style={{ background: `color-mix(in oklch, ${color} 14%, transparent)` }}
        />
      )}
      <Marker tone={tone} />
      <span>{children}</span>
      {interactive && (
        <svg
          aria-hidden
          viewBox="0 0 12 12"
          className={cn("-mr-1 size-3 transition-[opacity,transform] duration-(--motion-fast) ease-ui", selected ? "scale-100 opacity-100" : "scale-50 opacity-0")}
        >
          <path d="M2.5 6.5l2.2 2.2L9.5 3.8" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </>
  );

  if (!interactive) {
    return (
      <span className={classes} style={chipStyle}>
        {body}
      </span>
    );
  }
  return (
    <button type="button" aria-pressed={selected} className={classes} style={chipStyle} {...rest}>
      {body}
    </button>
  );
}
