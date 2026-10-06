import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";

type HatchVariant = "wash" | "accent";

interface HatchProps {
  /** wash: amber hatch over a 12% wash fill (wash windows). accent: fine emerald hatch. */
  variant?: HatchVariant;
  /** Fade the hatch out toward the top (final CTA band) or toward the right. */
  fade?: "none" | "up" | "right";
  as?: "span" | "div";
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

const FADES: Record<NonNullable<HatchProps["fade"]>, string | undefined> = {
  none: undefined,
  up: "linear-gradient(to top, black 0%, black 15%, transparent 100%)",
  right: "linear-gradient(to right, black 0%, transparent 100%)",
};

/**
 * The brand texture (§2.6.5). Size it with className. Uses context tokens, so the same
 * component switches to --wash-ink / --accent-deep inside `.paper`.
 */
export function Hatch({ variant = "wash", fade = "none", as: Tag = "span", className, style, children }: HatchProps) {
  const mask = FADES[fade];
  return (
    <Tag
      aria-hidden={children ? undefined : true}
      className={cn(variant === "wash" ? "hatch-wash" : "hatch-accent", Tag === "span" && "inline-block", className)}
      style={{ ...(mask && { maskImage: mask, WebkitMaskImage: mask }), ...style }}
    >
      {children}
    </Tag>
  );
}
