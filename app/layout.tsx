import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "lenis/dist/lenis.css";
import "./globals.css";
import { MotionProvider } from "@/components/providers/MotionProvider";
import { SITE } from "@/lib/site";

/**
 * Newsreader 500 with its optical-size axis (the display cut, §2.3), pinned from the variable font
 * and subset to the characters headings use (see app/fonts/README.md): 74 KB instead of the 279 KB
 * that next/font/google ships with both axes.
 */
const newsreader = localFont({
  src: [
    { path: "./fonts/Newsreader-500-normal-opsz.woff2", weight: "500", style: "normal" },
    { path: "./fonts/Newsreader-500-italic-opsz.woff2", weight: "500", style: "italic" },
  ],
  variable: "--font-newsreader",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `Lotwise: ${SITE.tagline.replace(/\.$/, "").toLowerCase()}`, template: "%s · Lotwise" },
  description: SITE.description,
  applicationName: SITE.name,
  authors: [{ name: SITE.author }],
  alternates: { canonical: "/" },
  openGraph: { type: "website", siteName: SITE.name, url: "/", title: SITE.tagline, description: SITE.description, locale: "en_US" },
  twitter: { card: "summary_large_image", title: SITE.tagline, description: SITE.description },
};

export const viewport: Viewport = {
  themeColor: "#0f1a15",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${newsreader.variable} ${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
