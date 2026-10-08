# TASKS.md — Trexora

Sequenced, small. Status as of 2026-10-08 (from repo state + git log).

## Done (verified in repo)
- [x] Public site live on GitHub Pages (marketing pages: platform, markets, demo, signals, indicators, tournaments, mobile-app, payments, promotions, affiliate, about, blog, faq, support).
- [x] Trading terminal with Deriv public WebSocket live feed + bundled Lightweight Charts; cache-bust discipline (`?v=`) after the stale-cache incident.
- [x] Full admin portal (dashboard, trades, users, payments, requests, risk management with payout/margin per asset + platform limits + house-edge explainer, integrations, settings, assets).
- [x] SEO pass: 60-char homepage title, OG/Twitter tags on all pages, sitemap.xml, robots.txt, themed 404, compressed images, signup honeypot.
- [x] Mobile nav: SVG icons (emojis removed); Help moved into More menu; bottom-nav pattern.

## In progress
- [ ] Deploy target `trexora.pdfedit.website` (CNAME set in repo) — verify DNS resolves and Pages serves it.
- [ ] Owner confirms LIVE badge renders correctly on his phone — awaiting his check.

## Next (sequenced)
1. [ ] SSL "not secure" fix on the production target for client demos — TODO (needs hosting access).
2. [ ] PHP + MySQL production backend (v1) — TODO; front-end keeps static fallbacks until then.
3. [ ] Formal trademark clearance for "Trexora" — TODO.
4. [ ] Client demo dry-run: every admin function operable end-to-end — TODO before any demo he fears.

## Standing blockers (owner-side)
- Hosting/cPanel access for production deploy + SSL fix; trademark counsel for clearance.
