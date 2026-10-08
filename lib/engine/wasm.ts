// The real engine: Rust compiled to WebAssembly (engine/ → lib/engine/wasm/, built by
// scripts/build-engine.sh). JSON strings cross the boundary; this file types them.
//
// Browser: `await loadEngine()` fetches and compiles the .wasm once (lazily, never on the landing
// page's critical path). Node (Vitest, the MCP server): `initEngineSync(bytes)` with the file's bytes.
import init, * as raw from "./wasm/lotwise_engine.js";
import type {
  CountdownRow,
  EngineInfo,
  HarvestCandidate,
  Portfolio,
  ReplayResult,
  ScanInput,
  SimulateInput,
  TradeReceipt,
  YearSummary,
} from "./portfolio";
import type { Engine, SaleInput, SaleResult } from "./types";

export interface WasmEngine extends Engine {
  info(): EngineInfo;
  /** Open lots (as of a date, if given) and every realized sale. */
  replay(portfolio: Portfolio, asOf?: string): ReplayResult;
  /** The pre-trade receipt for a proposed sale (and optional rebuy). */
  simulate(input: SimulateInput): TradeReceipt;
  harvestScan(input: ScanInput): HarvestCandidate[];
  countdown(input: ScanInput): CountdownRow[];
  yearSummary(portfolio: Portfolio, year: number): YearSummary;
}

interface RawSaleResult {
  realized: string;
  term: "short" | "long";
  estTax: string;
  wash: null | { disallowed: string; replacementBasis: string; holdingStart: string; permanent: boolean };
}

const call = <T>(fn: (json: string) => string, input: unknown): T => JSON.parse(fn(JSON.stringify(input))) as T;

function create(): WasmEngine {
  return {
    info: () => JSON.parse(raw.info()) as EngineInfo,
    replay: (portfolio, asOf) => call(raw.replay, { portfolio, asOf }),
    simulate: (input) => call(raw.simulate, input),
    harvestScan: (input) => call(raw.harvestScan, input),
    countdown: (input) => call(raw.countdown, input),
    yearSummary: (portfolio, year) => call(raw.yearSummary, { portfolio, year }),
    simulateSale(input: SaleInput): SaleResult {
      const r = call<RawSaleResult>(raw.simulateLotSale, input);
      const n = (s: string) => Number(s) + 0; // + 0 normalizes -0
      return {
        realized: n(r.realized),
        term: r.term,
        estTax: n(r.estTax),
        wash: r.wash && {
          disallowed: n(r.wash.disallowed),
          replacementBasis: n(r.wash.replacementBasis),
          holdingStart: r.wash.holdingStart,
          permanent: r.wash.permanent,
        },
      };
    },
  };
}

let instance: WasmEngine | null = null;
let loading: Promise<WasmEngine> | null = null;

/** The engine if it has finished loading, else null. */
export function loadedEngine(): WasmEngine | null {
  return instance;
}

/** Loads the engine in the browser (once). */
export function loadEngine(): Promise<WasmEngine> {
  loading ??= init({ module_or_path: new URL("./wasm/lotwise_engine_bg.wasm", import.meta.url) })
    .then(() => (instance = create()))
    .catch((e: unknown) => {
      loading = null;
      throw e;
    });
  return loading;
}

/** Initializes the engine synchronously from the .wasm bytes (Node). */
export function initEngineSync(bytes: BufferSource): WasmEngine {
  if (!instance) {
    raw.initSync({ module: bytes });
    instance = create();
  }
  return instance;
}
