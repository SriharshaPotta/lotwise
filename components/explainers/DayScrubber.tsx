"use client";

import { motion } from "motion/react";
import { useCallback, useRef, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface DayScrubberProps {
  /** Number of days on the strip; values run 0..days-1. */
  days: number;
  value: number;
  onChange: (day: number) => void;
  /** ISO date of a day index (for month ticks). */
  dateOf: (day: number) => string;
  /** Accessible name and spoken value of the marker. */
  label: string;
  valueText: string;
  /** Mono label under the marker ("buy back Oct 22"). */
  markerLabel: ReactNode;
  /** Layers drawn behind the marker: windows, ticks, other events. Get a day → % helper. */
  children?: (pct: (day: number) => number) => ReactNode;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const springy = { type: "spring", stiffness: 900, damping: 60, mass: 0.6 } as const;

/**
 * A calendar strip with one draggable date marker (§5). The marker is a real slider: drag it,
 * tap the strip, or use the keyboard (arrow = 1 day, Shift+arrow = 1 week, Home/End). It moves by
 * transform only. Geometry: events live between 32px and 112px; the axis sits at 112px.
 */
export function DayScrubber({ days, value, onChange, dateOf, label, valueText, markerLabel, children }: DayScrubberProps) {
  const last = days - 1;
  const pct = useCallback((d: number) => (d / last) * 100, [last]);
  const clamp = (d: number) => Math.min(last, Math.max(0, Math.round(d)));
  const trackRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const dayAt = (clientX: number) => {
    const r = trackRef.current!.getBoundingClientRect();
    return clamp(((clientX - r.left) / r.width) * last);
  };
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    onChange(dayAt(e.clientX));
    handleRef.current?.focus({ preventScroll: true });
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging.current) onChange(dayAt(e.clientX));
  };
  const stop = () => {
    dragging.current = false;
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 7 : 1;
    const next =
      e.key === "ArrowRight" || e.key === "ArrowUp" ? value + step
      : e.key === "ArrowLeft" || e.key === "ArrowDown" ? value - step
      : e.key === "PageUp" ? value + 7
      : e.key === "PageDown" ? value - 7
      : e.key === "Home" ? 0
      : e.key === "End" ? last
      : null;
    if (next === null) return;
    e.preventDefault();
    onChange(clamp(next));
  };

  const monthStarts = Array.from({ length: days }, (_, d) => d).filter((d) => dateOf(d).endsWith("-01"));
  const align = value > last * 0.88 ? "-translate-x-full" : value < last * 0.12 ? "" : "-translate-x-1/2";

  return (
    <div className="px-5 pt-8 pb-4 sm:px-8">
      <div
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={stop}
        onPointerCancel={stop}
        className="relative h-40 cursor-ew-resize touch-pan-y select-none"
      >
        {children?.(pct)}

        <div aria-hidden className="absolute inset-x-0 top-28 h-px bg-border" />
        {Array.from({ length: days }, (_, d) => (
          <span
            key={d}
            aria-hidden
            className={cn("absolute top-28 w-px", monthStarts.includes(d) ? "h-3 bg-muted" : "h-1.5 bg-border")}
            style={{ left: `${pct(d)}%` }}
          />
        ))}
        {monthStarts.map((d) => (
          <span key={d} aria-hidden className="num absolute top-32 -translate-x-1/2 text-[12px] text-muted" style={{ left: `${pct(d)}%` }}>
            {MONTHS[Number(dateOf(d).slice(5, 7)) - 1]}
          </span>
        ))}

        {/* a full-width layer moved by transform, so dragging never touches layout */}
        <motion.div aria-hidden className="pointer-events-none absolute inset-0" initial={false} animate={{ x: `${pct(value)}%` }} transition={springy}>
          <div className="absolute top-10 left-0 h-[4.5rem] w-px -translate-x-1/2 bg-fg" />
          <span className={cn("num absolute top-[8.75rem] text-[12px] whitespace-nowrap text-fg", align)}>{markerLabel}</span>
        </motion.div>
        <motion.div className="pointer-events-none absolute inset-0" initial={false} animate={{ x: `${pct(value)}%` }} transition={springy}>
          <div
            ref={handleRef}
            role="slider"
            tabIndex={0}
            aria-label={label}
            aria-valuemin={0}
            aria-valuemax={last}
            aria-valuenow={value}
            aria-valuetext={valueText}
            aria-orientation="horizontal"
            onKeyDown={onKeyDown}
            className="group pointer-events-auto absolute top-28 left-0 grid size-11 -translate-1/2 cursor-grab touch-none place-items-center rounded-full outline-none active:cursor-grabbing"
          >
            <span className="size-[18px] rounded-full border-2 border-fg bg-surface shadow-[0_0_0_3px_var(--surface)] transition-transform duration-(--motion-fast) ease-ui group-hover:scale-110 group-focus-visible:outline-2 group-focus-visible:outline-offset-3 group-focus-visible:outline-accent group-active:scale-125" />
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/** An event on the strip: a coloured vertical line from the label row to the axis. */
export function StripEvent({ at, className, label, labelClassName }: { at: number; className: string; label?: ReactNode; labelClassName?: string }) {
  return (
    <>
      <div aria-hidden className={cn("absolute top-6 h-[5.5rem] w-0.5 -translate-x-1/2 rounded-full", className)} style={{ left: `${at}%` }} />
      {label && (
        <span aria-hidden className={cn("num absolute top-0 -translate-x-1/2 text-[12px] whitespace-nowrap text-fg", labelClassName)} style={{ left: `${at}%` }}>
          {label}
        </span>
      )}
    </>
  );
}
