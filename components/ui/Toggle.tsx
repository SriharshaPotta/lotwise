"use client";

import { m } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { spring } from "@/lib/motion";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  disabled?: boolean;
  className?: string;
  "data-force"?: string;
}

/** A 36×20 switch ("Buy back next week"), emerald when on. The thumb moves on the paper spring; the track crossfades. */
export function Toggle({ checked, onChange, label, disabled, className, "data-force": force }: ToggleProps) {
  return (
    <label className={cn("inline-flex items-center gap-3 text-[14px] text-ctx-fg", disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer", className)}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        data-force={force}
        className="group relative isolate h-5 w-9 shrink-0 rounded-pill transition-transform duration-(--motion-fast) ease-ui is-active:scale-[0.96] disabled:cursor-not-allowed"
      >
        <span aria-hidden className="ring-hairline absolute inset-0 rounded-[inherit] bg-ctx-raised" />
        <span
          aria-hidden
          className="absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-(--motion-fast) ease-ui group-is-hover:opacity-100"
          style={{ boxShadow: "0 0 0 1px var(--ctx-hairline-strong)" }}
        />
        <span
          aria-hidden
          className={cn("absolute inset-0 rounded-[inherit] bg-ctx-accent transition-opacity duration-(--motion-fast) ease-ui", checked ? "opacity-100" : "opacity-0")}
        />
        <m.span
          aria-hidden
          initial={false}
          animate={{ x: checked ? 16 : 0 }}
          transition={spring.paper}
          className={cn("absolute top-0.5 left-0.5 size-4 rounded-full shadow-[0_1px_2px_rgb(0_0_0/.35)]", checked ? "bg-ctx-on-control" : "bg-ctx-fg")}
        />
      </button>
      <span>{label}</span>
    </label>
  );
}
