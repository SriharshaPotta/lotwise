import type { CubicBezier } from "./motion";

/**
 * Inverse of a CSS cubic-bezier timing function: given output progress y, returns the input
 * time x. Used to time things to the moment the ink line reaches them.
 */
export function bezierTimeFor(progress: number, [x1, y1, x2, y2]: CubicBezier): number {
  const p = Math.min(Math.max(progress, 0), 1);
  const at = (u: number, a: number, b: number) => 3 * a * u * (1 - u) ** 2 + 3 * b * u * u * (1 - u) + u ** 3;
  // bisection on the curve parameter u, solving y(u) = p, then report x(u)
  let lo = 0, hi = 1, u = p;
  for (let i = 0; i < 40; i++) {
    u = (lo + hi) / 2;
    if (at(u, y1, y2) < p) lo = u;
    else hi = u;
  }
  return at(u, x1, x2);
}
