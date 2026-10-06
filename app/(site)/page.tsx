import { Convergence } from "@/components/sections/Convergence";
import { Hero } from "@/components/sections/Hero";
import { FindingsTape } from "@/components/tape/FindingsTape";

export default function Home() {
  return (
    <>
      <Hero />
      <FindingsTape />
      <div className="pt-24 lg:pt-36">
        <Convergence />
      </div>
      {/* Placeholder runway until §4.5 lands, so the convergence can be scrolled past. */}
      <div className="h-[60vh]" />
    </>
  );
}
