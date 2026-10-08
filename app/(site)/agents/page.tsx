import type { Metadata } from "next";
import { CodeBlock } from "@/components/agents/CodeBlock";
import { Button } from "@/components/ui/Button";
import { Lead } from "@/components/ui/Lead";
import { Surface } from "@/components/ui/Surface";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Agents",
  description:
    "The Lotwise MCP server lets Claude, Cursor or any agent check the tax impact of a trade before placing it: wash sales across accounts, short vs long term, rebuy-safe dates. Runs locally.",
  alternates: { canonical: "/agents" },
  openGraph: { title: "Lotwise for agents: the MCP server", url: "/agents", images: [SITE.ogImage] },
};

const MCP_DIR = `${SITE.github}/tree/main/mcp`;
const NPX = "npx -y github:SriharshaPotta/lotwise";

const CONFIG = `{
  "mcpServers": {
    "lotwise": {
      "command": "npx",
      "args": ["-y", "github:SriharshaPotta/lotwise", "--data", "/Users/you/lotwise-trades.csv"]
    }
  }
}`;

const TOOLS: { name: string; does: string }[] = [
  { name: "check_trade_tax_impact", does: "Realized gain or loss, term, wash-sale risk with the purchases behind it, est. tax, the first safe rebuy date, and cheaper alternatives." },
  { name: "list_lots", does: "Open lots with basis, holding period and days until long-term." },
  { name: "find_harvestable_losses", does: "Losing lots, ranked, with the ones that would wash flagged and dated." },
  { name: "days_until_long_term", does: "When each short-term lot turns long-term, and what waiting saves." },
  { name: "summarize_tax_year", does: "This year's short, long and §1256 gains, disallowed losses and est. tax." },
];

const SAMPLE = `→ check_trade_tax_impact
  { "symbol": "XYZ", "quantity": 100,
    "rebuy": { "date": "2026-10-22" } }

← "realized": "-1000.00",
  "term": "short",
  "wash_sale_risk": "HIGH",
  "disallowed": "1000.00",
  "rebuy_safe_from": "2026-11-15",
  "alternatives": [ … ]`;

/** §4.7's "Set up the MCP server →": what it does, and three ways to plug it in. */
export default function AgentsPage() {
  return (
    <div className="page-container pt-[calc(var(--ledger-row)*4)] pb-24 lg:pb-36">
      <p className="num text-meta leading-8 text-muted">Agents · MCP server</p>
      <h1 className="mt-4 max-w-[16ch] text-display">
        Let your agent ask <em>before</em> it trades.
      </h1>
      <div className="mt-8 grid gap-12 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-5">
          <Lead strong="Lotwise ships an MCP server.">
            Claude, Cursor or any agent can check the tax impact of a trade before placing it, across every account you own. It runs on
            your machine, reads your trade file, and never calls the network.
          </Lead>
          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
            <Button href={MCP_DIR} target="_blank" rel="noreferrer">
              Source and README
            </Button>
            <Button href="/demo#data" variant="quiet">
              Export your trades from the demo →
            </Button>
          </div>
        </div>
        <div className="min-w-0 lg:col-span-6 lg:col-start-7">
          <Surface>
            <pre aria-label="Example tool call" tabIndex={0} className="num overflow-x-auto p-5 text-[13px] leading-6 text-fg">
              <code>{SAMPLE}</code>
            </pre>
          </Surface>
        </div>
      </div>

      <section aria-labelledby="tools-title" className="mt-24 grid gap-10 lg:mt-36 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-4">
          <h2 id="tools-title" className="text-h2">Five tools.</h2>
          <Lead strong="Read-only, local, explainable." size="body" className="mt-4">
            Every answer names the purchases and accounts behind it, so the agent can tell you why.
          </Lead>
        </div>
        <dl className="space-y-6 lg:col-span-7 lg:col-start-6">
          {TOOLS.map((t) => (
            <div key={t.name} className="grid gap-1 sm:grid-cols-[16rem_1fr] sm:gap-6">
              <dt className="num text-[14px] text-fg">{t.name}</dt>
              <dd className="text-[15px] leading-6 text-muted">{t.does}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="setup-title" className="mt-24 grid gap-10 lg:mt-36 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-4">
          <h2 id="setup-title" className="text-h2">
            Set it <em>up</em>.
          </h2>
          <Lead strong="Node 20 or newer." size="body" className="mt-4">
            Point it at a Lotwise CSV or JSON export, or a Schwab transactions CSV. Start with <span className="num whitespace-nowrap text-fg">--demo</span> to try it on the demo portfolio.
          </Lead>
          <ol className="num mt-6 space-y-1.5 text-meta text-muted">
            <li>1 · Export trades from the demo (Your data → Export CSV)</li>
            <li>2 · Add the server to your agent</li>
            <li>3 · Ask before you sell</li>
          </ol>
        </div>
        <div className="min-w-0 space-y-6 lg:col-span-7 lg:col-start-6">
          <CodeBlock label="Claude Code" code={`claude mcp add lotwise -- ${NPX} --data ~/lotwise-trades.csv\n\n# or try it on the demo portfolio\nclaude mcp add lotwise-demo -- ${NPX} --demo`} />
          <CodeBlock
            label="Claude Desktop · claude_desktop_config.json"
            code={CONFIG}
          />
          <CodeBlock
            label="Cursor · ~/.cursor/mcp.json"
            code={CONFIG}
          />
          <CodeBlock
            label="From a clone (no npx, no install)"
            code={`git clone ${SITE.github}\nnode lotwise/mcp/dist/lotwise-mcp.mjs --data ~/lotwise-trades.csv`}
          />
          <p className="text-[14px] leading-6 text-muted">
            npx fetches the repository on first run, which takes a minute. Options: <span className="num text-fg">--prices FILE</span>,{" "}
            <span className="num text-fg">--as-of YYYY-MM-DD</span>, <span className="num text-fg">--schwab-account NAME</span>. Details in the{" "}
            <a href={`${MCP_DIR}#readme`} className="text-fg underline decoration-[var(--hairline-strong)] underline-offset-4 hover:decoration-[var(--accent)]">
              README
            </a>
            .
          </p>
        </div>
      </section>

      <p className="num mt-24 text-meta text-muted">Estimates only — not tax advice.</p>
    </div>
  );
}
