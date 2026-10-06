import type { MDXComponents } from "mdx/types";
import { AcrossAccountsExplainer } from "@/components/explainers/AcrossAccountsExplainer";
import { ShortVsLongTermExplainer } from "@/components/explainers/ShortVsLongTermExplainer";
import { IraTrapExplainer, OptionsExplainer, WashSaleExplainer } from "@/components/explainers/WashSaleExplainer";

// Typography for MDX lives in globals.css (.learn-prose). Explainer interactives are available to
// every MDX file without imports.
const components: MDXComponents = {
  WashSaleExplainer,
  ShortVsLongTermExplainer,
  AcrossAccountsExplainer,
  IraTrapExplainer,
  OptionsExplainer,
};

export function useMDXComponents(): MDXComponents {
  return components;
}
