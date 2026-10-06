"use client";

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { bezierTimeFor } from "@/lib/easing";
import { DRIFT_SECONDS_PER_SCREEN, duration, ease, heroTimeline } from "@/lib/motion";
import {
  DAYS_PER_TILE,
  LOT_AT,
  UNDERWATER_LOT,
  WASH_WINDOW_DAYS,
  lowestIndex,
  periodicSeries,
  sampleAt,
  smoothPath,
  toPoints,
  washWindowRows,
} from "@/lib/viz/priceLine";

const LOT_W = 22;
const LOT_H = 5;
/** Keeps the line off the lane's top and bottom rules. */
const PAD = 10;

interface Size {
  w: number;
  h: number;
}

/**
 * The living ledger (§2.6.1): an emerald price line that draws itself across the ledger rows,
 * lot bars that fade in as the ink reaches them, and an amber hatched wash window that settles
 * around the dip. Then the whole tile drifts left one screen width per minute, looping on a
 * second identical tile. Paused offscreen and in hidden tabs; static under reduced motion.
 *
 * Fills its positioned parent vertically and bleeds to the viewport edges horizontally.
 * Decorative only (aria-hidden).
 */
export function PriceLineDraw({ className }: { className?: string }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const driftRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<Size | null>(null);
  const patternId = `wash-hatch-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  // Measure the lane. Only width changes regenerate the path (height is fixed by CSS).
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      const h = Math.round(entry.contentRect.height);
      setSize((prev) => (prev && Math.abs(prev.w - w) < 2 && prev.h === h ? prev : { w, h }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Pause the drift when the lane is offscreen or the tab is hidden.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || !size) return;
    let visible = true;
    const apply = () => {
      const drift = driftRef.current;
      if (!drift) return;
      if (visible && document.visibilityState === "visible") delete drift.dataset.paused;
      else drift.dataset.paused = "";
    };
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      apply();
    });
    io.observe(frame);
    document.addEventListener("visibilitychange", apply);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", apply);
    };
  }, [size]);

  const geo = useMemo(() => (size ? buildGeometry(size) : null), [size]);

  return (
    <div
      ref={frameRef}
      aria-hidden
      className={cn("pointer-events-none absolute inset-y-0 left-1/2 w-screen -translate-x-1/2 overflow-hidden", className)}
    >
      {size && geo && (
        <div
          ref={driftRef}
          className="drift absolute inset-y-0 left-0"
          style={{ width: size.w * 2, "--d": `${heroTimeline.drift}s`, "--drift-dur": `${DRIFT_SECONDS_PER_SCREEN}s` } as CSSProperties}
        >
          <svg width={size.w * 2} height={size.h} viewBox={`0 0 ${size.w * 2} ${size.h}`} className="block overflow-visible">
            <defs>
              <pattern id={patternId} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="1.5" height="6" style={{ fill: "var(--wash)" }} />
              </pattern>
            </defs>
            {[0, 1].map((tile) => (
              <Tile key={tile} tile={tile} w={size.w} h={size.h} geo={geo} patternId={patternId} />
            ))}
          </svg>
        </div>
      )}
    </div>
  );
}

type Geometry = ReturnType<typeof buildGeometry>;

function buildGeometry({ w, h }: Size) {
  const series = periodicSeries();
  const points = toPoints(series, w, h, PAD);
  const dip = points[lowestIndex(series)];
  const windowW = (WASH_WINDOW_DAYS / DAYS_PER_TILE) * w;
  const lots = LOT_AT.map((t, i) => ({
    ...sampleAt(points, t),
    // appear the moment the ink reaches them
    delay: heroTimeline.line + bezierTimeFor(t, ease.ink) * duration.inkLine,
    underwater: i === UNDERWATER_LOT,
  }));
  return { path: smoothPath(points), dip, windowW, windowY: washWindowRows(dip.y, h), lots };
}

function Tile({ tile, w, h, geo, patternId }: { tile: number; w: number; h: number; geo: Geometry; patternId: string }) {
  const first = tile === 0;
  // Only the first tile performs the entrance; the second is offscreen until the drift begins.
  const enter = <T extends string>(cls: T, delay: number, extra?: CSSProperties) =>
    first ? { className: cls, style: { "--d": `${delay}s`, ...extra } as CSSProperties } : {};

  return (
    <g transform={`translate(${tile * w} 0)`}>
      {/* Wash window: 61 days around the dip; top and bottom edges sit on ledger rules. */}
      <g {...enter("settle", heroTimeline.washWindow)}>
        {[`color-mix(in oklch, var(--wash) 12%, transparent)`, `url(#${patternId})`].map((fill) => (
          <rect
            key={fill}
            x={geo.dip.x - geo.windowW / 2}
            y={geo.windowY.top + 0.5}
            width={geo.windowW}
            height={geo.windowY.bottom - geo.windowY.top - 1}
            rx={3}
            style={{ fill }}
          />
        ))}
      </g>

      <path
        d={geo.path}
        pathLength={1}
        fill="none"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ stroke: "var(--accent)", ...(first ? ({ "--d": `${heroTimeline.line}s` } as CSSProperties) : {}) }}
        className={first ? "ink-draw" : undefined}
      />

      {geo.lots.map((lot, i) => (
        <rect
          key={i}
          x={lot.x - LOT_W / 2}
          y={lot.y - LOT_H / 2}
          width={LOT_W}
          height={LOT_H}
          rx={LOT_H / 2}
          className={first ? "enter-fade" : undefined}
          style={{
            fill: lot.underwater ? "var(--loss)" : "var(--muted)",
            stroke: "var(--bg)",
            strokeWidth: 2,
            paintOrder: "stroke",
            ...(first ? ({ "--d": `${lot.delay}s`, "--dur": "420ms" } as CSSProperties) : {}),
          }}
        />
      ))}
    </g>
  );
}
