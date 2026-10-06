import type { SVGProps } from "react";

/** The one orange on the site: the assistant spark and the composer's send button (§4.7). */
export const SPARK_ORANGE = "#D97757";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

/** Base for the 16px line icons: 1.5px strokes, round joins, currentColor. */
function Line({ size = 16, children, ...rest }: IconProps) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...rest}>
      {children}
    </svg>
  );
}

/**
 * An eight-point asterisk drawn for this page (not a logo file): four long rays and four short
 * ones, round-capped, so it reads as a soft spark at 18px.
 */
export function Spark({ size = 18, ...rest }: IconProps) {
  const rays = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4;
    const r = i % 2 === 0 ? 8 : 6.2;
    return { x: 10 + Math.sin(a) * r, y: 10 - Math.cos(a) * r, a };
  });
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 20 20" fill="none" {...rest}>
      {rays.map((p, i) => (
        <line
          key={i}
          x1={10 + Math.sin(p.a) * 1.6}
          y1={10 - Math.cos(p.a) * 1.6}
          x2={p.x}
          y2={p.y}
          stroke={SPARK_ORANGE}
          strokeWidth={2.4}
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

export const Plug = (p: IconProps) => (
  <Line {...p}>
    <path d="M6 2v3M10 2v3M4.5 5h7v2.5a3.5 3.5 0 0 1-7 0V5ZM8 11v3" />
  </Line>
);
export const Chevron = (p: IconProps) => (
  <Line {...p}>
    <path d="m6 4 4 4-4 4" />
  </Line>
);
export const Check = (p: IconProps) => (
  <Line {...p}>
    <path d="m3.5 8.5 3 3 6-7" />
  </Line>
);
/** A three-quarter ring; the caller spins it. */
export const Spinner = (p: IconProps) => (
  <Line {...p}>
    <path d="M8 2.5a5.5 5.5 0 1 0 5.5 5.5" />
  </Line>
);
export const Copy = (p: IconProps) => (
  <Line {...p}>
    <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
    <path d="M10.5 5.5V4A1.5 1.5 0 0 0 9 2.5H4A1.5 1.5 0 0 0 2.5 4v5A1.5 1.5 0 0 0 4 10.5h1.5" />
  </Line>
);
export const ThumbUp = (p: IconProps) => (
  <Line {...p}>
    <path d="M5 7v6.5H3a.5.5 0 0 1-.5-.5V7.5A.5.5 0 0 1 3 7h2Zm0 0 2.6-4.4a1.2 1.2 0 0 1 2.2.8L9.3 6.5h3.1a1.2 1.2 0 0 1 1.2 1.4l-.9 4.6a1.2 1.2 0 0 1-1.2 1H5" />
  </Line>
);
export const ThumbDown = (p: IconProps) => (
  <Line {...p} style={{ transform: "scaleY(-1)", ...p.style }}>
    <path d="M5 7v6.5H3a.5.5 0 0 1-.5-.5V7.5A.5.5 0 0 1 3 7h2Zm0 0 2.6-4.4a1.2 1.2 0 0 1 2.2.8L9.3 6.5h3.1a1.2 1.2 0 0 1 1.2 1.4l-.9 4.6a1.2 1.2 0 0 1-1.2 1H5" />
  </Line>
);
export const Retry = (p: IconProps) => (
  <Line {...p}>
    <path d="M13 8a5 5 0 1 1-1.6-3.7M13 2.5v2.8h-2.8" />
  </Line>
);
export const Plus = (p: IconProps) => (
  <Line {...p}>
    <path d="M8 3v10M3 8h10" />
  </Line>
);
export const ArrowUp = (p: IconProps) => (
  <Line {...p} strokeWidth={2}>
    <path d="M8 13V3.5M4 7.5l4-4 4 4" />
  </Line>
);
