import { NavAnchor } from "@/components/nav/Nav";
import { Wordmark } from "@/components/nav/Wordmark";
import { FOOTER_LINKS, SITE } from "@/lib/site";

/** §4.10. The last page of the ledger: a double rule closes the book, then the colophon. */
export function Footer() {
  return (
    <footer className="relative">
      <div className="page-container">
        <div aria-hidden className="h-[3px] border-y border-rule-strong" />
        <div className="flex flex-wrap items-center gap-x-10 gap-y-4 py-8">
          <Wordmark />
          <ul className="flex flex-wrap gap-x-8 gap-y-2">
            {FOOTER_LINKS.map((l) => (
              <li key={l.label}>
                <NavAnchor link={l} className="text-[14px] leading-8" />
              </li>
            ))}
          </ul>
        </div>
        <div className="num flex flex-wrap justify-between gap-x-8 pb-16 text-meta leading-8 text-muted">
          <p>Estimates only — not tax advice.</p>
          <p>Made by {SITE.author}.</p>
        </div>
      </div>
    </footer>
  );
}
