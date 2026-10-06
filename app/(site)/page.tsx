import { HydrateOnView } from "@/components/effects/HydrateOnView";
import { Agents } from "@/components/sections/Agents";
import { Bento } from "@/components/sections/Bento";
import { Convergence } from "@/components/sections/Convergence";
import { FinalCta } from "@/components/sections/FinalCta";
import { Footer } from "@/components/sections/Footer";
import { Hero } from "@/components/sections/Hero";
import { LearnTeaser } from "@/components/sections/LearnTeaser";
import { Private } from "@/components/sections/Private";
import { FindingsTape } from "@/components/tape/FindingsTape";

/**
 * Sections below the first screen hydrate as they approach (HydrateOnView), so the initial load
 * only pays for the hero and the tape.
 *
 * Sections are separated by --space-32 (desktop) / --space-24 (phones), §2.4, measured from the
 * last content of one section to the next headline. The convergence brings 96px of its own above
 * its headline (its sticky stage clears the nav) and the CTA band carries its gap inside the band.
 */
const GAP = "pt-24 lg:pt-36";

export default function Home() {
  return (
    <>
      <Hero />
      <HydrateOnView>
        <FindingsTape />
      </HydrateOnView>
      <div className="lg:pt-12">
        <HydrateOnView>
          <Convergence />
        </HydrateOnView>
      </div>
      <div className={GAP}>
        <HydrateOnView>
          <Bento />
        </HydrateOnView>
      </div>
      <div className={GAP}>
        <HydrateOnView>
          <Private />
        </HydrateOnView>
      </div>
      <div className={GAP}>
        <HydrateOnView>
          <Agents />
        </HydrateOnView>
      </div>
      <div className={GAP}>
        <HydrateOnView>
          <LearnTeaser />
        </HydrateOnView>
      </div>
      <HydrateOnView>
        <FinalCta />
      </HydrateOnView>
      <Footer />
    </>
  );
}
