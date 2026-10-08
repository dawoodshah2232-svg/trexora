# PRD.md — Trexora

## Product goal
Trexora is a binary-options trading platform: pick an asset, set an expiry, take a position in seconds. Public marketing site + trading terminal + full admin portal. Deploy target for production: `trexora.pdfedit.website` (CNAME is set; apex `pdfedit.website` runs the live PDFEdit app on Vercel and must stay untouched).

Brand: "Trexora". Formal trademark clearance is still required — TODO before any legal/regulatory commitments.

## Users
- Retail traders (demo + real accounts; demo needs no deposit).
- Platform admins (secret admin path, full operational portal).

## Features (as implemented in this repo)
- Marketing pages: home, platform, markets, demo, signals, indicators, tournaments, mobile-app, payments, promotions, affiliate, about, blog, faq, support, legal (terms, privacy, risk-disclosure, aml-kyc).
- Trading terminal (`app/terminal.html` + `app/app.js`): real price feed via Deriv public WebSocket (`derivws.com/trading/v1/options/ws/public`), bundled Lightweight Charts (`app/vendor/lightweight-charts.standalone.production.js`), live/home tickers (`home-live.js`).
- Admin portal (`admin/`): dashboard, trades, users, payments, requests, risk management (payout/margin per asset, platform limits, honest house-edge explainer), integrations, settings, assets, media.
- Client-side state via `shared/store.js` (localStorage-backed demo state; production backend later).
- SEO: sitemap.xml, robots.txt, OG/Twitter tags, themed 404, compressed images, 60-char titles.
- Mobile-first with bottom nav (professional SVG icons, no emojis); signup honeypot.

## Standards (owner, standing)
- REAL chart data only — never simulated prices; honest data states.
- Nothing broken, every admin function operable.
- User-facing errors must show the real underlying issue (never a generic "Server Error" red box); empty results get friendly designed messages.

## TODO / unknowns
- Formal trademark clearance for "Trexora".
- Production backend = PHP + MySQL (later); cPanel SSL "not secure" fix for client demo.
- Owner to confirm LIVE badge rendering on his phone.
