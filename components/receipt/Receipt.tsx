"use client";

import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { createContext, useContext, useEffect, type ReactNode } from "react";
import { Marker } from "@/components/ui/Marker";
import { MoneyTween, formatInt } from "@/components/viz/MoneyTween";
import { cn } from "@/lib/cn";
import type { TradeReceipt } from "@/lib/demo";
import { receiptDate, shortDate } from "@/lib/format";
import { print, printDuration } from "@/lib/motion";
import { Barcode } from "./Barcode";
import { Stamp } from "./Stamp";

/** Line items, top to bottom. Fixed so every variant prints at the same height (zero layout shift). */
export const RECEIPT_LINES = 14;

interface ReceiptProps {
  model: TradeReceipt;
  serial: string;
  /** Animate the print on mount (feed + type-in). False renders the printed state. */
  printing: boolean;
  /** Seconds before the feed starts. */
  delay?: number;
  /** Called once the last line is in. */
  onPrinted?: () => void;
  /** Hover/focus: straighten from the −1.5° resting tilt. */
  straight?: boolean;
  /** Let the stamp land (the showcase holds it until the print is done). */
  showStamp?: boolean;
}

// `printing` decides the initial (hidden) state and must match the server render; `instant`
// (reduced motion, only known on the client) only shortens transitions to zero.
const Typing = createContext<{ printing: boolean; instant: boolean; start: number }>({ printing: false, instant: false, start: 0 });

/** One printed line; types in `i × 40ms` after the feed stops. */
function Line({ i, className, children, wrap }: { i: number; className?: string; children?: ReactNode; wrap?: boolean }) {
  const { printing, instant, start } = useContext(Typing);
  return (
    <m.div
      initial={printing ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={instant ? { duration: 0 } : { delay: start + i * print.lineGap, duration: print.lineFade }}
      className={cn(
        "flex items-baseline gap-2",
        // `wrap` lines may take two rows on phones; the second row is reserved so height never changes
        wrap ? "min-h-12 leading-6 sm:h-6 sm:min-h-0 sm:whitespace-nowrap" : "h-6 whitespace-nowrap",
        className,
      )}
    >
      {children}
    </m.div>
  );
}

function Leader() {
  return <span aria-hidden className="receipt-leader min-w-4 flex-1 self-stretch" />;
}

function Row({ i, label, children, className }: { i: number; label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Line i={i} className={className}>
      <span className="truncate">{label}</span>
      <Leader />
      {/* fixed width: a tweening value never nudges its leader */}
      <span className="min-w-[10ch] shrink-0 text-right">{children}</span>
    </Line>
  );
}

function Rule({ i, double }: { i: number; double?: boolean }) {
  return (
    <Line i={i} className="items-center">
      <span aria-hidden className={cn("w-full", double ? "h-[3px] border-y border-ink" : "h-px bg-[color-mix(in_oklch,var(--ink)_28%,transparent)]")} />
    </Line>
  );
}

/**
 * The pre-trade receipt (§2.6.2): paper with perforated zigzag edges, mono line items with dotted
 * leaders, a double rule above the totals and a thin-bar barcode. Prints out of the ticket's slot
 * in three quick steps, then types its lines in 40ms apart; the WASH SALE stamp lands last.
 */
export function Receipt({ model, serial, printing, delay = 0, onPrinted, straight, showStamp = true }: ReceiptProps) {
  const instant = useReducedMotion() === true;
  const animate = printing && !instant;
  const start = delay + print.feedDuration;
  const total = delay + printDuration(RECEIPT_LINES);

  useEffect(() => {
    if (!onPrinted) return;
    const t = window.setTimeout(onPrinted, animate ? total * 1000 : 0);
    return () => window.clearTimeout(t);
  }, []); // once per print: each print mounts a new Receipt

  const { position: p, shares } = model;
  const sym = p.lot.symbol;
  const loss = model.realized < 0;

  return (
    <m.div
      initial={printing ? { y: print.feedY[0] } : false}
      animate={
        instant
          ? { y: "0%", transition: { duration: 0 } }
          : { y: [...print.feedY], transition: { delay, duration: print.feedDuration, times: [...print.feedTimes], ease: "easeOut" } }
      }
      exit={{ y: 28, opacity: 0, transition: { duration: print.tearOff, ease: "easeIn" } }}
      className="w-full"
    >
      <m.div
        initial={false}
        animate={{ rotate: straight ? 0 : -1.5 }}
        transition={{ type: "spring", stiffness: 220, damping: 26, mass: 1.1 }}
        className="paper-shadow origin-top"
      >
        <div className="paper paper-fiber perforated relative px-5 pt-6 pb-6 text-receipt text-ink sm:px-7">
          <Typing.Provider value={{ printing, instant, start }}>
            <div className="num">
              <Line i={0} className="receipt-caps justify-between text-[0.92em]">
                <span>
                  Lotwise · pre-trade<span className="hidden sm:inline"> receipt</span>
                </span>
                <span>{receiptDate(model.date)}</span>
              </Line>
              <Rule i={1} />
              <Line i={2} className="receipt-caps">
                <span>
                  Sell <MoneyTween value={shares} format={formatInt} className="inline-block w-[3ch] text-right" /> {sym} @ {p.price.toFixed(2)}
                </span>
              </Line>
              <Row i={3} label="Proceeds"><MoneyTween value={model.proceeds} /></Row>
              <Row i={4} label="Cost basis"><MoneyTween value={model.basis} /></Row>
              <Row i={5} label="Realized">
                <MoneyTween value={model.realized} className={loss ? "text-loss-ink" : shares ? "text-gain-ink" : undefined} />
              </Row>
              <Row i={6} label="Term"><span className="receipt-caps">{shares ? model.term : "—"}</span></Row>
              <Rule i={7} double />
              {model.taxFree ? (
                <>
                  <Row i={8} label="Tax on this sale"><MoneyTween value={0} /></Row>
                  <Line i={9} className="pl-3 text-ink-muted">{p.account.name} · sales inside aren&rsquo;t taxed</Line>
                  <Line i={10} wrap />
                </>
              ) : (
                <>
                  <Row i={8} label="Deductible loss"><MoneyTween value={model.deductible} /></Row>
                  <Row
                    i={9}
                    className="font-medium"
                    label={
                      <span className="inline-flex items-center gap-2">
                        <Marker tone="wash" className={cn(!model.disallowed && "opacity-0")} />
                        Disallowed (wash sale)
                      </span>
                    }
                  >
                    <MoneyTween value={model.disallowed} />
                  </Row>
                  <Line i={10} wrap className="pl-3 text-ink-muted sm:pl-6">
                    <span>{model.cause && model.disallowed > 0 && <CauseText model={model} />}</span>
                  </Line>
                </>
              )}
              <Line i={11} className="pl-3 text-ink-muted sm:pl-6">
                {model.rebuy && <RebuyText model={model} />}
              </Line>
              <Rule i={12} />
              <Line i={13} className="mt-1 h-7 items-center justify-between text-ink">
                <Barcode seed={serial} className="h-6 w-auto" />
                <span className="text-ink-muted">{serial}</span>
              </Line>
            </div>
          </Typing.Provider>

          {/* Lands on the totals once printing is done (Showcase decides when). */}
          <AnimatePresence>{showStamp && model.stamp && <StampSlot key="stamp" label={model.stamp} />}</AnimatePresence>
        </div>
      </m.div>
    </m.div>
  );
}

function StampSlot({ label }: { label: string }) {
  return (
    // Over the double rule and the leader dots: covers no label and no figure.
    <div className="absolute top-[11.1rem] left-[36%] sm:left-[31%]">
      <Stamp>{label}</Stamp>
    </div>
  );
}

function CauseText({ model }: { model: TradeReceipt }) {
  const t = model.cause!.trade;
  const what = t.option ? `${t.option.type}${t.qty === 1 ? "" : "s"}` : t.qty === 1 ? "share" : "shares";
  return (
    <>
      {t.qty} {t.symbol} {what} bought {shortDate(t.date)} · {model.cause!.account.name}
    </>
  );
}

function RebuyText({ model }: { model: TradeReceipt }) {
  const r = model.rebuy!;
  if (!model.shares) return <>Rebuy {shortDate(r.date)}</>;
  if (!r.triggers) return <>Rebuy {shortDate(r.date)} · no wash sale</>;
  return (
    <>
      Rebuy {shortDate(r.date)} would {model.cause ? "also " : ""}trigger ·{" "}
      <span className="text-loss-ink" aria-label="wash sale">
        ✕
      </span>
    </>
  );
}

