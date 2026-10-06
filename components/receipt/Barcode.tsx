/** Thin-bar barcode for the receipt footer. Deterministic from `seed`; decorative. */
export function Barcode({ seed, className }: { seed: string; className?: string }) {
  const bars: { x: number; w: number }[] = [];
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  let x = 0;
  for (let i = 0; i < 44; i++) {
    h = Math.imul(h ^ (h >>> 13), 2654435761) >>> 0;
    const w = 1 + (h % 3 === 0 ? 1 : 0) + (h % 7 === 0 ? 1 : 0);
    bars.push({ x, w });
    x += w + 1 + (h % 5 === 0 ? 2 : h % 2);
  }
  return (
    <svg aria-hidden viewBox={`0 0 ${x} 24`} width={x} height={24} className={className}>
      {bars.map((b, i) => (
        <rect key={i} x={b.x} width={b.w} height={24} fill="currentColor" />
      ))}
    </svg>
  );
}
