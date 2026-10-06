"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** True once the first (server-HTML) hydration of the app has committed. Set by MotionProvider. */
let appHydrated = false;
export function markAppHydrated() {
  appHydrated = true;
}

/**
 * Keeps a below-the-fold section's server HTML on screen without hydrating it, and hydrates it when
 * it is on screen, or within `margin` of the viewport once the visitor has started scrolling (or
 * immediately after a client-side navigation, where there is no server HTML to keep). The markup is identical either way, so nothing moves.
 *
 * During the initial hydration the wrapper renders `dangerouslySetInnerHTML=""` with
 * suppressHydrationWarning: React adopts the existing DOM inside it as-is instead of hydrating it.
 */
export function HydrateOnView({ children, margin = "100% 0px" }: { children: ReactNode; margin?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(() => typeof window === "undefined" || appHydrated);

  useEffect(() => {
    if (live) return;
    const el = ref.current;
    if (!el) return;
    let io: IntersectionObserver | null = null;
    const watch = (rootMargin: string) => {
      io?.disconnect();
      io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            io?.disconnect();
            setLive(true);
          }
        },
        { rootMargin },
      );
      io.observe(el);
    };
    // On load, only what's actually on screen hydrates; the look-ahead starts with the first scroll
    // (which also covers anchor jumps and Lenis), so loading never pays for sections nobody has reached.
    watch("0px");
    const lookAhead = () => watch(margin);
    window.addEventListener("scroll", lookAhead, { once: true, passive: true });
    return () => {
      io?.disconnect();
      window.removeEventListener("scroll", lookAhead);
    };
  }, [live, margin]);

  if (live) {
    return (
      <div ref={ref} data-hydrated="">
        {children}
      </div>
    );
  }
  return <div ref={ref} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: "" }} />;
}
