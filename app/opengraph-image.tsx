import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { DEMO_DATE, LOTS, heroReceipt } from "@/lib/demo";
import { money, receiptDate } from "@/lib/format";
import { SITE } from "@/lib/site";

export const alt = `Lotwise: ${SITE.tagline} A pre-trade receipt for selling 100 NVDA, stamped WASH SALE.`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// DESIGN.md tokens as sRGB (the image renderer has no OKLCH).
const C = {
  bg: "#0a100d",
  fg: "#f0ede0",
  muted: "#9da093",
  rule: "rgba(240,237,224,0.06)",
  paper: "#f2efe0",
  ink: "#121e17",
  inkMuted: "#50584e",
  accent: "#25d086",
  lossInk: "#b63132",
  stamp: "#c26300",
};

const font = (file: string) => readFile(join(process.cwd(), "assets/fonts", file));

/** Zigzag perforation along a receipt edge. */
function Perforation({ flip }: { flip?: boolean }) {
  const w = 440;
  const z = 7;
  // teeth point up on the top edge, down on the bottom edge
  const [base, tip] = flip ? [0, z] : [z, 0];
  const pts = Array.from({ length: Math.ceil(w / (2 * z)) + 1 }, (_, i) => `${i * 2 * z},${base} ${i * 2 * z + z},${tip}`).join(" ");
  return (
    <svg width={w} height={z} viewBox={`0 0 ${w} ${z}`} style={{ display: "flex" }}>
      <polygon points={`0,${base} ${pts} ${w},${base}`} fill={C.paper} />
    </svg>
  );
}

function Row({ label, value, color, bold }: { label: string; value: string; color?: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, fontSize: 19, lineHeight: 1.7, color: C.ink, fontWeight: bold ? 600 : 400 }}>
      <span>{label}</span>
      <span style={{ flex: 1, height: 4, marginBottom: 9, opacity: 0.5, backgroundImage: `radial-gradient(circle, ${C.inkMuted} 1px, transparent 1.4px)`, backgroundSize: "6px 4px", backgroundRepeat: "repeat-x" }} />
      <span style={{ color: color ?? C.ink }}>{value}</span>
    </div>
  );
}

/** The share image: the hero headline on ledger ink, with a printed receipt and a WASH SALE stamp. */
export default async function OpengraphImage() {
  const [serif, serifItalic, mono] = await Promise.all([font("Newsreader-500.woff"), font("Newsreader-Italic-500.woff"), font("GeistMono-Regular.woff")]);
  const r = heroReceipt(LOTS.nvda.qty);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: C.bg, fontFamily: "Geist Mono" }}>
        {/* ledger ruling and the double margin rule */}
        {Array.from({ length: 20 }, (_, i) => (
          <div key={i} style={{ position: "absolute", left: 0, right: 0, top: 32 * (i + 1) - 1, height: 1, background: C.rule }} />
        ))}
        <div style={{ position: "absolute", top: 0, bottom: 0, left: 36, width: 1, background: "rgba(240,237,224,0.12)" }} />
        <div style={{ position: "absolute", top: 0, bottom: 0, left: 40, width: 1, background: "rgba(240,237,224,0.12)" }} />

        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 0 64px 80px", width: 680 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 16, height: 16, border: `1.5px solid ${C.accent}`, display: "flex" }} />
            <span style={{ fontFamily: "Newsreader", fontStyle: "italic", fontSize: 30, color: C.fg }}>Lotwise</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", fontFamily: "Newsreader", fontSize: 64, lineHeight: 1.04, letterSpacing: "-0.02em", color: C.fg }}>
            <span>Know the tax bill</span>
            <span style={{ display: "flex" }}>
              <span style={{ fontStyle: "italic", marginRight: 15 }}>before</span>
              <span>you click sell.</span>
            </span>
          </div>
          <div style={{ display: "flex", fontSize: 20, color: C.muted, gap: 16 }}>
            <span>Runs in your browser</span>
            <span>·</span>
            <span>No account needed</span>
          </div>
        </div>

        {/* the receipt */}
        <div style={{ position: "absolute", top: 70, right: 80, display: "flex", flexDirection: "column", transform: "rotate(-2deg)", boxShadow: "0 24px 48px -12px rgba(0,0,0,.6)" }}>
          <Perforation />
          <div style={{ display: "flex", flexDirection: "column", width: 440, background: C.paper, padding: "18px 28px 22px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, letterSpacing: "0.08em", color: C.inkMuted }}>
              <span>PRE-TRADE RECEIPT</span>
              <span>{receiptDate(DEMO_DATE)}</span>
            </div>
            <div style={{ height: 1, background: "rgba(18,30,23,0.25)", margin: "10px 0" }} />
            <div style={{ display: "flex", fontSize: 19, letterSpacing: "0.08em", color: C.ink, lineHeight: 1.7 }}>
              {`SELL ${r.shares} ${LOTS.nvda.symbol} @ ${r.price.toFixed(2)}`}
            </div>
            <Row label="Proceeds" value={money(r.proceeds)} />
            <Row label="Cost basis" value={money(r.basis)} />
            <Row label="Realized" value={money(r.result!.realized)} color={C.lossInk} />
            <Row label="Term" value="SHORT" />
            <div style={{ height: 4, borderTop: `1.5px solid ${C.ink}`, borderBottom: `1.5px solid ${C.ink}`, margin: "8px 0" }} />
            <Row label="Deductible loss" value={money(r.deductible)} />
            <Row label="Disallowed (wash sale)" value={money(r.disallowed)} bold />
            <div style={{ display: "flex", gap: 3, marginTop: 14, height: 30 }}>
              {Array.from({ length: 46 }, (_, i) => (
                <div key={i} style={{ width: i % 3 === 0 ? 3 : i % 5 === 0 ? 2 : 1, background: C.ink, display: "flex" }} />
              ))}
            </div>
          </div>
          <Perforation flip />

          {/* the stamp */}
          <div
            style={{
              position: "absolute",
              top: 238,
              left: 120,
              display: "flex",
              padding: "8px 18px",
              border: `3px solid ${C.stamp}`,
              borderRadius: 8,
              color: C.stamp,
              fontSize: 30,
              fontWeight: 600,
              letterSpacing: "0.14em",
              transform: "rotate(-8deg)",
              opacity: 0.92,
            }}
          >
            WASH SALE
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Newsreader", data: serif, style: "normal", weight: 500 },
        { name: "Newsreader", data: serifItalic, style: "italic", weight: 500 },
        { name: "Geist Mono", data: mono, style: "normal", weight: 400 },
      ],
    },
  );
}
