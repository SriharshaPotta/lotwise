"use client";

import { AnimatePresence, animate, m, useInView, useReducedMotion, type AnimationPlaybackControls } from "motion/react";
import { useEffect, useMemo, useRef, useState, type FocusEvent } from "react";
import { useMediaQuery } from "@/components/effects/useMediaQuery";
import { Coupon } from "@/components/receipt/Coupon";
import { Receipt } from "@/components/receipt/Receipt";
import { TradeTicket } from "@/components/ticket/TradeTicket";
import { position, receiptSerial, tradeReceipt, type AccountId, type CouponModel, type TradeReceipt } from "@/lib/demo";
import { money, shortDate } from "@/lib/format";
import { ease, print, spring } from "@/lib/motion";

/** The one-time teaser moves the slider in steps of this many shares. */
const TEASER_STEP = 5;

const ANNOUNCE_AFTER_MS = 700;

/**
 * §4.2: the trade ticket and the pre-trade receipt it prints.
 * - Slider changes only tween numbers; switching account or the toggle re-prints.
 * - ~1.4s after load the slider runs 0 → 100 once, unless the visitor got there first.
 * - The WASH SALE stamp and the coupons wait until the print is done.
 * - A polite live region reads out the totals and any stamp.
 */
export function Showcase() {
  const reduce = useReducedMotion();
  const wide = useMediaQuery("(min-width: 1280px)");

  const [accountId, setAccountId] = useState<AccountId>("brokerage-one");
  const [shares, setShares] = useState(0);
  const [buyBack, setBuyBack] = useState(false);
  const [printIndex, setPrintIndex] = useState(0);
  const [printed, setPrinted] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);

  const touched = useRef(false);
  const teaser = useRef<AnimationPlaybackControls | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  // On phones the showcase starts below the fold: the teaser waits until it's actually seen.
  const seen = useInView(rootRef, { once: true, amount: 0.5 });
  const [mountedAt] = useState(() => (typeof performance === "undefined" ? 0 : performance.now()));
  const model = useMemo(() => tradeReceipt(accountId, shares, buyBack), [accountId, shares, buyBack]);

  // One-time teaser: slide 0 → full position, unless the visitor already touched the ticket. It runs
  // print.teaserAt after load, or shortly after the showcase scrolls into view if that's later.
  useEffect(() => {
    if (reduce === null) return;
    const full = position("brokerage-one").lot.qty;
    if (reduce) {
      if (!touched.current) setShares(full);
      return;
    }
    if (!seen) return;
    const wait = Math.max(print.teaserAt * 1000 - (performance.now() - mountedAt), 300);
    const id = window.setTimeout(() => {
      if (touched.current) return;
      teaser.current = animate(0, full, {
        duration: print.teaserDuration,
        ease: ease.settle,
        // Steps of 5 shares: the receipt's numbers tween between steps anyway (MoneyTween), and the
        // whole ticket + receipt re-renders ~20 times instead of once per frame.
        onUpdate: (v) => setShares(Math.round(v / TEASER_STEP) * TEASER_STEP),
      });
    }, wait);
    return () => {
      window.clearTimeout(id);
      teaser.current?.stop();
    };
  }, [reduce, seen, mountedAt]);

  const touch = () => {
    touched.current = true;
    teaser.current?.stop();
  };
  const reprint = () => {
    setPrinted(false);
    setPrintIndex((i) => i + 1);
  };

  const onAccount = (id: AccountId) => {
    if (id === accountId) return;
    touch();
    // keep the same fraction of the position
    const fraction = shares / position(accountId).lot.qty;
    setShares(Math.round(fraction * position(id).lot.qty));
    setAccountId(id);
    reprint();
  };
  const onBuyBack = (on: boolean) => {
    touch();
    setBuyBack(on);
    reprint();
  };
  const onShares = (v: number) => {
    touch();
    setShares(v);
  };

  const onBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusWithin(false);
  };

  const showCoupons = printed && model.shares > 0 && model.coupons.length > 0;

  return (
    <div ref={rootRef} onFocus={() => setFocusWithin(true)} onBlur={onBlur}>
      <TradeTicket
        position={model.position}
        onAccount={onAccount}
        shares={shares}
        onShares={onShares}
        buyBack={buyBack}
        onBuyBack={onBuyBack}
      />

      {/* Starts at the slot line; everything above it is clipped, so paper emerges from the slit. */}
      <div className="slot-clip relative z-30 -mt-3">
        <div
          className="relative isolate mx-auto w-[min(100%-2rem,25rem)] xl:mx-0 xl:ml-8"
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
        >
          {/* Outgoing and incoming receipts share one grid cell: they overlap during a re-print
              without anything being measured or re-laid out (no forced layout, no shift). */}
          <div className="grid [&>*]:[grid-area:1/1]">
            <AnimatePresence>
              <Receipt
              key={printIndex}
              model={model}
              serial={receiptSerial(printIndex)}
              printing
              delay={printIndex === 0 ? print.firstAt : print.tearOff * 0.6}
              onPrinted={() => setPrinted(true)}
              straight={hovered || focusWithin}
              showStamp={printed}
              />
            </AnimatePresence>
          </div>

          {/* Coupons: under the receipt's right edge on wide screens, below it otherwise. */}
          <div className="relative -z-10 mt-6 min-h-[11.5rem] space-y-3 xl:absolute xl:top-[38%] xl:left-[calc(100%-1.25rem)] xl:mt-0 xl:min-h-0 xl:w-[19.5rem] xl:space-y-4">
            <AnimatePresence>
              {showCoupons &&
                model.coupons.map((c, i) => (
                  <m.div
                    key={`${printIndex}-${c.kind}`}
                    initial={wide ? { x: "-100%", rotate: 0 } : { y: `${-(i + 1) * 115}%`, rotate: 0 }}
                    animate={{ x: 0, y: 0, rotate: i % 2 ? -0.8 : 1.1 }}
                    exit={{ opacity: 0, transition: { duration: print.tearOff } }}
                    transition={{ ...spring.paper, delay: print.couponsAfter + i * print.couponGap }}
                  >
                    <CouponFor coupon={c} tucked={wide} />
                  </m.div>
                ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <LiveSummary model={model} printed={printed} />
    </div>
  );
}

function CouponFor({ coupon: c, tucked }: { coupon: CouponModel; tucked: boolean }) {
  const amount = (n: number) => <span className="num text-gain-ink">{money(n, { whole: true })}</span>;
  switch (c.kind) {
    case "wait-to-sell":
      return <Coupon tucked={tucked} when={`Sell on or after ${shortDate(c.date)}`} then={<>keep the full {amount(c.keep)} deduction</>} />;
    case "wait-to-rebuy":
      return <Coupon tucked={tucked} when={`Rebuy on or after ${shortDate(c.date)}`} then={<>keep the full {amount(c.keep)} deduction</>} />;
    case "harvest-instead":
      return <Coupon tucked={tucked} when={`Harvest ${c.symbol} instead`} then={<>{amount(c.deductible)} deductible, no wash</>} />;
  }
}

/** Screen-reader summary of the receipt, debounced so dragging the slider doesn't chatter. */
function LiveSummary({ model, printed }: { model: TradeReceipt; printed: boolean }) {
  const [text, setText] = useState("");
  const next = describe(model, printed);
  useEffect(() => {
    const t = window.setTimeout(() => setText(next), ANNOUNCE_AFTER_MS);
    return () => window.clearTimeout(t);
  }, [next]);
  return (
    <p className="sr-only" aria-live="polite" aria-atomic="true">
      {text}
    </p>
  );
}

export function describe(m: TradeReceipt, printed: boolean): string {
  const { lot, account } = m.position;
  if (!m.shares) return `Receipt for ${account.name}: move the slider to sell some ${lot.symbol}.`;
  const parts = [
    `Selling ${m.shares} ${lot.symbol} from ${account.name}.`,
    `Proceeds ${money(m.proceeds)}, realized ${m.realized < 0 ? "loss" : "gain"} ${money(Math.abs(m.realized))}, ${m.term}-term.`,
  ];
  if (m.taxFree) parts.push("No tax on sales inside a Roth IRA.");
  else {
    parts.push(`Deductible loss ${money(m.deductible)}.`);
    if (m.disallowed) parts.push(`${money(m.disallowed)} disallowed.`);
    if (m.stamp && printed) parts.push(`Stamped ${m.stamp.toLowerCase()}.`);
  }
  if (m.rebuy) parts.push(m.rebuy.triggers ? `Rebuying ${shortDate(m.rebuy.date)} would ${m.cause ? "also " : ""}trigger a wash sale.` : `Rebuying ${shortDate(m.rebuy.date)} would not trigger a wash sale.`);
  return parts.join(" ");
}
