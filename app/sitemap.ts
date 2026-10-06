import type { MetadataRoute } from "next";
import { EXPLAINERS } from "@/lib/learn";
import { SITE } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const at = (path: string) => new URL(path, SITE.url).toString();
  return [
    { url: at("/"), changeFrequency: "monthly", priority: 1 },
    { url: at("/learn"), changeFrequency: "monthly", priority: 0.8 },
    { url: at("/demo"), changeFrequency: "monthly", priority: 0.5 },
    ...EXPLAINERS.filter((e) => e.ready).map((e) => ({ url: at(`/learn/${e.slug}`), changeFrequency: "monthly" as const, priority: 0.7 })),
  ];
}
