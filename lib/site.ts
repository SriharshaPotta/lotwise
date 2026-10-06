export const SITE = {
  name: "Lotwise",
  /** TODO: replace with the real repository URL. */
  github: "https://github.com/",
  author: "Sriharsha Potta",
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
