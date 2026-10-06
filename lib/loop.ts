// Time-driven loops for small ambient visuals: each visual is a pure function of loop time, so a
// loop can pause, resume, or change speed without ever jumping.

/** A keyframe: [seconds into the loop, value]. Times must be ascending. */
export type Stop = readonly [time: number, value: number];

const linear = (p: number) => p;

/** Value at time `t` along `stops`, eased within each segment; holds the ends outside the range. */
export function keyframes(t: number, stops: readonly Stop[], ease: (p: number) => number = linear): number {
  if (t <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    const [t1, v1] = stops[i];
    if (t <= t1) {
      const [t0, v0] = stops[i - 1];
      const p = t1 === t0 ? 1 : (t - t0) / (t1 - t0);
      return v0 + (v1 - v0) * ease(p);
    }
  }
  return stops[stops.length - 1][1];
}

/** 0 → 1 over [start, end], eased; 0 before, 1 after. */
export function progress(t: number, start: number, end: number, ease: (p: number) => number = linear): number {
  return keyframes(t, [[start, 0], [end, 1]], ease);
}

/** Loop time folded into one period. */
export const wrap = (t: number, period: number) => ((t % period) + period) % period;

/** Linear interpolation into a table of rows sampled at whole steps (e.g. one row per share). */
export function sampleAt<T>(rows: readonly T[], at: number, pick: (row: T) => number): number {
  const x = Math.min(Math.max(at, 0), rows.length - 1);
  const i = Math.floor(x);
  const a = pick(rows[i]);
  if (i === rows.length - 1) return a;
  return a + (pick(rows[i + 1]) - a) * (x - i);
}
