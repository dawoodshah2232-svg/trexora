# RULES.md — Trexora

## Stack rules
- Production backend (when built): MySQL + PHP only (cPanel hosting rule). No Supabase/Postgres backends.
- Front-end: static HTML/JS/CSS, no framework; charts = bundled Lightweight Charts v5 only (never CDN).
- Before ANY work: `git fetch origin` + pull latest `main` (verify default branch first). Never force-push. Never `git reset --hard`.

## AI must
- Inspect before editing (`git status`, `git diff`, recent log); keep old working code intact on merges.
- After editing: open and verify the page yourself before handing a URL (visual checks), `git diff --check`; cache-bust app assets on every release (`?v=YYYYMMDDx` on CSS/JS — a past stale-cache incident broke the terminal on the owner's phone).
- REAL data only: never present simulated prices as live; Deriv public WS is the live truth; any data staleness gets an honest badge (LIVE/STALE/etc.).
- Errors must surface the real underlying issue — never a generic "Server Error" red box; empty results get friendly designed messages.
- Admin path stays secret (not linked publicly); keep it operable — every admin function must work.

## AI must NOT
- Use Roboto/Titillium/Montserrat/Open Sans as primary fonts; emojis in UI; non-Heroicon iconography (icons = Heroicons inline SVG only; recent mobile-nav pass replaced emojis with professional SVG).
- Put the Trexora logo on cards/boxes/backgrounds — logo used raw.
- Touch the apex `pdfedit.website` deployment (Vercel) — only the `trexora.` CNAME target is in scope.
- Auto-deploy backend code: backend batches are pushed to GitHub but stay OFF live until the owner approves a manual deploy (standing security rule).

## Conventions
- One HTML file per page at root; shared CSS in `styles.css`; shared state in `shared/store.js`.
- Pages must be mobile-first (320–430px), bottom-nav pattern: Home / Markets / Trade / Account.
- No secrets in the repo (no keys committed; Deriv feed is keyless by design).
