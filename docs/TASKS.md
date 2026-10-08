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

## SEO sweep — 20 fixes (applied 2026-10-08, commit pending)
- [x] Audit baseline first (63 issues), applied fixes, re-audited to **0 issues**.
- [x] Schema: Organization+WebSite+BreadcrumbList on home; WebPage+BreadcrumbList on all pages; FAQPage (8 real Q&As) on faq.html.
- [x] Headings: footer h4→h3, blog/support card h3→h2; 404 got "Popular destinations" h2 + quick links.
- [x] Images: hero-devices.png (384KB)→hero-devices.webp (39KB); hero-skyline/steps-lifestyle/cta-attract recompressed (~60% smaller); removed unused hero-laptop.png + mkt-phone.png; width/height on all content imgs (CLS), fetchpriority=high on hero (LCP).
- [x] Cache-bust `?v=20261008` on every local CSS/JS (also added where missing: app/login, app/signup, legal/*).
- [x] 404: OG + canonical + noindex kept (legit for 404).
- [x] A11y: skip-to-content link + `id="main"` on all public pages; tap targets >=44px (buttons, nav, drawer, footer links).
- [x] No fake reviews/ratings, no keyword stuffing, no invented content — all schema/descriptions from real page copy.

### TODO — owner-side (Dawood)
1. [ ] **Google Search Console**: verify trexora.pdfedit.website in GSC (HTML file or DNS TXT — his call), then submit sitemap (already referenced in robots.txt: `https://trexora.pdfedit.website/sitemap.xml`).
2. [ ] **Backlink strategy (earn via content only — never buy or spam links):** publish the SEO blog articles regularly (blog.html is the hub); share trading-education pieces in his trading community/Telegram; get listed on event/partner pages (ProFX Media expo sites can link the platform); each quality earned link > dozens of bought ones. Never use link farms, PBNs, or paid guest-post schemes.

### TODO — agent-side
- [ ] Re-run the audit script after any new page is added (keep `docs/` contract).
