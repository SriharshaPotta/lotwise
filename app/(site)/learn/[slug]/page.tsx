import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { EXPLAINERS, explainer, neighbours, readingMinutes, type Explainer } from "@/lib/learn";

export const dynamicParams = false;

export function generateStaticParams() {
  return EXPLAINERS.filter((e) => e.ready).map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const e = explainer((await params).slug);
  return e ? { title: `${e.title} · Learn · Lotwise`, description: e.summary } : {};
}

/**
 * §5 template: a 680px editorial column for prose; interactives (`.breakout`) span the container.
 * Breadcrumb, h1, summary and reading time on top; the demo link and prev/next at the bottom.
 */
export default async function ExplainerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const e = explainer(slug);
  if (!e?.ready) notFound();

  const { default: Content } = await import(`@/content/learn/${slug}.mdx`);
  const source = await readFile(path.join(process.cwd(), "content/learn", `${slug}.mdx`), "utf8");
  const minutes = readingMinutes(source);
  const { prev, next } = neighbours(slug);

  return (
    <article className="page-container pt-[calc(var(--ledger-row)*4)] pb-24 lg:pb-36">
      <nav aria-label="Breadcrumb" className="num text-meta leading-8 text-muted">
        <ol className="flex flex-wrap gap-x-2">
          <li>
            <Link href="/learn" className="text-muted transition-opacity duration-(--motion-fast) ease-ui hover:opacity-70">
              Learn
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-fg">
            {e.n} · {e.title}
          </li>
        </ol>
      </nav>

      <header className="learn-column mt-4">
        <h1 className="text-display">{e.title}</h1>
        <p className="mt-6 text-lead text-muted">{e.summary}</p>
        <p className="num mt-6 text-meta leading-8 text-muted">{minutes} min read</p>
      </header>

      <div className="learn-prose mt-12">
        <Content />
      </div>

      <footer className="learn-column mt-16">
        <Button href="/demo">Try this on the demo portfolio →</Button>
        <nav aria-label="More explainers" className="mt-16 grid gap-4 border-t border-rule-strong pt-8 sm:grid-cols-2">
          <PathLink e={prev} dir="prev" />
          <PathLink e={next} dir="next" />
        </nav>
      </footer>
    </article>
  );
}

function PathLink({ e, dir }: { e?: Explainer; dir: "prev" | "next" }) {
  if (!e) return <span />;
  const align = dir === "next" ? "sm:text-right" : "";
  const kicker = dir === "prev" ? "← Previous" : "Next →";
  const inner = (
    <>
      <span className="num block text-meta leading-8 text-muted">
        {kicker} · {e.n}
      </span>
      <span className="block font-display text-[22px] leading-8">{e.title}</span>
      {!e.ready && <span className="num block text-meta leading-8 text-muted">Coming soon</span>}
    </>
  );
  return e.ready ? (
    <Link href={`/learn/${e.slug}`} className={`group block ${align}`}>
      {inner}
    </Link>
  ) : (
    <div className={align}>{inner}</div>
  );
}
