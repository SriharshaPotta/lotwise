import Link from "next/link";
import { HandUnderline } from "@/components/annotate/HandUnderline";
import { LedgerRules } from "@/components/ledger/LedgerRules";
import { cn } from "@/lib/cn";
import type { Explainer } from "@/lib/learn";
import { PREVIEWS } from "./Previews";

/**
 * A numbered stop on the learning path with a static preview of its interactive. Explainers that
 * aren't written yet render as a plain card marked "Coming soon" rather than a dead link.
 */
export function ExplainerCard({ e, summary = false }: { e: Explainer; summary?: boolean }) {
  const body = (
    <>
      <LedgerRules margin={false} />
      {e.ready && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] border border-[color-mix(in_oklch,var(--fg)_20%,transparent)] opacity-0 transition-opacity duration-(--motion-fast) ease-ui group-is-hover:opacity-100 group-is-focus:opacity-100"
        />
      )}
      <div className="relative">
        <span className="num block text-meta leading-8 text-muted">{e.n}</span>
        <h3 className="text-[26px] leading-8 tracking-[-0.01em]">{e.title}</h3>
        {summary && <p className="mt-0 leading-8 text-muted">{e.summary}</p>}
        <div aria-hidden className={cn("mt-8 h-[calc(var(--ledger-row)*4)]", !e.ready && "opacity-60")}>
          {PREVIEWS[e.slug]}
        </div>
        {e.ready ? (
          <span className="relative mt-8 inline-block leading-8 text-fg">
            Explore →
            <HandUnderline />
          </span>
        ) : (
          <span className="num mt-8 block text-meta leading-8 text-muted">Coming soon</span>
        )}
      </div>
    </>
  );
  const classes = "group relative block h-full overflow-hidden rounded-md border border-border bg-surface px-6 py-8 lg:px-8";
  return e.ready ? (
    <Link href={`/learn/${e.slug}`} className={classes}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  );
}
