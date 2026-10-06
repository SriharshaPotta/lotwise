// The learning path (§5). Order is the order of the path; `ready` explainers have MDX in content/learn.

export interface Explainer {
  slug: string;
  n: string;
  title: string;
  summary: string;
  ready: boolean;
}

export const EXPLAINERS: readonly Explainer[] = [
  { slug: "the-wash-sale", n: "01", title: "The wash sale", summary: "Sell at a loss, buy it back within 30 days, and the loss has to wait.", ready: true },
  { slug: "short-vs-long-term", n: "02", title: "Short vs long term", summary: "One more day of holding can change the rate on a gain.", ready: true },
  { slug: "across-accounts", n: "03", title: "Across accounts", summary: "The rule looks at every account you own, not just the one you sold in.", ready: true },
  { slug: "the-ira-trap", n: "04", title: "The IRA trap", summary: "Buy it back inside an IRA and the loss is gone for good.", ready: true },
  { slug: "options-can-trigger-it", n: "05", title: "Options can trigger it", summary: "A call option on the same stock counts as buying it back.", ready: false },
  { slug: "section-1256", n: "06", title: "Section 1256", summary: "Some index options are taxed 60/40, however long you hold them.", ready: false },
  { slug: "tax-loss-harvesting", n: "07", title: "Tax-loss harvesting", summary: "Take losses on purpose, without tripping the wash-sale rule.", ready: false },
];

export function explainer(slug: string): Explainer | undefined {
  return EXPLAINERS.find((e) => e.slug === slug);
}

/** Previous and next stops on the path. */
export function neighbours(slug: string) {
  const i = EXPLAINERS.findIndex((e) => e.slug === slug);
  return { prev: EXPLAINERS[i - 1], next: EXPLAINERS[i + 1] };
}

const WORDS_PER_MINUTE = 200;

/** Reading time of an MDX source: prose words only (imports, exports and JSX tags removed). */
export function readingMinutes(mdx: string): number {
  const prose = mdx
    .replace(/^(import|export)\s.*$/gm, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#*_>`-]/g, " ");
  const words = prose.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
