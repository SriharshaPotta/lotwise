"use client";

import { cubicBezier, m, useTransform, type MotionValue } from "motion/react";
import { Ring } from "@/components/viz/Ring";
import { LOTS, countdown } from "@/lib/demo";
import { money, shortDate } from "@/lib/format";
import { keyframes, progress, wrap } from "@/lib/loop";
import { ease } from "@/lib/motion";

const CD = countdown();
const LOT_QTY = LOTS.aapl.qty;
const HELD = CD.held / CD.total;
const PERIOD = 7.5;
const FILL: [number, number] = [0.3, 2.6];
const FADE: [number, number] = [6.5, 7.2];
/** Ring filled, "9 days" showing, the saving revealed. */
export const COUNTDOWN_POSTER = 4;

const inOut = cubicBezier(...ease.ink);
const settle = cubicBezier(...ease.settle);
const SIZE = 136;

export const countdownSummary = `${CD.symbol} has been held ${CD.held} of ${CD.total} days. In ${CD.daysAway} days, on ${shortDate(
  CD.ltDate,
)}, it turns long-term; selling then instead of now saves ${money(CD.save, { whole: true })}.`;

/** A violet ring filling with the days held, stopping just short of long-term. */
export function CountdownLoop({ time }: { time: MotionValue<number> }) {
  const t = useTransform(time, (v) => wrap(v, PERIOD));
  const fill = useTransform(t, (u) => HELD * progress(u, FILL[0], FILL[1], inOut));
  const ring = useTransform(t, (u) => keyframes(u, [[FADE[0], 1], [FADE[1], 0]]));
  // The ring number and "held N days" both read this one tweened count, so they always add up to
  // CD.total and can never disagree mid-fill.
  const held = useTransform(fill, (f) => Math.round(CD.total * f));
  const days = useTransform(held, (h) => String(CD.total - h));
  const heldText = useTransform(held, (h) => `held ${h} days`);
  const save = useTransform(t, (u) => keyframes(u, [[FILL[1] - 0.2, 0], [FILL[1] + 0.4, 1], [FADE[0], 1], [FADE[1], 0]], settle));

  return (
    <div className="flex h-full items-center gap-6">
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <Ring progress={fill} opacity={ring} size={SIZE} color="var(--longterm)" endTick />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <m.span data-testid="countdown-days" className="num inline-block w-[3ch] text-center text-[36px] leading-none text-fg">
            {days}
          </m.span>
          <span className="num mt-2 text-meta text-muted">days to go</span>
        </div>
      </div>
      <div className="num min-w-0 text-meta whitespace-nowrap">
        <div className="flex h-8 items-center text-fg">
          {CD.symbol} · {LOT_QTY} sh
        </div>
        <m.div data-testid="countdown-held" className="flex h-8 items-center text-muted">
          {heldText}
        </m.div>
        <div className="flex h-8 items-center gap-2 text-muted">
          <span className="inline-block h-3 w-0.5 rounded-full bg-longterm" />
          long-term {shortDate(CD.ltDate)}
        </div>
        <m.div className="flex h-8 items-center text-fg" style={{ opacity: save }}>
          wait, save {money(CD.save, { whole: true })}
        </m.div>
      </div>
    </div>
  );
}
