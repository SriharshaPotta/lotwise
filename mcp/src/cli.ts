// lotwise-mcp: a stdio MCP server. Reads trades from a local file; never touches the network.
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadData, NO_DATA, type DataOptions } from "./data";
import { createLotwiseServer, VERSION } from "./server";

const HELP = `lotwise-mcp ${VERSION}: check the tax impact of a trade before placing it (MCP over stdio)

Usage: lotwise-mcp [--data FILE | --demo] [options]

  --data FILE            Your trades: Lotwise CSV/JSON (export from the demo) or a Schwab
                         transactions CSV. Re-read on every call. Env: LOTWISE_DATA
  --demo                 Use the built-in demo portfolio (three accounts, Oct 15 2026)
  --prices FILE          JSON of last prices, e.g. {"NVDA": "129.80"}. Env: LOTWISE_PRICES
  --as-of YYYY-MM-DD     Treat this date as today. Env: LOTWISE_AS_OF
  --schwab-account NAME  Account name for a Schwab file (default "Schwab"; "Roth IRA" → Roth)
  -h, --help             This help
  -v, --version          Version

Estimates only, not tax advice.`;

function parseArgs(argv: string[]): DataOptions {
  const o: DataOptions = {
    dataPath: process.env.LOTWISE_DATA || undefined,
    pricesPath: process.env.LOTWISE_PRICES || undefined,
    asOf: process.env.LOTWISE_AS_OF || undefined,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[++i];
      if (!v) throw new Error(`${a} needs a value`);
      return v;
    };
    if (a === "--data") o.dataPath = next();
    else if (a === "--demo") o.demo = true;
    else if (a === "--prices") o.pricesPath = next();
    else if (a === "--as-of") o.asOf = next();
    else if (a === "--schwab-account") o.schwabAccount = next();
    else if (a === "-h" || a === "--help") {
      process.stdout.write(HELP + "\n");
      process.exit(0);
    } else if (a === "-v" || a === "--version") {
      process.stdout.write(VERSION + "\n");
      process.exit(0);
    } else throw new Error(`Unknown option ${a}. Try --help.`);
  }
  return o;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  // Fail fast on a bad file, but keep serving without one: the tools explain how to configure it.
  if (options.dataPath || options.demo) {
    const d = loadData(options);
    process.stderr.write(`lotwise-mcp: ${d.portfolio.trades.length} trades in ${d.portfolio.accounts.length} accounts from ${d.source}, as of ${d.asOf}\n`);
  } else {
    process.stderr.write(`lotwise-mcp: ${NO_DATA}\n`);
  }
  const server = createLotwiseServer(options);
  await server.connect(new StdioServerTransport());
}

main().catch((e: unknown) => {
  process.stderr.write(`lotwise-mcp: ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
