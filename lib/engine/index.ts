import { mockEngine } from "./mock";
import type { Engine } from "./types";

export const engine: Engine = mockEngine; // swap to wasmEngine later

export type * from "./types";
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
} from "./mock";
export { addDays, addMonths, daysBetween } from "./dates";
