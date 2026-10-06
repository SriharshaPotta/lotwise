// Section 1256 explainer (§5): the same gain on SPY options (taxed by holding period) and on XSP
// options (Section 1256: 60% long-term, 40% short-term, however long you held them).
import { DEFAULT_RATES, addDays, engine, section1256Tax } from "@/lib/engine";
import { SPY_CALLS_GAIN } from "./findings";
import { DEMO_DATE } from "./prices";

export const S1256_EXPLAINER = {
  /** The demo's closed SPY call trade, to the dollar. */
  defaultGain: Math.round(SPY_CALLS_GAIN),
  min: 500,
  max: 20000,
  step: 5,
  rates: DEFAULT_RATES,
  ltShare: 0.6,
} as const;

export interface S1256State {
  gain: number;
  heldOverYear: boolean;
  spy: { term: "short" | "long"; tax: number };
  /** XSP's two slices of the same gain. */
  xsp: { tax: number; ltTax: number; stTax: number; blendedRate: number };
  /** SPY tax minus XSP tax: positive when XSP is cheaper. */
  saving: number;
}

export function s1256State(gain: number, heldOverYear: boolean): S1256State {
  // SPY calls bought a few weeks ago, or more than a year ago, closed today for `gain`.
  const acquired = addDays(DEMO_DATE, heldOverYear ? -400 : -40);
  const spy = engine.simulateSale({
    lot: { id: "spy-calls", account: "brokerage-one", symbol: "SPY", qty: 1, costPerShare: 0, acquired },
    qty: 1, price: gain, date: DEMO_DATE,
  });
  const x = S1256_EXPLAINER;
  const xspTax = section1256Tax(gain);
  const ltTax = round(gain * x.ltShare * x.rates.lt);
  return {
    gain,
    heldOverYear,
    spy: { term: spy.term, tax: spy.estTax },
    xsp: { tax: xspTax, ltTax, stTax: round(xspTax - ltTax), blendedRate: x.ltShare * x.rates.lt + (1 - x.ltShare) * x.rates.st },
    saving: round(spy.estTax - xspTax),
  };
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}
