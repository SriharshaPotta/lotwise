import type { Metadata } from "next";
import { KitchenSink } from "@/components/dev/KitchenSink";

export const metadata: Metadata = {
  title: "Kitchen sink",
  robots: { index: false, follow: false },
};

export default function KitchenSinkPage() {
  return <KitchenSink />;
}
