import { referenceEngine } from "./reference";
import type { Engine } from "./types";
import type { WasmEngine } from "./wasm";

// The site talks to `engine`. It is the Rust/WASM engine once loaded; until then (and during
// server rendering) the TypeScript reference model answers. tests/engine-parity.test.ts holds the
// two to identical cents on every scenario the site shows, so which one answered never shows.
let wasm: WasmEngine | null = null;
let pending: Promise<WasmEngine | null> | null = null;

export const engine: Engine = {
  simulateSale: (input) => (wasm ?? referenceEngine).simulateSale(input),
};

/** Starts loading the WASM engine in the browser (idempotent); resolves to it, or null on failure. */
export function preloadEngine(): Promise<WasmEngine | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  pending ??= import("./wasm")
    .then((m) => m.loadEngine())
    .then((e) => {
      wasm = e;
      document.documentElement.dataset.engine = "wasm"; // observable for e2e tests
      return e;
    })
    .catch(() => null);
  return pending;
}

/** Routes `engine` through an already-initialized WASM engine (tests, Node). */
export function setWasmEngine(e: WasmEngine | null) {
  wasm = e;
}

/** Which implementation is answering right now. */
export function engineKind(): "wasm" | "reference" {
  return wasm ? "wasm" : "reference";
}

export type * from "./types";
export type * from "./portfolio";
export type { WasmEngine } from "./wasm";
export {
  DEFAULT_RATES,
  WASH_WINDOW_DAYS,
  costBasis,
  firstSafeRebuyAfter,
  firstSafeSaleAfter,
  isInWashWindow,
  isLongTerm,
  longTermDate,
  recognized,
  section1256Tax,
} from "./reference";
export { addDays, addMonths, daysBetween } from "./dates";
