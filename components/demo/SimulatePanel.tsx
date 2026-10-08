"use client";

import { AnimatePresence, m } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { Coupon } from "@/components/receipt/Coupon";
import { Receipt, type ReceiptModel } from "@/components/receipt/Receipt";
import { TicketFrame } from "@/components/ticket/TradeTicket";
import { Lead } from "@/components/ui/Lead";
import { Segmented } from "@/components/ui/Segmented";
import { Slider } from "@/components/ui/Slider";
import { Surface } from "@/components/ui/Surface";
import { Toggle } from "@/components/ui/Toggle";
import { MoneyTween } from "@/components/viz/MoneyTween";
import { addDays } from "@/lib/engine/dates";
import type { Coupon as CouponT, EngineLot, LotMethod, TradeReceipt } from "@/lib/engine/portfolio";
import type { WasmEngine } from "@/lib/engine/wasm";
import { money, shortDate } from "@/lib/format";
import { print, spring } from "@/lib/motion";
import type { DemoState } from "@/lib/portfolio/store";
import { Field, Input, Money, Select, TermChip, WashFlag, dateText, num, qtyText } from "./parts";
import { receiptModel, usefulCoupons } from "./receiptModel";
import { priceKey } from "./useDemo";

export interface SimRequest {
  account: string;
  key: string;
  qty?: number;
  lotId?: string;
}

interface Position {
  account: string;
  key: string;
  symbol: string;
  label: string;
  option?: EngineLot["option"];
  qty: number;
  basis: number;
  lots: EngineLot[];
}

function positionsOf(lots: EngineLot[]): Position[] {
  const map = new Map<string, Position>();
  for (const l of lots) {
    const k = `${l.account}|${priceKey(l)}`;
    const p = map.get(k) ?? { account: l.account, key: priceKey(l), symbol: l.symbol, label: l.label, option: l.option, qty: 0, basis: 0, lots: [] };
    p.qty += num(l.qty);
    p.basis += num(l.basis);
    p.lots.push(l);
    map.set(k, p);
  }
  return [...map.values()];
}

const METHODS: { value: LotMethod; label: string }[] = [
  { value: "fifo", label: "FIFO" },
  { value: "hifo", label: "HIFO" },
  { value: "lifo", label: "LIFO" },
];

const serial = (i: number) => `#${String(1042 + i).padStart(5, "0")}`;

/**
 * The pre-trade simulator: the trade ticket and the paper receipt it prints, computed by the real
 * engine against the whole portfolio (every account), with the coupons and the full "why".
 */
export function SimulatePanel({
  state,
  engine,
  lots,
  request,
  onPrice,
}: {
  state: DemoState;
  engine: WasmEngine;
  lots: EngineLot[];
  request: SimRequest | null;
  onPrice: (key: string, price: string) => void;
}) {
  const { portfolio, prices, asOf } = state;
  const positions = useMemo(() => positionsOf(lots), [lots]);
  const accounts = portfolio.accounts.filter((a) => positions.some((p) => p.account === a.id));

  const first = request ?? (positions.find((p) => p.account === "brokerage-one" && p.key === "NVDA") ? { account: "brokerage-one", key: "NVDA" } : positions[0]);
  const [account, setAccount] = useState(first?.account ?? "");
  const [key, setKey] = useState(first?.key ?? "");
  const pos = positions.find((p) => p.account === account && p.key === key) ?? positions.find((p) => p.account === account) ?? positions[0];
  const [shares, setShares] = useState(request?.qty ?? pos?.qty ?? 0);
  const [method, setMethod] = useState<LotMethod>("fifo");
  const [lotId, setLotId] = useState<string | undefined>(request?.lotId);
  const [date, setDate] = useState(asOf);
  const [buyBack, setBuyBack] = useState(false);
  const [rebuyDate, setRebuyDate] = useState(addDays(asOf, 7));
  const [rebuyAccount, setRebuyAccount] = useState(account);
  const [printIndex, setPrintIndex] = useState(0);
  const [printed, setPrinted] = useState(false);

  const reprint = () => {
    setPrinted(false);
    setPrintIndex((i) => i + 1);
  };

  // A new request from another panel ("Simulate this lot").
  useEffect(() => {
    if (!request) return;
    setAccount(request.account);
    setKey(request.key);
    setRebuyAccount(request.account);
    const p = positions.find((x) => x.account === request.account && x.key === request.key);
    setShares(request.qty ?? p?.qty ?? 0);
    setLotId(request.lotId);
    reprint();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  const price = prices[pos?.key ?? ""] ?? "";
  const qty = Math.min(shares, pos?.qty ?? 0);

  const result = useMemo((): { receipt: TradeReceipt } | { error: string } | null => {
    if (!pos || qty <= 0 || !(num(price) >= 0) || price === "") return null;
    try {
      return {
        receipt: engine.simulate({
          portfolio,
          prices,
          proposal: {
            account: pos.account,
            symbol: pos.symbol,
            option: pos.option,
            qty,
            price,
            date,
            ...(lotId ? { method: "specific" as const, lots: [{ lotId, qty }] } : { method }),
            ...(buyBack ? { rebuy: { date: rebuyDate, account: rebuyAccount } } : {}),
          },
        }),
      };
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  }, [engine, portfolio, prices, pos, qty, price, date, method, lotId, buyBack, rebuyDate, rebuyAccount]);

  if (!pos) {
    return <p className="text-lead text-muted">No open positions as of {dateText(asOf)}. Add trades on the Data tab.</p>;
  }

  const receipt = result && "receipt" in result ? result.receipt : null;
  const name = (id: string) => portfolio.accounts.find((a) => a.id === id)?.name ?? id;
  const isIra = portfolio.accounts.find((a) => a.id === pos.account)?.kind !== "taxable";
  const model: ReceiptModel = receipt
    ? receiptModel(receipt, portfolio.accounts, qty)
    : {
        position: { lot: { symbol: pos.label }, price: num(price), account: { name: name(pos.account) } },
        shares: 0,
        date,
        proceeds: 0,
        basis: 0,
        realized: 0,
        term: "short",
        taxFree: isIra,
        deductible: 0,
        disallowed: 0,
        cause: null,
        rebuy: buyBack ? { date: rebuyDate, triggers: false } : null,
        stamp: null,
      };
  const coupons = receipt ? usefulCoupons(receipt) : [];
  const accountPositions = positions.filter((p) => p.account === pos.account);
  const avg = pos.basis / (pos.qty * num(pos.lots[0]?.multiplier ?? 1));
  const unrealized = num(price) * pos.qty * num(pos.lots[0]?.multiplier ?? 1) - pos.basis;

  return (
    <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
      <div className="lg:col-span-5">
        <TicketFrame>
          {accounts.length <= 3 ? (
            <Segmented
              label="Account"
              options={accounts.map((a) => ({ value: a.id, label: a.name }))}
              value={pos.account}
              onChange={(id) => {
                const p = positions.find((x) => x.account === id)!;
                setAccount(id);
                setKey(p.key);
                setShares(p.qty);
                setRebuyAccount(id);
                setLotId(undefined);
                reprint();
              }}
              stretch
            />
          ) : (
            <Field label="Account">
              {(id) => (
                <Select
                  id={id}
                  value={pos.account}
                  onChange={(e) => {
                    const p = positions.find((x) => x.account === e.target.value)!;
                    setAccount(p.account);
                    setKey(p.key);
                    setShares(p.qty);
                    setRebuyAccount(p.account);
                    setLotId(undefined);
                    reprint();
                  }}
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          )}

          <div className="grid grid-cols-[1fr_auto] items-end gap-4">
            <Field label="Position">
              {(id) => (
                <Select
                  id={id}
                  value={pos.key}
                  onChange={(e) => {
                    const p = accountPositions.find((x) => x.key === e.target.value)!;
                    setKey(p.key);
                    setShares(p.qty);
                    setLotId(undefined);
                    reprint();
                  }}
                >
                  {accountPositions.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.label} · {qtyText(p.qty)} {p.option ? "contracts" : "sh"}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <p className="num pb-2.5 text-right text-meta text-muted">
              <span className="sr-only">Unrealized {unrealized < 0 ? "loss" : "gain"} </span>
              <MoneyTween value={unrealized} className={unrealized < 0 ? "text-loss" : "text-fg"} />
            </p>
          </div>
          <p className="num -mt-2 text-meta text-muted">
            avg cost {money(avg)} · {pos.lots.length} lot{pos.lots.length === 1 ? "" : "s"}
            {lotId && (
              <>
                {" "}
                · selling lot <span className="text-fg">{lotId}</span>{" "}
                <button type="button" className="underline decoration-dotted underline-offset-4 hover:text-fg" onClick={() => setLotId(undefined)}>
                  use a method instead
                </button>
              </>
            )}
          </p>

          <Slider
            label={pos.option ? "Contracts to sell" : "Shares to sell"}
            value={qty}
            max={Math.max(1, Math.floor(pos.qty))}
            onChange={setShares}
            unit={pos.option ? { short: "ct", long: "contracts" } : undefined}
          />

          <div className="grid grid-cols-2 gap-4">
            <Field label="Price">
              {(id) => (
                <Input
                  id={id}
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => onPrice(pos.key, e.target.value.replace(/[^0-9.]/g, ""))}
                />
              )}
            </Field>
            <Field label="Sale date">
              {(id) => (
                <Input
                  id={id}
                  type="date"
                  value={date}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    setDate(e.target.value);
                    reprint();
                  }}
                />
              )}
            </Field>
          </div>

          {!lotId && pos.lots.length > 1 && (
            <Segmented
              label="Which lots to sell"
              options={METHODS}
              value={method}
              onChange={(v) => {
                setMethod(v);
                reprint();
              }}
              stretch
            />
          )}

          <Toggle
            checked={buyBack}
            onChange={(on) => {
              setBuyBack(on);
              reprint();
            }}
            label="Buy back"
          />
          {buyBack && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Rebuy date">
                {(id) => (
                  <Input
                    id={id}
                    type="date"
                    value={rebuyDate}
                    onChange={(e) => {
                      if (!e.target.value) return;
                      setRebuyDate(e.target.value);
                      reprint();
                    }}
                  />
                )}
              </Field>
              <Field label="In account">
                {(id) => (
                  <Select
                    id={id}
                    value={rebuyAccount}
                    onChange={(e) => {
                      setRebuyAccount(e.target.value);
                      reprint();
                    }}
                  >
                    {portfolio.accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>
          )}
        </TicketFrame>

        <div className="slot-clip relative z-30 -mt-3">
          <div className="relative isolate mx-auto w-[min(100%-2rem,25rem)] xl:mx-0 xl:ml-8">
            <div className="grid [&>*]:[grid-area:1/1]">
              <AnimatePresence>
                <Receipt
                  key={printIndex}
                  model={model}
                  serial={serial(printIndex)}
                  printing
                  delay={printIndex === 0 ? 0.2 : print.tearOff * 0.6}
                  onPrinted={() => setPrinted(true)}
                  showStamp={printed}
                />
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      <div className="min-w-0 space-y-10 lg:col-span-7 lg:pl-6">
        <div>
          <h2 className="text-[clamp(26px,2.4vw,34px)] leading-[1.1] tracking-[-0.015em]">
            The receipt, <em>before</em> you trade.
          </h2>
          <Lead strong="Every account is checked, not just this one." size="body" className="mt-4 max-w-[52ch]">
            The engine replays all {portfolio.trades.length} trades across {portfolio.accounts.length} accounts with this sale added, then
            prints what it would do to this year&rsquo;s taxes.
          </Lead>
        </div>

        {result && "error" in result && (
          <p role="alert" className="num rounded-[8px] px-4 py-3 text-[13px] text-fg ring-hairline">
            <span className="text-loss">Can&rsquo;t simulate this sale.</span> {result.error}
          </p>
        )}

        <Coupons coupons={coupons} show={printed} printIndex={printIndex} name={name} />
        {receipt && <Why receipt={receipt} name={name} />}
        <LiveSummary receipt={receipt} printed={printed} />
      </div>
    </div>
  );
}

function Coupons({ coupons, show, printIndex, name }: { coupons: CouponT[]; show: boolean; printIndex: number; name: (id: string) => string }) {
  const amount = (n: string) => <span className="num text-gain-ink">{money(Math.abs(num(n)), { whole: true })}</span>;
  return (
    <section aria-label="Better alternatives" className="min-h-[7rem]">
      <p className="num mb-4 text-meta text-muted">
        {coupons.length ? `Better alternatives · ${coupons.length}` : "No better alternative for this sale"}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <AnimatePresence>
          {show &&
            coupons.map((c, i) => (
              <m.div
                key={`${printIndex}-${c.kind}`}
                initial={{ y: -16, opacity: 0, rotate: 0 }}
                animate={{ y: 0, opacity: 1, rotate: i % 2 ? -0.8 : 1.1 }}
                exit={{ opacity: 0, transition: { duration: print.tearOff } }}
                transition={{ ...spring.paper, delay: i * print.couponGap }}
              >
                {c.kind === "longTerm" && <Coupon when={`Sell on or after ${shortDate(c.date)} (${c.daysAway} days)`} then={<>it&rsquo;s long-term: save {amount(c.saves)}</>} />}
                {c.kind === "avoidWash" && <Coupon when={`Sell on or after ${shortDate(c.date)}`} then={<>keep the full {amount(c.keeps)} deduction</>} />}
                {c.kind === "safeRebuy" && <Coupon when={`Rebuy on or after ${shortDate(c.date)}`} then={<>keep {amount(c.keeps)} deductible</>} />}
                {c.kind === "harvestInstead" && (
                  <Coupon when={`Harvest ${c.symbol} instead · ${name(c.account)}`} then={<>−{amount(c.loss)} deductible, no wash</>} />
                )}
              </m.div>
            ))}
        </AnimatePresence>
      </div>
    </section>
  );
}

/** Everything the receipt is too small for: each lot sold and each purchase that washed it. */
function Why({ receipt: r, name }: { receipt: TradeReceipt; name: (id: string) => string }) {
  return (
    <Surface className="overflow-hidden">
      <div className="px-5 pt-5 pb-2">
        <h3 className="text-[20px] leading-7">Why these numbers</h3>
      </div>
      <dl className="num grid grid-cols-2 gap-x-6 gap-y-3 px-5 py-3 text-[13px] sm:grid-cols-4">
        {[
          ["Realized", <Money key="r" value={r.realized} signed />],
          ["Disallowed", <Money key="d" value={r.disallowed} />],
          ["Counts this year", <Money key="c" value={r.recognized} signed />],
          ["Est. tax", <Money key="t" value={r.estTax} signed />],
        ].map(([k, v]) => (
          <div key={String(k)}>
            <dt className="text-muted">{k}</dt>
            <dd className="mt-0.5 text-[15px] text-fg">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="space-y-1 px-5 pt-4 pb-5 text-[13px] leading-6">
        <p className="text-muted">Lots sold</p>
        <ul className="num space-y-1">
          {r.lots.map((l) => (
            <li key={l.lotId} className="flex flex-wrap items-baseline gap-x-3">
              <span className="text-fg">
                {qtyText(l.qty)} × {l.label}
              </span>
              <span className="text-muted">bought {dateText(l.acquired)}</span>
              <TermChip term={l.term} />
              <span className="ml-auto">
                <Money value={l.realized} signed />
              </span>
            </li>
          ))}
        </ul>

        {r.causes.length > 0 && (
          <>
            <p className="pt-4 text-muted">Purchases that wash it (30 days either side, any account)</p>
            <ul className="num space-y-1">
              {r.causes.map((c) => (
                <li key={c.tradeId} className="flex flex-wrap items-baseline gap-x-3">
                  <WashFlag permanent={c.permanent}>
                    {qtyText(c.qty)} {c.label}
                  </WashFlag>
                  <span className="text-muted">
                    {c.beforeSale ? "bought" : "buying"} {dateText(c.date)} · {name(c.account)}
                  </span>
                  <span className="ml-auto text-fg">
                    {money(num(c.disallowed))} {c.permanent ? "gone for good" : "into its basis"}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
        {r.rebuy?.triggers && (
          <p className="num pt-3 text-fg">
            <WashFlag permanent={r.rebuy.permanent}>Your rebuy</WashFlag>{" "}
            <span className="text-muted">
              absorbs {money(num(r.rebuy.disallowed))}
              {r.rebuy.permanent ? ", gone for good (it's in an IRA)" : `; new basis ${money(num(r.rebuy.replacementBasis))}, holding from ${dateText(r.rebuy.holdingStart)}`}
            </span>
          </p>
        )}
        {r.taxExempt && <p className="pt-3 text-muted">Sales inside an IRA or Roth aren&rsquo;t taxed, and can&rsquo;t trigger a wash sale.</p>}
      </div>
    </Surface>
  );
}

function LiveSummary({ receipt: r, printed }: { receipt: TradeReceipt | null; printed: boolean }) {
  const text = !r
    ? "No shares selected."
    : `Selling ${qtyText(r.qty)} ${r.label}: realized ${money(num(r.realized))}, ${r.term} term. ` +
      (num(r.disallowed) > 0 ? `Wash sale: ${money(num(r.disallowed))} disallowed${num(r.disallowedPermanent) > 0 ? ", permanently" : ""}. ` : "") +
      `Estimated tax ${money(num(r.estTax))}.`;
  return (
    <p className="sr-only" aria-live="polite">
      {printed ? text : ""}
    </p>
  );
}
