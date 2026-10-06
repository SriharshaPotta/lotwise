import type { ReactNode } from "react";
import { Hatch } from "@/components/viz/Hatch";
import { iraTrap } from "@/lib/demo";
import { money } from "@/lib/format";

/* Tiny static versions of each explainer's hero interactive (§5). Decorative; 4 ledger rows tall. */

const DAYS = 25;
const IRA_LOSS = iraTrap().result.wash!.disallowed;
const bar = "bg-[color-mix(in_oklch,var(--muted)_45%,transparent)]";

function Calendar({ children }: { children?: ReactNode }) {
  return (
    <div className="relative h-full">
      <div className="absolute inset-x-0 bottom-8 flex justify-between">
        {Array.from({ length: DAYS }, (_, i) => (
          <span key={i} className={i % 6 === 0 ? "h-3 w-px bg-border" : "h-1.5 w-px bg-border"} />
        ))}
      </div>
      <span className="absolute inset-x-0 bottom-8 h-px bg-border" />
      {children}
    </div>
  );
}

const Label = ({ className, children }: { className: string; children: ReactNode }) => (
  <span className={`num absolute text-[12px] whitespace-nowrap text-muted ${className}`}>{children}</span>
);

function WashSale() {
  return (
    <Calendar>
      <Hatch variant="wash" as="div" className="absolute bottom-8 left-[22%] h-14 w-[56%] rounded-[3px]" />
      <span className="absolute bottom-8 left-1/2 h-14 w-0.5 -translate-x-1/2 rounded-full bg-loss" />
      <Label className="bottom-0 left-1/2 -translate-x-1/2">sale</Label>
      <span className="absolute bottom-[2.6rem] left-[68%] size-3.5 -translate-x-1/2 rounded-full border-2 border-fg bg-surface" />
      <Label className="top-0 left-[68%] -translate-x-1/2">buy back</Label>
      <Label className="top-0 left-[22%]">61 days</Label>
    </Calendar>
  );
}

function ShortVsLong() {
  return (
    <Calendar>
      <span className={`absolute bottom-[3.25rem] left-0 h-2 w-[84%] rounded-full ${bar}`} />
      <span className="absolute bottom-8 left-[72%] h-16 w-0.5 rounded-full bg-longterm" />
      <Label className="bottom-0 left-[72%] -translate-x-1/2">1 year</Label>
      <Label className="top-0 left-0">short</Label>
      <span className="num absolute top-0 left-[72%] -translate-x-1/2 text-[12px] text-longterm">long</span>
    </Calendar>
  );
}

function AcrossAccounts() {
  return (
    <div className="relative grid h-full grid-cols-2 gap-3">
      {[0, 1].map((i) => (
        <div key={i} className="flex flex-col justify-center gap-3 ring-hairline rounded-[6px] px-3">
          {[0, 1, 2].map((r) => (
            <span key={r} className={`h-1.5 rounded-full ${bar}`} style={{ width: `${[78, 54, 66][(r + i) % 3]}%` }} />
          ))}
        </div>
      ))}
      <Hatch variant="wash" as="div" className="absolute inset-x-0 top-1/2 h-3 -translate-y-1/2 rounded-[2px]" />
    </div>
  );
}

function IraTrap() {
  return (
    <div className="relative h-full">
      <span className="num absolute top-1 left-[8%] inline-flex h-7 items-center rounded-pill bg-[color-mix(in_oklch,var(--loss)_12%,transparent)] px-3 text-meta text-fg shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--loss)_45%,transparent)]">
        {money(-IRA_LOSS, { whole: true })} loss
      </span>
      <svg viewBox="0 0 200 128" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
        <path d="M88 30C124 30 140 50 140 72" fill="none" stroke="var(--hairline-strong)" strokeWidth={1.25} strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="absolute right-[12%] bottom-0 flex h-14 w-[40%] items-end justify-center rounded-md border border-dashed border-hairline-strong pb-2">
        <span className="num text-[12px] text-muted">Roth IRA · gone</span>
      </div>
    </div>
  );
}

function Options() {
  return (
    <Calendar>
      <Hatch variant="wash" as="div" className="absolute bottom-8 left-[22%] h-14 w-[56%] rounded-[3px]" />
      <span className="absolute bottom-8 left-[40%] h-14 w-0.5 -translate-x-1/2 rounded-full bg-loss" />
      <span className="num absolute bottom-[3.4rem] left-[62%] inline-flex h-6 -translate-x-1/2 items-center ring-hairline rounded-pill bg-surface px-2.5 text-[12px] text-fg">
        call
      </span>
      <Label className="bottom-0 left-[40%] -translate-x-1/2">sale</Label>
    </Calendar>
  );
}

function Section1256() {
  return (
    <div className="num flex h-full flex-col justify-center gap-4 text-[12px] text-muted">
      <div className="flex items-center gap-3">
        <span className="w-8">SPY</span>
        <span className={`h-2.5 flex-1 rounded-full ${bar}`} />
      </div>
      <div className="flex items-center gap-3">
        <span className="w-8">XSP</span>
        <span className="flex h-2.5 flex-1 gap-px">
          <span className="w-[60%] rounded-l-full bg-sec1256" />
          <span className="w-[40%] rounded-r-full bg-[color-mix(in_oklch,var(--sec1256)_50%,transparent)]" />
        </span>
      </div>
    </div>
  );
}

const HARVEST = [2, 6, 9, 13, 16, 19];
function Harvesting() {
  return (
    <div className="grid h-full content-center gap-2" style={{ gridTemplateColumns: "repeat(7, 20px)" }}>
      {Array.from({ length: 21 }, (_, i) => (
        <span
          key={i}
          className={
            HARVEST.includes(i)
              ? i === 13
                ? "hatch-wash size-5 rounded-[3px] border border-wash"
                : "size-5 rounded-[3px] bg-loss"
              : "ring-hairline size-5 rounded-[3px] bg-surface-2"
          }
        />
      ))}
    </div>
  );
}

export const PREVIEWS: Record<string, ReactNode> = {
  "the-wash-sale": <WashSale />,
  "short-vs-long-term": <ShortVsLong />,
  "across-accounts": <AcrossAccounts />,
  "the-ira-trap": <IraTrap />,
  "options-can-trigger-it": <Options />,
  "section-1256": <Section1256 />,
  "tax-loss-harvesting": <Harvesting />,
};
