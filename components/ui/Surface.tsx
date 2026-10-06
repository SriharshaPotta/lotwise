import type { HTMLAttributes, ReactNode, Ref } from "react";
import { cn } from "@/lib/cn";

type Size = "frame" | "control";

interface SurfaceOptions {
  /** "frame" (12px radius) for cards and panels, "control" (8px) for small chrome. */
  size?: Size;
  /** Crop the content off the bottom edge behind a fade (the ring stays crisp). */
  fade?: boolean;
  /** Hover / focus-visible: the ring strengthens and the background lifts one step. */
  interactive?: boolean;
}

/** Class names for a Surface, for elements that can't be a <Surface> (e.g. a Next <Link>). */
export function surfaceClass({ fade, interactive }: SurfaceOptions = {}, className?: string) {
  return cn("surface", fade && "surface-fade", interactive && "surface-interactive", className);
}

interface SurfaceProps extends SurfaceOptions, HTMLAttributes<HTMLElement> {
  as?: "div" | "article" | "figure" | "section";
  ref?: Ref<HTMLElement>;
  children?: ReactNode;
}

/**
 * The card primitive (DESIGN.md §2.4): opaque --surface, no border, a 1px box-shadow ring and a
 * small drop. Nothing ruled ever shows inside one.
 */
export function Surface({ as: Tag = "div", size = "frame", fade, interactive, className, children, ref, ...rest }: SurfaceProps) {
  return (
    <Tag
      ref={ref as Ref<HTMLDivElement>}
      data-size={size === "control" ? "control" : undefined}
      className={surfaceClass({ fade, interactive }, className)}
      {...rest}
    >
      {fade ? <div className="surface-content">{children}</div> : children}
    </Tag>
  );
}
