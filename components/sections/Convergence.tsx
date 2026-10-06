"use client";

import { animate, cubicBezier, m, useMotionValueEvent, useScroll, useTransform, type MotionValue } from "motion/react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { LedgerPage } from "@/components/ledger/LedgerPage";
import { AccountTag, LedgerRow } from "@/components/ledger/LedgerRow";
import { useMediaQuery } from "@/components/effects/useMediaQuery";
import { Stamp } from "@/components/receipt/Stamp";
import { Badge } from "@/components/ui/Badge";
import { Chip } from "@/components/ui/Chip";
import { Lead } from "@/components/ui/Lead";
import { Marker } from "@/components/ui/Marker";
import { Segmented } from "@/components/ui/Segmented";
import { FlyingChip } from "@/components/viz/FlyingChip";
import { WashWindow } from "@/components/viz/WashWindow";
import { cn } from "@/lib/cn";
import { LEDGER_ACCOUNTS, convergence, entriesFor, type LedgerEntry } from "@/lib/demo";
import { money, shortDate } from "@/lib/format";
import { ease, stampIn } from "@/lib/motion";

const data = convergence();
const LEAD = { strong: "Each broker checks its own account.", rest: "That’s all it’s required to do." };
const CAPTION = { strong: "lotwise checks across all of them,", rest: "before you trade." };
const WASH_BADGE = `1 wash sale · ${money(data.disallowed, { whole: true })} disallowed`;
const IRA_BADGE = "1 IRA trap · loss permanently lost";
const WINDOW_LABEL = `${shortDate(data.window.start)} – ${shortDate(data.window.end)}`;

function Heading() {
  return (
    <h2 id="convergence-title" className="max-w-[18ch] text-h2 lg:max-w-none">
      Your broker sees one account. The IRS sees <em>all</em> of them.
    </h2>
  );
}

/** §4.4. The scroll stage where it fits, the Broker/IRS toggle where it doesn't (see globals.css). */
export function Convergence() {
  return (
    <section id="how-it-works" aria-labelledby="convergence-title" className="relative">
      <ConvergenceScroll />
      <ConvergenceFallback />
    </section>
  );
}

/* ───────────────────────────────────────────────────────────────────────────
   Scroll stage. A 300vh section; a sticky viewport-tall stage plays four steps as the section
   scrolls past. Everything is driven by motion values derived from scroll progress, so scrolling
   never re-renders React. The stage is laid out on a fixed 1240×600 canvas and scaled to fit.
   ─────────────────────────────────────────────────────────────────────────── */

const STAGE_W = 1240;
const STAGE_H = 600;
const ROW = 32;
const HEAD = 64;
const GAP = 24;
const CARD_W = (STAGE_W - 2 * GAP) / 3;
const CARD_H = HEAD + 5 * ROW + 64;
const ROW_X = 40;
const ROW_W = 340;
const ACCT_X = ROW_X + ROW_W;
const MERGED_W = 600;
const ROWS = data.entries.length;
const MERGED_H = HEAD + ROWS * ROW + 96;
/** Step 1: the three pages sit centred on the merged ledger's height, then rise into it. */
const CARD_Y = Math.round((MERGED_H - CARD_H) / 2 / ROW) * ROW;

const cardX = (id: string) => LEDGER_ACCOUNTS.findIndex((a) => a.id === id) * (CARD_W + GAP);
const rowY = (i: number) => HEAD + i * ROW;
const inOut = cubicBezier(...ease.ink);

/** Step boundaries, as fractions of the section's scroll (§4.4). */
const T = {
  frames: [0.25, 0.42],
  framesFade: [0.36, 0.46],
  cardChrome: [0.25, 0.32],
  rows: 0.3,
  rowStagger: 0.011,
  rowSpan: 0.15,
  merged: [0.42, 0.56],
  accounts: [0.5, 0.58],
  window: [0.6, 0.69],
  windowLabel: [0.66, 0.71],
  lightUp: [0.66, 0.7],
  chip: [0.7, 0.8],
  chipIn: [0.69, 0.71],
  stamp: 0.82,
  badge: [0.82, 0.86],
  lead: [0.78, 0.82],
  caption: [0.82, 0.86],
  ira: [0.88, 0.92],
} as const;

/**
 * Empty viewport below the finished ledger, in px: the next section is pulled up over it so the gap
 * after the convergence is the usual section gap. Plain DOM code, because it runs twice: inline while
 * the HTML parses (TAIL_SCRIPT, so the page never moves when the section later hydrates) and from
 * the section's ResizeObserver once it has.
 */
function convergenceTail(root: HTMLElement, W: number, H: number, MH: number): number {
  if (getComputedStyle(root).display === "none") return 0;
  const sticky = root.firstElementChild as HTMLElement | null;
  const fit = root.querySelector<HTMLElement>("[data-stage-fit]");
  if (!sticky || !fit) return 0;
  const s = Math.min(1, fit.clientWidth / W, fit.clientHeight / H);
  const top = fit.getBoundingClientRect().top - sticky.getBoundingClientRect().top;
  return Math.max(0, Math.round(sticky.clientHeight - top - MH * s));
}

const TAIL_SCRIPT = `(function(root){var f=${convergenceTail.toString()};function a(){var t=f(root,${STAGE_W},${STAGE_H},${MERGED_H});root.style.marginBottom=-t+"px";window.__lwConvTail=t}a();addEventListener("resize",a);if(document.fonts)document.fonts.ready.then(a)})(document.currentScript.previousElementSibling)`;

/** Where the scroll stage is shown instead of the fallback; mirrors the media query in globals.css. */
const STAGE_QUERY = "(prefers-reduced-motion: no-preference) and (min-height: 720px) and (min-width: 768px)";

function ConvergenceScroll() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const fitRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  // Starts from what TAIL_SCRIPT measured, so the first client render matches the page as painted.
  const [tail, setTail] = useState(() => (typeof window === "undefined" ? 0 : ((window as { __lwConvTail?: number }).__lwConvTail ?? 0)));
  const { scrollYProgress: p } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });

  // Fit the canvas to the space under the heading. Re-renders on resize only.
  useEffect(() => {
    const el = fitRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const s = Math.min(1, e.contentRect.width / STAGE_W, e.contentRect.height / STAGE_H);
      setScale((prev) => (Math.abs(prev - s) < 0.005 ? prev : s));
      if (sectionRef.current) setTail(convergenceTail(sectionRef.current, STAGE_W, STAGE_H, MERGED_H));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const stageShown = useMediaQuery(STAGE_QUERY);
  const lead = useTransform(p, [...T.lead], [1, 0]);
  const caption = useTransform(p, [...T.caption], [0, 1]);

  return (
    <>
      <div ref={sectionRef} className="convergence-scroll relative h-[300vh] overflow-x-clip" style={{ marginBottom: -tail }}>
        <div className="sticky top-0 flex h-svh flex-col pt-24 pb-8">
          <div className="page-container">
            <Heading />
            <div className="mt-4 grid [&>*]:[grid-area:1/1]">
              <m.div style={{ opacity: lead }}>
                <Lead strong={LEAD.strong}>{LEAD.rest}</Lead>
              </m.div>
              <m.div style={{ opacity: caption }} aria-hidden>
                <Lead strong={CAPTION.strong}>{CAPTION.rest}</Lead>
              </m.div>
            </div>
          </div>
          <div className="page-container mt-8 min-h-0 flex-1">
            <div ref={fitRef} data-stage-fit="" className="relative size-full">
              <div className="absolute top-0 left-0 origin-top-left" style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${scale})` }}>
                {/* The stage is client-only and only where it's shown: phones, short screens and
                    reduced motion never build it (they get the fallback below). */}
                {stageShown && <Stage p={p} />}
              </div>
            </div>
          </div>
          {/* What a screen reader gets instead of the choreography. */}
          <p className="sr-only">
            Three broker ledgers each report no issues. Merged by date, the proposed sale of {data.sale.label} on{" "}
            {shortDate(data.sale.date)} falls inside the 61-day window ({WINDOW_LABEL}) of the{" "}
            {data.replacement.label} bought {shortDate(data.replacement.date)} in {data.replacementAccount.name}: {WASH_BADGE}.{" "}
            {IRA_BADGE}.
          </p>
        </div>
      </div>
      <script dangerouslySetInnerHTML={{ __html: TAIL_SCRIPT }} />
    </>
  );
}

function Stage({ p }: { p: MotionValue<number> }) {
  const mergedOpacity = useTransform(p, [...T.merged], [0, 1]);
  const windowScale = useTransform(p, [...T.window], [0, 1], { ease: inOut });
  const windowLabel = useTransform(p, [...T.windowLabel], [0, 1]);
  const chipT = useTransform(p, [...T.chip], [0, 1], { ease: inOut });
  const chipIn = useTransform(p, [...T.chipIn], [0, 1]);
  const okBadge = useTransform(p, [...T.badge], [1, 0]);
  const washBadge = useTransform(p, [...T.badge], [0, 1]);
  const iraBadge = useTransform(p, [...T.ira], [0, 1]);

  const top = rowY(data.window.firstRank) + 4;
  const bottom = rowY(data.window.lastRank) + ROW + 12;
  const saleCenter = rowY(data.sale.rank) + ROW / 2;
  const chipX = MERGED_W + 4;

  return (
    <div aria-hidden className="relative size-full">
      {/* Merged ledger frame (fades in as the broker pages dissolve into it). */}
      <m.div className="absolute top-0 left-0" style={{ opacity: mergedOpacity, width: MERGED_W, height: MERGED_H }}>
        <LedgerPage title="All accounts · by date" className="size-full" />
        <m.div className="absolute left-5" style={{ top: HEAD + ROWS * ROW + 18, opacity: okBadge }}>
          <Badge tone="gain">No issues found</Badge>
        </m.div>
        <m.div className="absolute left-5" style={{ top: HEAD + ROWS * ROW + 18, opacity: washBadge }}>
          <Badge tone="wash">{WASH_BADGE}</Badge>
        </m.div>
        <m.div className="absolute left-5" style={{ top: HEAD + ROWS * ROW + 54, opacity: iraBadge }}>
          <Badge tone="loss">{IRA_BADGE}</Badge>
        </m.div>
        <StampOnThreshold p={p} />
      </m.div>

      {LEDGER_ACCOUNTS.map((a) => (
        <CardFrame key={a.id} p={p} id={a.id} title={a.name} />
      ))}

      {/* 61-day window: draws outward from the sale row. */}
      <m.div
        className="absolute left-[15px]"
        style={{ top, height: bottom - top, scaleY: windowScale, originY: (saleCenter - top) / (bottom - top) }}
      >
        <WashWindow className="h-full" />
      </m.div>
      <m.div className="num absolute text-meta leading-5" style={{ left: MERGED_W + 24, top, opacity: windowLabel }}>
        <p className="text-fg">61-day window</p>
        <p className="text-muted">{WINDOW_LABEL}</p>
      </m.div>

      {data.entries.map((e) => (
        <StageRow key={e.id} p={p} entry={e} />
      ))}

      <FlyingChip
        t={chipT}
        opacity={chipIn}
        from={{ x: chipX, y: saleCenter }}
        to={{ x: chipX, y: rowY(data.replacement.rank) + ROW / 2 }}
        bulge={56}
      >
        <Chip tone="wash">{money(data.disallowed, { whole: true })}</Chip>
      </FlyingChip>
    </div>
  );
}

/** A broker's ledger page: slides into the merged ledger and dissolves. */
function CardFrame({ p, id, title }: { p: MotionValue<number>; id: string; title: string }) {
  const x = useTransform(p, [...T.frames], [cardX(id), 0], { ease: inOut });
  const y = useTransform(p, [...T.frames], [CARD_Y, 0], { ease: inOut });
  const opacity = useTransform(p, [...T.framesFade], [1, 0]);
  const chrome = useTransform(p, [...T.cardChrome], [1, 0]);
  return (
    <m.div className="absolute top-0 left-0" style={{ x, y, opacity, width: CARD_W, height: CARD_H }}>
      <LedgerPage className="size-full" />
      <m.div style={{ opacity: chrome }}>
        <p className="num absolute top-0 left-5 flex h-16 items-center text-meta text-muted">{title}</p>
        <div className="absolute left-5" style={{ top: CARD_H - 48 }}>
          <Badge tone="gain">No issues found</Badge>
        </div>
      </m.div>
    </m.div>
  );
}

/** One trade: its slot on its broker's page → its rank in the merged ledger. */
function StageRow({ p, entry }: { p: MotionValue<number>; entry: LedgerEntry }) {
  const start = T.rows + entry.rank * T.rowStagger;
  const range = [start, start + T.rowSpan];
  const x = useTransform(p, range, [cardX(entry.account) + ROW_X, ROW_X], { ease: inOut });
  const y = useTransform(p, range, [CARD_Y + rowY(entry.accountIndex), rowY(entry.rank)], { ease: inOut });
  const acct = useTransform(p, [...T.accounts], [0, 1]);
  const isReplacement = entry.id === data.replacement.id;
  const isTrap = entry.id === data.iraTrap.saleId || entry.id === data.iraTrap.buyId;
  const light = useTransform(p, [...T.lightUp], [0, 1]);
  const trap = useTransform(p, [...T.ira], [0, 1]);

  return (
    <m.div className="absolute top-0 left-0" style={{ x, y, width: ROW_W + 150, height: ROW }}>
      {isReplacement && (
        <m.div
          className="absolute -inset-x-3 inset-y-0.5 rounded-sm bg-[color-mix(in_oklch,var(--fg)_7%,transparent)] shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--wash)_45%,transparent)]"
          style={{ opacity: light }}
        />
      )}
      <LedgerRow entry={entry} proposedRealized={entry.proposed ? data.saleRealized : undefined} className="relative" />
      <m.div className="absolute top-0 flex h-8 items-center gap-2" style={{ left: ROW_W, opacity: acct }}>
        <AccountTag entry={entry} />
        {isTrap && (
          <m.span style={{ opacity: trap }}>
            <Marker tone="loss" />
          </m.span>
        )}
      </m.div>
    </m.div>
  );
}

/** The stamp is a thunk, not a scrub: crossing the threshold plays it; scrolling back lifts it. */
function StampOnThreshold({ p }: { p: MotionValue<number> }) {
  const ref = useRef<HTMLDivElement>(null);
  const on = useRef(false);
  const sync = (v: number) => {
    const el = ref.current;
    const next = v >= T.stamp;
    if (!el || next === on.current) return;
    on.current = next;
    if (next) animate(el, stampIn.animate as never, {});
    else animate(el, { opacity: 0 }, { duration: 0.12 });
  };
  useMotionValueEvent(p, "change", sync);
  useEffect(() => sync(p.get()));

  return (
    <div className="absolute top-3 right-6">
      <m.div ref={ref} initial={stampIn.initial} className="origin-center">
        <Stamp entrance={false}>WASH SALE</Stamp>
      </m.div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────────────
   Fallback: reduced motion, short screens, phones. A segmented toggle crossfades between the
   end of step 1 (three broker ledgers) and the end of step 4 (the merged ledger).
   ─────────────────────────────────────────────────────────────────────────── */

type View = "broker" | "irs";
const VIEWS = [
  { value: "broker" as const, label: "Broker view" },
  { value: "irs" as const, label: "IRS view" },
];

function ConvergenceFallback() {
  const [view, setView] = useState<View>("broker");
  return (
    <div className="convergence-fallback page-container pt-24">
      <Heading />
      <div className="mt-4 grid [&>*]:[grid-area:1/1]">
        <Fade show={view === "broker"}>
          <Lead strong={LEAD.strong}>{LEAD.rest}</Lead>
        </Fade>
        <Fade show={view === "irs"}>
          <Lead strong={CAPTION.strong}>{CAPTION.rest}</Lead>
        </Fade>
      </div>
      <Segmented label="Ledger view" options={VIEWS} value={view} onChange={setView} className="mt-8" />
      <div className="mt-8 grid [&>*]:[grid-area:1/1]">
        <Panel show={view === "broker"}>
          <div className="grid gap-6 md:grid-cols-3">
            {LEDGER_ACCOUNTS.map((a) => (
              <LedgerPage key={a.id} title={a.name} footer={<Badge tone="gain">No issues found</Badge>}>
                <div className="px-5">
                  {entriesFor(a.id).map((e) => (
                    <LedgerRow key={e.id} entry={e} proposedRealized={e.proposed ? data.saleRealized : undefined} />
                  ))}
                </div>
              </LedgerPage>
            ))}
          </div>
        </Panel>
        <Panel show={view === "irs"}>
          <MergedStatic />
        </Panel>
      </div>
    </div>
  );
}

function Fade({ show, children }: { show: boolean; children: ReactNode }) {
  return (
    <m.div initial={false} animate={{ opacity: show ? 1 : 0 }} transition={{ duration: 0.2 }} aria-hidden={!show}>
      {children}
    </m.div>
  );
}

function Panel({ show, children }: { show: boolean; children: ReactNode }) {
  return (
    <m.div
      initial={false}
      animate={{ opacity: show ? 1 : 0 }}
      transition={{ duration: 0.24 }}
      aria-hidden={!show}
      inert={!show}
      className={cn("min-w-0", !show && "pointer-events-none")}
    >
      {children}
    </m.div>
  );
}

function MergedStatic() {
  const sorted = [...data.entries].sort((a, b) => a.rank - b.rank);
  const top = data.window.firstRank * ROW + 4;
  const bottom = (data.window.lastRank + 1) * ROW + 12;
  return (
    <div className="max-w-[40rem]">
      <LedgerPage
        title={
          <span className="flex w-full items-center justify-between">
            All accounts · by date
            <span className="-mr-1 -rotate-[8deg]">
              <Stamp entrance={false}>WASH SALE</Stamp>
            </span>
          </span>
        }
        footer={
          <>
            <Badge tone="wash">{WASH_BADGE}</Badge>
            <Badge tone="loss">{IRA_BADGE}</Badge>
          </>
        }
      >
        <div className="relative min-w-0 pr-4 pl-10">
          <WashWindow className="absolute left-[15px]" style={{ top, height: bottom - top } as CSSProperties} />
          {sorted.map((e) => {
            const isReplacement = e.id === data.replacement.id;
            const isTrap = e.id === data.iraTrap.saleId || e.id === data.iraTrap.buyId;
            return (
              <div key={e.id} className="relative flex items-center justify-between gap-3">
                {isReplacement && (
                  <span className="absolute -inset-x-3 inset-y-0.5 rounded-sm bg-[color-mix(in_oklch,var(--fg)_7%,transparent)] shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--wash)_45%,transparent)]" />
                )}
                <LedgerRow entry={e} proposedRealized={e.proposed ? data.saleRealized : undefined} className="relative min-w-0" />
                <span className="relative flex shrink-0 items-center gap-2">
                  {isReplacement && <Chip tone="wash">{money(data.disallowed, { whole: true })}</Chip>}
                  {isTrap && <Marker tone="loss" />}
                  <AccountTag entry={e} className="hidden sm:inline" />
                </span>
              </div>
            );
          })}
        </div>
      </LedgerPage>
      <p className="num mt-4 text-meta text-muted">
        <span className="text-fg">61-day window</span> · {WINDOW_LABEL}
      </p>
    </div>
  );
}
