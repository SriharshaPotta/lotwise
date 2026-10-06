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

/** A switch ("Buy back next week"). The thumb moves on the paper spring; the track crossfades. */
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
        className="group relative isolate h-6 w-10 shrink-0 rounded-pill transition-transform duration-(--motion-fast) ease-ui is-active:scale-[0.96] disabled:cursor-not-allowed"
      >
        <span aria-hidden className="absolute inset-0 rounded-[inherit] border border-ctx-line bg-ctx-raised" />
        <span
          aria-hidden
          className="absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-(--motion-fast) ease-ui group-is-hover:opacity-100"
          style={{ boxShadow: "inset 0 0 0 1px var(--ctx-fg)" }}
        />
        <span
          aria-hidden
          className={cn("absolute inset-0 rounded-[inherit] bg-ctx-control transition-opacity duration-(--motion-fast) ease-ui", checked ? "opacity-100" : "opacity-0")}
        />
        <m.span
          aria-hidden
          initial={false}
          animate={{ x: checked ? 16 : 0 }}
          transition={spring.paper}
          className={cn("absolute top-[3px] left-[3px] size-[18px] rounded-full", checked ? "bg-ctx-on-control" : "bg-ctx-fg")}
        />
      </button>
      <span>{label}</span>
    </label>
  );
}
