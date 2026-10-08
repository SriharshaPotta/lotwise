// The real engine (Rust → WASM) from TypeScript:
// 1. every hand-computed fixture in engine/tests/fixtures runs through the WASM build and must
//    match exactly what the Rust test suite checks;
// 2. every engine call the marketing site makes, across every slider/toggle position, gives the
//    same cents from the WASM engine as from the TypeScript reference model it falls back to.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import * as demo from "@/lib/demo";
import { engine, section1256Tax, setWasmEngine, type SaleInput } from "@/lib/engine";
import { referenceEngine } from "@/lib/engine/reference";
import { initEngineSync, type WasmEngine } from "@/lib/engine/wasm";
import * as raw from "@/lib/engine/wasm/lotwise_engine.js";

const root = join(__dirname, "..");
let wasm: WasmEngine;

beforeAll(() => {
  wasm = initEngineSync(readFileSync(join(root, "lib/engine/wasm/lotwise_engine_bg.wasm")));
});

// Same partial-match rules as engine/tests/fixtures.rs.
function mismatches(expect: unknown, actual: unknown, path = ""): string[] {
  if (expect && typeof expect === "object" && !Array.isArray(expect) && "$contains" in expect) {
    const want = (expect as { $contains: unknown[] }).$contains;
    const have = Array.isArray(actual) ? actual : [];
    return want.flatMap((w, i) => (have.some((h) => mismatches(w, h).length === 0) ? [] : [`${path}: nothing matches $contains[${i}]`]));
  }
  if (Array.isArray(expect)) {
    if (!Array.isArray(actual) || actual.length !== expect.length) return [`${path}: expected ${expect.length} items, got ${JSON.stringify(actual)}`];
    return expect.flatMap((e, i) => mismatches(e, actual[i], `${path}[${i}]`));
  }
  if (expect && typeof expect === "object") {
    if (!actual || typeof actual !== "object") return [`${path}: expected an object, got ${JSON.stringify(actual)}`];
    return Object.entries(expect).flatMap(([k, v]) =>
      k in actual ? mismatches(v, (actual as Record<string, unknown>)[k], `${path}.${k}`) : [`${path}.${k}: missing`],
    );
  }
  return expect === actual ? [] : [`${path}: expected ${JSON.stringify(expect)}, got ${JSON.stringify(actual)}`];
}

const fixtureDir = join(root, "engine/tests/fixtures");
const fixtures = readdirSync(fixtureDir)
  .filter((f) => f.endsWith(".json"))
  .sort()
  .map((f) => JSON.parse(readFileSync(join(fixtureDir, f), "utf8")) as { name: string; call: keyof typeof raw; input: unknown; expect?: unknown; error?: string });

describe("WASM engine: hand-computed fixtures", () => {
  it("has the full fixture set", () => expect(fixtures.length).toBeGreaterThanOrEqual(30));

  it.each(fixtures.map((f) => [f.name, f] as const))("%s", (_name, f) => {
    const fn = raw[f.call] as (json: string) => string;
    if (f.error) {
      expect(() => fn(JSON.stringify(f.input))).toThrow(f.error);
      return;
    }
    const actual = JSON.parse(fn(JSON.stringify(f.input)));
    expect(mismatches(f.expect, actual)).toEqual([]);
  });

  it("reports its version and rules", () => {
    const info = wasm.info();
    expect(info.washWindowDays).toBe(30);
    expect(info.section1256Symbols).toContain("XSP");
  });
});

describe("marketing site: WASM engine = reference model on every input the site uses", () => {
  /** Runs `exercise` with `engine.simulateSale` recording its inputs (answered by the reference). */
  function recordInputs(exercise: () => void): SaleInput[] {
    const seen: SaleInput[] = [];
    const original = engine.simulateSale;
    setWasmEngine(null);
    engine.simulateSale = (input) => {
      seen.push(structuredClone(input));
      return original(input);
    };
    try {
      exercise();
    } finally {
      engine.simulateSale = original;
    }
    return seen;
  }

  const inputs = recordInputs(() => {
    for (let shares = 0; shares <= 100; shares++) {
      demo.heroReceipt(shares);
      demo.heroReceipt(shares, true);
    }
    for (const a of demo.ACCOUNTS) {
      const max = demo.position(a.id).lot.qty;
      for (let s = 0; s <= max; s++) {
        demo.tradeReceipt(a.id, s);
        demo.tradeReceipt(a.id, s, true);
      }
    }
    demo.heroSafeSale();
    demo.amdHarvest();
    demo.aaplLongTerm();
    demo.agentXyz();
    demo.agentTranscript();
    demo.iraTrap();
    demo.findings();
    demo.simulatorTable();
    demo.harvestGrid();
    demo.countdown();
    demo.sec1256Compare();
    demo.convergence();
    demo.accountsExplainer();
    for (const s of Object.values(demo.WASH_SCENARIOS)) {
      for (let day = 0; day < s.calendarDays; day++) {
        for (const acct of s.accounts) demo.washOutcome(s, demo.scenarioDate(s, day), acct);
      }
    }
    for (let day = 0; day < demo.TERM_EXPLAINER.calendarDays; day++) demo.termState(demo.termDate(day));
    demo.termCliff();
    for (let gain = demo.S1256_EXPLAINER.min; gain <= demo.S1256_EXPLAINER.max; gain += 95) {
      demo.s1256State(gain, false);
      demo.s1256State(gain, true);
    }
    const lots = demo.harvestLots();
    for (let mask = 0; mask < 1 << lots.length; mask++) {
      demo.harvestTotals(lots.filter((_, i) => mask & (1 << i)).map((l) => l.id));
    }
  });

  it("exercises a meaningful number of engine calls", () => expect(inputs.length).toBeGreaterThan(500));

  it("every call agrees to the cent", () => {
    const diffs = inputs.flatMap((input) => {
      const a = referenceEngine.simulateSale(input);
      const b = wasm.simulateSale(input);
      return JSON.stringify(a) === JSON.stringify(b) ? [] : [{ input, reference: a, wasm: b }];
    });
    expect(diffs.slice(0, 3)).toEqual([]);
  });

  it("the headline numbers come out the same with the WASM engine answering", () => {
    setWasmEngine(null);
    const before = [demo.heroReceipt(100, true), demo.findings(), demo.agentTranscript(), demo.iraTrap(), demo.aaplLongTerm()];
    setWasmEngine(wasm);
    try {
      const after = [demo.heroReceipt(100, true), demo.findings(), demo.agentTranscript(), demo.iraTrap(), demo.aaplLongTerm()];
      expect(after).toEqual(before);
      expect(demo.heroReceipt(100).disallowed).toBe(1840);
    } finally {
      setWasmEngine(null);
    }
  });

  it("Section 1256: the engine's 60/40 tax matches the site's section1256Tax", () => {
    const portfolio = {
      accounts: [{ id: "b", name: "B", kind: "taxable" as const }],
      trades: [{ id: "x", account: "b", date: "2026-09-01", side: "buy" as const, symbol: "XSP", qty: 1, price: 10, option: { type: "call" as const } }],
    };
    for (const gain of [500, 4310, 12345, 20000]) {
      const price = 10 + gain / 100;
      const r = wasm.simulate({ portfolio, proposal: { account: "b", symbol: "XSP", qty: 1, price, date: "2026-10-15", option: { type: "call" } } });
      expect(r.term).toBe("1256");
      expect(Number(r.estTax)).toBeCloseTo(section1256Tax(gain), 2);
    }
  });
});
