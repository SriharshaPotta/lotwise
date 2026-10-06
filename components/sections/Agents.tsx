"use client";

import { m, useInView } from "motion/react";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { ArrowUp, Check, Chevron, Copy, Plug, Plus, Retry, SPARK_ORANGE, Spark, Spinner, ThumbDown, ThumbUp } from "@/components/agents/ChatIcons";
import { useReducedMotionSafe } from "@/components/effects/useReducedMotionSafe";
import { Badge } from "@/components/ui/Badge";
import { Lead } from "@/components/ui/Lead";
import { Marker } from "@/components/ui/Marker";
import { Surface } from "@/components/ui/Surface";
import { cn } from "@/lib/cn";
import { AGENT_TOOL, agentTranscript } from "@/lib/demo";
import { ease, print, printDuration, reveal } from "@/lib/motion";

/** Hyphens inside words don't break (U+2011), so "similar-but-not-identical" stays whole. */
const T = (({ reply, ...t }) => ({ ...t, reply: reply.replace(/(?<=\w)-(?=\w)/g, "‑") }))(agentTranscript());

/** The reply streams in word by word. */
const WORD_EVERY = 0.04;
const BEAT = { start: 0.25, bubble: 0.24, afterUser: 0.35, thinking: 0.7, spinner: 0.6, afterReceipt: 0.25 };
const RECEIPT_ROWS = 4;
const THINKING = "Thinking…";

/** Character offsets where each streamed word of the reply ends. */
const REPLY_WORDS = [0, ...[...T.reply.matchAll(/\S+\s*/g)].map((w) => w.index! + w[0].length)];

type Phase = "idle" | "user" | "thinking" | "tool" | "result" | "reply" | "done";
const ORDER: Phase[] = ["idle", "user", "thinking", "tool", "result", "reply", "done"];
const reached = (phase: Phase, step: Phase) => ORDER.indexOf(phase) >= ORDER.indexOf(step);

/** §4.7. */
export function Agents() {
  return (
    <section id="agents" aria-labelledby="agents-title" className="page-container relative scroll-mt-24">
      <m.h2 id="agents-title" {...reveal} className="max-w-[16ch] text-h2 lg:max-w-[22ch]">
        Your AI agents can ask <em>before</em> they trade.
      </m.h2>
      <div className="mt-12 grid gap-12 lg:mt-16 lg:grid-cols-12 lg:gap-8">
        <m.div {...reveal} className="lg:col-span-4 lg:pt-4">
          <Lead strong="An MCP server for your agents.">
            Claude, Cursor or any agent will be able to check the tax impact of a trade before placing it.
          </Lead>
          <Badge className="mt-6">MCP server · coming soon</Badge>
        </m.div>
        <m.div {...reveal} className="min-w-0 lg:col-span-8">
          <Transcript />
        </m.div>
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
 * A Claude-style conversation that plays once when 40% of it is in view, and again on "Replay".
 * Every turn is laid out at its final size from the start (hidden parts are transparent, the reply's
 * untyped words included), so the card's height is the finished conversation's and nothing moves
 * while it plays. Screen readers always get the whole transcript, in order.
 */
function Transcript() {
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef, { amount: 0.4 });
  const reduce = useReducedMotionSafe();
  const [phase, setPhase] = useState<Phase>("idle");
  const [play, setPlay] = useState(0);
  const reply: Typed = { shown: useRef(null), rest: useRef(null), text: T.reply };

  useEffect(() => {
    if (reduce) {
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
    const stream = (t: Typed) =>
      new Promise<void>((done) => {
        let t0 = 0;
        let last = -1;
        const step = (now: number) => {
          if (!alive) return;
          t0 ||= now;
          const n = REPLY_WORDS[Math.min(Math.floor((now - t0) / 1000 / WORD_EVERY), REPLY_WORDS.length - 1)];
          if (n !== last) write(t, (last = n));
          if (n >= t.text.length) done();
          else raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
      });
    const go = async (next: Phase, after: number) => {
      if (!alive) return false;
      setPhase(next);
      await wait(after);
      return alive;
    };

    (async () => {
      write(reply, 0);
      setPhase("idle");
      await wait(BEAT.start);
      if (!(await go("user", BEAT.bubble + BEAT.afterUser))) return;
      if (!(await go("thinking", BEAT.thinking))) return;
      if (!(await go("tool", BEAT.spinner))) return;
      if (!(await go("result", printDuration(RECEIPT_ROWS) + BEAT.afterReceipt))) return;
      setPhase("reply");
      await stream(reply);
      if (alive) setPhase("done");
    })();

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play, reduce]);

  const at = (step: Phase) => reached(phase, step);
  const done = phase === "done";

  return (
    <div ref={rootRef} tabIndex={-1} className="max-w-[720px] outline-none">
      <Surface className="flex flex-col">
        <div className="px-4 pt-6 sm:px-8 sm:pt-8">
          {/* User turn */}
          <m.div
            initial={false}
            animate={at("user") ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
            transition={reduce ? { duration: 0 } : { duration: BEAT.bubble, ease: ease.settle }}
            className="flex items-start gap-3"
          >
            <span aria-hidden className="mt-2 grid size-7 shrink-0 place-items-center rounded-full bg-[color-mix(in_oklch,var(--fg)_14%,transparent)] text-[13px] font-medium text-fg">
              S
            </span>
            <p className="min-w-0 rounded-[14px] bg-surface-2 px-4 py-2.5 text-[16px] leading-[1.5] text-fg">
              <span className="sr-only">You: </span>
              {T.user}
            </p>
          </m.div>

          {/* Assistant turn */}
          <div className="mt-7 flex items-start gap-3">
            <m.span
              aria-hidden
              initial={false}
              animate={{ opacity: at("thinking") ? 1 : 0 }}
              transition={{ duration: 0.2 }}
              className="grid h-10 w-7 shrink-0 place-items-center"
            >
              <Spark className={cn(phase === "thinking" && "spark-pulse")} />
            </m.span>
            <div className="min-w-0 flex-1">
              <span className="sr-only">Claude:</span>
              <div className="grid grid-cols-[minmax(0,1fr)] [&>*]:min-w-0 [&>*]:[grid-area:1/1]">
                <Fade show={phase === "thinking"} aria-hidden className="flex h-10 items-center text-[15px] text-muted">
                  {[...THINKING].map((c, i) => (
                    <span key={i} className="shimmer-char" style={{ animationDelay: `${i * 70}ms` }}>
                      {c}
                    </span>
                  ))}
                </Fade>
                <Fade show={at("tool")}>
                  <ToolRow done={at("result")} spinning={phase === "tool" && !reduce} />
                </Fade>
              </div>
              <ToolResult printing={at("result")} instant={reduce} play={play} />
              <p className="mt-5 max-w-[62ch] font-display text-[17px] leading-[1.65] text-fg">
                <span ref={reply.shown} />
                <span ref={reply.rest} className="opacity-0">
                  {T.reply}
                </span>
              </p>
              <Fade show={done} aria-hidden className="-ml-1.5 mt-1.5 flex text-muted">
                {[Copy, ThumbUp, ThumbDown, Retry].map((Icon, i) => (
                  <span key={i} className="grid size-7 place-items-center">
                    <Icon />
                  </span>
                ))}
              </Fade>
            </div>
          </div>
        </div>
        <Composer />
      </Surface>

      {!reduce && (
        <m.div initial={false} animate={{ opacity: done ? 1 : 0 }} transition={{ duration: 0.3 }} inert={!done} className="mt-3">
          <button
            type="button"
            onClick={() => {
              rootRef.current?.focus();
              setPlay((p) => p + 1);
            }}
            className="text-[13px] text-muted underline-offset-4 transition-colors duration-(--motion-fast) hover:text-fg hover:underline"
          >
            Replay ↺
          </button>
        </m.div>
      )}
    </div>
  );
}

function Fade({ show, className, children, ...rest }: { show: boolean; className?: string; children: ReactNode; "aria-hidden"?: boolean }) {
  return (
    <m.div initial={false} animate={{ opacity: show ? 1 : 0 }} transition={{ duration: 0.2 }} className={className} {...rest}>
      {children}
    </m.div>
  );
}

/** The collapsed tool call: server, tool name, a spinner while it runs, a check when it's back. */
function ToolRow({ done, spinning }: { done: boolean; spinning: boolean }) {
  return (
    <div className="ring-hairline flex h-10 min-w-0 items-center gap-2 rounded-[10px] px-3 text-[14px]">
      <Plug className="shrink-0 text-muted" />
      <span className="text-muted max-sm:hidden">Lotwise</span>
      <span className="num min-w-0 truncate text-[13px] text-fg">{AGENT_TOOL}</span>
      <span aria-hidden className="ml-auto flex shrink-0 items-center gap-1.5 text-muted">
        <span className="grid size-4 place-items-center [&>*]:[grid-area:1/1]">
          <Spinner className={cn("transition-opacity duration-150", spinning && "animate-spin", done && "opacity-0")} />
          <Check className={cn("text-fg transition-opacity duration-150", !done && "opacity-0")} />
        </span>
        <Chevron className={cn("transition-transform duration-(--motion-fast) ease-ui", done && "rotate-90")} />
      </span>
    </div>
  );
}

/** The tool result: the paper receipt feeds out from under the tool row, then types its rows in. */
function ToolResult({ printing, instant, play }: { printing: boolean; instant: boolean; play: number }) {
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
    // Clipped on top only, so the paper emerges from under the tool row but its shadow still falls freely.
    <div className="relative h-[140px] max-w-[440px] [clip-path:inset(0_-32px_-48px_-32px)]">
      <m.div key={play} initial={{ y: instant ? "0%" : "-100%" }} animate={feed} className="paper-shadow-sm px-1 pt-2 pb-3">
        <div className="paper paper-fiber perforated num px-4 pt-4 pb-4 text-[12px] leading-6 text-ink">
          <Line i={0} shown={shown} instant={instant} className="receipt-caps truncate text-[11px] text-ink-muted">
            lotwise · result
          </Line>
          {rows.map(([label, value], i) => (
            <Line key={i} i={i + 1} shown={shown} instant={instant} className="flex items-end gap-1.5">
              <span className="receipt-caps whitespace-nowrap">{label}</span>
              <span aria-hidden className="receipt-leader min-w-4 flex-1 self-stretch" />
              <span className="receipt-caps whitespace-nowrap">{value}</span>
            </Line>
          ))}
        </div>
      </m.div>
    </div>
  );
}

function Line({ i, shown, instant, className, children }: { i: number; shown: boolean; instant: boolean; className?: string; children: ReactNode }) {
  return (
    <m.div
      initial={false}
      animate={{ opacity: shown ? 1 : 0 }}
      transition={instant || !shown ? { duration: 0 } : { duration: print.lineFade, delay: print.feedDuration + i * print.lineGap }}
      className={className}
    >
      {children}
    </m.div>
  );
}

/** The message box, drawn only: aria-hidden and inert, nothing in it can be focused or typed into. */
function Composer() {
  return (
    <div aria-hidden inert className="px-4 pt-6 pb-4 sm:px-8 sm:pb-8">
      <div className="ring-hairline rounded-[20px] bg-surface-2 px-3 pt-3.5 pb-2.5">
        <p className="px-1.5 text-[15px] text-muted">Reply to Claude…</p>
        <div className="mt-3 flex items-center gap-2">
          <span className="ring-hairline grid size-8 place-items-center rounded-[8px] text-muted">
            <Plus />
          </span>
          <span className="ml-auto flex items-center gap-1 text-[13px] text-muted">
            Sonnet 5.5
            <Chevron size={12} className="rotate-90" />
          </span>
          {/* Dimmed: nothing typed yet, as in the real composer. */}
          <span className="grid size-8 place-items-center rounded-full text-[#fff] opacity-50" style={{ backgroundColor: SPARK_ORANGE }}>
            <ArrowUp />
          </span>
        </div>
      </div>
    </div>
  );
}
