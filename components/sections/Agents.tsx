"use client";

import { motion, useInView } from "motion/react";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { useReducedMotionSafe } from "@/components/effects/useReducedMotionSafe";
import { LedgerPage } from "@/components/ledger/LedgerPage";
import { Button } from "@/components/ui/Button";
import { Marker } from "@/components/ui/Marker";
import { cn } from "@/lib/cn";
import { AGENT_TOOL, agentTranscript } from "@/lib/demo";
import { print, printDuration, reveal } from "@/lib/motion";
import { SITE } from "@/lib/site";

const T = agentTranscript();
/** User text types at ~35 characters a second; the reply streams in chunks of 1–3 words. */
const USER_CPS = 35;
const CHUNK_EVERY = 0.07;
const CHUNK_WORDS = [2, 3, 1, 2, 3, 2, 1];
const BEAT = { start: 0.25, afterUser: 0.45, afterReceipt: 0.3 };
const RECEIPT_ROWS = 4;

/** Character offsets where each streamed chunk of the reply ends. */
const REPLY_CHUNKS = (() => {
  const words = [...T.reply.matchAll(/\S+\s*/g)].map((m) => m.index! + m[0].length);
  const ends: number[] = [0];
  for (let w = 0, i = 0; w < words.length; i++) {
    w = Math.min(words.length, w + CHUNK_WORDS[i % CHUNK_WORDS.length]);
    ends.push(words[w - 1]);
  }
  return ends;
})();

type Phase = "idle" | "user" | "tool" | "reply" | "done";
const ORDER: Phase[] = ["idle", "user", "tool", "reply", "done"];
const reached = (phase: Phase, step: Phase) => ORDER.indexOf(phase) >= ORDER.indexOf(step);

/** §4.7. */
export function Agents() {
  return (
    <section id="agents" aria-labelledby="agents-title" className="page-container relative scroll-mt-24">
      <motion.h2 id="agents-title" {...reveal} className="max-w-[16ch] text-h2 lg:max-w-[22ch]">
        Your AI agents can ask <em>before</em> they trade.
      </motion.h2>
      <div className="mt-12 grid gap-12 lg:mt-16 lg:grid-cols-12 lg:gap-8">
        <motion.div {...reveal} className="lg:col-span-4">
          <p className="max-w-[44ch] text-lead text-muted">
            Lotwise ships an MCP server, so Claude, Cursor or any agent can check the tax impact of a trade before placing it.
          </p>
          <Button href={SITE.github} variant="quiet" className="mt-8" target="_blank" rel="noreferrer">
            Set up the MCP server →
          </Button>
        </motion.div>
        <motion.div {...reveal} className="min-w-0 lg:col-span-8">
          <Transcript />
        </motion.div>
      </div>
    </section>
  );
}

type Typed = { shown: RefObject<HTMLSpanElement | null>; rest: RefObject<HTMLSpanElement | null>; text: string };

function write({ shown, rest, text }: Typed, n: number) {
  if (shown.current) shown.current.textContent = text.slice(0, n);
  if (rest.current) rest.current.textContent = text.slice(n);
}

/**
 * The transcript replays once when 40% of it is in view, and again on "Replay". Both messages are
 * laid out at full length from the start (the untyped part is transparent), so typing never moves
 * anything and screen readers always get the whole conversation.
 */
function Transcript() {
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef, { amount: 0.4 });
  const reduce = useReducedMotionSafe();
  const [phase, setPhase] = useState<Phase>("idle");
  const [play, setPlay] = useState(0);
  const user: Typed = { shown: useRef(null), rest: useRef(null), text: T.user };
  const reply: Typed = { shown: useRef(null), rest: useRef(null), text: T.reply };

  useEffect(() => {
    if (reduce) {
      write(user, user.text.length);
      write(reply, reply.text.length);
      setPhase("done");
    } else if (inView && play === 0) {
      setPlay(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, reduce, play]);

  useEffect(() => {
    if (play === 0 || reduce) return;
    let alive = true;
    let raf = 0;
    const timers: number[] = [];
    const wait = (s: number) => new Promise<void>((r) => timers.push(window.setTimeout(r, s * 1000)));
    const typeOut = (t: Typed, at: (elapsed: number) => number) =>
      new Promise<void>((done) => {
        let t0 = 0;
        let last = -1;
        const step = (now: number) => {
          if (!alive) return;
          t0 ||= now;
          const n = Math.min(t.text.length, at((now - t0) / 1000));
          if (n !== last) write(t, (last = n));
          if (n >= t.text.length) done();
          else raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
      });

    (async () => {
      write(user, 0);
      write(reply, 0);
      setPhase("user");
      await wait(BEAT.start);
      await typeOut(user, (e) => Math.floor(e * USER_CPS));
      await wait(BEAT.afterUser);
      if (!alive) return;
      setPhase("tool");
      await wait(printDuration(RECEIPT_ROWS) + BEAT.afterReceipt);
      if (!alive) return;
      setPhase("reply");
      await typeOut(reply, (e) => REPLY_CHUNKS[Math.min(Math.floor(e / CHUNK_EVERY), REPLY_CHUNKS.length - 1)]);
      if (alive) setPhase("done");
    })();

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play, reduce]);

  const replay = () => {
    rootRef.current?.focus();
    setPlay((p) => p + 1);
  };

  return (
    <div ref={rootRef} tabIndex={-1} className="outline-none">
      <LedgerPage
        title={<span>conversation · lotwise MCP</span>}
        footer={
          <div className="flex h-8 items-center">
            {!reduce && (
              <motion.div initial={false} animate={{ opacity: phase === "done" ? 1 : 0 }} transition={{ duration: 0.3 }} inert={phase !== "done"}>
                <Button variant="quiet" size="sm" onClick={replay} className="text-muted">
                  Replay ↺
                </Button>
              </motion.div>
            )}
          </div>
        }
      >
        <div className="px-5 text-[15px] leading-8">
          <Message who="you" show={reached(phase, "user")}>
            <TypedText t={user} />
          </Message>
          <Message who="claude" show={reached(phase, "tool")} className="mt-8">
            <ToolReceipt printing={reached(phase, "tool")} instant={reduce} play={play} />
            <p className="text-fg">
              <TypedText t={reply} />
            </p>
          </Message>
        </div>
      </LedgerPage>
    </div>
  );
}

function Message({ who, show, className, children }: { who: string; show: boolean; className?: string; children: ReactNode }) {
  return (
    <div className={cn("grid sm:grid-cols-[5.5rem_1fr]", className)}>
      <motion.span initial={false} animate={{ opacity: show ? 1 : 0 }} transition={{ duration: 0.2 }} className="num text-meta leading-8 text-muted">
        {who}
      </motion.span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function TypedText({ t }: { t: Typed }) {
  return (
    <span className="text-fg">
      <span ref={t.shown} />
      <span ref={t.rest} className="opacity-0">
        {t.text}
      </span>
    </span>
  );
}

/** The tool call as a mini paper receipt that feeds out of a slot line, then types its rows in. */
function ToolReceipt({ printing, instant, play }: { printing: boolean; instant: boolean; play: number }) {
  const r = T.receipt;
  const rows: [ReactNode, ReactNode][] = [
    [r.sale, <><span className="max-[400px]:sr-only">realized </span><span className="text-loss-ink">{r.realized}</span></>],
    [
      "Wash-sale risk",
      <span key="risk" className="inline-flex items-center gap-2">
        <Marker tone="wash" />
        {r.risk}
      </span>,
    ],
    ["Rebuy safe from", r.safeFrom],
  ];
  const shown = printing || instant;
  const feed = instant
    ? { y: "0%", transition: { duration: 0 } }
    : printing
      ? { y: [...print.feedY], transition: { duration: print.feedDuration, times: [...print.feedTimes], ease: "linear" as const } }
      : { y: "-100%", transition: { duration: 0 } };

  return (
    <div className="relative mb-4 h-[calc(var(--ledger-row)*5)] max-w-[440px]">
      <span aria-hidden className="absolute inset-x-0 top-3 h-px rounded-full bg-rule-strong" />
      <div className="absolute inset-x-0 top-3 bottom-0 overflow-hidden">
        <motion.div key={play} initial={{ y: instant ? "0%" : "-100%" }} animate={feed} className="paper-shadow-sm px-1 pb-3">
          <div className="paper paper-fiber perforated num px-4 pt-4 pb-4 text-[12px] leading-6 text-ink">
            <Line i={0} shown={shown} instant={instant} className="receipt-caps truncate text-[11px] text-ink-muted">
              lotwise · {AGENT_TOOL}
            </Line>
            {rows.map(([label, value], i) => (
              <Line key={i} i={i + 1} shown={shown} instant={instant} className="flex items-end gap-1.5">
                <span className="receipt-caps whitespace-nowrap">{label}</span>
                <span aria-hidden className="receipt-leader min-w-4 flex-1 self-stretch" />
                <span className="receipt-caps whitespace-nowrap">{value}</span>
              </Line>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function Line({ i, shown, instant, className, children }: { i: number; shown: boolean; instant: boolean; className?: string; children: ReactNode }) {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: shown ? 1 : 0 }}
      transition={instant || !shown ? { duration: 0 } : { duration: print.lineFade, delay: print.feedDuration + i * print.lineGap }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
