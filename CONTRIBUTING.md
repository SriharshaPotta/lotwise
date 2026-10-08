# Contributing to Lotwise

Thanks for helping. Lotwise gives people tax estimates, so correctness and clarity come first.

## Ground rules

- **Estimates only — not tax advice.** Any new rule needs a short note in
  `docs/PRODUCT_PLAN.md` (what it models, what it simplifies) and a hand-computed fixture.
- **Nothing leaves the browser.** No analytics on portfolio data, no network calls from the
  engine, the demo's data layer or the MCP server.
- **UI follows `DESIGN.md`** ("the private ledger"): read it before touching components.

## Changing the engine

1. Edit `engine/src/*`. Money and quantities are `Decimal`; dates are `engine/src/date.rs`.
2. Add a fixture in `engine/tests/fixtures/NN-name.json` with numbers you worked out by hand,
   and say how in its `description`. Fixtures run in Rust and against the WASM build from Vitest.
3. `npm run engine:test` (also `cargo fmt` and `cargo clippy --all-targets -- -D warnings`).
4. `npm run engine:build` and commit `lib/engine/wasm/` (and `mcp/dist/lotwise_engine_bg.wasm`).
   CI rebuilds it and fails if what you committed differs.
5. If the JSON interface changed, update `lib/engine/portfolio.ts`.
6. If a number in the site copy changes, `tests/copy-numbers.test.ts` and
   `tests/engine-parity.test.ts` will say so: fix the copy or the demo data, never the test.

## Changing the site

```bash
npm run dev
npm run typecheck && npm run lint && npm test
npm run build && npx playwright test --project='chromium-*'
```

Check new pages at 390, 768 and 1440 px, with reduced motion, and keyboard-only; add them to the
axe list in `e2e/`.

## Changing the MCP server

```bash
cd mcp && npm install && npm test && npm run build
```

Commit `mcp/dist/` (CI checks it's up to date).

## Pull requests

Small and focused, with tests. Describe the tax rule in plain words in the PR. CI runs Rust
tests, clippy and fmt, the WASM and MCP artifact checks, typecheck, lint, Vitest, the build and
Playwright (Chromium).
