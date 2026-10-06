import type { Metadata } from "next";
import { LedgerRules } from "@/components/ledger/LedgerRules";
import { Nav } from "@/components/nav/Nav";
import { Stamp } from "@/components/receipt/Stamp";
import { Footer } from "@/components/sections/Footer";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Not in the ledger",
  robots: { index: false },
};

/** Any unknown URL. The page is ledger paper with an empty row where the entry should be. */
export default function NotFound() {
  return (
    <div className="relative min-h-dvh">
      <LedgerRules />
      <Nav />
      <main className="relative">
        <div className="page-container pt-[calc(var(--ledger-row)*5)] pb-24 lg:pb-36">
          <p className="num text-meta leading-8 text-muted">404 · no matching entry</p>
          <h1 className="mt-4 max-w-[14ch] text-display">
            This page isn&rsquo;t in the <em>ledger</em>.
          </h1>
          <p className="mt-8 max-w-[44ch] text-lead text-muted">
            The link may be old, or the page may never have existed. Everything we have is on the front page or in Learn.
          </p>
          <div className="relative mt-12 flex max-w-[34rem] items-center">
            {/* the empty ledger line, struck through with a stamp */}
            <div className="num flex h-8 w-full items-center border-y border-rule-strong text-meta text-muted">
              <span className="w-24 shrink-0 pl-2">—</span>
              <span>no entry</span>
            </div>
            <div className="absolute right-4">
              <Stamp>NOT FOUND</Stamp>
            </div>
          </div>
          <div className="mt-16 flex flex-wrap items-center gap-x-6 gap-y-4">
            <Button href="/">Back to the front page</Button>
            <Button href="/learn" variant="quiet">
              Browse Learn →
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
