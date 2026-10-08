"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  CountdownRow,
  EngineLot,
  HarvestCandidate,
  Portfolio,
  PortfolioAccount,
  PortfolioTrade,
  Prices,
  Realization,
  YearSummary,
} from "@/lib/engine/portfolio";
import { loadEngine, type WasmEngine } from "@/lib/engine/wasm";
import { mergePortfolios, type ParseResult } from "@/lib/portfolio/csv";
import { clearState, demoState, emptyState, loadState, saveState, todayIso, type DemoState } from "@/lib/portfolio/store";

export interface Derived {
  lots: EngineLot[];
  realizations: Realization[];
  harvest: HarvestCandidate[];
  countdown: CountdownRow[];
  summary: YearSummary;
}

/** Price key for a lot: its label, which is the symbol for stocks and "NVDA 2026-11-20 140 C" for options. */
export const priceKey = (l: { label: string }) => l.label;

/**
 * The demo's whole state: the portfolio (saved to this browser only), the engine, and everything
 * the engine derives from them. Recomputed on every edit; the engine is fast enough that a full
 * replay of a few hundred trades takes a few milliseconds.
 */
export function useDemo() {
  const [state, setState] = useState<DemoState | null>(null);
  const [engine, setEngine] = useState<WasmEngine | null>(null);
  const [engineError, setEngineError] = useState<string | null>(null);

  useEffect(() => {
    setState(loadState() ?? demoState());
    loadEngine().then(
      (e) => {
        setEngine(e);
        document.documentElement.dataset.engine = "wasm";
      },
      (e: unknown) => setEngineError(e instanceof Error ? e.message : String(e)),
    );
  }, []);

  const derived = useMemo((): { ok: Derived } | { error: string } | null => {
    if (!engine || !state) return null;
    const { portfolio, prices, asOf } = state;
    try {
      const { lots } = engine.replay(portfolio, asOf);
      const { realizations } = engine.replay(portfolio);
      return {
        ok: {
          lots,
          realizations,
          harvest: engine.harvestScan({ portfolio, prices, date: asOf }),
          countdown: engine.countdown({ portfolio, prices, date: asOf }),
          summary: engine.yearSummary(portfolio, Number(asOf.slice(0, 4))),
        },
      };
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  }, [engine, state]);

  const update = useCallback((fn: (s: DemoState) => DemoState) => {
    setState((s) => {
      if (!s) return s;
      const next = { ...fn(s), source: "custom" as const };
      saveState(next);
      return next;
    });
  }, []);

  const actions = useMemo(
    () => ({
      setPrice: (key: string, price: string) => update((s) => ({ ...s, prices: { ...s.prices, [key]: price } })),
      setAsOf: (asOf: string) => update((s) => ({ ...s, asOf })),
      setRates: (stRate: string, ltRate: string) =>
        update((s) => ({ ...s, portfolio: { ...s.portfolio, settings: { ...s.portfolio.settings, stRate, ltRate } } })),
      addAccount: (a: PortfolioAccount) => update((s) => ({ ...s, portfolio: { ...s.portfolio, accounts: [...s.portfolio.accounts, a] } })),
      removeAccount: (id: string) =>
        update((s) => ({
          ...s,
          portfolio: {
            ...s.portfolio,
            accounts: s.portfolio.accounts.filter((a) => a.id !== id),
            trades: s.portfolio.trades.filter((t) => t.account !== id),
          },
        })),
      addTrade: (t: PortfolioTrade) => update((s) => ({ ...s, portfolio: { ...s.portfolio, trades: [...s.portfolio.trades, t] } })),
      removeTrade: (id: string) =>
        update((s) => ({ ...s, portfolio: { ...s.portfolio, trades: s.portfolio.trades.filter((t) => t.id !== id) } })),
      importFile: (r: ParseResult, mode: "replace" | "merge") =>
        update((s) => {
          const portfolio: Portfolio =
            mode === "replace" ? { ...r.portfolio, settings: r.portfolio.settings ?? s.portfolio.settings } : mergePortfolios(s.portfolio, r.portfolio);
          const prices: Prices = mode === "replace" ? { ...r.prices } : { ...s.prices, ...r.prices };
          // Fill missing prices with each symbol's last trade price, so positions show a value.
          for (const t of [...portfolio.trades].sort((a, b) => a.date.localeCompare(b.date))) {
            if (!t.option && !(t.symbol in prices)) prices[t.symbol] = String(t.price);
          }
          return { ...s, portfolio, prices, asOf: r.asOf ?? (mode === "replace" ? todayIso() : s.asOf) };
        }),
      reset: () => {
        clearState();
        setState(demoState());
      },
      clearAll: () => {
        clearState();
        const blank = emptyState(todayIso());
        saveState(blank);
        setState(blank);
      },
    }),
    [update],
  );

  return { state, engine, engineError, derived, actions };
}

export type DemoActions = ReturnType<typeof useDemo>["actions"];
