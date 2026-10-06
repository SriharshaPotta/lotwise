"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { getLenis } from "@/components/providers/MotionProvider";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { spring } from "@/lib/motion";
import { NAV_LINKS, type NavLink } from "@/lib/site";
import { Wordmark } from "./Wordmark";

const SCROLLED_AT = 24;

/**
 * §4.0. Sits on the ledger ruling at the top; after 24px of scroll a solid --bg layer and a
 * --rule-strong hairline fade in (opacity only, 160ms). Below md the links move into a
 * full-width sheet that slides down from under the bar on the paper spring.
 */
export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > SCROLLED_AT); // no re-render unless it flips
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const close = useCallback((restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) toggleRef.current?.focus();
  }, []);

  // While the sheet is open: lock scroll, close on Escape, close if the viewport grows to md.
  useEffect(() => {
    if (!open) return;
    const lenis = getLenis();
    lenis?.stop();
    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    sheetRef.current?.querySelector<HTMLElement>("a")?.focus();

    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    const md = window.matchMedia("(min-width: 768px)");
    const onMd = () => md.matches && close(false);
    window.addEventListener("keydown", onKey);
    md.addEventListener("change", onMd);
    return () => {
      lenis?.start();
      root.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      md.removeEventListener("change", onMd);
    };
  }, [open, close]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-16">
      <div
        aria-hidden
        className={cn(
          "absolute inset-0 border-b border-rule-strong bg-bg transition-opacity duration-(--motion-fast) ease-ui",
          scrolled || open ? "opacity-100" : "opacity-0",
        )}
      />
      <nav aria-label="Main" className="page-container relative flex h-full items-center">
        <Wordmark />

        <ul className="ml-auto hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((l) => (
            <li key={l.label}>
              <NavAnchor link={l} className="text-[14px]" />
            </li>
          ))}
        </ul>
        <div className="ml-8 hidden md:block">
          <Button variant="outline" size="sm" href="/demo">
            Open the demo
          </Button>
        </div>

        <button
          ref={toggleRef}
          type="button"
          aria-expanded={open}
          aria-controls={menuId}
          aria-label={open ? "Close menu" : "Menu"}
          onClick={() => (open ? close() : setOpen(true))}
          className="relative -mr-2 ml-auto grid size-10 place-items-center rounded-sm md:hidden"
        >
          {/* Two ledger rules that cross into an ✕. */}
          <span aria-hidden className="relative block h-[7px] w-[18px]">
            <span
              className={cn(
                "absolute inset-x-0 top-0 h-px bg-fg transition-transform duration-(--motion-reveal) ease-settle",
                open && "translate-y-[3px] rotate-45",
              )}
            />
            <span
              className={cn(
                "absolute inset-x-0 bottom-0 h-px bg-fg transition-transform duration-(--motion-reveal) ease-settle",
                open && "-translate-y-[3px] -rotate-45",
              )}
            />
          </span>
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={sheetRef}
            id={menuId}
            initial={{ y: "-100%" }}
            animate={{ y: 0 }}
            exit={{ y: "-100%" }}
            transition={spring.paper}
            className="absolute inset-x-0 top-0 -z-10 border-b border-rule-strong bg-bg pt-16 shadow-[0_24px_48px_-24px_rgba(0,0,0,.6)] md:hidden"
          >
            <ul className="page-container">
              {NAV_LINKS.map((l) => (
                <li key={l.label} className="border-b border-rule">
                  <NavAnchor link={l} className="flex h-16 items-center text-[18px]" onNavigate={() => close(false)} />
                </li>
              ))}
            </ul>
            <div className="page-container py-8">
              <Button variant="outline" href="/demo" className="w-full" onClick={() => close(false)}>
                Open the demo
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

/**
 * A nav link: --muted at rest, --fg on hover. The color change is a crossfade of an --fg copy
 * of the label (opacity only, §2.5), so it eases without animating color.
 */
function NavAnchor({ link, className, onNavigate }: { link: NavLink; className?: string; onNavigate?: () => void }) {
  const classes = cn("group relative text-muted", className);
  const label = (
    <>
      <span>{link.label}</span>
      <span
        aria-hidden
        className="absolute inset-0 flex items-center text-fg opacity-0 transition-opacity duration-(--motion-fast) ease-ui group-is-hover:opacity-100 group-is-focus:opacity-100"
      >
        {link.label}
      </span>
    </>
  );
  if (link.external) {
    return (
      <a href={link.href} target="_blank" rel="noreferrer" className={classes} onClick={onNavigate}>
        {label}
      </a>
    );
  }
  if (link.href.includes("#")) {
    return (
      <a href={link.href} className={classes} onClick={onNavigate}>
        {label}
      </a>
    );
  }
  return (
    <Link href={link.href} className={classes} onClick={onNavigate}>
      {label}
    </Link>
  );
}
