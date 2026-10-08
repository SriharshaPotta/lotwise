"use client";

import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { Surface } from "@/components/ui/Surface";
import type { AccountKind, PortfolioTrade } from "@/lib/engine/portfolio";
import { exportLotwiseCsv, exportLotwiseJson, guessKind, LOTWISE_COLUMNS, LOTWISE_REQUIRED, parseTradeFile, type ParseResult } from "@/lib/portfolio/csv";
import type { DemoState } from "@/lib/portfolio/store";
import { Field, Input, Panel, Select, dateText, qtyText } from "./parts";
import type { DemoActions } from "./useDemo";

const KINDS: { value: AccountKind; label: string }[] = [
  { value: "taxable", label: "Taxable" },
  { value: "ira", label: "IRA" },
  { value: "roth", label: "Roth" },
];

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const slug = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "account";

/** Import, export, manual entry, accounts, settings, reset and clear. All of it stays in this browser. */
export function DataPanel({ state, actions }: { state: DemoState; actions: DemoActions }) {
  const { portfolio, asOf } = state;
  return (
    <Panel
      title={
        <>
          Your trades, <em>your</em> browser.
        </>
      }
      strong="Nothing here is uploaded."
      lead="Imports are read in this tab and saved to this browser's local storage. Export any time; clear it all in one click."
      notes={[
        `${portfolio.trades.length} trades · ${portfolio.accounts.length} accounts`,
        state.source === "demo" ? "Showing the demo portfolio" : "Saved in this browser",
      ]}
    >
      <div className="grid gap-8 xl:grid-cols-2">
        <ImportCard state={state} actions={actions} />
        <TradeForm state={state} actions={actions} />
        <AccountsCard state={state} actions={actions} />
        <SettingsCard state={state} actions={actions} />
      </div>
      <Surface className="mt-8 p-5">
        <h3 className="text-[20px] leading-7">Trades</h3>
        <p className="mt-1 text-[13px] text-muted">Newest first. Removing a trade re-runs everything.</p>
        <ul className="num mt-4 max-h-[26rem] space-y-0.5 overflow-y-auto pr-1 text-[13px]">
          {[...portfolio.trades]
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-x-3 rounded-[6px] px-2 py-1.5 hover:bg-surface-2">
                <span className="w-24 text-muted">{dateText(t.date)}</span>
                <span className={t.side === "sell" ? "w-9 text-loss" : "w-9 text-fg"}>{t.side}</span>
                <span className="min-w-0 flex-1 text-fg">
                  {qtyText(t.qty)} {t.symbol}
                  {t.option ? ` ${t.option.type}${t.option.strike ? ` ${t.option.strike}` : ""}${t.option.expiry ? ` ${t.option.expiry}` : ""}` : ""} @ {String(t.price)}
                </span>
                <span className="text-muted">{portfolio.accounts.find((a) => a.id === t.account)?.name ?? t.account}</span>
                <button
                  type="button"
                  className="rounded-[6px] px-2 py-0.5 text-[12px] text-muted hover:text-fg"
                  onClick={() => actions.removeTrade(t.id)}
                  aria-label={`Remove ${t.side} ${t.symbol} on ${dateText(t.date)}`}
                >
                  Remove
                </button>
              </li>
            ))}
        </ul>
      </Surface>
    </Panel>
  );
}

function Card({ title, children, hint }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <Surface className="p-5">
      <h3 className="text-[20px] leading-7">{title}</h3>
      {hint && <p className="mt-1 text-[13px] text-muted">{hint}</p>}
      <div className="mt-5 space-y-4">{children}</div>
    </Surface>
  );
}

function ImportCard({ state, actions }: { state: DemoState; actions: DemoActions }) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"merge" | "replace">(state.source === "demo" ? "replace" : "merge");
  const [schwabName, setSchwabName] = useState("Schwab");
  const [result, setResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const parse = (t: string) => {
    setDone(null);
    try {
      const r = parseTradeFile(t, { schwabAccount: { id: slug(schwabName), name: schwabName, kind: guessKind(schwabName) } });
      setResult(r);
      setError(null);
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <Card title="Import trades" hint={`Lotwise CSV (${LOTWISE_REQUIRED.join(", ")}), Lotwise JSON, or a Schwab transactions export.`}>
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
          Choose a file…
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.json,text/csv,application/json"
          className="sr-only"
          tabIndex={-1}
          aria-label="Trade file"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const t = await f.text();
            setText(t);
            parse(t);
            e.target.value = "";
          }}
        />
        <span className="text-[13px] text-muted">or paste below</span>
      </div>
      <Field label="CSV or JSON">
        {(id) => (
          <textarea
            id={id}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setResult(null);
            }}
            rows={4}
            placeholder={`${LOTWISE_COLUMNS.slice(0, 6).join(",")}\n2026-03-12,Brokerage One,buy,NVDA,100,148.20`}
            className="num w-full rounded-[8px] bg-bg px-3 py-2 text-[13px] text-fg ring-hairline placeholder:text-muted/70"
          />
        )}
      </Field>
      <Field label="Account name for Schwab files" hint="Schwab exports one account per file.">
        {(id) => <Input id={id} value={schwabName} onChange={(e) => setSchwabName(e.target.value)} />}
      </Field>
      <Segmented
        label="Import mode"
        options={[
          { value: "merge", label: "Add to these trades" },
          { value: "replace", label: "Replace everything" },
        ]}
        value={mode}
        onChange={setMode}
        stretch
      />
      <div className="flex flex-wrap gap-3">
        <Button size="sm" variant="outline" onClick={() => parse(text)} disabled={!text.trim()}>
          Check
        </Button>
        <Button
          size="sm"
          disabled={!result || result.portfolio.trades.length === 0}
          onClick={() => {
            if (!result) return;
            actions.importFile(result, mode);
            setDone(`Imported ${result.portfolio.trades.length} trades.`);
            setResult(null);
            setText("");
          }}
        >
          Import {result ? `${result.portfolio.trades.length} trades` : ""}
        </Button>
      </div>
      <div aria-live="polite" className="num text-[13px] leading-6">
        {error && <p className="text-loss">{error}</p>}
        {done && <p className="text-fg">{done}</p>}
        {result && (
          <>
            <p className="text-fg">
              {result.format === "schwab" ? "Schwab export" : result.format === "lotwise-json" ? "Lotwise JSON" : "Lotwise CSV"}:{" "}
              {result.portfolio.trades.length} trades in {result.portfolio.accounts.map((a) => `${a.name} (${a.kind})`).join(", ") || "no accounts"}
            </p>
            {result.skipped.length > 0 && (
              <details className="text-muted">
                <summary className="cursor-pointer">{result.skipped.length} rows skipped</summary>
                <ul className="mt-1 max-h-32 overflow-y-auto">
                  {result.skipped.map((s) => (
                    <li key={s.line}>
                      line {s.line}: {s.reason}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </>
        )}
      </div>
      <div className="flex flex-wrap gap-3 pt-2">
        <Button size="sm" variant="outline" onClick={() => download("lotwise-trades.csv", exportLotwiseCsv(state.portfolio), "text/csv")}>
          Export CSV
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => download("lotwise.json", exportLotwiseJson({ portfolio: state.portfolio, prices: state.prices, asOf: state.asOf }), "application/json")}
        >
          Export JSON
        </Button>
      </div>
    </Card>
  );
}

function TradeForm({ state, actions }: { state: DemoState; actions: DemoActions }) {
  const accounts = state.portfolio.accounts;
  const [f, setF] = useState({ account: accounts[0]?.id ?? "", side: "buy", symbol: "", qty: "", price: "", fees: "", date: state.asOf, option: "", strike: "", expiry: "" });
  const [msg, setMsg] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!f.account || !f.symbol.trim() || !(Number(f.qty) > 0) || !(Number(f.price) >= 0) || f.price === "") {
      setMsg("Fill in account, symbol, quantity and price.");
      return;
    }
    const t: PortfolioTrade = {
      id: `m-${Date.now().toString(36)}`,
      account: f.account,
      date: f.date,
      side: f.side as "buy" | "sell",
      symbol: f.symbol.trim().toUpperCase(),
      qty: f.qty,
      price: f.price,
      ...(Number(f.fees) > 0 ? { fees: f.fees } : {}),
      ...(f.option
        ? { option: { type: f.option as "call" | "put", multiplier: 100, ...(f.strike ? { strike: f.strike } : {}), ...(f.expiry ? { expiry: f.expiry } : {}) } }
        : {}),
    };
    actions.addTrade(t);
    setMsg(`Added: ${t.side} ${t.qty} ${t.symbol}.`);
    setF((x) => ({ ...x, symbol: "", qty: "", price: "", fees: "" }));
  };

  return (
    <Card title="Add a trade" hint="Sells take lots first-in, first-out. A sell bigger than the position shows an error instead of guessing.">
      <form onSubmit={submit} className="grid grid-cols-2 gap-4">
        <Field label="Account" className="col-span-2 sm:col-span-1">
          {(id) => (
            <Select id={id} value={f.account} onChange={set("account")}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Side" className="col-span-2 sm:col-span-1">
          {(id) => (
            <Select id={id} value={f.side} onChange={set("side")}>
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
            </Select>
          )}
        </Field>
        <Field label="Symbol">{(id) => <Input id={id} value={f.symbol} onChange={set("symbol")} autoCapitalize="characters" />}</Field>
        <Field label="Date">{(id) => <Input id={id} type="date" value={f.date} onChange={set("date")} required />}</Field>
        <Field label="Quantity">{(id) => <Input id={id} inputMode="decimal" value={f.qty} onChange={set("qty")} />}</Field>
        <Field label="Price">{(id) => <Input id={id} inputMode="decimal" value={f.price} onChange={set("price")} />}</Field>
        <Field label="Fees">{(id) => <Input id={id} inputMode="decimal" value={f.fees} onChange={set("fees")} placeholder="0" />}</Field>
        <Field label="Option">
          {(id) => (
            <Select id={id} value={f.option} onChange={set("option")}>
              <option value="">Not an option</option>
              <option value="call">Call</option>
              <option value="put">Put</option>
            </Select>
          )}
        </Field>
        {f.option && (
          <>
            <Field label="Strike">{(id) => <Input id={id} inputMode="decimal" value={f.strike} onChange={set("strike")} />}</Field>
            <Field label="Expiry">{(id) => <Input id={id} type="date" value={f.expiry} onChange={set("expiry")} />}</Field>
          </>
        )}
        <div className="col-span-2 flex items-center gap-4">
          <Button size="sm" variant="outline" type="submit" disabled={accounts.length === 0}>
            Add trade
          </Button>
          <p aria-live="polite" className="num text-[13px] text-muted">
            {accounts.length === 0 ? "Add an account first." : msg}
          </p>
        </div>
      </form>
    </Card>
  );
}

function AccountsCard({ state, actions }: { state: DemoState; actions: DemoActions }) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<AccountKind>("taxable");
  const accounts = state.portfolio.accounts;
  return (
    <Card title="Accounts" hint="Wash sales are checked across all of them. A purchase in an IRA or Roth makes a washed loss permanent.">
      <ul className="num space-y-1 text-[13px]">
        {accounts.map((a) => (
          <li key={a.id} className="flex items-center gap-3 rounded-[6px] px-2 py-1.5 hover:bg-surface-2">
            <span className="flex-1 text-fg">{a.name}</span>
            <span className="text-muted">{a.kind}</span>
            <span className="text-muted">{state.portfolio.trades.filter((t) => t.account === a.id).length} trades</span>
            <button
              type="button"
              className="rounded-[6px] px-2 py-0.5 text-[12px] text-muted hover:text-fg"
              onClick={() => actions.removeAccount(a.id)}
              aria-label={`Remove ${a.name} and its trades`}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <form
        className="grid grid-cols-[1fr_auto] items-end gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          const n = name.trim();
          if (!n) return;
          let id = slug(n);
          while (accounts.some((a) => a.id === id)) id += "-2";
          actions.addAccount({ id, name: n, kind });
          setName("");
        }}
      >
        <Field label="New account">{(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Fidelity Roth" />}</Field>
        <Button size="sm" variant="outline" type="submit">
          Add
        </Button>
        <Segmented label="Account type" options={KINDS} value={kind} onChange={setKind} className="col-span-2" />
      </form>
    </Card>
  );
}

function SettingsCard({ state, actions }: { state: DemoState; actions: DemoActions }) {
  const s = state.portfolio.settings ?? {};
  const [confirming, setConfirming] = useState(false);
  const pct = (v: unknown, d: number) => String(Math.round(Number(v ?? d) * 1000) / 10);
  return (
    <Card title="Settings" hint="Rates are your marginal rates; federal only, no NIIT or state tax.">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Short-term rate %">
          {(id) => (
            <Input
              id={id}
              inputMode="decimal"
              defaultValue={pct(s.stRate, 0.24)}
              onBlur={(e) => {
                const v = Number(e.target.value);
                if (v >= 0 && v <= 100) actions.setRates(String(v / 100), String(s.ltRate ?? "0.15"));
              }}
            />
          )}
        </Field>
        <Field label="Long-term rate %">
          {(id) => (
            <Input
              id={id}
              inputMode="decimal"
              defaultValue={pct(s.ltRate, 0.15)}
              onBlur={(e) => {
                const v = Number(e.target.value);
                if (v >= 0 && v <= 100) actions.setRates(String(s.stRate ?? "0.24"), String(v / 100));
              }}
            />
          )}
        </Field>
        <Field label="As of" hint="“Today” for positions and scans." className="col-span-2 sm:col-span-1">
          {(id) => <Input id={id} type="date" value={state.asOf} onChange={(e) => e.target.value && actions.setAsOf(e.target.value)} />}
        </Field>
      </div>
      <div className="flex flex-wrap gap-3 pt-2">
        <Button size="sm" variant="outline" onClick={actions.reset}>
          Reset to the demo
        </Button>
        {confirming ? (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                actions.clearAll();
                setConfirming(false);
              }}
            >
              Yes, delete everything
            </Button>
            <Button size="sm" variant="quiet" onClick={() => setConfirming(false)}>
              Keep it
            </Button>
          </>
        ) : (
          <Button size="sm" variant="quiet" onClick={() => setConfirming(true)}>
            Clear all data…
          </Button>
        )}
      </div>
    </Card>
  );
}
