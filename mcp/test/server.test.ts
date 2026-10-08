// The MCP server end to end: a real MCP client talking to it (in memory, and over stdio to the
// built bundle), on the demo portfolio and on a CSV file.
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { beforeAll, describe, expect, it } from "vitest";
import { createLotwiseServer } from "../src/server";

type Result = { isError?: boolean; structuredContent?: Record<string, any>; content: { type: string; text: string }[] };

async function connect(options: Parameters<typeof createLotwiseServer>[0]) {
  const server = createLotwiseServer(options);
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test", version: "1" });
  await Promise.all([server.connect(a), client.connect(b)]);
  return async (name: string, args: Record<string, unknown> = {}) => (await client.callTool({ name, arguments: args })) as Result;
}

describe("on the demo portfolio", () => {
  let call: Awaited<ReturnType<typeof connect>>;
  beforeAll(async () => {
    call = await connect({ demo: true });
  });

  it("the agent transcript: sell XYZ, buy it back next week", async () => {
    const r = await call("check_trade_tax_impact", { symbol: "XYZ", quantity: 100, rebuy: { date: "2026-10-22" } });
    expect(r.isError).toBeFalsy();
    expect(r.structuredContent).toMatchObject({
      realized: "-1000.00",
      wash_sale_risk: "HIGH",
      rebuy_safe_from: "2026-11-15",
      rebuy: { triggers_wash_sale: true, disallowed: "1000.00" },
      disclaimer: expect.stringContaining("not tax advice"),
    });
    expect(r.structuredContent!.summary).toContain("Rebuy safe from 2026-11-15");
  });

  it("the hero sale: washed by calls in another account, with alternatives", async () => {
    const r = await call("check_trade_tax_impact", { symbol: "nvda", quantity: 100, account: "Brokerage One" });
    const s = r.structuredContent!;
    expect(s).toMatchObject({ realized: "-1840.00", disallowed: "1840.00", wash_sale_risk: "HIGH", sell_safe_from: "2026-11-03" });
    expect(s.wash_sale_causes).toEqual([expect.objectContaining({ what: "2 NVDA 2026-11-20 140 C", account: "Brokerage Two", date: "2026-10-03" })]);
    expect(s.alternatives).toEqual([
      "Sell on or after 2026-11-03 instead: no wash sale, keeps the full $1,840.00 deduction.",
      "Harvest 80 AMD in Brokerage Two instead: −$1,120.00 deductible, no wash sale.",
    ]);
  });

  it("an IRA rebuy is permanent", async () => {
    const r = await call("check_trade_tax_impact", { symbol: "AMD", quantity: 80, lot_id: "b2-amd-1", rebuy: { date: "2026-10-20", account: "roth-ira" } });
    expect(r.structuredContent).toMatchObject({ permanently_disallowed: "1120.00", rebuy: { permanent: true } });
  });

  it("explains unknown symbols; a sale inside the Roth isn't taxed", async () => {
    const roth = await call("check_trade_tax_impact", { symbol: "MSFT", quantity: 1 });
    expect(roth.structuredContent).toMatchObject({ tax_exempt_account: true, est_tax: "0.00", wash_sale_risk: "NONE" });
    const missing = await call("check_trade_tax_impact", { symbol: "ZZZ", quantity: 1 });
    expect(missing.isError).toBe(true);
    expect(missing.content[0].text).toMatch(/No open position in ZZZ.*Held: AAPL/);
  });

  it("list_lots", async () => {
    const r = await call("list_lots", { account: "Brokerage One", symbol: "AAPL" });
    expect(r.structuredContent!.lots).toEqual([
      expect.objectContaining({ symbol: "AAPL", quantity: "40", days_until_long_term: 9, long_term_from: "2026-10-24", unrealized: "4555.60" }),
    ]);
    expect(r.structuredContent!.accounts).toHaveLength(3);
  });

  it("find_harvestable_losses", async () => {
    const r = await call("find_harvestable_losses", { min_loss: 500 });
    const c = r.structuredContent!.candidates as any[];
    expect(c.map((x) => x.symbol)).toEqual(["AMD", "XYZ", "NVDA"]);
    expect(c[2]).toMatchObject({ wash_sale: true, safe_to_sell_from: "2026-11-03", caused_by: ["2 NVDA 2026-11-20 140 C bought 2026-10-03 in Brokerage Two"] });
    expect(c[0]).toMatchObject({ wash_sale: false, est_tax_saving: "268.80" });
  });

  it("days_until_long_term", async () => {
    const r = await call("days_until_long_term", { symbol: "AAPL" });
    expect(r.structuredContent!.lots).toEqual([expect.objectContaining({ days_away: 9, tax_saved_by_waiting: "410.00" })]);
  });

  it("summarize_tax_year", async () => {
    const r = await call("summarize_tax_year", { year: 2026 });
    expect(r.structuredContent).toMatchObject({ disallowed_permanently: "620.00", disallowed_deferred: "215.00" });
  });

  it("validates input", async () => {
    const r = await call("check_trade_tax_impact", { symbol: "NVDA", quantity: 1, date: "Oct 15" });
    expect(r.isError).toBe(true);
  });
});

describe("on a local CSV file", () => {
  it("reads the file on every call and explains when nothing is configured", async () => {
    const dir = mkdtempSync(join(tmpdir(), "lotwise-"));
    const file = join(dir, "trades.csv");
    writeFileSync(file, "date,account,side,symbol,qty,price\n2026-01-05,Taxable,buy,ABC,10,100\n");
    const call = await connect({ dataPath: file, asOf: "2026-02-20" });
    const first = await call("check_trade_tax_impact", { symbol: "ABC", quantity: 10, price: 80 });
    expect(first.structuredContent).toMatchObject({ realized: "-200.00", wash_sale_risk: "NONE", deductible_loss: "200.00" });

    writeFileSync(file, "date,account,side,symbol,qty,price\n2026-01-05,Taxable,buy,ABC,10,100\n2026-02-10,Roth IRA,buy,ABC,5,81\n");
    const second = await call("check_trade_tax_impact", { symbol: "ABC", quantity: 10, price: 80, account: "taxable" });
    expect(second.content[0].text).not.toContain("Error");
    const ambiguous = await call("check_trade_tax_impact", { symbol: "ABC", quantity: 1, price: 80 });
    expect(ambiguous.isError).toBe(true);
    expect(ambiguous.content[0].text).toContain('held in 2 accounts (Taxable, Roth IRA); pass "account"');
    expect(second.structuredContent).toMatchObject({ wash_sale_risk: "HIGH", permanently_disallowed: "100.00" });

    const none = await connect({});
    const r = await none("list_lots");
    expect(r.isError).toBe(true);
    expect(r.content[0].text).toContain("--data");
  });
});

describe("the built bundle over stdio", () => {
  it("lists the tools and answers", async () => {
    const transport = new StdioClientTransport({ command: process.execPath, args: [join(__dirname, "../dist/lotwise-mcp.mjs"), "--demo"], stderr: "pipe" });
    const client = new Client({ name: "stdio-test", version: "1" });
    await client.connect(transport);
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(["check_trade_tax_impact", "days_until_long_term", "find_harvestable_losses", "list_lots", "summarize_tax_year"]);
    const r = (await client.callTool({ name: "days_until_long_term", arguments: { symbol: "AAPL" } })) as Result;
    expect(r.structuredContent!.lots[0].days_away).toBe(9);
    await client.close();
  });

  it("--help works without a data file", async () => {
    const out = await new Promise<string>((res) => {
      const p = spawn(process.execPath, [join(__dirname, "../dist/lotwise-mcp.mjs"), "--help"]);
      let s = "";
      p.stdout.on("data", (d) => (s += d));
      p.on("close", () => res(s));
    });
    expect(out).toContain("--data FILE");
  });
});
