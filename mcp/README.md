# lotwise-mcp

An [MCP](https://modelcontextprotocol.io) server so Claude, Cursor or any agent can check the tax
impact of a trade **before** placing it: realized gain or loss, short vs long term, wash sales
across every account you own (including the IRA trap), Section 1256, and the first safe rebuy date.

It runs the same Rust → WebAssembly engine as the [Lotwise demo](https://lotwise-seven.vercel.app/demo),
locally, over stdio. It reads your trades from a local file and never touches the network.

> Estimates only — not tax advice.

## Tools

| Tool | What it answers |
|---|---|
| `check_trade_tax_impact` | "If I sell N of X at P (and maybe buy it back on D), what happens?" Realized, term, `wash_sale_risk` (`HIGH`/`NONE`) with the exact purchases that cause it, disallowed (and how much is permanent), est. tax, `rebuy_safe_from`, `sell_safe_from`, cheaper alternatives. |
| `list_lots` | Open lots with basis, holding period, days until long-term, unrealized gain. |
| `find_harvestable_losses` | Losing lots in taxable accounts, ranked; which would wash and when they're safe. |
| `days_until_long_term` | Short-term lots, the date each goes long-term, and the tax saved by waiting. |
| `summarize_tax_year` | Realized ST/LT/§1256, disallowed (deferred vs permanent), net, est. tax. |

Example (the agent transcript on the Lotwise home page):

```jsonc
// check_trade_tax_impact {"symbol": "XYZ", "quantity": 100, "rebuy": {"date": "2026-10-22"}}
{
  "summary": "SELL 100 XYZ in Brokerage Two on 2026-10-15: realized −$1,000.00 (short-term). WASH-SALE RISK HIGH: $1,000.00 of the loss is disallowed … Rebuy safe from 2026-11-15. …",
  "realized": "-1000.00",
  "wash_sale_risk": "HIGH",
  "rebuy_safe_from": "2026-11-15",
  …
}
```

## Your data

Export your trades from the demo (**Your data → Export CSV** or **Export JSON**), or write a CSV:

```csv
date,account,side,symbol,qty,price,fees,option_type,strike,expiry,multiplier,deep_itm,account_name,account_type,id
2026-03-12,brokerage-one,buy,NVDA,100,148.20,,,,,,,Brokerage One,taxable,b1-nvda-1
2026-10-03,brokerage-two,buy,NVDA,2,6.40,,call,140,2026-11-20,100,,Brokerage Two,taxable,t7
```

Only `date, account, side, symbol, qty, price` are required; the account type is guessed from the
name when `account_type` is missing ("Roth IRA" → roth). A Schwab transactions export works too
(`--schwab-account "Schwab Roth IRA"` names the account). The file is re-read on every call.

Prices: JSON exports carry them; otherwise pass `--prices prices.json` (`{"NVDA": "129.80"}`) or a
`price` / `prices` argument to the tools.

## Setup

The server is a single file with no dependencies: `mcp/dist/lotwise-mcp.mjs` (plus the `.wasm`
next to it). Node 20+.

```bash
git clone https://github.com/SriharshaPotta/lotwise
# try it on the demo portfolio
node lotwise/mcp/dist/lotwise-mcp.mjs --demo --help
```

Or without cloning (npx fetches the repository; the first run takes a minute):

```bash
npx -y github:SriharshaPotta/lotwise --demo
```

### Claude Code

```bash
claude mcp add lotwise -- node /path/to/lotwise/mcp/dist/lotwise-mcp.mjs --data ~/lotwise-trades.csv
# or
claude mcp add lotwise -- npx -y github:SriharshaPotta/lotwise --data ~/lotwise-trades.csv
# just trying it:
claude mcp add lotwise-demo -- npx -y github:SriharshaPotta/lotwise --demo
```

### Claude Desktop

`claude_desktop_config.json` (Settings → Developer → Edit Config):

```json
{
  "mcpServers": {
    "lotwise": {
      "command": "node",
      "args": ["/path/to/lotwise/mcp/dist/lotwise-mcp.mjs", "--data", "/Users/you/lotwise-trades.csv"]
    }
  }
}
```

### Cursor

`~/.cursor/mcp.json` (or `.cursor/mcp.json` in a project):

```json
{
  "mcpServers": {
    "lotwise": {
      "command": "npx",
      "args": ["-y", "github:SriharshaPotta/lotwise", "--data", "/Users/you/lotwise-trades.csv"]
    }
  }
}
```

### Options

```
--data FILE            Lotwise CSV/JSON or a Schwab CSV (env LOTWISE_DATA)
--demo                 The built-in demo portfolio (as of Oct 15 2026)
--prices FILE          JSON of last prices (env LOTWISE_PRICES)
--as-of YYYY-MM-DD     Treat this date as today (env LOTWISE_AS_OF)
--schwab-account NAME  Account name for a Schwab file
```

## Development

```bash
cd mcp
npm install
npm test          # a real MCP client against the server, in memory and over stdio
npm run build     # bundles src/ + ../lib into dist/lotwise-mcp.mjs, copies the .wasm
```

`dist/` is committed so the server runs straight from a clone; CI rebuilds it and fails if it
differs. Publishing to npm would only need `npm publish` from this folder (`bin` and `files` are
set up); it isn't published yet.
