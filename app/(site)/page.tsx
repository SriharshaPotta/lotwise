import { Bento } from "@/components/sections/Bento";
import { Convergence } from "@/components/sections/Convergence";
import { Hero } from "@/components/sections/Hero";
import { Private } from "@/components/sections/Private";
import { FindingsTape } from "@/components/tape/FindingsTape";

export default function Home() {
  return (
    <>
      <Hero />
      <FindingsTape />
      <div className="pt-24 lg:pt-36">
        <Convergence />
      </div>
      <div className="pt-24 lg:pt-36">
        <Bento />
      </div>
      <div className="pt-24 lg:pt-36">
        <Private />
      </div>
      {/* Runway until §4.7 lands. */}
      <div className="h-[40vh]" />
    </>
  );
}
