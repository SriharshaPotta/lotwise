// The demo portfolio the /demo app opens with: three accounts, 30 trades, and a sale you're about
// to regret (100 NVDA in Brokerage One, with NVDA calls bought 12 days ago in Brokerage Two).
// It is the same story the marketing site tells (lib/demo), written as a full trade history so
// the real engine can replay it. tests/portfolio.test.ts holds the two together.
import type { Portfolio, PortfolioTrade, Prices } from "@/lib/engine/portfolio";

export const DEMO_AS_OF = "2026-10-15";

const NVDA_CALL = { type: "call", multiplier: 100, strike: 140, expiry: "2026-11-20" } as const;
const SPY_CALL = { type: "call", multiplier: 100, strike: 560, expiry: "2026-12-18" } as const;

const t = (
  id: string,
  account: string,
  date: string,
  side: "buy" | "sell",
  symbol: string,
  qty: number,
  price: number,
  extra: Partial<PortfolioTrade> = {},
): PortfolioTrade => ({ id, account, date, side, symbol, qty: String(qty), price: String(price), ...extra });

export const DEMO_PORTFOLIO: Portfolio = {
  version: 1,
  accounts: [
    { id: "brokerage-one", name: "Brokerage One", kind: "taxable" },
    { id: "brokerage-two", name: "Brokerage Two", kind: "taxable" },
    { id: "roth-ira", name: "Roth IRA", kind: "roth" },
  ],
  trades: [
    // Brokerage One
    t("b1-ko-1", "brokerage-one", "2024-04-08", "buy", "KO", 30, 60.1),
    t("b1-aapl-1", "brokerage-one", "2025-10-23", "buy", "AAPL", 40, 117.51),
    t("b1-tsla-1", "brokerage-one", "2025-11-18", "buy", "TSLA", 20, 268.4),
    t("b1-vti-1", "brokerage-one", "2026-01-12", "buy", "VTI", 10, 248.0),
    t("b1-intc-1", "brokerage-one", "2026-01-15", "buy", "INTC", 100, 27.4),
    t("b1-nvda-1", "brokerage-one", "2026-03-12", "buy", "NVDA", 100, 148.2),
    t("b1-ko-sell", "brokerage-one", "2026-06-12", "sell", "KO", 30, 71.25),
    t("b1-spyc-1", "brokerage-one", "2026-07-20", "buy", "SPY", 4, 8.5, { option: SPY_CALL }),
    t("b1-sofi-1", "brokerage-one", "2026-07-21", "buy", "SOFI", 100, 7.9),
    t("t1", "brokerage-one", "2026-08-14", "buy", "COST", 5, 902.4),
    t("t2", "brokerage-one", "2026-09-02", "sell", "TSLA", 20, 241.1),
    t("b1-spyc-sell", "brokerage-one", "2026-09-10", "sell", "SPY", 4, 26.463, { option: SPY_CALL }),
    t("t3", "brokerage-one", "2026-09-28", "sell", "INTC", 100, 21.2),
    t("t4", "brokerage-one", "2026-10-09", "buy", "VTI", 10, 287.6),
    // Brokerage Two
    t("b2-qqq-1", "brokerage-two", "2025-06-02", "buy", "QQQ", 15, 440.1),
    t("b2-amd-1", "brokerage-two", "2026-02-04", "buy", "AMD", 80, 172.0),
    t("b2-meta-1", "brokerage-two", "2026-02-20", "buy", "META", 8, 702.3),
    t("b2-sofi-1", "brokerage-two", "2026-04-14", "buy", "SOFI", 200, 9.8),
    t("b2-xyz-1", "brokerage-two", "2026-05-19", "buy", "XYZ", 100, 50.0),
    t("b2-sofi-sell", "brokerage-two", "2026-07-01", "sell", "SOFI", 200, 7.65),
    t("t5", "brokerage-two", "2026-08-21", "buy", "AMD", 30, 165.2),
    t("t6", "brokerage-two", "2026-09-16", "sell", "META", 8, 588.0),
    t("t7", "brokerage-two", "2026-10-03", "buy", "NVDA", 2, 6.4, { option: NVDA_CALL }),
    t("t8", "brokerage-two", "2026-10-08", "buy", "GOOGL", 12, 164.9),
    // Roth IRA
    t("ira-spy-1", "roth-ira", "2023-11-20", "buy", "SPY", 12, 498.75),
    t("ira-msft-1", "roth-ira", "2024-06-03", "buy", "MSFT", 15, 380.1),
    t("t9", "roth-ira", "2026-08-30", "buy", "SCHD", 40, 27.9),
    t("t10", "roth-ira", "2026-09-19", "buy", "MSFT", 3, 418.2),
    t("t11", "roth-ira", "2026-10-06", "buy", "INTC", 100, 21.9),
    t("t12", "roth-ira", "2026-10-12", "sell", "SPY", 4, 569.0),
  ],
  settings: { stRate: "0.24", ltRate: "0.15", method: "fifo" },
};

/** Last prices on DEMO_AS_OF (options by their label). */
export const DEMO_PRICES: Prices = {
  NVDA: "129.80",
  AMD: "158.00",
  AAPL: "231.40",
  XYZ: "40.00",
  INTC: "21.20",
  MSFT: "412.60",
  SPY: "571.30",
  VTI: "290.20",
  COST: "921.50",
  GOOGL: "171.20",
  QQQ: "512.40",
  SCHD: "28.40",
  SOFI: "8.40",
  "NVDA 2026-11-20 140 C": "4.10",
};

/** The sale the demo opens on. */
export const DEMO_SALE = { account: "brokerage-one", symbol: "NVDA", qty: 100, price: "129.80", date: DEMO_AS_OF } as const;
