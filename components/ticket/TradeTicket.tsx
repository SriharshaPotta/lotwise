"use client";

import { Segmented } from "@/components/ui/Segmented";
import { Slider } from "@/components/ui/Slider";
import { Surface } from "@/components/ui/Surface";
import { Toggle } from "@/components/ui/Toggle";
import { MoneyTween } from "@/components/viz/MoneyTween";
import type { ReactNode } from "react";
import { ACCOUNTS, type AccountId, type Position } from "@/lib/demo";
import { money } from "@/lib/format";

const ACCOUNT_OPTIONS = ACCOUNTS.map((a) => ({ value: a.id, label: a.name }));

interface TradeTicketProps {
  position: Position;
  onAccount: (id: AccountId) => void;
  shares: number;
  onShares: (shares: number) => void;
  buyBack: boolean;
  onBuyBack: (on: boolean) => void;
}

/**
 * The trade ticket (§4.2): a Surface holding the account switch, the position, the shares
 * slider and the buy-back toggle. The thin slot along its bottom edge is where the receipt prints.
 */
export function TradeTicket({ position: p, onAccount, shares, onShares, buyBack, onBuyBack }: TradeTicketProps) {
  const { lot } = p;
  return (
    <TicketFrame>
        <Segmented label="Account" options={ACCOUNT_OPTIONS} value={p.account.id} onChange={onAccount} stretch />

        <div className="num grid grid-cols-[1fr_auto] text-meta leading-6 text-muted sm:grid-cols-[auto_1fr_auto]">
          <p className="col-start-1 row-start-1">
            <span className="text-fg">{lot.symbol}</span> · {lot.qty} sh<span className="hidden sm:inline">&nbsp;·&nbsp;</span>
          </p>
          <p className="col-span-2 col-start-1 row-start-2 sm:col-span-1 sm:col-start-2 sm:row-start-1">
            avg cost {money(lot.costPerShare)} · last {money(p.price)}
          </p>
          <p className="col-start-2 row-start-1 pl-4 text-right sm:col-start-3">
            <span className="sr-only">Unrealized {p.unrealized < 0 ? "loss" : "gain"} </span>
            <MoneyTween value={p.unrealized} className={p.unrealized < 0 ? "text-loss" : "text-fg"} />
          </p>
        </div>

        <Slider
          label="Shares to sell"
          value={shares}
          max={lot.qty}
          onChange={onShares}
        />

        <Toggle checked={buyBack} onChange={onBuyBack} label="Buy back next week" />
    </TicketFrame>
  );
}

/** The ticket's body: a Surface with the controls, and the thin print slot along its bottom edge. */
export function TicketFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Surface className={className ?? "z-20"}>
      <div className="space-y-5 p-5">{children}</div>

      {/* The print slot: a dark slit with a lit lower lip. */}
      <div aria-hidden className="relative h-3">
        <div className="absolute top-0 right-0 left-0 mx-auto h-[3px] w-[min(100%-1rem,26.5rem)] rounded-full bg-bg shadow-[0_1px_0_var(--rule-strong)] xl:mx-0 xl:ml-5" />
      </div>
    </Surface>
  );
}
