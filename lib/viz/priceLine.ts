// Geometry for the hero's living price line (§2.6.1). Pure functions so they can be tested and
// so the component only has to measure its lane and render.
//
// The series is periodic: the last point equals the first and the slopes match, so two copies
// laid side by side join seamlessly and the drift can loop forever.

export const TILE_POINTS = 72;
/** One tile (one screen width) represents a year. */
export const DAYS_PER_TILE = 365;
/** Mirrors --ledger-row so shapes can snap to the rules. */
export const LEDGER_ROW = 32;
/** The wash window spans 61 days: 30 before the sale, the sale day, 30 after. */
export const WASH_WINDOW_DAYS = 61;
/** Where the dip (the loss sale) sits along a tile, 0–1. */
export const DIP_AT = 0.33;

const TAU = Math.PI * 2;

/** Deterministic, periodic pseudo-noise in [-1, 1] for sample i of n. */
function noise(i: number, n: number) {
  const t = (i % n) / n;
  return 0.55 * Math.sin(TAU * 11 * t + 1.3) + 0.3 * Math.sin(TAU * 17 * t + 0.2) + 0.15 * Math.sin(TAU * 29 * t + 2.4);
}

/** Wrapped gaussian so the dip is periodic too. */
function dip(t: number, at: number, width: number) {
  let v = 0;
  for (let k = -1; k <= 1; k++) v += Math.exp(-((t - at + k) ** 2) / (2 * width * width));
  return v;
}

/**
 * Normalized prices for one tile, 0 (low) – 1 (high). Length n + 1; last === first.
 * Shaped like a position bought high that sold off into one sharp dip, then recovered.
 */
export function periodicSeries(n = TILE_POINTS): number[] {
  const raw: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / n;
    raw.push(
      0.16 * Math.sin(TAU * t + 2.1) +
        0.07 * Math.sin(TAU * 3 * t + 0.4) +
        0.02 * noise(i, n) -
        0.42 * dip(t, DIP_AT, 0.028),
    );
  }
  const lo = Math.min(...raw);
  const hi = Math.max(...raw);
  const out = raw.map((v) => (v - lo) / (hi - lo));
  out.push(out[0]);
  return out;
}

export interface Point {
  x: number;
  y: number;
}

/** Maps a series onto a tile of width w; y=1 sits `pad` below the top, y=0 `pad` above the bottom. */
export function toPoints(series: number[], w: number, h: number, pad: number): Point[] {
  const n = series.length - 1;
  return series.map((v, i) => ({ x: (i / n) * w, y: pad + (1 - v) * (h - 2 * pad) }));
}

/**
 * Smooth path through points (Catmull–Rom → cubic Bézier). Treats the points as periodic so the
 * tangent at the seam matches the next tile's.
 */
export function smoothPath(points: Point[], offsetX = 0): string {
  const n = points.length - 1; // last duplicates first
  const w = points[n].x - points[0].x;
  const at = (i: number): Point => {
    const k = ((i % n) + n) % n;
    const wraps = Math.floor(i / n);
    return { x: points[k].x + wraps * w, y: points[k].y };
  };
  const f = (p: number) => Math.round(p * 100) / 100;
  let d = `M${f(points[0].x + offsetX)} ${f(points[0].y)}`;
  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += `C${f(c1.x + offsetX)} ${f(c1.y)} ${f(c2.x + offsetX)} ${f(c2.y)} ${f(p2.x + offsetX)} ${f(p2.y)}`;
  }
  return d;
}

/** Linear interpolation of the series at t ∈ [0, 1]. */
export function sampleAt(points: Point[], t: number): Point {
  const n = points.length - 1;
  const f = Math.min(Math.max(t, 0), 1) * n;
  const i = Math.min(Math.floor(f), n - 1);
  const k = f - i;
  return { x: points[i].x + (points[i + 1].x - points[i].x) * k, y: points[i].y + (points[i + 1].y - points[i].y) * k };
}

/**
 * Vertical extent of the wash window: from the rule at least ¾ row above the dip down to the
 * bottom of the lane, so both edges sit on ledger rules.
 */
export function washWindowRows(dipY: number, laneH: number, row = LEDGER_ROW): { top: number; bottom: number } {
  const top = Math.max(0, Math.floor((dipY - row * 0.75) / row) * row);
  return { top, bottom: laneH };
}

export function lowestIndex(series: number[]): number {
  let best = 0;
  for (let i = 1; i < series.length; i++) if (series[i] < series[best]) best = i;
  return best;
}

/** Lots bought along the line, as fractions of a tile. The first one is the underwater position. */
export const LOT_AT = [0.07, 0.19, 0.52, 0.71, 0.86] as const;
/** Index into LOT_AT of the lot bought near the top, now at a loss. */
export const UNDERWATER_LOT = 1;
