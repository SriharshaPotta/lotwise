import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { HandUnderline } from "@/components/annotate/HandUnderline";
import { cn } from "@/lib/cn";

type Variant = "primary" | "outline" | "quiet";
type Size = "md" | "sm";

interface CommonProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
  /** Review only: pin "hover" | "focus" | "active" (see /dev/kitchen-sink). */
  "data-force"?: string;
}

type ButtonProps = CommonProps &
  (
    | ({ href?: undefined } & ButtonHTMLAttributes<HTMLButtonElement>)
    | ({ href: string; disabled?: boolean } & AnchorHTMLAttributes<HTMLAnchorElement>)
  );

const SIZE: Record<Size, string> = {
  md: "h-11 px-5 text-[15px] gap-2.5",
  sm: "h-9 px-3.5 text-[14px] gap-2",
};

const VARIANT: Record<Variant, { root: string; layer: string }> = {
  /** Filled emerald, --on-accent text. The one saturated moment on a screen. */
  primary: { root: "bg-ctx-accent text-ctx-on-accent", layer: "bg-ctx-accent-hover" },
  /** Hairline emerald border. */
  outline: {
    root: "text-ctx-fg border border-[color-mix(in_oklch,var(--ctx-accent)_55%,transparent)]",
    layer: "bg-[color-mix(in_oklch,var(--ctx-accent)_12%,transparent)]",
  },
  /** Text action with a hand-drawn underline that draws on (HandUnderline). */
  quiet: { root: "text-ctx-fg !px-0.5", layer: "" },
};

/**
 * Hover and press only animate opacity and transform (§2.5): the hover color is a layer that
 * fades in, and presses scale to 0.98. Renders a Next <Link> when `href` is set.
 */
export function Button(props: ButtonProps) {
  const { variant = "primary", size = "md", className, children, ...rest } = props;
  const v = VARIANT[variant];
  const classes = cn(
    "group relative isolate inline-flex select-none items-center justify-center rounded-sm font-body font-medium whitespace-nowrap",
    "transition-transform duration-(--motion-fast) ease-ui is-active:scale-[0.98]",
    "disabled:cursor-not-allowed disabled:opacity-40 aria-disabled:cursor-not-allowed aria-disabled:opacity-40",
    SIZE[size],
    v.root,
    className,
  );

  const inner = (
    <>
      {v.layer && (
        <span
          aria-hidden
          className={cn(
            "absolute inset-0 -z-10 rounded-[inherit] opacity-0 transition-opacity duration-(--motion-fast) ease-ui group-is-hover:opacity-100",
            v.layer,
          )}
        />
      )}
      {children}
      {variant === "quiet" && <HandUnderline />}
    </>
  );

  if (rest.href !== undefined) {
    const { href, disabled, ...anchor } = rest as { href: string; disabled?: boolean } & AnchorHTMLAttributes<HTMLAnchorElement>;
    if (disabled) {
      return (
        <a role="link" aria-disabled="true" className={classes} {...anchor}>
          {inner}
        </a>
      );
    }
    // In-page anchors stay plain <a> so Lenis (not the router) owns the smooth scroll.
    if (href.includes("#")) {
      return (
        <a href={href} className={classes} {...anchor}>
          {inner}
        </a>
      );
    }
    return (
      <Link href={href} className={classes} {...anchor}>
        {inner}
      </Link>
    );
  }

  const { type = "button", ...button } = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button type={type} className={classes} {...button}>
      {inner}
    </button>
  );
}
