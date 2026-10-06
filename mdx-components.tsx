import type { MDXComponents } from "mdx/types";
import { AcrossAccountsExplainer } from "@/components/explainers/AcrossAccountsExplainer";
import { Section1256Explainer } from "@/components/explainers/Section1256Explainer";
import { ShortVsLongTermExplainer } from "@/components/explainers/ShortVsLongTermExplainer";
import { HarvestExplainer } from "@/components/explainers/HarvestExplainer";
import { IraTrapExplainer, OptionsExplainer, WashSaleExplainer } from "@/components/explainers/WashSaleExplainer";

// Typography for MDX lives in globals.css (.learn-prose). Explainer interactives are available to
// every MDX file without imports.
const components: MDXComponents = {
  WashSaleExplainer,
  ShortVsLongTermExplainer,
  AcrossAccountsExplainer,
  IraTrapExplainer,
  OptionsExplainer,
  Section1256Explainer,
  HarvestExplainer,
};

export function useMDXComponents(): MDXComponents {
  return components;
}
