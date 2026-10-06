"use client";

import { LayoutGroup, motion } from "motion/react";
import { useState } from "react";
import { LedgerPage } from "@/components/ledger/LedgerPage";
import { AccountTag, LedgerRow } from "@/components/ledger/LedgerRow";
import { Stamp } from "@/components/receipt/Stamp";
import { Badge } from "@/components/ui/Badge";
import { Chip } from "@/components/ui/Chip";
import { Segmented } from "@/components/ui/Segmented";
import { WashWindow } from "@/components/viz/WashWindow";
import { accountsExplainer, type LedgerEntry } from "@/lib/demo";
import { money, shortDate } from "@/lib/format";
import { spring } from "@/lib/motion";
import { ExplainerFrame, Readout, Readouts } from "./parts";

const D = accountsExplainer();
const ROW = 32;

function WashBadge() {
  return (
    <Badge tone="wash">
      1 wash sale · {money(D.disallowed, { whole: true })}
      <span className="max-sm:hidden"> disallowed</span>
    </Badge>
  );
}

type View = "broker" | "irs";
const VIEWS = [
  { value: "broker" as const, label: "Broker view" },
  { value: "irs" as const, label: "IRS view" },
];

const SPOKEN: Record<View, string> = {
  broker: `Broker view. ${D.saleAccount.name} sees the proposed sale of 100 NVDA; ${D.replacementAccount.name} sees the NVDA calls bought ${shortDate(D.replacement.date)}. Each checks only its own account and finds no issues.`,
  irs: `IRS view. Both accounts on one ledger by date: the NVDA calls bought ${shortDate(D.replacement.date)} in ${D.replacementAccount.name} fall inside the 61-day window of the ${shortDate(D.merged.find((e) => e.id === D.saleId)!.date)} sale, so the ${money(D.disallowed, { whole: true })} loss is disallowed.`,
};

/** §5 across-accounts: Broker view / IRS view over two accounts, rows re-sorting between them (convergence parts). */
export function AcrossAccountsExplainer() {
  const [view, setView] = useState<View>("broker");
  const irs = view === "irs";

  return (
    <ExplainerFrame
      label="Broker view versus IRS view"
      title={<>Sell 100 NVDA in {D.saleAccount.name} · {shortDate(D.merged.find((e) => e.id === D.saleId)!.date)}</>}
      hint="Switch views with the arrow keys"
      controls={<Segmented label="Ledger view" options={VIEWS} value={view} onChange={setView} />}
      spoken={SPOKEN[view]}
    >
      <div className="px-5 pt-4 pb-8 sm:px-8">
        <LayoutGroup id="across-accounts">
          {irs ? <IrsLedger /> : <BrokerLedgers />}
        </LayoutGroup>
      </div>

      <Readouts cols={3}>
        <Readout label="Realized">
          <span className="text-loss">{money(D.realized)}</span>
        </Readout>
        <Readout label={irs ? "Disallowed (IRS)" : "Disallowed (broker)"}>
          <motion.span key={view} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
            {money(irs ? D.disallowed : 0)}
          </motion.span>
        </Readout>
        <Readout label="Issues found">
          <motion.span key={view} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
            {irs ? "1 wash sale" : "None"}
          </motion.span>
        </Readout>
      </Readouts>
    </ExplainerFrame>
  );
}

function Row({ entry, withAccount, highlight }: { entry: LedgerEntry; withAccount?: boolean; highlight?: boolean }) {
  return (
    <motion.div layoutId={`row-${entry.id}`} layout="position" transition={spring.paper} className="relative flex h-8 items-center justify-between gap-3">
      {highlight && (
        <span className="absolute -inset-x-3 inset-y-0.5 rounded-sm bg-[color-mix(in_oklch,var(--fg)_7%,transparent)] shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--wash)_45%,transparent)]" />
      )}
      <LedgerRow entry={entry} proposedRealized={entry.proposed ? D.realized : undefined} className="relative min-w-0" />
      <span className="relative flex shrink-0 items-center gap-2">
        {highlight && <Chip tone="wash" className="max-sm:hidden">{money(D.disallowed, { whole: true })}</Chip>}
        {withAccount && (
          <>
            <AccountTag entry={entry} className="max-sm:hidden" />
            {!entry.proposed && <span className="num text-[12px] text-muted sm:hidden">{entry.account === "brokerage-one" ? "One" : "Two"}</span>}
          </>
        )}
      </span>
    </motion.div>
  );
}

function BrokerLedgers() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {D.accounts.map((a) => (
        <motion.div key={a.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
          <LedgerPage title={a.name} footer={a.washes ? <WashBadge /> : <Badge tone="gain">No issues found</Badge>}>
            <div className="px-5">
              {a.entries.map((e) => (
                <Row key={e.id} entry={e} />
              ))}
            </div>
          </LedgerPage>
        </motion.div>
      ))}
    </div>
  );
}

function IrsLedger() {
  const top = D.window.first * ROW + 4;
  const bottom = (D.window.last + 1) * ROW - 4;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }} className="max-w-[40rem]">
      <LedgerPage
        title={
          <span className="flex w-full items-center justify-between">
            <span>
              <span className="max-sm:hidden">Both accounts · </span>by date
            </span>
            <span className="-mr-1">
              <Stamp>WASH SALE</Stamp>
            </span>
          </span>
        }
        footer={<WashBadge />}
      >
        <div className="relative min-w-0 pr-4 pl-10">
          <WashWindow className="absolute left-[15px]" style={{ top, height: bottom - top }} />
          {D.merged.map((e) => (
            <Row key={e.id} entry={e} withAccount highlight={e.id === D.replacementId} />
          ))}
        </div>
      </LedgerPage>
      <p className="num mt-4 text-meta text-muted">
        <span className="text-fg">61-day window</span> · {shortDate(D.window.start)} – {shortDate(D.window.end)}
      </p>
    </motion.div>
  );
}
