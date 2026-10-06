// Prints WCAG contrast ratios for the muted text tokens on their backgrounds (DESIGN.md §2.7).
// Reads the oklch() values straight from app/globals.css. Exits 1 if any pair is under 4.5:1.
//   node scripts/contrast.mjs
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

const PAIRS = [
  ["--muted", "--bg"],
  ["--muted", "--surface"],
  ["--muted", "--surface-2"],
  ["--ink-muted", "--paper"],
  ["--ink-muted", "--paper-2"],
];
const MIN = 4.5;

function token(name) {
  const m = css.match(new RegExp(`${name}:\\s*oklch\\(([\\d.]+)%\\s+([\\d.]+)\\s+([\\d.]+)\\)`));
  if (!m) throw new Error(`${name}: no oklch() value in globals.css`);
  return [Number(m[1]) / 100, Number(m[2]), Number(m[3])];
}

/** OKLCH → linear sRGB (Björn Ottosson's OKLab matrices), clamped to gamut. */
function linearRgb([L, C, h]) {
  const a = C * Math.cos((h * Math.PI) / 180);
  const b = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((v) => Math.min(1, Math.max(0, v)));
}

const luminance = (c) => {
  const [r, g, b] = linearRgb(c);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

let failed = false;
for (const [fg, bg] of PAIRS) {
  const [hi, lo] = [luminance(token(fg)), luminance(token(bg))].sort((x, y) => y - x);
  const ratio = (hi + 0.05) / (lo + 0.05);
  const ok = ratio >= MIN;
  failed ||= !ok;
  console.log(`${ok ? "pass" : "FAIL"}  ${fg.padEnd(12)} on ${bg.padEnd(11)} ${ratio.toFixed(2)}:1`);
}
process.exit(failed ? 1 : 0);
