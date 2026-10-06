import { HandCircle } from "@/components/annotate/HandCircle";
import { Button } from "@/components/ui/Button";
import { Hatch } from "@/components/viz/Hatch";

/** §4.9. Fine emerald hatching fades up from the bottom over the ledger rules. */
export function FinalCta() {
  return (
    <section aria-labelledby="cta-title" className="relative overflow-hidden">
      <Hatch variant="accent" fade="up" as="div" className="absolute inset-x-0 bottom-0 h-full opacity-30" />
      <div className="page-container relative pt-24 pb-24 lg:pt-36 lg:pb-36">
        <h2 id="cta-title" className="max-w-[12ch] text-display lg:max-w-[16ch]">
          See what your broker{" "}
          <span className="relative inline-block">
            <em>isn&rsquo;t</em>
            <HandCircle className="text-fg" />
          </span>{" "}
          showing you.
        </h2>
        <Button href="/demo" className="mt-12">
          Open the demo portfolio
        </Button>
      </div>
    </section>
  );
}
