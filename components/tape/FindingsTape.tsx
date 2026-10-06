"use client";

import { useEffect, useRef, type PointerEvent } from "react";
import { Hatch } from "@/components/viz/Hatch";
import { findings, type Finding } from "@/lib/demo";
import { money } from "@/lib/format";
import { TAPE_PX_PER_SECOND } from "@/lib/motion";

/**
 * §4.3: a slim band between two strong rules with a slow tape of findings from the demo portfolio.
 * ~30px/s, a pure CSS transform loop over two copies of the list. Pauses on hover, while a finger
 * is down, offscreen and in hidden tabs; wraps statically under reduced motion.
 */
export function FindingsTape() {
  const items = findings();
  const bandRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLUListElement>(null);

  // Duration from the measured width of one copy, so the speed is 30px/s at every size.
  useEffect(() => {
    const copy = copyRef.current;
    const track = trackRef.current;
    const band = bandRef.current;
    if (!copy || !track || !band) return;
    const ro = new ResizeObserver(() => {
      track.style.setProperty("--tape-dur", `${copy.offsetWidth / TAPE_PX_PER_SECOND}s`);
    });
    ro.observe(copy);
    let visible = true;
    const apply = () => {
      if (visible && document.visibilityState === "visible") delete track.dataset.paused;
      else track.dataset.paused = "";
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      apply();
    });
    io.observe(band);
    document.addEventListener("visibilitychange", apply);
    return () => {
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", apply);
    };
  }, []);

  const hold = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") e.currentTarget.dataset.held = "";
  };
  const release = (e: PointerEvent<HTMLDivElement>) => {
    delete e.currentTarget.dataset.held;
  };

  return (
    <section aria-label="Findings from the demo portfolio" className="border-y border-rule-strong">
      <div className="page-container flex min-h-16 items-stretch">
        <p className="num flex shrink-0 items-center border-r border-rule-strong pr-5 text-meta text-muted sm:pr-6">
          <span className="sm:hidden">Demo</span>
          <span className="hidden sm:inline">From the demo portfolio</span>
        </p>
        <div
          ref={bandRef}
          className="tape relative flex min-w-0 flex-1 items-center overflow-hidden"
          onPointerDown={hold}
          onPointerUp={release}
          onPointerCancel={release}
          onPointerLeave={release}
        >
          <div ref={trackRef} className="tape-track">
            <TapeCopy ref={copyRef} items={items} />
            <TapeCopy items={items} hidden />
          </div>
        </div>
      </div>
    </section>
  );
}

function TapeCopy({ items, hidden, ref }: { items: Finding[]; hidden?: boolean; ref?: React.Ref<HTMLUListElement> }) {
  return (
    <ul ref={ref} aria-hidden={hidden || undefined} className="tape-copy num flex shrink-0 items-center text-meta text-muted">
      {items.map((f) => (
        <li key={f.id} className="flex items-center gap-x-6 py-2 pl-6 whitespace-nowrap">
          <Hatch variant="accent" className="size-2 shrink-0 opacity-80" />
          <span>
            {f.what} ·{" "}
            <span className="text-fg">
              {f.verb === "save" && "save "}
              {money(f.amount, { whole: true })}
              {f.verb === "kept" && " kept"}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
