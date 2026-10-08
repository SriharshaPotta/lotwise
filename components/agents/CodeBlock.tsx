"use client";

import { useState } from "react";
import { Surface } from "@/components/ui/Surface";

/** A command or config on a Surface: mono, horizontally scrollable, with a copy button. */
export function CodeBlock({ code, label }: { code: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Surface className="relative">
      <div className="flex items-center justify-between px-5 pt-3">
        <span className="num text-meta text-muted">{label}</span>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(code).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1600);
            });
          }}
          className="num rounded-[6px] px-2 py-1 text-meta text-muted ring-hairline transition-shadow duration-(--motion-fast) ease-ui hover:text-fg hover:shadow-[0_0_0_1px_var(--hairline-strong)]"
          aria-label={`Copy ${label}`}
        >
          <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre tabIndex={0} aria-label={label} className="num overflow-x-auto px-5 pt-3 pb-5 text-[13px] leading-6 text-fg">
        <code>{code}</code>
      </pre>
    </Surface>
  );
}
