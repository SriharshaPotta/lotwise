import { describe, expect, it } from "vitest";
import { section1256Tax } from "@/lib/engine";
import { convergence, entriesFor, findings, ledgerEntries } from "@/lib/demo";
import { money, shortDate } from "@/lib/format";

describe("§4.3 findings tape", () => {
  const f = findings();
  const line = (id: string) => {
    const x = f.find((y) => y.id === id)!;
    return `${x.what} · ${x.verb === "save" ? "save " : ""}${money(x.amount, { whole: true })}${x.verb === "kept" ? " kept" : ""}`;
  };
  it("Wash sale caught · $1,840 kept", () => expect(line("wash")).toBe("Wash sale caught · $1,840 kept"));
  it("Goes long-term in 9 days · save $410", () => expect(line("long-term")).toBe("Goes long-term in 9 days · save $410"));
  it("IRA trap avoided · $620", () => expect(line("ira")).toBe("IRA trap avoided · $620"));
  it("HIFO instead of FIFO · save $95", () => expect(line("hifo")).toBe("HIFO instead of FIFO · save $95"));
  it("XSP instead of SPY · save $388", () => expect(line("1256")).toBe("XSP instead of SPY · save $388"));
  it("taxes Section 1256 gains 60/40", () => expect(section1256Tax(1000)).toBe(186));
});

describe("§4.4 convergence ledger", () => {
  const c = convergence();
  const entries = ledgerEntries();

  it("has 4–5 dated trades per broker ledger", () => {
    expect(entriesFor("brokerage-one")).toHaveLength(5);
    expect(entriesFor("brokerage-two")).toHaveLength(4);
    expect(entriesFor("roth-ira")).toHaveLength(4);
  });
  it("merges into one chronological ledger", () => {
    const merged = [...entries].sort((a, b) => a.rank - b.rank);
    expect(merged.map((e) => e.date)).toEqual([...merged.map((e) => e.date)].sort());
    expect(new Set(entries.map((e) => e.rank)).size).toBe(entries.length);
  });
  it("puts the proposed NVDA sale last, in Brokerage One", () => {
    expect(c.sale).toMatchObject({ account: "brokerage-one", label: "SELL 100 NVDA", proposed: true, rank: entries.length - 1 });
  });
  it("draws the 61-day window Sep 15 – Nov 14 around it", () => {
    expect([shortDate(c.window.start), shortDate(c.window.end)]).toEqual(["Sep 15", "Nov 14"]);
    const inside = entries.filter((e) => e.rank >= c.window.firstRank && e.rank <= c.window.lastRank).map((e) => e.date);
    expect(inside.every((d) => d >= c.window.start && d <= c.window.end)).toBe(true);
  });
  it("lights up the call purchase in Brokerage Two inside the window", () => {
    expect(c.replacement.label).toBe("BUY 2 NVDA calls");
    expect(c.replacementAccount.name).toBe("Brokerage Two");
    expect(c.replacement.rank).toBeGreaterThanOrEqual(c.window.firstRank);
  });
  it("badge: 1 wash sale · $1,840 disallowed", () => expect(`1 wash sale · ${money(c.disallowed, { whole: true })} disallowed`).toBe("1 wash sale · $1,840 disallowed"));
  it("second line: 1 IRA trap · loss permanently lost", () => {
    expect(c.iraTrap.permanent).toBe(true);
    expect(entries.find((e) => e.id === c.iraTrap.buyId)?.account).toBe("roth-ira");
  });
});
