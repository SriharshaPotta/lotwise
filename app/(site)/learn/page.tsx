import type { Metadata } from "next";
import { ExplainerCard } from "@/components/learn/ExplainerCard";
import { EXPLAINERS } from "@/lib/learn";

export const metadata: Metadata = {
  title: "Learn · Lotwise",
  description: "Seven interactive explainers on wash sales, holding periods, IRAs, options and Section 1256.",
};

/** §5 index: the seven explainers as a numbered learning path. */
export default function LearnIndex() {
  return (
    <div className="page-container pt-[calc(var(--ledger-row)*4)] pb-24 lg:pb-36">
      <p className="num text-meta leading-8 text-muted">Learn · {EXPLAINERS.length} explainers</p>
      <h1 className="mt-4 max-w-[16ch] text-display">Taxes, explained by playing with them.</h1>
      <p className="mt-8 max-w-[44ch] text-lead text-muted">
        Each one is a small, honest model you can push around. Start at the top: every explainer builds on the one before it.
      </p>
      <ol className="mt-16 grid gap-8 md:grid-cols-2 lg:mt-24 lg:grid-cols-3">
        {EXPLAINERS.map((e) => (
          <li key={e.slug}>
            <ExplainerCard e={e} summary />
          </li>
        ))}
      </ol>
    </div>
  );
}
