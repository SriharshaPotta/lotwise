// DESIGN.md §2.5 "paper physics" as Motion presets. Durations are in seconds (Motion's unit);
// the ms values mirror the CSS tokens in globals.css.
import type { TargetAndTransition, Transition } from "motion/react";

export type CubicBezier = [number, number, number, number];

export const ease = {
  /** Hovers, presses. --ease-ui */
  ui: [0.32, 0.72, 0, 1] as CubicBezier,
  /** Lines drawing themselves. --ease-ink */
  ink: [0.65, 0, 0.35, 1] as CubicBezier,
  /** Reveals. --ease-settle */
  settle: [0.16, 1, 0.3, 1] as CubicBezier,
} as const;

export const duration = {
  /** --motion-fast: hovers, presses, nav background. */
  fast: 0.16,
  /** --motion-reveal: fade + rise reveals. */
  reveal: 0.64,
  /** Numbers always tween over this; they never jump. */
  tween: 0.42,
  /** Stamp landing. */
  stamp: 0.12,
  /** Hero price line drawing on. */
  inkLine: 1.6,
  /** Ledger rules fading in at page load. */
  rulesIn: 0.3,
} as const;

export const stagger = {
  /** Section reveals. */
  reveal: 0.07,
  /** Hero headline, line by line. */
  headline: 0.09,
  /** Receipt line items typing in. */
  receiptLine: 0.04,
} as const;

export const spring = {
  /** Objects feel like paper: weighted, slight overshoot, never bouncy. */
  paper: { type: "spring", stiffness: 220, damping: 26, mass: 1.1 },
} as const satisfies Record<string, Transition>;

export const transition = {
  ui: { duration: duration.fast, ease: ease.ui },
  reveal: { duration: duration.reveal, ease: ease.settle },
  tween: { duration: duration.tween, ease: ease.settle },
  inkLine: { duration: duration.inkLine, ease: ease.ink },
  stamp: { duration: duration.stamp, ease: ease.ui },
} as const satisfies Record<string, Transition>;

/** Fade + 20px rise, once at 20% in view. Spread onto a motion element. */
export const reveal = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: transition.reveal,
} as const;

/** Parent variants that stagger children by `stagger.reveal`. */
export const revealGroup = {
  hidden: {},
  shown: { transition: { staggerChildren: stagger.reveal } },
} as const;

export const revealItem = {
  hidden: { opacity: 0, y: 20 },
  shown: { opacity: 1, y: 0, transition: transition.reveal },
} as const;

/** Stamp thunk: scale 1.35 → 1 with a tiny 2px settle. */
export const stampIn: { initial: TargetAndTransition; animate: TargetAndTransition } = {
  initial: { opacity: 0, scale: 1.35, rotate: -8, y: -2 },
  animate: {
    opacity: 1, scale: 1, rotate: -8, y: [-2, 2, 0],
    transition: { duration: duration.stamp, ease: ease.ui, y: { duration: duration.stamp + 0.12, times: [0, 0.6, 1] } },
  },
};

/** Fixed nav height: two ledger rows. Anchor scrolls stop below it. */
export const NAV_HEIGHT = 64;

/**
 * Smooth scroll (Lenis). Off under prefers-reduced-motion. Handles in-page anchor links; the stop
 * below the nav comes from CSS (html scroll-padding-top, section scroll-margin-top), which Lenis
 * and native anchor jumps both honour.
 */
export const lenisOptions = { lerp: 0.09, smoothWheel: true, anchors: true } as const;

/** Hero entrance (§4.1), seconds from first paint. Total ≈ 2s; nothing blocks interaction. */
export const heroTimeline = {
  rules: 0,
  line: 0.3,
  headline: 0.3,
  lead: 0.62,
  ctas: 0.7,
  trust: 0.78,
  /** The ticket rises in just before the receipt prints. */
  showcase: 0.5,
  /** The wash window settles as the line finishes drawing. */
  washWindow: 1.55,
  /** Drift starts once the line is fully drawn. */
  drift: 0.3 + 1.6,
} as const;

/**
 * Receipt printing (§2.6.2): a short stepped feed out of the slot (3 quick steps), then line
 * items type in 40ms apart. The stamp lands and coupons slide out once the last line is in.
 */
export const print = {
  /** Where the first print starts, in hero time (after the lead and CTAs). */
  firstAt: 0.85,
  /** Feed: y (as % of the receipt) at each stop, and the timing of each stop (0–1). */
  feedY: ["-100%", "-64%", "-64%", "-30%", "-30%", "0%"],
  feedTimes: [0, 0.2, 0.36, 0.56, 0.72, 1],
  feedDuration: 0.46,
  lineGap: stagger.receiptLine,
  lineFade: 0.08,
  /** After the last line: stamp lands, then coupons slide out 90ms apart. */
  stampAfter: 0.08,
  couponsAfter: 0.22,
  couponGap: 0.09,
  /** The one-time slider teaser (0 → 100) starts this long after load, never before the first print is done. */
  teaserAt: 1.4,
  teaserDuration: 0.9,
  /** Old receipt being torn off when a re-print starts. */
  tearOff: 0.18,
} as const;

/** Total seconds for a print with `lines` line items. */
export const printDuration = (lines: number) => print.feedDuration + lines * print.lineGap + print.lineFade;

/** The living line moves one screen width per this many seconds (§2.6.1). */
export const DRIFT_SECONDS_PER_SCREEN = 60;

/** Findings tape speed (§4.3). */
export const TAPE_PX_PER_SECOND = 30;
