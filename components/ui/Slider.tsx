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
  /** Tick marks at 0, 50 and 100%. */
  ticks?: boolean;
  /** Format the shown and spoken value (e.g. as money). Defaults to "value unit". */
  format?: (value: number) => string;
  disabled?: boolean;
  className?: string;
  "data-force"?: string;
}

const THUMB = 16;
const TICKS = [0, 0.5, 1];

/**
 * A native range input (keyboard, touch and AT support for free) over a 4px track with an
 * emerald fill up to the thumb. The fill is a sibling scaled on X, so moving the slider only
 * touches transform.
 */
export function Slider({
  label, value, onChange, min = 0, max = 100, step = 1,
  unit = { short: "sh", long: "shares" }, ticks = true, format, disabled, className, "data-force": force,
}: SliderProps) {
  const id = useId();
  const pct = (value - min) / (max - min || 1);

  return (
    <div className={cn("w-full", disabled && "opacity-40", className)}>
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="text-[14px] text-ctx-fg">
          {label}
        </label>
        <output htmlFor={id} className="num min-w-[6ch] text-right text-meta text-ctx-fg" aria-hidden>
          {format ? format(value) : <>{value} <span className="text-ctx-muted">{unit.short}</span></>}
        </output>
      </div>
      <div className="relative h-8">
        {/* track + fill sit between the thumb centres so the fill ends exactly under the thumb */}
        <div
          aria-hidden
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-[color-mix(in_oklch,var(--ctx-fg)_12%,transparent)]"
          style={{ left: THUMB / 2, right: THUMB / 2 }}
        />
        <div
          aria-hidden
          className="absolute top-1/2 h-1 origin-left rounded-full bg-ctx-accent"
          style={{ left: THUMB / 2, right: THUMB / 2, transform: `translateY(-50%) scaleX(${pct})` }}
        />
        {ticks && (
          <div aria-hidden className="absolute top-[calc(50%+8px)]" style={{ left: THUMB / 2, right: THUMB / 2 }}>
            {TICKS.map((t) => (
              <span key={t} className="absolute h-1.5 w-px -translate-x-1/2 bg-ctx-line" style={{ left: `${t * 100}%` }} />
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
          aria-valuetext={format ? format(value) : `${value} ${unit.long}`}
          onChange={(e) => onChange(Number(e.currentTarget.value))}
          className="lw-range absolute inset-0 h-8 w-full"
        />
      </div>
    </div>
  );
}
