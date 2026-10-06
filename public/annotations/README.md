Drop the hand-drawn, vectorized marks here, then run `npm run annotations` (it also runs before every build):

- `underline.svg` — the "How it works ↓" / link underline
- `circle.svg` — the loop around "isn't" in the final CTA (roughly 5:3)
- `stamp.svg` — the rubber-stamp border (roughly 200:56)

Each file needs a `viewBox` and the mark as `<path d="…">` (strokes and shapes converted to paths, transforms flattened).
