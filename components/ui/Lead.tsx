import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Size = "lead" | "body";

const SIZE: Record<Size, string> = {
  lead: "text-lead max-w-[38ch]",
  body: "text-body max-w-[36ch]",
};

interface LeadProps extends Omit<HTMLAttributes<HTMLParagraphElement>, "children"> {
  /** The key clause, set in --fg. */
  strong: ReactNode;
  /** The rest of the sentence, set in --muted. */
  children?: ReactNode;
  size?: Size;
}

/**
 * Two-tone supporting copy (§2.3): the clause that carries the point in --fg, the rest in
 * --muted. `<Lead strong="First clause.">rest of the sentence</Lead>`.
 */
export function Lead({ strong, children, size = "lead", className, ...rest }: LeadProps) {
  return (
    <p className={cn(SIZE[size], "text-ctx-muted", className)} {...rest}>
      <span className="text-ctx-fg">{strong}</span>
      {children && <> {children}</>}
    </p>
  );
}
