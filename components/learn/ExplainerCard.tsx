import Link from "next/link";
import { surfaceClass } from "@/components/ui/Surface";
import { cn } from "@/lib/cn";
import type { Explainer } from "@/lib/learn";
import { PREVIEWS } from "./Previews";

/**
 * A stop on the learning path, as a Surface: the explainer's preview fills the top edge to edge,
 * then a hairline, the serif title and "Explore →". Explainers that aren't written yet render as a
 * plain card marked "Coming soon" rather than a dead link.
 */
export function ExplainerCard({ e, summary = false }: { e: Explainer; summary?: boolean }) {
  const body = (
    <>
      <div aria-hidden className={cn("h-[200px] bg-bg/40 px-6 py-8", !e.ready && "opacity-60")}>
        {PREVIEWS[e.slug]}
      </div>
      <div aria-hidden className="h-px bg-hairline" />
      <div className="flex flex-1 flex-col px-6 pt-5 pb-6">
        <h3 className="text-[24px] leading-[1.15] tracking-[-0.01em]">{e.title}</h3>
        {summary && <p className="mt-2 text-small text-muted">{e.summary}</p>}
        {e.ready ? (
          <span className="mt-auto pt-6 text-small text-fg">
            Explore{" "}
            <span aria-hidden className="inline-block transition-transform duration-150 ease-ui group-hover:translate-x-[2px] group-focus-visible:translate-x-[2px]">
              →
            </span>
          </span>
        ) : (
          <span className="mt-auto pt-6 text-small text-muted">Coming soon</span>
        )}
      </div>
    </>
  );
  const classes = surfaceClass({ interactive: e.ready }, "group flex h-full flex-col overflow-hidden");
  return e.ready ? (
    <Link href={`/learn/${e.slug}`} className={classes}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  );
}
