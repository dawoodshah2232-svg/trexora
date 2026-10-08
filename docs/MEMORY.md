# MEMORY.md — Trexora (progress log)

## Done
- 2026-09-29: v1 public site live at https://dawoodshah2232-svg.github.io/trexora/ (static, GitHub Pages); repo dawoodshah2232-svg/trexora (public, main).
- 2026-09-29: Cache-bust incident resolved: owner's phone loaded stale app.js/app.css — `?v=` query params on all app assets on every release since.
- 2026-10-0x: Admin portal completed: dashboard, trades, users, payments, requests, risk management (payout/margin per asset, platform limits, honest house-edge explainer), integrations, settings, assets.
- 2026-10-0x: SEO/compliance pass (og-image.jpg, social tags on all pages, robots sitemap URL, themed 404, image compression, signup honeypot); mobile nav emoji→SVG icons.
- 2026-10-08: AI context files added (`docs/` six-file set).

## In progress
- Deploy target `trexora.pdfedit.website` (CNAME in repo) — DNS/Pages verification pending.
- Owner's phone check of LIVE badge — pending his confirmation.

## Next
- SSL fix + PHP/MySQL backend v1 (manual deploy per standing security rule).
- Trademark clearance for "Trexora".

## 2026-10-08 — 20-fix SEO sweep applied (verified)
- Baseline audit: 63 issues across 20 public pages (no schema anywhere, h2→h4 heading jumps, missing ?v= on app/login+signup and legal/*, uncompressed 300-400KB hero images, no skip links, sub-44px tap targets).
- Fixes: JSON-LD everywhere (Org/WebSite/BreadcrumbList home; WebPage+BreadcrumbList elsewhere; FAQPage 8 Q&As), heading hierarchy clean, hero-devices.png→webp (384KB→39KB), ~60% image weight cut, ?v=20261008 global, skip links, 44px tap targets, 404 improved (OG/canonical/h2 quick links, noindex kept).
- Re-audit: **0 issues**. JSON-LD validated (unique @ids, breadcrumb positions, https URLs).
- Standing: audit script pattern — baseline audit first, fix, re-audit to zero before claiming. /tmp scripts are SHARED and ephemeral (another agent overwrote mine mid-run) — use unique filenames.
- Owner TODOs in TASKS.md: GSC verification + sitemap submit (his UI action); backlink strategy = earn via content only.
