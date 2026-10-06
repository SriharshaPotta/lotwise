import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import "lenis/dist/lenis.css";
import "./globals.css";
import { MotionProvider } from "@/components/providers/MotionProvider";
import { SITE } from "@/lib/site";

const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-newsreader",
  display: "swap",
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
