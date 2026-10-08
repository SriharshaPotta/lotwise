// Types for the real engine's JSON interface (engine/src/*.rs). Money and quantities are decimal
// strings ("148.20", "100"); numbers are accepted on input. Dates are ISO "YYYY-MM-DD".

export type Dec = string;
export type DecIn = string | number;

export type AccountKind = "taxable" | "ira" | "roth";

export interface PortfolioAccount {
  id: string;
  name: string;
  kind: AccountKind;
}

export interface OptionSpec {
  type: "call" | "put";
  multiplier?: DecIn;
  strike?: DecIn;
  expiry?: string;
  /** A written put that is deep in the money: counts as a contract to buy the stock. */
  deepItm?: boolean;
}

export type LotMethod = "fifo" | "lifo" | "hifo" | "specific";

export interface LotPick {
  /** A lot id, or the buy trade id that opened it. */
  lotId: string;
  qty?: DecIn;
}

export interface PortfolioTrade {
  id: string;
  account: string;
  date: string;
  side: "buy" | "sell";
  symbol: string;
  qty: DecIn;
  price: DecIn;
  fees?: DecIn;
  option?: OptionSpec;
  method?: LotMethod;
  lots?: LotPick[];
}

export interface PortfolioSettings {
  stRate?: DecIn;
  ltRate?: DecIn;
  method?: LotMethod;
}

export interface Portfolio {
  version?: 1;
  accounts: PortfolioAccount[];
  trades: PortfolioTrade[];
  settings?: PortfolioSettings;
}

export type Prices = Record<string, DecIn>;

export interface EngineLot {
  id: string;
  tradeId: string;
  account: string;
  symbol: string;
  label: string;
  option?: OptionSpec;
  qty: Dec;
  multiplier: Dec;
  basis: Dec;
  costPerShare: Dec;
  acquired: string;
  holdingStart: string;
  longTermFrom: string;
  section1256: boolean;
  washAdjustment: Dec;
  washReplacement: boolean;
}

export type Term = "short" | "long" | "1256";

export interface WashMatch {
  tradeId: string;
  account: string;
  accountKind: AccountKind;
  date: string;
  symbol: string;
  label: string;
  option?: OptionSpec;
  shares: Dec;
  disallowed: Dec;
  permanent: boolean;
  beforeSale: boolean;
}

export interface Realization {
  saleId: string;
  lotId: string;
  lotTradeId: string;
  account: string;
  symbol: string;
  label: string;
  qty: Dec;
  acquired: string;
  holdingStart: string;
  date: string;
  proceeds: Dec;
  basis: Dec;
  realized: Dec;
  disallowed: Dec;
  disallowedPermanent: Dec;
  recognized: Dec;
  term: Term;
  shortTerm: Dec;
  longTerm: Dec;
  estTax: Dec;
  taxExempt: boolean;
  wash: WashMatch[];
}

export interface ReplayResult {
  lots: EngineLot[];
  realizations: Realization[];
}

export interface Proposal {
  account: string;
  symbol: string;
  qty: DecIn;
  price: DecIn;
  date: string;
  fees?: DecIn;
  option?: OptionSpec;
  method?: LotMethod;
  lots?: LotPick[];
  rebuy?: { date: string; account?: string; qty?: DecIn; price?: DecIn; option?: OptionSpec };
}

export interface SimulateInput {
  portfolio: Portfolio;
  proposal: Proposal;
  prices?: Prices;
}

export interface Cause extends Omit<WashMatch, "shares"> {
  qty: Dec;
  shares: Dec;
}

export type Coupon =
  | { kind: "longTerm"; date: string; daysAway: number; saves: Dec }
  | { kind: "avoidWash"; date: string; keeps: Dec }
  | { kind: "safeRebuy"; date: string; keeps: Dec }
  | { kind: "harvestInstead"; lotId: string; account: string; symbol: string; qty: Dec; loss: Dec; estTax: Dec };

export interface TradeReceipt {
  account: string;
  symbol: string;
  label: string;
  qty: Dec;
  price: Dec;
  date: string;
  proceeds: Dec;
  basis: Dec;
  realized: Dec;
  term: Term | "mixed" | "none";
  disallowed: Dec;
  disallowedPermanent: Dec;
  recognized: Dec;
  deductible: Dec;
  shortTerm: Dec;
  longTerm: Dec;
  estTax: Dec;
  taxExempt: boolean;
  causes: Cause[];
  rebuy: null | {
    date: string;
    account: string;
    qty: Dec;
    triggers: boolean;
    disallowed: Dec;
    permanent: boolean;
    safeFrom: string;
    replacementBasis: Dec;
    holdingStart: string;
  };
  lots: Realization[];
  coupons: Coupon[];
}

export interface ScanInput {
  portfolio: Portfolio;
  prices: Prices;
  date: string;
}

export interface HarvestCandidate {
  lotId: string;
  account: string;
  symbol: string;
  label: string;
  qty: Dec;
  acquired: string;
  holdingStart: string;
  term: Term;
  basis: Dec;
  price: Dec;
  value: Dec;
  unrealized: Dec;
  recognized: Dec;
  disallowed: Dec;
  estTax: Dec;
  clean: boolean;
  causes: Cause[];
  safeFrom: string | null;
  section1256: boolean;
}

export interface CountdownRow {
  lotId: string;
  account: string;
  symbol: string;
  label: string;
  qty: Dec;
  acquired: string;
  holdingStart: string;
  longTermFrom: string;
  daysAway: number;
  basis: Dec;
  price: Dec | null;
  unrealized: Dec | null;
  taxSavedByWaiting: Dec;
}

export interface Bucket {
  proceeds: Dec;
  basis: Dec;
  realized: Dec;
  disallowed: Dec;
  recognized: Dec;
  count: number;
}

export interface YearSummary {
  year: number;
  shortTerm: Bucket;
  longTerm: Bucket;
  section1256: Bucket;
  taxExempt: Bucket;
  disallowedTemporary: Dec;
  disallowedPermanent: Dec;
  netShort: Dec;
  netLong: Dec;
  net: Dec;
  deductibleLoss: Dec;
  carryforward: Dec;
  estTax: Dec;
  realizations: Realization[];
}

export interface EngineInfo {
  version: string;
  washWindowDays: number;
  section1256Symbols: string[];
}
