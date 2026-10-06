# DESIGN.md — Lotwise

> Source of truth for all UI work. Copied verbatim from WEBSITE_PLAN.md §2.

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
