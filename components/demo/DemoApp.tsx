"use client";

import { m } from "motion/react";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Lead } from "@/components/ui/Lead";
import { cn } from "@/lib/cn";
import { receiptDate } from "@/lib/format";
import { spring } from "@/lib/motion";
import { CountdownPanel } from "./CountdownPanel";
import { DataPanel } from "./DataPanel";
import { HarvestPanel } from "./HarvestPanel";
import { PositionsPanel } from "./PositionsPanel";
import { SimulatePanel, type SimRequest } from "./SimulatePanel";
import { useDemo } from "./useDemo";
import { YearPanel } from "./YearPanel";

const TABS = [
  { id: "simulate", label: "Simulate a sale" },
  { id: "positions", label: "Positions" },
  { id: "harvest", label: "Harvest" },
  { id: "long-term", label: "Long-term" },
  { id: "year", label: "This year" },
  { id: "data", label: "Your data" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const isTab = (s: string): s is TabId => TABS.some((t) => t.id === s);

/** The demo app: the real engine, a portfolio saved in this browser, six views of it. */
export function DemoApp() {
  const { state, engine, engineError, derived, actions } = useDemo();
  const [tab, setTab] = useState<TabId>("simulate");
  const [request, setRequest] = useState<SimRequest | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const fromHash = () => {
      const h = window.location.hash.slice(1);
      if (isTab(h)) setTab(h);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);

  const go = useCallback((id: TabId, focus = false) => {
    setTab(id);
    history.replaceState(null, "", `#${id}`);
    if (focus) tabRefs.current[TABS.findIndex((t) => t.id === id)]?.focus();
  }, []);

  const simulate = useCallback(
    (r: SimRequest) => {
      setRequest({ ...r });
      go("simulate");
      document.getElementById("demo-tabs")?.scrollIntoView({ block: "start", behavior: "smooth" });
    },
    [go],
  );

  const onKeyDown = (e: KeyboardEvent) => {
    const i = TABS.findIndex((t) => t.id === tab);
    const to = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: TABS.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    go(TABS[(to + TABS.length) % TABS.length].id, true);
  };

  const ready = state && engine && derived;

  return (
    <div className="page-container pt-[calc(var(--ledger-row)*4)] pb-24 lg:pb-36">
      <header className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <p className="num text-meta leading-8 text-muted">
            Demo · {state ? `as of ${receiptDate(state.asOf).toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}` : "loading"} ·{" "}
            {state?.source === "custom" ? "your data" : "demo portfolio"}
          </p>
          <h1 className="mt-4 max-w-[18ch] text-[clamp(40px,5vw,72px)] leading-[1] tracking-[-0.02em]">
            Three accounts. One sale you&rsquo;re about to <em>regret</em>.
          </h1>
        </div>
        <div className="lg:col-span-4 lg:self-end">
          <Lead strong="Everything here runs in this tab." size="body">
            The Rust tax engine is compiled to WebAssembly and loaded into your browser. Trades you add stay in this browser; nothing is
            uploaded.
          </Lead>
          <p className="num mt-3 text-meta text-muted" aria-live="polite">
            {engineError ? (
              <span className="text-loss">The engine failed to load: {engineError}</span>
            ) : engine ? (
              <>
                engine v{engine.info().version} · WebAssembly · loaded
              </>
            ) : (
              "loading the engine…"
            )}
          </p>
        </div>
      </header>

      <div
        id="demo-tabs"
        role="tablist"
        aria-label="Demo views"
        onKeyDown={onKeyDown}
        className="mt-12 mb-10 flex scroll-mt-24 gap-1 overflow-x-auto rounded-[10px] p-1 ring-hairline [scrollbar-width:none] lg:mt-16"
      >
        {TABS.map((t, i) => {
          const selected = t.id === tab;
          return (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={selected}
              aria-controls={`panel-${t.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => go(t.id)}
              className={cn(
                "relative h-9 shrink-0 rounded-[7px] px-3.5 text-[14px] whitespace-nowrap transition-colors duration-(--motion-fast) ease-ui sm:px-4",
                selected ? "text-fg" : "text-muted hover:text-fg",
              )}
            >
              {selected && <m.span layoutId="demo-tab" transition={spring.paper} className="absolute inset-0 -z-0 rounded-[7px] bg-surface-2 ring-hairline" />}
              <span className="relative">{t.label}</span>
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} tabIndex={-1} className="min-h-[60vh] outline-none">
        {!ready ? (
          <Skeleton />
        ) : "error" in derived ? (
          <div role="alert" className="max-w-[60ch] space-y-3">
            <p className="text-lead text-fg">The engine couldn&rsquo;t replay these trades.</p>
            <p className="num text-[14px] text-loss">{derived.error}</p>
            <p className="text-[14px] text-muted">Fix or remove the trade on the Your data tab, or reset to the demo.</p>
            {tab !== "data" && (
              <button type="button" className="text-[14px] text-accent underline underline-offset-4" onClick={() => go("data")}>
                Go to your data
              </button>
            )}
            {tab === "data" && <DataPanel state={state} actions={actions} />}
          </div>
        ) : (
          <>
            {tab === "simulate" && <SimulatePanel state={state} engine={engine} lots={derived.ok.lots} request={request} onPrice={actions.setPrice} />}
            {tab === "positions" && (
              <PositionsPanel
                portfolio={state.portfolio}
                prices={state.prices}
                asOf={state.asOf}
                lots={derived.ok.lots}
                onPrice={actions.setPrice}
                onSimulate={simulate}
              />
            )}
            {tab === "harvest" && <HarvestPanel portfolio={state.portfolio} asOf={state.asOf} harvest={derived.ok.harvest} onSimulate={simulate} />}
            {tab === "long-term" && <CountdownPanel portfolio={state.portfolio} asOf={state.asOf} rows={derived.ok.countdown} onSimulate={simulate} />}
            {tab === "year" && <YearPanel portfolio={state.portfolio} summary={derived.ok.summary} />}
            {tab === "data" && <DataPanel state={state} actions={actions} />}
          </>
        )}
      </div>

      <p className="num mt-24 text-meta text-muted">Estimates only — not tax advice.</p>
    </div>
  );
}

function Skeleton() {
  return (
    <div aria-hidden className="grid gap-12 lg:grid-cols-12 lg:gap-8">
      <div className="h-[34rem] rounded-[12px] bg-surface ring-hairline lg:col-span-5" />
      <div className="space-y-4 lg:col-span-7 lg:pl-6">
        <div className="h-9 w-2/3 rounded-[6px] bg-surface" />
        <div className="h-5 w-full max-w-[52ch] rounded-[6px] bg-surface" />
      </div>
    </div>
  );
}
