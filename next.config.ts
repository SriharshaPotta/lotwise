import createMDX from "@next/mdx";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  // A package-lock.json in the user's home folder otherwise makes Next guess the wrong workspace root.
  outputFileTracingRoot: process.cwd(),
  turbopack: { root: process.cwd() },
};

// MDX for content/learn/*.mdx, imported by app/(site)/learn/[slug].
const withMDX = createMDX({});

export default withMDX(nextConfig);
