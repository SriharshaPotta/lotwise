import type { MDXComponents } from "mdx/types";
import { ShortVsLongTermExplainer } from "@/components/explainers/ShortVsLongTermExplainer";
import { WashSaleExplainer } from "@/components/explainers/WashSaleExplainer";

// Typography for MDX lives in globals.css (.learn-prose). Explainer interactives are available to
// every MDX file without imports.
const components: MDXComponents = {
  WashSaleExplainer,
  ShortVsLongTermExplainer,
};

export function useMDXComponents(): MDXComponents {
  return components;
}
