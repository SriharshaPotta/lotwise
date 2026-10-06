import type { CSSProperties } from "react";
import { LedgerRules } from "@/components/ledger/LedgerRules";
import { Nav } from "@/components/nav/Nav";
import { heroTimeline } from "@/lib/motion";

/** Marketing + learn pages: the whole page is ledger paper, with the nav sitting on it. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh">
      <LedgerRules className="enter-fade" style={{ "--d": `${heroTimeline.rules}s` } as CSSProperties} />
      <Nav />
      <main className="relative">{children}</main>
    </div>
  );
}
