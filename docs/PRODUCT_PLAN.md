# Lotwise product plan

The website (Next 16, repo root) promised a real product. This file is the build plan and the
working memory for it: re-read it at the start of every phase, tick boxes as things land.

Estimates only, not tax advice. That sentence goes on every surface.

## Architecture

```
engine/            Rust crate `lotwise-engine` (rlib + cdylib)
  src/money.rs       Decimal money/qty (rust_decimal, serialized as strings)
  src/date.rs        Civil dates (no chrono), anniversary + leap-day rules
  src/model.rs       Portfolio, Account, Trade, Lot, Realization… (serde, camelCase)
  src/rules.rs       Term, Section 1256 list, rates, wash windows
  src/ledger.rs      The core: replay trades chronologically → lots + realizations + wash sales
  src/simulate.rs    Pre-trade receipt (+ coupons), single-lot sale (site's legacy SaleInput)
  src/scan.rs        Harvest scan, long-term countdown, year summary
  src/wasm.rs        wasm-bindgen exports: JSON string in → JSON string out
  tests/fixtures/*.json  Hand-computed fixtures (shared with the TS parity suite)
lib/engine/wasm/   Committed wasm-bindgen `--target web` output (Vercel has no Rust)
lib/engine/wasm.ts Typed TS wrapper: loadEngine() (browser: fetch; Node: initSync from disk)
lib/engine/index.ts `engine` (sync facade used by the marketing explainers) + loadEngine()
scripts/build-engine.sh   cargo build → wasm-bindgen → lib/engine/wasm (+ MCP bundle copy)
app/(site)/demo    The demo app (client-only, localStorage persistence)
app/(site)/agents  MCP setup page
mcp/               TypeScript stdio MCP server (official SDK), bundled to mcp/dist/lotwise-mcp.mjs
                   with the wasm next to it; zero runtime deps after bundling
```

One engine, three hosts: the browser (demo + marketing explainers), Node (Vitest parity, MCP).
The wasm is built once with `--target web`; Node loads the same file with `initSync(bytes)`.

### Why the marketing explainers keep a sync facade
Every explainer on the landing page and /learn calls `engine.simulateSale` synchronously while the
visitor drags a slider, and the landing page must not pay for WASM up front (Lighthouse ~99/~90,
CLS 0). So `lib/engine/index.ts` exports a sync `engine` that delegates to the WASM engine once it
is loaded and to the TypeScript reference model (`reference.ts`, the former mock) until then.
Explainers call `preloadEngine()` when they hydrate, so interactions run on the real engine.
A parity suite (`tests/engine-parity.test.ts`) runs every marketing scenario through both and
requires identical cents, so the copy numbers are the real engine's numbers either way.

## Engine rules (and simplifications)

Money and quantities are `rust_decimal::Decimal`; JSON carries them as strings ("148.20").
Results round to cents (banker's rounding is NOT used: half away from zero) only at the edges.

- **Lots** per account. Buys create lots. Sells consume lots by method: FIFO (default), HIFO
  (highest cost per share first), LIFO, or specific lots (`lots: [{lotId, qty}]`). Partial sales split lots.
- **Term**: long-term if the sale date is after the one-year anniversary of the (possibly tacked)
  holding start. Anniversary of Feb 29 is Feb 28 (month-end rule), so long-term from Mar 1.
- **Est. tax**: recognized gain × ST or LT rate (defaults 24% / 15%, configurable). Losses show a
  negative tax (a deduction). Year summary nets ST and LT, caps net capital loss deduction at
  $3,000 (ordinary income at the ST rate) and reports the carryforward. No NIIT, AMT, state tax.
- **Wash sales** (IRC §1091) across every account the user owns:
  - A loss sale in a taxable account + an acquisition of substantially identical securities in
    any account within 30 days before or after (61-day window). "Substantially identical" =
    same symbol (case-insensitive), or a call option on that symbol, or a sold put flagged
    `deepItm` on that symbol. Different ETFs on the same index are NOT treated as identical.
  - Replacement shares are matched in order of acquisition; each replacement share absorbs at
    most one loss share. Shares bought and sold within the same loss sale are not replacements.
  - Disallowed = loss × matched shares / sold shares (pro-rated per lot).
  - Taxable replacement: disallowed loss is added to the replacement lot's basis and the
    replacement's holding period is tacked (start = replacement acquired − days the loss lot was
    held). Partially matched replacement lots are split. Chained wash sales follow naturally.
  - IRA/Roth replacement: disallowed permanently, no basis adjustment (Rev. Rul. 2008-5).
  - Options: a call counts as `contracts × multiplier` replacement shares; its basis gets the
    adjustment. Simplification: an option position is only "substantially identical" to the same
    option contract for its own loss sales; a sold deep-ITM put must be flagged by the user.
  - Simplification: a purchase before the sale counts only if it is still held (partly) at the
    sale; purchases already sold again before the loss sale are ignored.
- **IRA/Roth accounts**: sales are not taxed (realized is shown, recognized = 0, `taxExempt`).
  IRA sales never trigger wash sales; IRA purchases can be replacements.
- **Section 1256** (SPX, SPXW, XSP, NDX, NDXP, XND, RUT, RUTW, MRUT, VIX, VIXW, OEX, XEO, DJX):
  60% long / 40% short regardless of holding period; never subject to wash sales. No year-end
  mark-to-market of open positions (simplification).
- **Short sales, splits, dividends reinvestment, corporate actions, fees**: not modelled except
  `fees` on a trade (added to basis on buys, subtracted from proceeds on sells).

### Pre-trade receipt (`simulate`)
Input: portfolio + proposal `{account, symbol, qty, price, date, method?, lots?, rebuy?: {account, qty, price, date}}`.
The engine replays the portfolio with the hypothetical trades appended and reports the proposed
sale: proceeds, basis, realized, term (mixed when lots differ), deductible, disallowed, permanent
flag, causes (trade id, account, date, symbol, option, qty matched), est. tax, replacement basis /
holding start, and coupons:
- `longTerm`: sell on/after date X (gain lots that are short-term) → saves (st−lt) × gain.
- `avoidWash`: sell on/after the latest prior replacement + 31 days → keeps the deduction;
  `safeRebuy`: rebuy on/after sale + 31 days.
- `harvestInstead`: the largest clean harvestable loss elsewhere that would not wash.

### Scans
- `harvestScan(portfolio, prices, date)`: every taxable lot with an unrealized loss, its loss,
  est. tax saved, and wash risk (purchases within the last 30 days in any account, or replacement
  lots) with the first safe date.
- `countdown(portfolio, prices, date)`: per open short-term lot: long-term date, days away,
  unrealized gain, tax saved by waiting.
- `summary(portfolio, year)`: realized ST/LT, disallowed (temporary vs permanent), 1256, est. tax.

## Data formats

- Engine JSON (`Portfolio`): `{ version: 1, accounts: [{id, name, kind: "taxable"|"ira"|"roth"}],
  trades: [{id, account, date, side: "buy"|"sell", symbol, qty, price, fees?, option?: {type: "call"|"put", multiplier, strike?, expiry?, deepItm?}, method?, lots?}],
  settings?: {stRate, ltRate} }`. Money/qty as strings or numbers.
- Lotwise CSV (generic): header
  `date,account,side,symbol,qty,price,fees,option_type,multiplier,strike,expiry,account_type,id`
  (only the first six are required). Exported by the demo, read by the demo and the MCP server.
- Broker CSV: Schwab "Transactions" export (Date, Action, Symbol, Description, Quantity, Price,
  Fees & Comm, Amount), mapped per file to one account.

## Phases

### Phase 1 — Rust engine + tests
- [x] money/date/model/rules
- [x] ledger with FIFO/HIFO/LIFO/specific, partial lots
- [x] wash sales (before/after, across accounts, pro-rata, basis + holding tacking, chains, IRA permanent, options)
- [x] Section 1256
- [x] simulate + coupons, single-lot sale
- [x] harvest scan, countdown, year summary
- [x] hand-computed fixtures (JSON) + unit tests; clippy + fmt clean

### Phase 2 — WASM + site swap
- [x] wasm-bindgen exports; scripts/build-engine.sh (reproducible, path-remapped)
- [x] lib/engine/wasm.ts, index.ts facade, preloadEngine in explainers
- [x] parity suite (fixtures through WASM from Vitest) + marketing scenarios parity
- [x] `npm run engine:check` verifies committed artifacts

### Phase 3 — /demo app
- [x] demo portfolio (3 accounts, ~30 trades) consistent with lib/demo
- [x] positions / lots, simulator (ticket + receipt), harvest, countdown, year summary
- [x] CSV import (Lotwise + Schwab), manual entry, export, reset, clear
- [x] responsive, keyboard, axe, reduced motion; screenshots review

### Phase 4 — MCP + /agents
- [x] mcp/ server: check_trade_tax_impact, list_lots, find_harvestable_losses, days_until_long_term, summarize_year
- [x] tests, bundle, README (Claude Code, Claude Desktop, Cursor)
- [x] /agents page; Agents section link

### Phase 5 — links, README, LICENSE, CI
- [x] SITE.github, copy updates, sitemap
- [x] README, LICENSE, CONTRIBUTING
- [x] GitHub Actions

### Phase 6 — review loop, deploy check, known gaps

## Decisions log
- WASM is 323 KB raw / 114 KB gzip; loaded only by /demo and explainer pages (never the landing page).
- `preloadEngine()` runs in `ExplainerFrame`; `<html data-engine="wasm">` marks it loaded (e2e checks it).
- The mock became `lib/engine/reference.ts`; parity test covers >500 site inputs to the cent.
- Own tiny civil-date implementation instead of chrono (wasm size, exact anniversary rules).
- JSON strings across the wasm boundary (no serde-wasm-bindgen): one format for browser, Node, MCP, fixtures.
- No wasm-opt in the build (keeps artifacts reproducible between the container and CI).

- The demo's "today" is pinned to Oct 15 2026 for the demo portfolio (the story's date); imports use the real date. Editable on the Data tab.
- `<Receipt>` takes a structural `ReceiptModel`; the demo adapts engine receipts to it (components/demo/receiptModel.ts). Stamps: WASH SALE, PERMANENT, LONG-TERM IN N DAYS.
- Demo state = one localStorage key (`lotwise:v1`); the untouched demo is never written.

- MCP server: `mcp/src` bundled by esbuild into one minified file (`mcp/dist/lotwise-mcp.mjs`, committed) next to the .wasm; zero runtime deps. Root `package.json` has `bin` so `npx -y github:SriharshaPotta/lotwise` works (installs the site's deps on first run: slow). Tools: check_trade_tax_impact, list_lots, find_harvestable_losses, days_until_long_term, summarize_tax_year. Data file re-read per call; `--demo` for the built-in portfolio.

- ESLint (eslint-config-next core-web-vitals + typescript) added; the React Compiler rules `set-state-in-effect` and `refs` are warnings (pre-existing deliberate patterns).

## Known gaps / not great yet
(filled in at the end)
