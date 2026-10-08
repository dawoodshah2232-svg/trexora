# DESIGN.md — Trexora

## Brand
- "Trexora" binary-options platform. Dark premium trading-terminal aesthetic (deep navy blacks: `#070D1B`, `#0A1322`, `#0C1E42` family).
- Brand blue: `--brand:#1B63D6` / `#2F80FF` with deep `--brand-deep:#1A5FD0` and soft `rgba(27,99,214,.10)` variants (defined in `styles.css` `:root`).
- Logo used raw everywhere — NEVER on a card, box, or background.

## Typography
- Apple font stack (`--font` in `styles.css`, used by all UI text including buttons):
  `-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif`.
- Tabular numerals for prices/tickers. Never Roboto/Titillium/Montserrat/Open Sans as primary.

## Components
- Buttons: `.btn-trade` (trade actions), pill buttons (`.exp-pill`), gradient CTAs on brand blue; press feedback on tap (apple-design motion: scale on pointer-down, interruptible, critically-damped springs; house easing `cubic-bezier(.22,1,.36,1)` for marketing pages via web-animations).
- Cards on surface dark with subtle borders; no flat banner heroes — faded cinematic hero imagery that blends into the page background.
- Bottom mobile nav with professional SVG icons (Heroicons-style); no emojis anywhere in UI.
- Chart: Lightweight Charts with dark terminal theme; honest data-state badges (LIVE/STALE).

## Motion
- Load `~/workspace/skills/apple-design/` + `~/workspace/skills/web-animations/` for every UI build/restyle. Kill latency (respond on pointer-down), 1:1 direct manipulation feel, transform/opacity-only animations, `prefers-reduced-motion` respected.

## Consistency
- Same label = same color; numbers reconcile across pages; risk text lives in the footer only (owner decision); honest house-edge explainer on the admin risk page.
