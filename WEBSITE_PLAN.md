# Lotwise Website: Complete Build Plan for Claude Code

> Build the Lotwise marketing + learning website **before** the product. The look is Lotwise's own: **"the private ledger"** — a beautifully typeset financial newspaper crossed with an accountant's ledger book, at night. Serif headlines, monospace numbers, ruled ledger lines, and a pre-trade **tax receipt** as the hero object. Emerald is the accent.
>
> All numbers on the site come from a small **mock engine** behind a typed interface (`lib/engine`). When the real Rust/WASM engine exists, swap the implementation; the website doesn't change.

---

## 0. How to use this file

1. Put this file in the repo root as `WEBSITE_PLAN.md`.
2. Do the one-time setup in §1.
3. Have Claude Code create `DESIGN.md` from §2 and add a pointer to it in `CLAUDE.md` (Prompt 0 does this).
4. Run the prompts in §8 **one at a time, in plan mode** (Shift+Tab). Each prompt ends with a Playwright screenshot review. Don't move on until the section looks right on desktop **and** your phone.
5. Commit and push after each prompt; check the Vercel preview on a real phone.

---

## 1. One-time setup

```bash
# In the repo root, inside Claude Code:
/plugin marketplace add anthropics/claude-code
/plugin install frontend-design@claude-code-plugins

# In a normal terminal:
claude mcp add playwright -- npx @playwright/mcp@latest      # lets Claude screenshot + critique its work
npx @21st-dev/cli@latest install claude --api-key <YOUR_KEY>  # optional: component inspiration (beta)
```

- **frontend-design** loads automatically when you ask for UI. It makes Claude commit to a design direction before coding.
- **Playwright MCP** is how Claude sees what it built. Every prompt below uses it.
- **21st.dev Magic** is for small building blocks only (copy button, marquee, tooltip). Never for the hero or signature sections; those are custom.

Stack: **Next.js (App Router) + TypeScript + Tailwind v4**, **Motion** (`motion/react`) for animation, **Lenis** for smooth scroll, **next/font** for Geist Sans, Geist Mono and Instrument Serif. Minimal shadcn/ui (only if a primitive is needed). Deploy on Vercel.

---

## 2. DESIGN.md (copy this whole section into `DESIGN.md`)

### 2.1 Direction

**"The private ledger."** Editorial finance: the typographic confidence of a great financial newspaper, the precision of an accountant's ledger, the calm of a private bank, set on deep green-black ink. Trustworthy and warm, not "hacker terminal," not "AI startup."

The defining contrast: the page is dark ink, but the product's key artifact, **the tax receipt**, is a light paper object sitting on top of it. Paper vs. ink is the whole visual story: Lotwise hands you the receipt *before* you trade.

Apple-level restraint still applies: one idea per screen, huge confident headlines, lots of space, and one saturated emerald moment per screen.

**Never:** terminal/macOS window chrome, ASCII art, dithering, glassmorphism, purple-blue gradients, glows, emoji, stock illustrations, generic three-icon feature rows, centered-everything layouts.

### 2.2 Color tokens (OKLCH)

```css
:root {
  /* ink (page): neutrals tinted toward green */
  --bg:        oklch(16.5% 0.012 160);
  --surface:   oklch(20%   0.014 160);
  --surface-2: oklch(24%   0.016 160);
  --fg:        oklch(94.5% 0.018 95);    /* warm paper-white text */
  --muted:     oklch(70%   0.020 120);
  --border:    oklch(30%   0.018 160);
  --rule:      color-mix(in oklch, var(--fg) 6%, transparent);   /* ledger lines */
  --rule-strong: color-mix(in oklch, var(--fg) 12%, transparent);

  /* paper (receipts, coupons, explainer cards) */
  --paper:      oklch(95%  0.020 95);
  --paper-2:    oklch(91%  0.024 92);
  --ink:        oklch(22%  0.020 160);   /* text on paper */
  --ink-muted:  oklch(45%  0.020 140);

  /* accent: emerald */
  --accent:        oklch(76% 0.170 158);
  --accent-hover:  oklch(82% 0.150 160);
  --accent-deep:   oklch(42% 0.090 160);
  --on-accent:     oklch(17% 0.030 160);
  --accent-soft:   color-mix(in oklch, var(--accent) 14%, transparent);

  /* semantic (on ink) */
  --gain:      var(--accent);
  --loss:      oklch(68% 0.170 20);
  --wash:      oklch(83% 0.130 88);      /* ALWAYS paired with diagonal hatching */
  --longterm:  oklch(72% 0.130 300);
  --sec1256:   oklch(74% 0.110 230);

  /* semantic (on paper): darker so they read on --paper */
  --gain-ink:  oklch(48% 0.120 158);
  --loss-ink:  oklch(52% 0.170 25);
  --wash-ink:  oklch(58% 0.130 70);
  --stamp:     oklch(60% 0.150 55);      /* receipt stamp ink */
}
```

Rules: semantic colors only ever carry their meaning. Wash amber is never used without its hatch (`repeating-linear-gradient(135deg, var(--wash) 0 1.5px, transparent 1.5px 6px)` over a 12% wash fill). On paper, always use the `-ink` variants.

### 2.3 Type

```css
--font-display: var(--font-newsreader), 'Iowan Old Style', Georgia, serif;   /* all headlines */
--font-body:    var(--font-geist-sans), system-ui, sans-serif;
--font-mono:    var(--font-geist-mono), ui-monospace, monospace;             /* numbers, receipts */

--fs-display: clamp(44px, 6vw, 92px);    /* hero h1: Newsreader 500, opsz 72, line-height 0.98, letter-spacing -0.02em */
--fs-h2:      clamp(30px, 3.6vw, 52px);  /* Newsreader 500, letter-spacing -0.015em */
--fs-lead:    clamp(17px, 1.3vw, 20px);  /* Geist Sans, --muted, line-height 1.55, max 44ch */
--fs-body:    16px;
--fs-meta:    13px;                      /* Geist Mono labels */
--fs-receipt: clamp(12px, 0.95vw, 14px); /* Geist Mono on paper */
```

- **All headlines are serif.** Emphasis inside a headline is Newsreader *italic* (not a different color).
- Body copy is sans; anything numeric is mono with `tabular-nums`.
- Small-caps style (uppercase + 0.08em tracking, mono) is allowed **only on receipts and stamps**, nowhere else.

### 2.4 Space, radius, layout

```css
--space-1:4px; --space-2:8px; --space-3:12px; --space-4:16px; --space-6:24px;
--space-8:32px; --space-12:48px; --space-16:64px; --space-24:96px; --space-32:144px;
--container: 1240px;
--gutter: clamp(20px, 4vw, 56px);
--ledger-row: 32px;          /* baseline rhythm of the ruled background */
--radius-sm: 6px; --radius-md: 10px; --radius-lg: 16px; --radius-pill: 999px;
```

- 12-column grid. Headlines are **left-aligned**, often spanning 9–10 columns; supporting copy sits in narrower columns. Asymmetry is good.
- Big vertical gaps between sections (`--space-32` desktop, `--space-24` mobile).
- Cards on ink use hairline `--border`, small radius. Paper objects have **no border**, a soft shadow (`0 1px 0 rgba(0,0,0,.06), 0 24px 48px -12px rgba(0,0,0,.55)`), and perforated edges.

### 2.5 Motion: "paper physics"

```css
--motion-fast: 160ms;
--ease-ui: cubic-bezier(0.32, 0.72, 0, 1);     /* hovers, presses */
--motion-reveal: 640ms;
--ease-ink: cubic-bezier(0.65, 0, 0.35, 1);     /* lines drawing themselves */
--ease-settle: cubic-bezier(0.16, 1, 0.3, 1);   /* reveals */
```

- Objects feel like **paper**: weighted springs (`{ type: "spring", stiffness: 220, damping: 26, mass: 1.1 }`), a slight overshoot, never bouncy.
- Lines feel like **ink**: SVG strokes draw on with `stroke-dashoffset` and `--ease-ink`.
- Numbers always **tween** (420ms); they never jump.
- Animate only `transform`, `opacity`, and SVG stroke attributes.
- Reveals: fade + 20px rise, `--ease-settle`, 640ms, stagger 70ms, once at 20% in view.
- **Lenis** smooth scroll (lerp ≈ 0.09), off under reduced motion.
- Reduced motion: no scroll-linked motion, no printing/drawing animations (show final state), instant tweens. Still looks designed.
- Zero layout shift: next/font, explicit sizes on every visual container.

### 2.6 Signature elements (the identity)

1. **Ledger ruling.** The page background carries faint horizontal rules every `--ledger-row` and a thin double vertical margin rule on the left (like accounting paper), drawn with CSS gradients (`--rule`). In the hero, the ruling is alive: an **emerald price line draws itself** across the rules (SVG, ink easing, ~1.6s), small lot bars fade in along it, and an amber hatched window settles around one dip. Afterward, the line keeps a very slow drift (one screen width per ~60s).
2. **The tax receipt.** A light `--paper` card with **perforated zigzag top and bottom edges** (CSS `mask`), mono line items with **dotted leaders** (`Proceeds ……… $12,980.00`), a double rule above totals, and a footer barcode made of thin bars. It **prints**: it slides up out of a thin "slot" line with a short stepped feed (3 quick steps), then line items type in one by one (40ms apart).
3. **The stamp.** Rubber-stamp marks in `--stamp` ink (e.g. `WASH SALE`, `LONG-TERM IN 9 DAYS`): a rounded rectangle border, uppercase mono, rotated −8°, slightly rough edges (SVG turbulence-free: use a hand-drawn SVG outline). It lands with a thunk: scale 1.35 → 1, opacity 0 → 1, 120ms, tiny 2px settle.
4. **Coupons.** Better alternatives appear as **tear-off coupons** with a dashed border and a notched edge, sliding out from under the receipt.
5. **Hatch motif.** Diagonal hatching is the brand texture: amber for wash windows; fine emerald hatch for the final CTA band.
6. **Hand-drawn annotations.** A few SVG marks drawn by hand (circles, underlines, arrows) highlight key numbers; they draw on with ink easing. *(These should be drawn by hand and vectorized; they're what makes the site feel human.)*
7. **Finance grammar.** A lot is a rounded horizontal bar; a wash window is an amber hatched band; the long-term date is a violet tick; money moving between buckets is a small rounded chip traveling a curved path.

### 2.7 Accessibility

Text contrast ≥ 4.5:1 (check `--muted` on `--bg` and `--ink-muted` on `--paper`). Decorative SVG/canvas is `aria-hidden`. Every interactive visual has keyboard controls and a live-region text summary. Focus ring: 2px `--accent` outline, 3px offset (on paper: `--accent-deep`).

---

## 3. Site map

| Route | Purpose |
|---|---|
| `/` | Landing page (§4) |
| `/learn` | Index of interactive explainers |
| `/learn/[slug]` | Seven explorable explainers (§5) |
| `/agents` | MCP / AI-agent page (can start as a section anchor and become a page later) |
| `/demo` | Placeholder "Demo coming soon" page with an email-free "Star on GitHub" CTA until the app exists |

---

## 4. Landing page, section by section

Layout container: `--container` wide, `--gutter` side padding, 12-column grid. Copy below is final unless marked.

### 4.0 Nav

- Left: wordmark **Lotwise** in Newsreader italic 500, 22px, preceded by a 12px square filled with fine emerald hatching.
- Links (Geist Sans 14px, `--muted` → `--fg` on hover): How it works · Learn · Agents · GitHub.
- Right: "Open the demo" button (outlined, hairline emerald border).
- At the top it sits directly on the ledger ruling. After 24px of scroll it gets a solid `--bg` background and a 1px `--rule-strong` bottom line (no blur, no glass). 160ms.
- Mobile: links collapse into a full-width sheet that slides down with the paper spring.

### 4.1 Hero

**Background:** the living ledger (§2.6.1) across the full hero.

**Composition (desktop):** headline spans columns 1–10, left-aligned, top of the hero. Below it, a two-part row: on the left (cols 1–5) the lead, CTAs and trust line; on the right (cols 6–12) the trade ticket + receipt showcase (§4.2), which overlaps the drawn price line. Mobile: single column, headline → lead → CTAs → showcase.

**Headline (h1, serif):**
> Know the tax bill *before* you click sell.

**Lead:**
> Lotwise checks every account you own for wash sales and hands you the tax receipt for a trade *before* you place it. It runs entirely in your browser.

**CTAs:** primary "Open the demo portfolio" (filled emerald, `--on-accent` text) → `/demo`; secondary text link "How it works ↓" with an animated hand-drawn underline on hover → smooth-scrolls to §4.4.

**Trust line** (mono 13px, `--muted`, separated by thin vertical rules): `Runs in your browser` │ `No account needed` │ `Open source`

**Entrance choreography:** ledger rules fade in (300ms) → price line draws (1.6s, ink easing) while the headline rises line by line (stagger 90ms) → lead and CTAs → the receipt prints (§4.2). Total ≈ 2s, interactive immediately.

### 4.2 Showcase: trade ticket + tax receipt

Two connected objects:

**Trade ticket (dark panel, `--surface`, hairline border, `--radius-md`):**
- Segmented control: `Brokerage One` · `Brokerage Two` · `Roth IRA` (switches holdings shown; mock data).
- Position row: `NVDA · 100 sh · avg cost $148.20 · last $129.80`, unrealized loss in `--loss`.
- Slider "Shares to sell" (0–100) and toggle "Buy back next week".
- A thin "slot" line at the bottom of the ticket: the receipt prints out of it.

**Receipt (paper, §2.6.2), printing out of the ticket's slot:**

```
LOTWISE · PRE-TRADE RECEIPT                     OCT 15 2026
────────────────────────────────────────────────────────────
SELL 100 NVDA @ 129.80
Proceeds ........................................ $12,980.00
Cost basis ...................................... $14,820.00
Realized ......................................... −$1,840.00
Term ................................................ SHORT
════════════════════════════════════════════════════════════
Deductible loss ...................................... $0.00
Disallowed (wash sale) ........................... $1,840.00
  2 NVDA calls bought Oct 3 · Brokerage Two
────────────────────────────────────────────────────────────
||| | |||| || ||| | || |||| | ||| ||                 #00042
```

- Values tween as the slider moves (proportional to shares).
- When shares > 0, the **`WASH SALE` stamp** thunks onto the receipt (§2.6.3). Teaser: ~1.4s after load the slider animates 0 → 100 once, unless the visitor already touched it.
- Toggle "Buy back next week" ON adds a line: `Rebuy Oct 22 would also trigger · ✕`.
- **Coupons** (§2.6.4) slide out from under the receipt, staggered:
  - `Sell on or after Nov 3 → keep the full $1,840 deduction`
  - `Harvest AMD instead → −$1,120 deductible, no wash`
- Changing the account or toggle re-prints the receipt with a quick 3-step paper feed; slider changes only tween numbers.
- Resting state: receipt rotated −1.5°; it straightens on hover/focus with the paper spring.
- Demo date for all copy: **2026-10-15**; the calls were bought 2026-10-03. All numbers come from `lib/engine` + `lib/demo`.

### 4.3 Findings tape

A slim full-width band between two `--rule-strong` lines with a slow horizontal **tape** of example findings in mono, separated by small hatched squares:

`Wash sale caught · $1,840 kept` ▪ `Goes long-term in 9 days · save $410` ▪ `IRA trap avoided · $620` ▪ `HIFO instead of FIFO · save $95` ▪ `XSP instead of SPY · save $388`

Speed ≈ 30px/s, pauses on hover/touch, static (wrapping) under reduced motion. Numbers are illustrative and labeled as from the demo portfolio.

### 4.4 The convergence (signature scroll section)

**h2:** *Your broker sees one account. The IRS sees* all *of them.* ("all" in italic.)

**Mechanics:** a sticky stage inside a ~300vh tall section, driven by Motion `useScroll` + `useTransform`:

1. **0–25%:** three **ledger pages** side by side (dark cards with faint ruled lines and a mono header: Brokerage One, Brokerage Two, Roth IRA), each with 4–5 dated trades and a green "No issues found" badge. Lead text: *Each broker checks its own account. That's all it's required to do.*
2. **25–60%:** the cards slide together and dissolve their borders; their trades re-sort into **one chronological timeline** (layout animation; each row moves to its new position).
3. **60–80%:** a loss sale in Brokerage One gets a **61-day amber hatched window** that draws outward from the sale date; a call purchase in Brokerage Two inside the window lights up and a **chip** travels from the sale to that purchase.
4. **80–100%:** a `WASH SALE` stamp thunks onto the merged ledger and the badge morphs into `1 wash sale · $1,840 disallowed` and a second line appears: `1 IRA trap · loss permanently lost` (if the demo includes it). Caption: *lotwise checks across all of them, before you trade.*

**Reduced motion / mobile fallback:** a segmented toggle "Broker view / IRS view" that switches between the end states of step 1 and step 4 with a simple crossfade.

### 4.5 Features bento

**h2:** *Every trade, checked before it happens.*

A 2×2 bento grid (one wide card on top on desktop; stacked on mobile). Each card has a small looping visual built from real components (no videos), title, and one sentence.

| Card | Visual | Copy |
|---|---|---|
| **Pre-trade simulator** (wide) | A mini slider auto-scrubbing back and forth; tax number tweening | *Drag, see the tax hit, change your mind. Before anything is real.* |
| **Loss harvesting** | A grid of lot squares; red ones flip to emerald with a running "saved" counter | *Find losses worth taking — and the ones that would trigger a wash sale.* |
| **Long-term countdown** | A violet ring filling toward "9 days" | *Some trades get much cheaper if you wait. We tell you which, and by how much.* |
| **Section 1256** | Two bars (SPY vs XSP) re-stacking into 60/40 | *The same trade on a different ticker can be taxed very differently.* |

Card hover: border brightens one step, visual plays at 1.5× speed. Visuals only animate while in view.

### 4.6 "Runs entirely in your browser"

**h2:** *Your trades never leave your browser.*

Visual: a large outlined browser window (hairline, rounded) containing a chip labeled `Rust → WebAssembly` with tiny data dots orbiting inside the window. Outside, a dashed rounded "server" box labeled `our servers` with a counter that stays at **0 bytes received**. When the section enters view, a few dots try to drift toward the edge and bounce back softly (spring).

Copy: *The tax engine is written in Rust and compiled to WebAssembly. It runs on your device. There is no backend to send your trades to.*

### 4.7 Agents

**h2:** *Your AI agents can ask* before *they trade.*

A dark ledger card (ruled background, hairline border, no window chrome) holding a **chat transcript** that replays with a typewriter effect when 40% in view (user text ~35 chars/sec, assistant text in streaming chunks), with a replay link at the end. Speaker labels in mono `--muted` (`you`, `claude`). The tool call renders as a **mini paper receipt** that prints inline:

```
you     Sell my XYZ to lock in the loss, then buy it back next week.

claude  ┌ lotwise · check_trade_tax_impact ─────────────┐
        │ SELL 100 XYZ   realized −$1,000               │
        │ WASH-SALE RISK  HIGH   rebuy safe from NOV 15 │
        └───────────────────────────────────────────────┘
        Selling now locks in a $1,000 loss, but buying back next week
        would disallow it. I'll sell today and set a reminder to rebuy
        on November 15, or I can buy a similar-but-not-identical ETF now.
        Which do you prefer?
```

Side copy (cols 1–4): *Lotwise ships an MCP server, so Claude, Cursor or any agent can check the tax impact of a trade before placing it.* Link: "Set up the MCP server →".

### 4.8 Learn teaser

**h2:** *Taxes, explained by playing with them.*

Three cards (horizontal scroll on mobile with snap): *The wash sale* · *Short vs long term* · *The IRA trap*. Each has a tiny static version of its explainer visual and "Explore →". Link to `/learn`.

### 4.9 Final CTA band

Full-width band with fine emerald hatching fading up from the bottom over the ledger rules. A hand-drawn circle draws itself around "isn't":

> **See what your broker *isn't* showing you.**
> [Open the demo portfolio]

### 4.10 Footer

Wordmark · Learn · Agents · GitHub · mono line "Estimates only — not tax advice." · "Made by [your name]." The footer sits on the ledger ruling with the double margin rule visible, like the last page of a ledger book.

---

## 5. Learn pages

**Template (`/learn/[slug]`):** narrow editorial column (max 680px) for prose; interactives break out to the full container width. Top: small mono breadcrumb, h1, one-line summary, reading time. Bottom: "Try this on the demo portfolio →" and next/previous explainer links. Content in MDX; interactives are React components imported into the MDX.

Build **The wash sale** first as the flagship; the rest follow the same template.

| Slug | Hero interactive |
|---|---|
| `the-wash-sale` | A horizontal calendar. A loss sale sits in the middle; a 61-day amber hatched window surrounds it. The visitor **drags a "buy back" marker** along the calendar. Inside the window: the loss chip lifts out of a "Deductible" bucket and flies into the new lot, whose basis readout tweens up and whose holding-start marker slides earlier. Outside the window: the chip settles back into "Deductible." Readouts: loss, disallowed, adjusted basis, holding start. Keyboard: arrow keys move the marker by a day, Shift+arrow by a week |
| `short-vs-long-term` | "Days held" slider on a calendar strip; the tax bar visibly drops the moment the lot crosses one year (violet tick) |
| `across-accounts` | Broker view / IRS view toggle over two accounts (reuses the convergence components) |
| `the-ira-trap` | Like the wash sale, but buying back in the IRA drops the chip into a "gone forever" pit |
| `options-can-trigger-it` | Drop a call-option chip inside the window and the wash triggers |
| `section-1256` | Same P&L on SPY vs XSP, side-by-side stacked 60/40 bars and the savings |
| `tax-loss-harvesting` | A portfolio grid; click losing lots to harvest; running savings; blocked lots show when they become safe |

`/learn` index: a grid of the seven cards with a small static preview visual each, ordered as a learning path (numbered in mono, e.g. `01`).

---

## 6. Mock engine (`lib/engine`)

The website talks only to this interface. Later, `wasm.ts` implements the same interface using the real Rust engine.

```ts
// lib/engine/types.ts
export type Money = number; // mock only; the real engine uses decimal strings
export interface Lot { id: string; account: string; symbol: string; qty: number; costPerShare: Money; acquired: string /* ISO date */; }
export interface SaleInput { lot: Lot; qty: number; price: Money; date: string; rebuy?: { date: string; qty: number; price: Money; account: string; isIra?: boolean }; taxRates?: { st: number; lt: number }; }
export interface SaleResult {
  realized: Money; term: "short" | "long"; estTax: Money;
  wash: null | { disallowed: Money; replacementBasis: Money; holdingStart: string; permanent: boolean };
}
export interface Engine { simulateSale(input: SaleInput): SaleResult; }
```

```ts
// lib/engine/mock.ts: simplified rules, matching PLAN.md §4 for the cases the site shows
// - long-term if sale date > acquired + 12 months
// - wash sale if loss AND rebuy within ±30 days; disallowed = |loss| * min(rebuyQty, qty) / qty
// - taxable rebuy: basis += disallowed, holding start moves earlier by days held
// - IRA rebuy: permanent = true, no basis adjustment
// - estTax = realized * (st or lt rate), defaults st 0.24 / lt 0.15; losses show a negative tax impact (a deduction)
```

```ts
// lib/engine/index.ts
export const engine: Engine = mockEngine; // swap to wasmEngine later
```

Unit-test the mock with PLAN.md fixtures F1, F2, F3, F4, F6, F8 (Vitest).

Demo data for the site lives in `lib/demo/` (accounts, trades, prices) and must produce the exact numbers in the copy above (e.g. the $1,840 disallowed loss in the hero). Add a test that asserts those headline numbers so copy and data never drift apart.

---

## 7. File structure

```
apps/web/            (or repo root if the website ships first)
  app/
    layout.tsx                 # fonts (Newsreader, Geist Sans, Geist Mono), Lenis provider, tokens
    globals.css                # tokens from §2 + ledger ruling background + base styles
    page.tsx                   # landing: composes sections
    learn/page.tsx
    learn/[slug]/page.tsx
    demo/page.tsx
    opengraph-image.tsx
  components/
    nav/Nav.tsx
    ledger/LedgerRules.tsx     # ruled background + margin rule
    ledger/PriceLineDraw.tsx   # self-drawing emerald price line with lot bars + hatched window
    ledger/LedgerPage.tsx      # dark ruled card used in convergence/agents
    receipt/Receipt.tsx        # paper, perforated edges, dotted leaders, print animation
    receipt/Stamp.tsx
    receipt/Coupon.tsx
    ticket/TradeTicket.tsx     # dark control panel with the print slot
    tape/FindingsTape.tsx
    annotate/{HandCircle,HandUnderline,HandArrow}.tsx   # hand-drawn SVG paths, draw-on animation
    effects/useInViewLoop.ts   # IntersectionObserver + visibility + reduced-motion gate
    ui/{Button,Badge,Chip,Toggle,Slider,Segmented}.tsx
    viz/{MoneyTween,LotBar,WashWindow,TaxBar,FlyingChip,Ring,Hatch}.tsx
    sections/{Hero,Showcase,FindingsTape,Convergence,Bento,Private,Agents,LearnTeaser,FinalCta,Footer}.tsx
    explainers/{WashSaleExplainer,...}.tsx
  content/learn/*.mdx
  lib/engine/{types,mock,index}.ts
  lib/demo/{accounts,trades,prices}.ts
  lib/motion.ts                # easings, durations, spring presets from §2.5
  public/annotations/*.svg     # your hand-drawn marks
  tests/ (vitest) + e2e/ (playwright)
```

---

## 8. Prompts for Claude Code (run in order, one per session)

Before each prompt: `/clear`, then Shift+Tab into plan mode, paste, review the plan, approve. Every prompt ends with the same review loop, so Claude checks its own work visually.

**Standard review loop (included in every prompt below as "RUN THE REVIEW LOOP"):**
> Start the dev server. Use Playwright to screenshot the section at 1440px and 390px wide, in normal and reduced-motion mode. Critique the screenshots against DESIGN.md: spacing rhythm, alignment to the 12-column grid and the ledger rows, type hierarchy (serif headlines, mono numbers), contrast, use of accent (only one saturated emerald moment), and anything that looks generic, templated or like a developer-tool landing page. List the problems, fix the top five, re-screenshot, and show me before/after. Also record a performance trace while scrolling the section and confirm no long tasks over 50ms and no layout shift.

### Prompt 0: Scaffold + design system

```text
Read WEBSITE_PLAN.md fully. Create DESIGN.md containing §2 exactly. Create or update CLAUDE.md
with: "Before any UI work, read DESIGN.md and follow it strictly. Website spec: WEBSITE_PLAN.md."

Scaffold a Next.js App Router + TypeScript + Tailwind v4 project per §7. Load Newsreader
(variable, with optical sizing and italics), Geist Sans and Geist Mono via next/font. Put every
token from §2 in globals.css as CSS variables and expose them to Tailwind via @theme. Implement
the ledger ruling background (horizontal rules every --ledger-row, double left margin rule) as
a reusable LedgerRules component. Add Motion (motion/react) and Lenis (disabled under
prefers-reduced-motion). Create lib/motion.ts with the easings, durations and spring presets
from §2.5. Build the ui primitives (Button, Badge, Chip, Toggle, Slider, Segmented), the Hatch
component, and a /dev/kitchen-sink page showing all of them in every state on both ink and
paper backgrounds. Build lib/engine and lib/demo per §6 with Vitest tests, including tests that
assert the headline numbers used in the copy ($1,840, Nov 3, etc.).

RUN THE REVIEW LOOP on /dev/kitchen-sink.
```

### Prompt 1: Nav + hero + living ledger

```text
Read DESIGN.md and WEBSITE_PLAN.md §2.6.1, §2.6.6 and §4.0–4.1. Build the Nav and the Hero
(serif headline with italic "before", lead, CTAs, trust line, entrance choreography). Build
PriceLineDraw: an SVG emerald price line that draws itself across the ledger rows with
stroke-dashoffset and ink easing (~1.6s), small LotBars fading in along it, and an amber
hatched WashWindow settling around one dip; afterward the line drifts very slowly (one screen
width per ~60s) using a transform, paused offscreen and when the tab is hidden; under reduced
motion render the final state. Build HandUnderline for the "How it works" link hover using an
SVG path that draws on (use a placeholder path for now; I'll replace it with my own drawing).
Keep the hero composition on the 12-column grid exactly as specified.

RUN THE REVIEW LOOP on the hero.
```

### Prompt 2: Trade ticket + receipt

```text
Read DESIGN.md and WEBSITE_PLAN.md §2.6.2–2.6.4 and §4.2. Build TradeTicket (dark panel,
segmented account control, position row, "Shares to sell" slider, "Buy back next week" toggle,
print slot) and Receipt (paper card with CSS-mask zigzag perforated top and bottom edges, mono
line items with dotted leaders, double rule above totals, thin-bar barcode, -1.5° resting
rotation that straightens on hover/focus with the paper spring). Implement the print animation
(slides up out of the slot in 3 quick steps, then lines type in 40ms apart), the Stamp (thunk
in: scale 1.35→1, opacity, 120ms, 2px settle) and Coupons (dashed border, notched edge, slide
out from under the receipt, staggered). Wire everything to lib/engine and lib/demo exactly as
specified, including the one-time slider teaser, tweening values, the re-print on account or
toggle change, and the extra rebuy line. Full keyboard support; live region announcing the
receipt totals and any stamp.

RUN THE REVIEW LOOP on the showcase, including a phone screenshot mid-interaction.
```

### Prompt 3: Findings tape + convergence

```text
Read DESIGN.md and WEBSITE_PLAN.md §4.3–4.4. Build the FindingsTape (pauses on hover/touch,
static wrap under reduced motion). Then the Convergence section: a ~300vh section with a sticky
stage driven by Motion useScroll/useTransform through the four steps exactly as written (three
ruled LedgerPages → merge into one chronological ledger with layout animation → amber hatched
61-day window draws outward and a FlyingChip travels to the replacement purchase → WASH SALE
stamp lands and the badge morphs to "1 wash sale · $1,840 disallowed"). Use demo data so the
ledger is real. Under reduced motion and on screens < 720px tall, render the Segmented
"Broker view / IRS view" fallback. Use motion values so scrolling never re-renders React.

RUN THE REVIEW LOOP, with screenshots at 0%, 30%, 70% and 100% of the section's scroll.
```

### Prompt 4: Bento + "Runs in your browser"

```text
Read DESIGN.md and WEBSITE_PLAN.md §4.5–4.6. Build the features bento (wide first card on
desktop, stacked on mobile) with the four small looping visuals from real viz components (no
video): auto-scrubbing mini ticket with tweening tax, lot squares flipping red→emerald with a
saved counter, violet countdown ring, SPY vs XSP bars restacking into 60/40. Visuals animate
only while in view and speed up 1.5× on hover. Cards are dark with ruled backgrounds; headings
in serif. Then build the "Your trades never leave your browser" section as specified.

RUN THE REVIEW LOOP on both sections.
```

### Prompt 5: Agents transcript + learn teaser + final CTA + footer

```text
Read DESIGN.md and WEBSITE_PLAN.md §4.7–4.10. Build the Agents section: a dark ruled
LedgerPage with the chat transcript replaying via typewriter (starting at 40% in view, replay
link at the end, full transcript immediately under reduced motion) and the tool call rendered
as a mini paper receipt that prints inline. No terminal or window chrome. Then the Learn
teaser cards (horizontal snap-scroll on mobile), the final CTA band with fine emerald hatching
and a HandCircle drawing around "isn't", and the footer. Wire nav links to section anchors
with Lenis smooth scrolling.

RUN THE REVIEW LOOP on the full landing page top to bottom, then one more pass purely on
vertical rhythm between sections.
```

### Prompt 6: Learn template + flagship explainer

```text
Read DESIGN.md and WEBSITE_PLAN.md §5. Set up MDX for content/learn. Build the /learn/[slug]
template (680px editorial column, full-width interactives, breadcrumb, reading time, prev/next,
"Try this on the demo portfolio" link) and the /learn index (numbered cards with static
previews). Then build WashSaleExplainer exactly as specified: draggable buy-back marker on a
calendar, 61-day amber hatched window, chip that flies between the "Deductible" bucket and the
new lot, tweening readouts (loss, disallowed, adjusted basis, holding start), keyboard control
(arrow = 1 day, Shift+arrow = 1 week), and a screen-reader live region summarizing the state.
All numbers from lib/engine. Write the MDX prose for the-wash-sale: friendly, precise, short
paragraphs, under 600 words, ending with the "Estimates only, not tax advice" note.

RUN THE REVIEW LOOP on the explainer with the marker inside and outside the window.
```

### Prompt 7: Remaining explainers

```text
Read DESIGN.md and WEBSITE_PLAN.md §5. Build the remaining six explainers one at a time, reusing
viz components and the Convergence components where noted. For each: MDX prose under 500 words,
one hero interactive, keyboard support, live-region summary, numbers from lib/engine. Commit
after each explainer. RUN THE REVIEW LOOP after each one.
```

### Prompt 8: Polish, performance, SEO, deploy

```text
Final pass using DESIGN.md as the checklist:
- Micro-interactions: every hover/press/focus state eased (160ms, --ease-ui); designed focus rings
  on both ink and paper.
- A very subtle paper-fiber texture on receipts and coupons only (static PNG, ~4% opacity).
- Replace placeholder hand-drawn SVGs with the files in public/annotations/ (I'll provide them).
- Metadata, sitemap, robots, and an OG image (app/opengraph-image.tsx): the serif headline on
  ink with a printed receipt and WASH SALE stamp.
- 404 page in the same style ("This page isn't in the ledger.").
- Lighthouse ≥ 90 in all categories on / and /learn/the-wash-sale; zero CLS.
- Playwright e2e: receipt prints and stamp appears, convergence fallback toggle works,
  explainer keyboard control works. Axe check with no serious violations.
- Test in Chrome, Safari and Firefox at 390px, 768px, 1440px.
Then RUN THE REVIEW LOOP on the whole site and list anything still not great.
```

---

## 9. "Is it smooth?" checklist (check yourself before shipping)

- [ ] Scrolling the whole page on a real phone never stutters.
- [ ] Nothing jumps: no number, no layout, no font swap.
- [ ] Every hover and press is eased; nothing snaps.
- [ ] Only one fully saturated emerald element visible per screen.
- [ ] The hero communicates the whole idea in five seconds without scrolling.
- [ ] The receipt feels like paper and the price line feels like ink.
- [ ] Reduced-motion mode still looks designed, not broken.
- [ ] Animations stop when scrolled away (check CPU in the performance panel).
- [ ] Every number in the copy matches the demo data (tests enforce this).
- [ ] Nobody could mistake it for a template or for another product's site.

---

## 10. Deploy

Connect the GitHub repo to Vercel (framework preset: Next.js). Every push gets a preview URL; `main` deploys production. Add a custom domain later if you want (e.g. `lotwise.dev` if available).

*Estimates only, not tax advice.*

