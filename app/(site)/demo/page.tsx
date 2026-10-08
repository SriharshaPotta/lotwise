import type { Metadata } from "next";
import { DemoApp } from "@/components/demo/DemoApp";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Demo",
  description:
    "Three accounts, thirty trades and a sale you're about to regret. Simulate a sale, find wash sales across accounts, harvest losses. The Rust engine runs in your browser.",
  alternates: { canonical: "/demo" },
  openGraph: { title: "The Lotwise demo portfolio", url: "/demo", images: [SITE.ogImage] },
};

/** §3: the demo app. Entirely client-side; the portfolio lives in this browser's storage. */
export default function DemoPage() {
  return <DemoApp />;
}
