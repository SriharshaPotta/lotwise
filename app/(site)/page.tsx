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
 * Sections are separated by --space-32 (desktop) / --space-24 (phones), §2.4, measured from the
 * last content of one section to the next headline. The convergence brings 96px of its own above
 * its headline (its sticky stage clears the nav) and the CTA band carries its gap inside the band.
 */
const GAP = "pt-24 lg:pt-36";

export default function Home() {
  return (
    <>
      <Hero />
      <FindingsTape />
      <div className="lg:pt-12">
        <Convergence />
      </div>
      <div className={GAP}>
        <Bento />
      </div>
      <div className={GAP}>
        <Private />
      </div>
      <div className={GAP}>
        <Agents />
      </div>
      <div className={GAP}>
        <LearnTeaser />
      </div>
      <FinalCta />
      <Footer />
    </>
  );
}
