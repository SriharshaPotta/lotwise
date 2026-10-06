"use client";

import { m } from "motion/react";
import { useId, useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import { spring } from "@/lib/motion";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedProps<T extends string> {
  /** Accessible name for the group, e.g. "Account". */
  label: string;
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  /** Fill the container, options sharing the width equally. */
  stretch?: boolean;
  className?: string;
  /** Review only: "focus" pins focus on the selected option, "hover" on the first unselected one. */
  "data-force"?: string;
}

/**
 * A radio group drawn as a segmented control: a pill track with a hairline ring; the active
 * segment is a raised plate with its own ring. Roving tabindex; arrows, Home and End move and
 * select. The selection plate slides on the paper spring (transform only, via layoutId).
 */
export function Segmented<T extends string>({ label, options, value, onChange, disabled, stretch, className, "data-force": force }: SegmentedProps<T>) {
  const groupId = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const firstUnselected = options.findIndex((o) => o.value !== value);

  const move = (to: number) => {
    const i = (to + options.length) % options.length;
    onChange(options[i].value);
    refs.current[i]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const keys: Record<string, number> = {
      ArrowRight: selectedIndex + 1, ArrowDown: selectedIndex + 1,
      ArrowLeft: selectedIndex - 1, ArrowUp: selectedIndex - 1,
      Home: 0, End: options.length - 1,
    };
    if (e.key in keys) {
      e.preventDefault();
      move(keys[e.key]);
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-disabled={disabled || undefined}
      onKeyDown={disabled ? undefined : onKeyDown}
      className={cn("ring-hairline max-w-full rounded-pill p-[3px]", stretch ? "flex w-full sm:inline-flex sm:w-auto" : "inline-flex", disabled && "opacity-40", className)}
    >
      {options.map((o, i) => {
        const selected = i === selectedIndex;
        const pinned = force?.includes("focus") && selected ? "focus" : force?.includes("hover") && i === firstUnselected ? "hover" : undefined;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            disabled={disabled}
            data-force={pinned}
            onClick={() => onChange(o.value)}
            className={cn(
              "group relative isolate h-8 rounded-pill whitespace-nowrap",
              stretch ? "min-w-0 flex-auto px-1 text-[13px] sm:flex-none sm:px-3 sm:text-[14px]" : "shrink-0 px-3 text-[14px]",
              "transition-transform duration-(--motion-fast) ease-ui is-active:scale-[0.97] disabled:cursor-not-allowed",
              "text-ctx-muted",
            )}
          >
            {selected && (
              <m.span
                aria-hidden
                layoutId={`${groupId}-plate`}
                transition={spring.paper}
                className="absolute inset-0 -z-10 rounded-[inherit] bg-ctx-raised shadow-[0_0_0_1px_var(--ctx-hairline-strong)]"
              />
            )}
            {!selected && (
              <span
                aria-hidden
                className="absolute inset-0 -z-10 rounded-[inherit] bg-[color-mix(in_oklch,var(--ctx-fg)_4%,transparent)] opacity-0 transition-opacity duration-(--motion-fast) ease-ui group-is-hover:opacity-100"
              />
            )}
            {o.label}
            {/* the --fg colour crossfades over the muted label (opacity only, §2.5) */}
            <span
              aria-hidden
              className={cn(
                "absolute inset-0 grid place-items-center text-ctx-fg transition-opacity duration-(--motion-fast) ease-ui",
                selected ? "opacity-100" : "opacity-0 group-is-hover:opacity-100",
              )}
            >
              {o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
