"use client";

import { motion, useReducedMotion } from "motion/react";
import { useState, type ReactNode } from "react";
import { LedgerRules } from "@/components/ledger/LedgerRules";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Segmented } from "@/components/ui/Segmented";
import { Slider } from "@/components/ui/Slider";
import { Toggle } from "@/components/ui/Toggle";
import { Hatch } from "@/components/viz/Hatch";
import { cn } from "@/lib/cn";
import { aaplLongTerm, ACCOUNTS, amdHarvest, heroReceipt, iraTrap, type AccountId } from "@/lib/demo";
import { money, receiptDate } from "@/lib/format";
import { DEMO_DATE } from "@/lib/demo";
import { ease, spring, transition } from "@/lib/motion";

// Every figure shown here comes from lib/demo, same as the real sections will.
const hero = heroReceipt(100);
const amd = amdHarvest();
const aapl = aaplLongTerm();
const trap = iraTrap();
const ACCOUNT_OPTIONS = ACCOUNTS.map((a) => ({ value: a.id, label: a.name }));

const STATES = ["default", "hover", "focus", "pressed", "disabled"] as const;
type State = (typeof STATES)[number];
const force = (s: State) => (s === "pressed" ? "active" : s === "default" || s === "disabled" ? undefined : s);

export function KitchenSink() {
  return (
    <main className="relative min-h-dvh overflow-x-clip">
      <LedgerRules />
      <div className="page-container relative pt-24 pb-32">
        <header className="grid grid-cols-12 gap-x-6 pb-24">
          <p className="num col-span-12 mb-4 h-ledger text-meta leading-(--ledger-row) text-muted">/dev/kitchen-sink</p>
          <h1 className="col-span-12 text-display md:col-span-10">
            Every part, in every state, on ink <em>and</em> on paper.
          </h1>
          <p className="col-span-12 mt-8 max-w-[44ch] text-lead text-muted md:col-span-6">
            The primitives the site is built from. Hover, focus and pressed states are pinned with
            <code className="num text-[0.9em] text-fg"> data-force</code> so they can be reviewed side by side.
          </p>
        </header>

        <Section title="Color" note="DESIGN.md §2.2. Wash amber never appears without its hatch.">
          <Swatches />
        </Section>

        <Section title="Type" note="Newsreader for headlines, Geist Sans for prose, Geist Mono for every number.">
          <TypeSpecimen />
        </Section>

        <Section title="Button" note="Primary is the one saturated emerald moment; hover fades a layer, presses scale.">
          <Twin>{() => <ButtonGrid />}</Twin>
        </Section>

        <Section title="Badge" note="Status on a ledger. Each tone leads with its finance-grammar mark.">
          <Twin>{() => <BadgeSet />}</Twin>
        </Section>

        <Section title="Chip" note="Money moving between buckets. Static, or a toggle with aria-pressed.">
          <Twin>{() => <ChipSet />}</Twin>
        </Section>

        <Section title="Toggle" note="role=switch. Thumb on the paper spring, track crossfades.">
          <Twin>{() => <ToggleSet />}</Twin>
        </Section>

        <Section title="Slider" note="Native range input, so arrows, Page Up/Down, Home and End all work.">
          <Twin>{() => <SliderSet />}</Twin>
        </Section>

        <Section title="Segmented" note="Radio group with roving focus. Arrow keys move and select.">
          <Twin>{() => <SegmentedSet />}</Twin>
        </Section>

        <Section title="Hatch" note="The brand texture: amber for wash windows, fine emerald for the final band.">
          <Twin>{() => <HatchSet />}</Twin>
        </Section>

        <Section title="Ledger rules" note={`Rules every --ledger-row (32px) with a double margin rule.`}>
          <Twin>{() => <LedgerSample />}</Twin>
        </Section>

        <Section title="Motion" note="Paper spring for objects, ink easing for lines. Off under reduced motion.">
          <MotionSample />
        </Section>
      </div>
    </main>
  );
}

/* ── layout helpers ─────────────────────────────────────────────────────── */

function Section({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  return (
    <section className="grid grid-cols-12 gap-x-6 gap-y-6 pb-32">
      <div className="col-span-12 lg:col-span-3">
        <h2 className="text-[30px] leading-[1.1] tracking-[-0.01em]">{title}</h2>
        <p className="mt-3 max-w-[32ch] text-[14px] leading-[1.55] text-muted">{note}</p>
      </div>
      <div className="col-span-12 lg:col-span-9">{children}</div>
    </section>
  );
}

/** Renders the same specimen on ink and on paper. */
function Twin({ children }: { children: () => ReactNode }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Panel surface="ink">{children()}</Panel>
      <Panel surface="paper">{children()}</Panel>
    </div>
  );
}

function Panel({ surface, children }: { surface: "ink" | "paper"; children: ReactNode }) {
  return (
    <div
      className={cn(
        "relative min-w-0 rounded-sm p-6",
        surface === "ink" ? "border border-border bg-bg" : "paper shadow-paper",
      )}
    >
      <p className="num mb-6 text-[12px] text-ctx-muted">on {surface}</p>
      {children}
    </div>
  );
}

function Cell({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col items-start gap-2.5", className)}>
      <span className="num text-[12px] text-ctx-muted">{label}</span>
      {children}
    </div>
  );
}

/* ── specimens ─────────────────────────────────────────────────────────── */

const INK_SWATCHES = ["bg", "surface", "surface-2", "fg", "muted", "border", "rule", "rule-strong", "accent", "accent-hover", "accent-deep", "on-accent", "accent-soft", "gain", "loss", "wash", "longterm", "sec1256"];
const PAPER_SWATCHES = ["paper", "paper-2", "ink", "ink-muted", "gain-ink", "loss-ink", "wash-ink", "stamp"];

function Swatches() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Panel surface="ink">
        <SwatchGrid names={INK_SWATCHES} />
      </Panel>
      <Panel surface="paper">
        <SwatchGrid names={PAPER_SWATCHES} />
      </Panel>
    </div>
  );
}

function SwatchGrid({ names }: { names: string[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-3">
      {names.map((n) => {
        const isWash = n === "wash" || n === "wash-ink";
        return (
          <li key={n} className="flex items-center gap-3">
            <span
              className={cn("size-8 shrink-0 rounded-[4px] shadow-[inset_0_0_0_1px_var(--ctx-rule-strong)]", isWash && "hatch-wash")}
              style={isWash ? { ["--ctx-wash" as string]: `var(--${n})` } : { background: `var(--${n})` }}
            />
            <span className="num text-[12px] break-all text-ctx-fg">--{n}</span>
          </li>
        );
      })}
    </ul>
  );
}

function TypeSpecimen() {
  return (
    <div className="grid gap-6">
      <Panel surface="ink">
        <div className="space-y-8">
          <Cell label="display · Newsreader 500, opsz auto, -0.02em">
            <p className="font-display text-display font-medium">
              Know the tax bill <em>before</em> you click sell.
            </p>
          </Cell>
          <Cell label="h2 · Newsreader 500, -0.015em">
            <p className="font-display text-h2 font-medium">
              Your broker sees one account. The IRS sees <em>all</em> of them.
            </p>
          </Cell>
          <Cell label="lead · Geist Sans, muted, max 44ch">
            <p className="max-w-[44ch] text-lead text-muted">
              Lotwise checks every account you own for wash sales and hands you the tax receipt for a trade
              before you place it. It runs entirely in your browser.
            </p>
          </Cell>
          <div className="grid gap-8 sm:grid-cols-2">
            <Cell label="body · 16px">
              <p className="max-w-[60ch] text-body">Each broker checks its own account. That&rsquo;s all it&rsquo;s required to do.</p>
            </Cell>
            <Cell label="meta · Geist Mono 13px, tabular">
              {/* Stacks on narrow screens so a separator never starts a line. */}
              <p className="num flex flex-col gap-1 text-meta text-muted sm:flex-row sm:flex-wrap sm:gap-0">
                {["Runs in your browser", "No account needed", "Open source"].map((t, i) => (
                  <span key={t} className="whitespace-nowrap">
                    {i > 0 && <span aria-hidden className="mx-3 hidden h-3 w-px translate-y-0.5 bg-border sm:inline-block" />}
                    {t}
                  </span>
                ))}
              </p>
            </Cell>
          </div>
        </div>
      </Panel>
      <Panel surface="paper">
        <Cell label="receipt · Geist Mono, caps only on receipts and stamps" className="max-w-md">
          <div className="w-full text-receipt">
            <div className="receipt-caps flex flex-wrap justify-between gap-x-4 text-ctx-fg">
              <span className="whitespace-nowrap">Lotwise · pre-trade receipt</span>
              <span className="num ml-auto whitespace-nowrap">{receiptDate(DEMO_DATE)}</span>
            </div>
            <div className="my-2 h-px bg-ctx-line" />
            <Leader label="Proceeds" value={money(hero.proceeds)} />
            <Leader label="Cost basis" value={money(hero.basis)} />
            <Leader label="Realized" value={money(hero.result!.realized)} tone="loss" />
            <div className="my-2 h-[3px] border-y border-ctx-fg" />
            <Leader label="Disallowed (wash sale)" value={money(hero.disallowed)} tone="wash" />
          </div>
        </Cell>
      </Panel>
    </div>
  );
}

function Leader({ label, value, tone }: { label: string; value: string; tone?: "loss" | "wash" }) {
  return (
    <div className="num flex items-baseline gap-2 text-ctx-fg">
      <span>{label}</span>
      <span aria-hidden className="mb-[0.3em] flex-1 border-b border-dotted border-ctx-muted/60" />
      <span style={tone ? { color: `var(--ctx-${tone})` } : undefined}>{value}</span>
    </div>
  );
}

function ButtonGrid() {
  const rows = [
    { variant: "primary" as const, label: "Open the demo" },
    { variant: "outline" as const, label: "Open the demo" },
    { variant: "quiet" as const, label: "How it works ↓" },
  ];
  return (
    <div className="space-y-8">
      {rows.map((r) => (
        <div key={r.variant} className="space-y-3">
          <p className="num text-[12px] text-ctx-fg">{r.variant}</p>
          <div className="flex flex-wrap gap-x-5 gap-y-4">
            {STATES.map((s) => (
              <Cell key={s} label={s}>
                <Button variant={r.variant} size="sm" data-force={force(s)} disabled={s === "disabled"}>
                  {r.label}
                </Button>
              </Cell>
            ))}
          </div>
        </div>
      ))}
      <Cell label="size md, as a link">
        <Button href="/demo">Open the demo portfolio</Button>
      </Cell>
    </div>
  );
}

function BadgeSet() {
  return (
    <div className="flex flex-col items-start gap-3">
      <Badge tone="gain">No issues found</Badge>
      <Badge tone="wash">1 wash sale · {money(hero.disallowed, { whole: true })} disallowed</Badge>
      <Badge tone="loss">1 IRA trap · loss permanently lost</Badge>
      <Badge tone="longterm">Long-term in {aapl.daysAway} days</Badge>
      <Badge tone="sec1256">60/40 · Section 1256</Badge>
      <Badge>Estimates only</Badge>
    </div>
  );
}

function ChipSet() {
  const [picked, setPicked] = useState(true);
  return (
    <div className="space-y-8">
      <Cell label="static: money in motion">
        <div className="flex flex-wrap gap-2">
          <Chip tone="loss">{money(hero.result!.realized, { whole: true })}</Chip>
          <Chip tone="wash">{money(hero.disallowed, { whole: true })} disallowed</Chip>
          <Chip tone="gain">{money(-amd.deductible, { whole: true })} deductible</Chip>
          <Chip tone="longterm">{aapl.daysAway} days</Chip>
          <Chip>{money(trap.result.wash!.disallowed, { whole: true })}</Chip>
        </div>
      </Cell>
      <div className="flex flex-wrap gap-x-5 gap-y-4">
        {STATES.map((s) => (
          <Cell key={s} label={s}>
            <Chip tone="gain" selected={false} data-force={force(s)} disabled={s === "disabled"}>
              AMD {money(amd.deductible, { whole: true })}
            </Chip>
          </Cell>
        ))}
        <Cell label="selected">
          <Chip tone="gain" selected>
            AMD {money(amd.deductible, { whole: true })}
          </Chip>
        </Cell>
        <Cell label="live">
          <Chip tone="loss" selected={picked} onClick={() => setPicked((p) => !p)}>
            NVDA {money(hero.result!.realized, { whole: true })}
          </Chip>
        </Cell>
      </div>
    </div>
  );
}

function ToggleSet() {
  const [on, setOn] = useState(false);
  const noop = () => {};
  return (
    <div className="grid gap-x-6 gap-y-6 sm:grid-cols-2">
      <Cell label="live" className="sm:col-span-2">
        <Toggle checked={on} onChange={setOn} label="Buy back next week" />
      </Cell>
      <Cell label="off"><Toggle checked={false} onChange={noop} label="Off" /></Cell>
      <Cell label="on"><Toggle checked onChange={noop} label="On" /></Cell>
      <Cell label="hover"><Toggle checked={false} onChange={noop} label="Hover" data-force="hover" /></Cell>
      <Cell label="focus"><Toggle checked onChange={noop} label="Focus" data-force="focus" /></Cell>
      <Cell label="pressed"><Toggle checked={false} onChange={noop} label="Pressed" data-force="active" /></Cell>
      <Cell label="disabled"><Toggle checked onChange={noop} label="Disabled" disabled /></Cell>
    </div>
  );
}

function SliderSet() {
  const [shares, setShares] = useState(40);
  const noop = () => {};
  return (
    <div className="space-y-6">
      <Cell label="live" className="w-full">
        <Slider label="Shares to sell" value={shares} onChange={setShares} />
      </Cell>
      <div className="grid gap-6 sm:grid-cols-2">
        <Cell label="min" className="w-full"><Slider label="Shares to sell" value={0} onChange={noop} /></Cell>
        <Cell label="max" className="w-full"><Slider label="Shares to sell" value={100} onChange={noop} /></Cell>
        <Cell label="hover" className="w-full"><Slider label="Shares to sell" value={25} onChange={noop} data-force="hover" /></Cell>
        <Cell label="focus" className="w-full"><Slider label="Shares to sell" value={60} onChange={noop} data-force="focus" /></Cell>
        <Cell label="pressed" className="w-full"><Slider label="Shares to sell" value={75} onChange={noop} data-force="active" /></Cell>
        <Cell label="disabled" className="w-full"><Slider label="Shares to sell" value={50} onChange={noop} disabled /></Cell>
      </div>
    </div>
  );
}

function SegmentedSet() {
  const [acct, setAcct] = useState<AccountId>("brokerage-one");
  const noop = () => {};
  return (
    <div className="space-y-6">
      <Cell label="live">
        <Segmented label="Account" options={ACCOUNT_OPTIONS} value={acct} onChange={setAcct} />
      </Cell>
      <Cell label="hover (Brokerage Two)">
        <Segmented label="Account" options={ACCOUNT_OPTIONS} value="brokerage-one" onChange={noop} data-force="hover" />
      </Cell>
      <Cell label="focus">
        <Segmented label="Account" options={ACCOUNT_OPTIONS} value="roth-ira" onChange={noop} data-force="focus" />
      </Cell>
      <Cell label="disabled">
        <Segmented label="Account" options={ACCOUNT_OPTIONS} value="brokerage-two" onChange={noop} disabled />
      </Cell>
    </div>
  );
}

function HatchSet() {
  return (
    <div className="space-y-6">
      <Cell label="wash window" className="w-full">
        <div className="relative h-16 w-full">
          <div className="absolute inset-x-0 top-1/2 h-px bg-ctx-line" />
          <Hatch variant="wash" className="absolute inset-y-0 left-[30%] w-[38%] rounded-[3px]" />
          <span className="absolute top-1/2 left-[49%] h-3 w-0.5 -translate-y-1/2 rounded-full bg-ctx-loss" />
        </div>
      </Cell>
      <Cell label="fine emerald" className="w-full">
        <Hatch variant="accent" className="h-12 w-full rounded-[3px]" />
      </Cell>
      <Cell label="fine emerald, fading up (final band)" className="w-full">
        <Hatch variant="accent" fade="up" as="div" className="h-24 w-full" />
      </Cell>
      <Cell label="wordmark">
        <span className="inline-flex items-center gap-2.5">
          <Hatch variant="accent" className="size-3 shadow-[inset_0_0_0_1px_var(--ctx-accent)]" />
          <span className="font-display text-[22px] leading-none font-medium italic">Lotwise</span>
        </span>
      </Cell>
    </div>
  );
}

function LedgerSample() {
  return (
    <div className="relative h-48 overflow-hidden rounded-[3px] shadow-[inset_0_0_0_1px_var(--ctx-rule)]">
      <LedgerRules marginInset="28px" />
      <div className="num relative pl-12 text-meta leading-(--ledger-row) text-ctx-fg">
        <div className="flex gap-6"><span className="w-14 text-ctx-muted">Oct 3</span><span>BUY 2 NVDA calls</span></div>
        <div className="flex gap-6"><span className="w-14 text-ctx-muted">Oct 6</span><span>BUY 100 INTC</span></div>
        <div className="flex gap-6"><span className="w-14 text-ctx-muted">Oct 9</span><span>BUY 10 VTI</span></div>
        <div className="flex gap-6"><span className="w-14 text-ctx-muted">Oct 15</span><span>SELL 100 NVDA</span></div>
      </div>
    </div>
  );
}

function MotionSample() {
  const [run, setRun] = useState(0);
  // Motion's reducedMotion="user" only stops transforms; drawing must show its final state too.
  const reduce = useReducedMotion();
  return (
    <Panel surface="ink">
      <div className="grid items-end gap-8 sm:grid-cols-[1fr_1fr_auto]">
        <Cell label="paper spring · 220 / 26 / 1.1" className="w-full">
          <div className="relative h-28 w-full">
            <motion.div
              key={`p${run}`}
              initial={{ y: 56, opacity: 0, rotate: 0 }}
              animate={{ y: 0, opacity: 1, rotate: -1.5 }}
              transition={{ ...spring.paper, opacity: transition.ui }}
              className="paper absolute inset-x-6 top-2 h-24 rounded-[3px] shadow-paper"
            >
              <div className="num p-3 text-[12px] text-ctx-muted">receipt</div>
            </motion.div>
          </div>
        </Cell>
        <Cell label="ink line · 1.6s, ease-ink" className="w-full">
          <svg viewBox="0 0 240 112" className="h-28 w-full" aria-hidden>
            <motion.path
              key={`l${run}`}
              d="M0 80 C 30 70, 50 30, 80 46 S 130 96, 160 60 S 210 20, 240 34"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={reduce ? { duration: 0 } : { duration: 1.6, ease: ease.ink }}
            />
          </svg>
        </Cell>
        <Button variant="outline" size="sm" onClick={() => setRun((r) => r + 1)}>
          Replay
        </Button>
      </div>
    </Panel>
  );
}
