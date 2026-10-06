"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";

interface SliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Unit shown after the value and read out by screen readers ("sh" → "40 shares"). */
  unit?: { short: string; long: string };
  /** Tick marks every N units, like the rules of a ledger. 0 hides them. */
  tickEvery?: number;
  disabled?: boolean;
  className?: string;
  "data-force"?: string;
}

const THUMB = 18;

/**
 * A native range input (keyboard, touch and AT support for free) over a hairline track.
 * The fill is a sibling scaled on X, so moving the slider only touches transform.
 */
export function Slider({
  label, value, onChange, min = 0, max = 100, step = 1,
  unit = { short: "sh", long: "shares" }, tickEvery = 10, disabled, className, "data-force": force,
}: SliderProps) {
  const id = useId();
  const pct = (value - min) / (max - min || 1);
  const ticks = tickEvery > 0 ? Math.floor((max - min) / tickEvery) + 1 : 0;

  return (
    <div className={cn("w-full", disabled && "opacity-40", className)}>
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="text-[14px] text-ctx-fg">
          {label}
        </label>
        <output htmlFor={id} className="num text-meta text-ctx-fg" aria-hidden>
          {value} <span className="text-ctx-muted">{unit.short}</span>
        </output>
      </div>
      <div className="relative h-8">
        {/* track + fill sit between the thumb centres so the fill ends exactly under the thumb */}
        <div aria-hidden className="absolute top-1/2 h-px -translate-y-1/2 bg-ctx-line" style={{ left: THUMB / 2, right: THUMB / 2 }} />
        <div
          aria-hidden
          className="absolute top-1/2 h-0.5 origin-left rounded-full bg-ctx-fg"
          style={{ left: THUMB / 2, right: THUMB / 2, transform: `translateY(-50%) scaleX(${pct})` }}
        />
        {ticks > 0 && (
          <div aria-hidden className="absolute top-[calc(50%+7px)] flex justify-between" style={{ left: THUMB / 2 - 0.5, right: THUMB / 2 - 0.5 }}>
            {Array.from({ length: ticks }, (_, i) => (
              <span key={i} className={cn("w-px bg-ctx-line", i % 5 === 0 ? "h-2" : "h-1")} />
            ))}
          </div>
        )}
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          data-force={force}
          aria-valuetext={`${value} ${unit.long}`}
          onChange={(e) => onChange(Number(e.currentTarget.value))}
          className="lw-range absolute inset-0 h-8 w-full"
        />
      </div>
    </div>
  );
}
