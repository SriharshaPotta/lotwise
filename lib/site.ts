/** Absolute origin for metadata, the sitemap and OG URLs. Set NEXT_PUBLIC_SITE_URL in production. */
const url =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export const SITE = {
  name: "Lotwise",
  url,
  tagline: "Know the tax bill before you click sell.",
  description:
    "Lotwise checks every account you own for wash sales and hands you the tax receipt for a trade before you place it. It runs entirely in your browser.",
  github: "https://github.com/SriharshaPotta/lotwise",
  author: "Sriharsha Potta",
  /** The generated share image (app/opengraph-image.tsx). Pages that set their own openGraph repeat it,
   *  because metadata merges shallowly. */
  ogImage: { url: "/opengraph-image", width: 1200, height: 630, alt: "Lotwise: a pre-trade receipt for selling 100 NVDA, stamped WASH SALE." },
} as const;

export interface NavLink {
  label: string;
  href: string;
  external?: boolean;
}

export const NAV_LINKS: readonly NavLink[] = [
  { label: "How it works", href: "/#how-it-works" },
  { label: "Learn", href: "/#learn" },
  { label: "Agents", href: "/#agents" },
  { label: "GitHub", href: SITE.github, external: true },
];

export const FOOTER_LINKS: readonly NavLink[] = NAV_LINKS.filter((l) => l.label !== "How it works");
