/** "Today" for every piece of copy on the site. */
export const DEMO_DATE = "2026-10-15";

/** Last prices on DEMO_DATE. */
export const PRICES = {
  NVDA: 129.8,
  AMD: 158.0,
  AAPL: 231.4,
  XYZ: 40.0,
  INTC: 21.2,
  MSFT: 412.6,
  SPY: 571.3,
  VTI: 290.2,
} as const;

export type Ticker = keyof typeof PRICES;
