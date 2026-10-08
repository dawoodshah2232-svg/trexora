# ARCHITECTURE.md — Trexora

## Stack
- Static site (no build step): plain HTML + vanilla JS + vanilla CSS. Hosted on GitHub Pages at `https://dawoodshah2232-svg.github.io/trexora/`; CNAME `trexora.pdfedit.website`.
- Charting: bundled Lightweight Charts v5 (`app/vendor/lightweight-charts.standalone.production.js`) — never CDN.
- Live prices: Deriv public WebSocket, no key, no app_id (`wss://derivws.com/trading/v1/options/ws/public`) — `app/feed-deriv.js` is the single live price truth for the terminal.

## Top-level folders/files
| Path | Purpose |
|---|---|
| `index.html`, `platform.html`, `markets.html`, `demo.html`, … | Marketing pages (root level; one HTML file per page) |
| `app/` | Trading terminal: `terminal.html`, `app.js`, `app.css`, `feed-deriv.js`, `login.html`, `signup.html`, `vendor/` |
| `admin/` | Admin portal: `index.html`, `dashboard.html`, `trades.html`, `users.html`, `payments.html`, `requests.html`, `risk.html`, `integrations.html`, `settings.html`, `assets.html` + `admin.css`, `admin.js` |
| `shared/store.js` | Client-side data store (localStorage-backed demo state) |
| `styles.css` | Global marketing-site stylesheet (theme tokens, buttons, nav, bottom nav) |
| `assets/` | Images incl. real event/photos, hero images |
| `tools/sitegen.py` | Site generation helper |
| `legal/` | terms, privacy, risk-disclosure, aml-kyc |
| `sitemap.xml`, `robots.txt`, `404.html`, `CNAME` | Pages hosting plumbing |

## Data flow
1. `app/feed-deriv.js` opens the Deriv public WS and publishes ticks.
2. Terminal (`app/app.js`) consumes ticks, renders via bundled Lightweight Charts; honest LIVE/STALE badges.
3. Demo state (positions, balance, settings) lives in `shared/store.js` (localStorage); signup/login are front-end flows.
4. Admin portal reads/writes the same client store for the demo; risk page exposes payout/margin per asset and platform limits.
5. Production PHP + MySQL backend comes later — the front-end must keep working with static fallbacks until then.

## Deployment
- Push to `main` → GitHub Pages rebuild (~minutes). Never stack pushes while a build is running: poll `gh api repos/dawoodshah2232-svg/trexora/pages/builds` until status `built`.
