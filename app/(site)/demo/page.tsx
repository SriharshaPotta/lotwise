import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Demo",
  description: "The Lotwise demo portfolio is on its way. Until then, the explainers run the same engine.",
  alternates: { canonical: "/demo" },
  openGraph: { title: "The Lotwise demo is coming", url: "/demo", images: [SITE.ogImage] },
};

/** §3: a placeholder until the app exists. No email capture; a GitHub star is the only ask. */
export default function DemoPage() {
  return (
    <div className="page-container pt-[calc(var(--ledger-row)*5)] pb-24 lg:pb-36">
      <p className="num text-meta leading-8 text-muted">Demo · coming soon</p>
      <h1 className="mt-4 max-w-[14ch] text-display">
        The demo portfolio is <em>almost</em> printed.
      </h1>
      <p className="mt-8 max-w-[44ch] text-lead text-muted">
        It will open with three accounts, a few dozen trades and a sale you&rsquo;re about to regret. Star the repository to hear when
        it&rsquo;s ready; in the meantime, the explainers run on the same engine.
      </p>
      <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-4">
        <Button href={SITE.github} target="_blank" rel="noreferrer">
          Star on GitHub
        </Button>
        <Button href="/learn" variant="quiet">
          Try the explainers →
        </Button>
      </div>
    </div>
  );
}
