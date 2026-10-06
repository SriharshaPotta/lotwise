export type Money = number; // mock only; the real engine uses decimal strings

export interface Lot {
  id: string;
  account: string;
  symbol: string;
  qty: number;
  costPerShare: Money;
  acquired: string /* ISO date */;
}

export interface SaleInput {
  lot: Lot;
  qty: number;
  price: Money;
  date: string;
  rebuy?: { date: string; qty: number; price: Money; account: string; isIra?: boolean };
  taxRates?: { st: number; lt: number };
}

export interface SaleResult {
  realized: Money;
  term: "short" | "long";
  estTax: Money;
  wash: null | { disallowed: Money; replacementBasis: Money; holdingStart: string; permanent: boolean };
}

export interface Engine {
  simulateSale(input: SaleInput): SaleResult;
}
