import type { CSSProperties } from "react";
import { PriceLineDraw } from "@/components/ledger/PriceLineDraw";
import { Button } from "@/components/ui/Button";
import { Lead } from "@/components/ui/Lead";
import { Showcase } from "./Showcase";
import { heroTimeline, stagger } from "@/lib/motion";

const delay = (s: number) => ({ "--d": `${s}s` }) as CSSProperties;

const TRUST = ["Runs in your browser", "No account needed", "Open source"] as const;

/**
 * §4.1. Desktop grid (12 cols):
 *   row 1  headline ............................ cols 1–10
 *   row 2  living price line lane .............. full bleed      ┐ showcase
 *   row 3  lead · CTAs · trust ...... cols 1–5                  ┘ cols 6–12, rows 2–3
 * Phones stack: headline → lane → lead → CTAs → showcase.
 */
export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-x-clip pt-[calc(var(--ledger-row)*4)] pb-24 lg:pb-36">
      <div className="page-container grid grid-cols-12 gap-x-6">
        <h1 id="hero-title" className="hero-title col-span-12 text-display lg:col-span-10 lg:col-start-1 lg:row-start-1">
          <span className="enter-ink block" style={delay(heroTimeline.headline)}>
            Know the tax bill
          </span>
          <span className="enter-ink block" style={delay(heroTimeline.headline + stagger.headline)}>
            <em>before</em> you click sell.
          </span>
        </h1>

        <div className="relative col-span-12 h-[calc(var(--ledger-row)*3)] lg:col-start-1 lg:row-start-2 lg:h-[calc(var(--ledger-row)*4)]">
          <PriceLineDraw />
        </div>

        <div className="relative col-span-12 max-lg:mt-4 lg:col-span-5 lg:col-start-1 lg:row-start-3">
          <Lead
            className="enter-ink"
            style={delay(heroTimeline.lead)}
            strong={
              <>
                Lotwise checks every account you own for wash sales and hands you the tax receipt for a trade{" "}
                <em>before</em> you place it.
              </>
            }
          >
            It runs entirely in your browser.
          </Lead>

          <div className="enter-rise mt-8 flex flex-wrap items-center gap-x-6 gap-y-4 md:min-h-16" style={delay(heroTimeline.ctas)}>
            <Button href="/demo">Open the demo portfolio</Button>
            <Button href="#how-it-works" variant="quiet">
              How it works ↓
            </Button>
          </div>

          <ul aria-label="Why it's safe to try" className="rule-list enter-rise num relative mt-8 max-sm:flex-col max-sm:gap-y-1 text-meta leading-[1.5] text-muted" style={delay(heroTimeline.trust)}>
            {TRUST.map((t) => (
              <li key={t} className="whitespace-nowrap">
                {t}
              </li>
            ))}
          </ul>
        </div>

        {/* §4.2: trade ticket + receipt, overlapping the price-line lane on desktop. */}
        <div id="showcase" className="enter-rise relative col-span-12 mt-16 lg:col-span-7 lg:col-start-6 lg:row-span-2 lg:row-start-2 lg:mt-0" style={delay(heroTimeline.showcase)}>
          <Showcase />
        </div>
      </div>
    </section>
  );
}
