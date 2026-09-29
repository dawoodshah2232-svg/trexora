#!/usr/bin/env python3
"""Trexora static site generator — builds inner pages with one canonical header/footer.
Usage: python3 tools/sitegen.py
Also rewrites the header/footer inside index.html between <!--HEADER-->/<!--FOOTER--> markers
so every page shares the same navigation.
"""
import os, re, html

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://trexora.pdfedit.website"

NAV_MAIN = [
    ("Platform", "platform.html"),
    ("Markets", "markets.html"),
    ("Tournaments", "tournaments.html"),
    ("Affiliate", "affiliate.html"),
    ("FAQ", "faq.html"),
]
NAV_MORE = [
    ("Signals", "signals.html"),
    ("Indicators", "indicators.html"),
    ("Demo account", "demo.html"),
    ("Promotions", "promotions.html"),
    ("Payments", "payments.html"),
    ("Mobile app", "mobile-app.html"),
    ("Blog", "blog.html"),
    ("About", "about.html"),
    ("Support", "support.html"),
]
FOOTER_COLS = [
    ("Trading", [("Platform", "platform.html"), ("Markets", "markets.html"),
                 ("Signals", "signals.html"), ("Indicators", "indicators.html"),
                 ("Demo account", "demo.html")]),
    ("Programs", [("Affiliate", "affiliate.html"), ("Tournaments", "tournaments.html"),
                  ("Promotions", "promotions.html"), ("Payments", "payments.html"),
                  ("Mobile app", "mobile-app.html")]),
    ("Company", [("About", "about.html"), ("Blog", "blog.html"),
                 ("FAQ", "faq.html"), ("Support", "support.html")]),
    ("Legal", [("Terms of service", "legal/terms.html"), ("Privacy policy", "legal/privacy.html"),
               ("Risk disclosure", "legal/risk-disclosure.html"), ("AML & KYC", "legal/aml-kyc.html")]),
]

def header(p):
    main = "\n".join(f'      <a href="{p}{href}">{label}</a>' for label, href in NAV_MAIN)
    more = "\n".join(f'      <a href="{p}{href}">{label}</a>' for label, href in NAV_MORE)
    return f'''<header class="site-header" id="top">
  <div class="header-inner">
    <a class="brand" href="{p}index.html" aria-label="Trexora home">
      <img class="logo logo-dark" src="{p}assets/logo-dark.svg" alt="Trexora" width="132" height="37">
      <img class="logo logo-light" src="{p}assets/logo-light.svg" alt="Trexora" width="132" height="37">
    </a>
    <nav class="main-nav" id="mainNav" aria-label="Primary">
{main}
      <span class="drawer-label" aria-hidden="true">More</span>
      <span class="drawer-more">
{more}
      </span>
      <span class="drawer-label" aria-hidden="true">Account</span>
      <span class="drawer-more drawer-account">
        <a href="{p}app/login.html">Log in</a>
        <a href="{p}app/signup.html">Sign up</a>
      </span>
    </nav>
    <div class="header-actions">
      <button class="theme-toggle" id="themeToggle" aria-label="Toggle theme"><span class="sun">☀</span><span class="moon">☾</span></button>
      <a class="btn btn-ghost btn-sm header-login" href="{p}app/login.html">Log in</a>
      <a class="btn btn-primary btn-sm" href="{p}app/signup.html">Sign up</a>
      <button class="nav-toggle" id="navToggle" aria-label="Open menu" aria-expanded="false">
        <span></span><span></span><span></span>
      </button>
    </div>
  </div>
</header>'''

def footer(p):
    cols = []
    for title, links in FOOTER_COLS:
        items = "\n".join(f'        <a href="{p}{href}">{label}</a>' for label, href in links)
        cols.append(f'''      <nav aria-label="{title}">
        <h4>{title}</h4>
{items}
      </nav>''')
    cols_html = "\n".join(cols)
    return f'''<footer class="site-footer">
  <div class="wrap">
    <div class="footer-grid">
      <div class="footer-brand">
        <img class="logo logo-dark" src="{p}assets/logo-dark.svg" alt="Trexora" width="120" height="34">
        <img class="logo logo-light" src="{p}assets/logo-light.svg" alt="Trexora" width="120" height="34">
        <p>A modern binary options trading platform. Practice on a free demo with virtual funds.</p>
      </div>
{cols_html}
    </div>
    <div class="footer-risk">
      <p><strong>Risk disclosure:</strong> Trading binary options carries a high level of risk and may not be suitable for all investors. You may lose some or all of your invested capital. Most retail traders lose money. Nothing on this site is financial advice. Trexora services may be restricted in certain jurisdictions — check local regulations before trading.</p>
    </div>
    <div class="footer-bottom">
      <p>© 2026 Trexora. All rights reserved. · Demo environment: all balances and trades are virtual.</p>
    </div>
  </div>
</footer>'''

PAGE_CSS = '''
/* ---- inner pages ---- */
.page-hero{padding:64px 0 36px;text-align:center}
.page-hero .eyebrow{display:inline-block;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);margin-bottom:12px}
.page-hero h1{font-size:clamp(30px,5vw,46px);letter-spacing:-.02em;margin:0 0 12px}
.page-hero p.lede{color:var(--muted);max-width:640px;margin:0 auto 22px;font-size:17px}
.crumbs{font-size:13px;color:var(--muted);margin-bottom:14px}
.crumbs a{color:var(--muted);text-decoration:none}
.page-section{padding:28px 0}
.page-section h2{font-size:clamp(22px,3.4vw,30px);letter-spacing:-.01em;margin:0 0 10px}
.page-section .sub{color:var(--muted);max-width:680px;margin:0 0 24px}
.doc{max-width:780px;margin:0 auto}
.doc h2{font-size:20px;margin:30px 0 8px}
.doc p,.doc li{color:var(--text);font-size:15px;line-height:1.75}
.doc p{margin:0 0 12px}
.doc ul{margin:0 0 14px;padding-left:22px}
.doc .updated{color:var(--muted);font-size:13px}
.table-wrap{overflow-x:auto;border:1px solid var(--border);border-radius:14px;background:var(--card)}
table.data{width:100%;border-collapse:collapse;font-size:14px;min-width:560px}
table.data th,table.data td{padding:12px 14px;text-align:left;border-bottom:1px solid var(--border)}
table.data th{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);background:color-mix(in srgb,var(--card) 70%,transparent)}
table.data tr:last-child td{border-bottom:0}
.page-cta{margin:44px 0 8px;padding:44px 28px;border-radius:22px;text-align:center;background:linear-gradient(135deg,#2A0E14,#160A0D);border:1px solid var(--border)}
.page-cta h2{color:#fff;margin:0 0 8px}
.page-cta p{color:#E9C9C9;max-width:520px;margin:0 auto 20px}
.drawer-label,.drawer-more{display:none}
@media(max-width:767px){
  .drawer-label{display:block;width:100%;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);padding:14px 4px 4px}
  .drawer-more{display:flex;flex-direction:column;width:100%}
}
.check-list{list-style:none;margin:0 0 18px;padding:0}
.check-list li{padding:10px 0 10px 34px;position:relative;border-bottom:1px solid var(--border);font-size:15px}
.check-list li:last-child{border-bottom:0}
.check-list li::before{content:"✓";position:absolute;left:4px;top:10px;color:var(--accent);font-weight:800}
.blog-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
@media(max-width:767px){.blog-grid{grid-template-columns:1fr}}
.blog-card{display:block;border:1px solid var(--border);border-radius:16px;overflow:hidden;background:var(--card);text-decoration:none;color:var(--text)}
.blog-card .art{height:150px;background:linear-gradient(135deg,#3A141C,#160A0D);display:flex;align-items:center;justify-content:center;font-size:40px}
.blog-card .body{padding:18px}
.blog-card h3{margin:0 0 8px;font-size:17px}
.blog-card p{margin:0;color:var(--muted);font-size:14px}
.blog-card .tag{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--accent)}
.faq-full{max-width:780px;margin:0 auto}
'''

def page(title, desc, slug, body, p=""):
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{html.escape(title)} — Trexora</title>
<meta name="description" content="{html.escape(desc)}">
<link rel="canonical" href="{SITE}/{slug}">
<link rel="icon" type="image/svg+xml" href="{p}assets/favicon.svg">
<link rel="stylesheet" href="{p}styles.css">
</head>
<body>
{header(p)}
<main>
{body}
</main>
{footer(p)}
<script src="{p}app.js"></script>
</body>
</html>
'''

def hero(eyebrow, h1, lede, cta1=None, cta2=None):
    btns = ""
    if cta1: btns += f'<a class="btn btn-primary" href="{cta1[1]}">{cta1[0]}</a> '
    if cta2: btns += f'<a class="btn btn-outline" href="{cta2[1]}">{cta2[0]}</a>'
    return f'''<section class="page-hero"><div class="wrap">
<div class="eyebrow">{eyebrow}</div>
<h1>{h1}</h1>
<p class="lede">{lede}</p>
<div class="btn-row">{btns}</div>
</div></section>'''

def cta_band(h, p_text, btn, href):
    return f'''<section class="page-section"><div class="wrap"><div class="page-cta">
<h2>{h}</h2><p>{p_text}</p><a class="btn btn-primary" href="{btn and href}">{btn}</a>
</div></div></section>'''

PAGES = []
def add(slug, title, desc, body):
    PAGES.append((slug, title, desc, body))

# ============ ABOUT ============
add("about.html", "About Trexora", "Trexora is a modern binary options trading platform with a free demo, real charts and a mobile-first terminal.",
hero("About us", "Built for traders who want clarity", "Trexora is a binary options trading platform designed around one idea: trading should be simple to understand, fast to execute, and honest about risk. Every account starts with a free demo — virtual funds, real charts, zero pressure.", ("Open free demo", "demo.html"), ("See the platform", "platform.html")) + '''
<section class="page-section"><div class="wrap">
<h2>What Trexora is</h2>
<p class="sub">A complete trading environment for short-term binary options: pick an asset, choose an expiry, call the direction. If your forecast is right at expiry, you earn the stated payout. If not, you lose the stake — never more.</p>
<div class="feat-grid">
<div class="feat-card"><div class="feat-ic">◈</div><h3>Real charts</h3><p>Professional TradingView charts with live market data, indicators and drawing tools — the same quality desks use.</p></div>
<div class="feat-card"><div class="feat-ic">◎</div><h3>Honest payouts</h3><p>Payout percentages are shown before you trade. No hidden spreads, no surprise fees.</p></div>
<div class="feat-card"><div class="feat-ic">⬢</div><h3>Demo-first</h3><p>Every account opens with $10,000 in virtual funds. Learn the platform before risking anything.</p></div>
<div class="feat-card"><div class="feat-ic">⬣</div><h3>Mobile-native</h3><p>The full terminal runs in your phone browser — no download needed to start.</p></div>
</div></div></section>
<section class="page-section"><div class="wrap">
<h2>How binary options work here</h2>
<p class="sub">Three steps, settled automatically at expiry.</p>
<div class="steps-grid">
<div class="step"><span class="step-n">1</span><h3>Pick an asset &amp; expiry</h3><p>Choose from forex, crypto, gold and more, with expiries from 1 minute up.</p></div>
<div class="step"><span class="step-n">2</span><h3>Call Higher or Lower</h3><p>Forecast whether the price will be above or below the entry price at expiry.</p></div>
<div class="step"><span class="step-n">3</span><h3>Collect the payout</h3><p>Correct forecasts earn up to 95% on the stake, credited instantly. Wrong ones lose the stake only.</p></div>
</div></div></section>
''' + cta_band("Try it free — no card required", "Open a demo account in under a minute and place your first virtual trade.", "Start demo trading", "demo.html"))

# ============ PLATFORM ============
add("platform.html", "Trading platform", "Tour the Trexora terminal: live TradingView charts, one-tap Higher/Lower trading, early close and full trade history.",
hero("The platform", "A terminal that keeps up with you", "Live charts, instant execution and your whole account in one screen — on desktop and on your phone. This is where demo trading happens.", ("Launch the terminal", "app/terminal.html"), ("How it works", "demo.html")) + '''
<section class="page-section"><div class="wrap">
<h2>Everything in one screen</h2>
<p class="sub">The terminal is built for speed: chart on the left, ticket on the right, positions underneath.</p>
<ul class="check-list">
<li><strong>Live TradingView charts</strong> — real market data with 100+ indicators and drawing tools.</li>
<li><strong>One-tap tickets</strong> — set amount and expiry, tap Higher or Lower. Done in two seconds.</li>
<li><strong>Live countdown</strong> — every open position ticks down to expiry in real time.</li>
<li><strong>Early close</strong> — exit a trade before expiry at the current offer price.</li>
<li><strong>Full history</strong> — every trade, entry, expiry and result, searchable and exportable.</li>
<li><strong>Risk controls</strong> — stake limits and session reminders keep demo trading disciplined.</li>
</ul></div></section>
<section class="page-section"><div class="wrap">
<h2>Trade types</h2>
<p class="sub">Start with the classic, grow into more.</p>
<div class="feat-grid">
<div class="feat-card"><h3>Higher / Lower</h3><p>Forecast whether price finishes above or below entry at expiry. The classic binary.</p></div>
<div class="feat-card"><h3>Turbo</h3><p>Ultra-short expiries from 1 minute for fast markets. <em>Demo only for now.</em></p></div>
<div class="feat-card"><h3>Coming soon</h3><p>Touch, range and ladder contracts are on the roadmap and will appear here first.</p></div>
</div></div></section>
''' + cta_band("See it in action", "The fastest way to understand the terminal is two minutes inside it.", "Open the terminal", "app/terminal.html"))

# ============ MARKETS ============
add("markets.html", "Markets", "Trade forex, crypto, gold, stocks and indices on Trexora — 410+ instruments with live charts and transparent payouts.",
hero("Markets", "410+ instruments. One ticket.", "Forex majors, crypto, gold, stocks and indices — every market with live TradingView charts and the payout shown before you commit.", ("Browse in terminal", "app/terminal.html"), ("Free demo", "demo.html")) + '''
<section class="page-section"><div class="wrap">
<div class="table-wrap"><table class="data">
<tr><th>Market</th><th>Examples</th><th>Typical payout</th><th>Hours</th></tr>
<tr><td><strong>Forex</strong></td><td>EUR/USD, GBP/USD, USD/JPY, AUD/USD…</td><td>up to 92%</td><td>24/5</td></tr>
<tr><td><strong>Crypto</strong></td><td>BTC, ETH, SOL, XRP…</td><td>up to 90%</td><td>24/7</td></tr>
<tr><td><strong>Gold &amp; metals</strong></td><td>XAU/USD, XAG/USD…</td><td>up to 91%</td><td>23/5</td></tr>
<tr><td><strong>Stocks</strong></td><td>AAPL, TSLA, NVDA…</td><td>up to 88%</td><td>Exchange hours</td></tr>
<tr><td><strong>Indices</strong></td><td>S&amp;P 500, NASDAQ, DAX…</td><td>up to 89%</td><td>Exchange hours</td></tr>
</table></div>
<p class="sub" style="margin-top:14px">Payouts vary by asset, volatility and expiry — the exact figure is always shown on the ticket before you trade. Demo environment.</p>
</div></section>
<section class="page-section"><div class="wrap">
<h2>Why traders pick these markets</h2>
<div class="feat-grid">
<div class="feat-card"><div class="feat-ic">$</div><h3>Forex</h3><p>Deep liquidity and round-the-clock movement. The most traded market on the platform.</p></div>
<div class="feat-card"><div class="feat-ic">₿</div><h3>Crypto</h3><p>Trades all weekend. Volatility creates opportunity — and risk. Size carefully.</p></div>
<div class="feat-card"><div class="feat-ic">Au</div><h3>Gold</h3><p>The classic safe-haven. Smooth trends that technical traders love.</p></div>
</div></div></section>
''' + cta_band("Pick your market", "Open the terminal and switch between all 410+ instruments instantly.", "Start trading", "app/terminal.html"))

# ============ SIGNALS ============
add("signals.html", "Trading signals", "Trexora signals highlight live market opportunities across forex, crypto and gold — free on demo.",
hero("Signals", "Opportunities, flagged in real time", "Signals scan momentum, volatility and key levels across covered markets and flag setups as they form — free with every demo account.", ("See signals", "app/terminal.html"), ("Try the demo", "demo.html")) + '''
<section class="page-section"><div class="wrap">
<h2>How signals work</h2>
<p class="sub">Each signal shows the asset, direction bias, suggested expiry and the reason it triggered.</p>
<div class="steps-grid">
<div class="step"><span class="step-n">1</span><h3>Scan</h3><p>Markets are monitored continuously for momentum shifts and level breaks.</p></div>
<div class="step"><span class="step-n">2</span><h3>Flag</h3><p>When conditions align, a signal is published with entry context and expiry guidance.</p></div>
<div class="step"><span class="step-n">3</span><h3>Decide</h3><p>You choose whether to act — signals are ideas, not instructions. Always manage risk.</p></div>
</div>
<p class="sub">Signals are educational market commentary, not financial advice. Past signal performance does not predict future results.</p>
</div></section>
''' + cta_band("Signals are free on demo", "Create a demo account and see today's signals inside the terminal.", "Get free signals", "demo.html"))

# ============ INDICATORS ============
add("indicators.html", "Indicators", "100+ technical indicators on Trexora charts — RSI, MACD, Bollinger Bands, moving averages and more.",
hero("Indicators", "Read the market like a pro", "Every Trexora chart ships with 100+ built-in indicators — overlays, oscillators and volume tools — free on demo.", ("Open charts", "app/terminal.html"), ("Learn the basics", "blog.html")) + '''
<section class="page-section"><div class="wrap">
<h2>Popular with our traders</h2>
<div class="feat-grid">
<div class="feat-card"><h3>RSI</h3><p>Relative Strength Index — spot overbought and oversold conditions before reversals.</p></div>
<div class="feat-card"><h3>MACD</h3><p>Momentum and trend shifts at a glance, tuned for short expiries.</p></div>
<div class="feat-card"><h3>Bollinger Bands</h3><p>Volatility envelopes that frame breakouts and squeezes.</p></div>
<div class="feat-card"><h3>Moving averages</h3><p>EMA/SMA ribbons for trend direction on any timeframe.</p></div>
<div class="feat-card"><h3>Stochastic</h3><p>Timing entries with momentum turns on fast charts.</p></div>
<div class="feat-card"><h3>ATR</h3><p>Average True Range — gauge whether an expiry is realistic for current volatility.</p></div>
</div>
<p class="sub">Plus Fibonacci tools, pivot points, volume profile and full drawing toolkits — all on the live chart.</p>
</div></section>
''' + cta_band("Put them on a live chart", "Indicators are one click away inside the terminal.", "Open the terminal", "app/terminal.html"))

# ============ DEMO ============
add("demo.html", "Free demo account", "Open a free Trexora demo with $10,000 virtual funds — real charts, real payouts, zero risk.",
hero("Demo account", "$10,000 virtual. Real markets. Zero risk.", "Every Trexora account starts as a free demo: $10,000 in virtual funds, live charts, real payouts and the full terminal. No card, no deposit, no pressure.", ("Create free demo", "app/signup.html"), ("Try the terminal", "app/terminal.html")) + '''
<section class="page-section"><div class="wrap">
<h2>What's inside the demo</h2>
<ul class="check-list">
<li><strong>$10,000 virtual balance</strong> — refillable, so you can practice as long as you need.</li>
<li><strong>Live market charts</strong> — the same TradingView data as funded trading.</li>
<li><strong>Real payout table</strong> — identical payouts, expiries and assets.</li>
<li><strong>Signals &amp; indicators</strong> — the full toolkit, unlocked from day one.</li>
<li><strong>Trade history</strong> — review every virtual trade and learn from it.</li>
</ul></div></section>
<section class="page-section"><div class="wrap">
<h2>Demo vs real</h2>
<div class="table-wrap"><table class="data">
<tr><th></th><th>Demo account</th><th>Real account</th></tr>
<tr><td><strong>Funds</strong></td><td>$10,000 virtual</td><td>Your deposit</td></tr>
<tr><td><strong>Risk</strong></td><td>None — practice only</td><td>Real capital at risk</td></tr>
<tr><td><strong>Charts &amp; payouts</strong></td><td>Identical</td><td>Identical</td></tr>
<tr><td><strong>Availability</strong></td><td>Open now</td><td>Launching soon</td></tr>
</table></div>
<p class="sub" style="margin-top:14px">Real-money trading is not available yet. We will announce the launch here — demo accounts carry over.</p>
</div></section>
''' + cta_band("Start your demo in 60 seconds", "Pick a name and email — that's all it takes.", "Create free demo", "app/signup.html"))

# ============ AFFILIATE ============
add("affiliate.html", "Affiliate program", "Partner with Trexora: earn up to 80% revenue share promoting a demo-first trading platform.",
hero("Affiliates", "Earn up to 80% revenue share", "Promote a platform traders actually enjoy: free demo, live charts, mobile-first terminal. Competitive commissions, real-time stats and fast payouts for partners.", ("Become a partner", "support.html"), ("How it pays", "payments.html")) + '''
<section class="page-section"><div class="wrap">
<h2>Commission plans</h2>
<div class="table-wrap"><table class="data">
<tr><th>Plan</th><th>How you earn</th><th>Rate</th></tr>
<tr><td><strong>Revenue share</strong></td><td>Share of platform revenue from your referrals</td><td>Up to 80%</td></tr>
<tr><td><strong>CPA</strong></td><td>Fixed bounty per qualified trader</td><td>Custom tiers</td></tr>
<tr><td><strong>Hybrid</strong></td><td>Smaller CPA + lifetime revenue share</td><td>Tailored</td></tr>
</table></div>
<p class="sub" style="margin-top:14px">Final rates are agreed at onboarding and confirmed in your partner agreement. The program opens with real-money launch.</p>
</div></section>
<section class="page-section"><div class="wrap">
<h2>Why partners choose Trexora</h2>
<div class="feat-grid">
<div class="feat-card"><div class="feat-ic">◈</div><h3>Demo converts</h3><p>A free $10,000 demo removes signup friction — your traffic tries before it trusts.</p></div>
<div class="feat-card"><div class="feat-ic">◎</div><h3>Real-time stats</h3><p>Clicks, signups and earnings update live in your partner dashboard.</p></div>
<div class="feat-card"><div class="feat-ic">⬢</div><h3>Marketing kit</h3><p>Banners, landing pages and tracking links in every major language.</p></div>
<div class="feat-card"><div class="feat-ic">⬣</div><h3>Fast payouts</h3><p>Partner commissions paid on schedule, no minimum games.</p></div>
</div></div></section>
''' + cta_band("Reserve your partner spot", "The program opens at real-money launch. Register interest now and get launch terms.", "Apply now", "support.html"))

# ============ TOURNAMENTS ============
add("tournaments.html", "Tournaments", "Trexora trading tournaments: compete on demo leaderboards and climb the ranks.",
hero("Tournaments", "Compete. Climb. Win.", "Regular trading tournaments with live leaderboards. Compete on virtual funds, sharpen your strategy, and take the top spots.", ("Join the next tournament", "app/signup.html"), ("Practice first", "demo.html")) + '''
<section class="page-section"><div class="wrap">
<h2>How tournaments work</h2>
<div class="steps-grid">
<div class="step"><span class="step-n">1</span><h3>Enter free</h3><p>Join with your demo account. Everyone starts the tournament on equal virtual funds.</p></div>
<div class="step"><span class="step-n">2</span><h3>Trade the window</h3><p>Tournaments run over fixed periods — every binary trade counts toward your score.</p></div>
<div class="step"><span class="step-n">3</span><h3>Top the board</h3><p>The live leaderboard ranks by profit. Top traders take the prizes.</p></div>
</div></div></section>
<section class="page-section"><div class="wrap">
<h2>First season — coming soon</h2>
<p class="sub">We're finalizing prize pools and schedules. Create your demo account now and you'll be notified the moment entries open.</p>
<ul class="check-list">
<li><strong>Weekly sprints</strong> — short, intense competitions with fast leaderboards.</li>
<li><strong>Monthly majors</strong> — bigger pools for consistent performers.</li>
<li><strong>Free entry</strong> — tournaments run on virtual funds during the demo phase.</li>
</ul></div></section>
''' + cta_band("Be ready for season one", "Set up your demo account today so you can enter the moment tournaments open.", "Create demo account", "app/signup.html"))

# ============ PROMOTIONS ============
add("promotions.html", "Promotions", "Trexora bonuses and promotions — welcome offers, demo contests and partner rewards.",
hero("Promotions", "Bonuses worth opening", "From welcome boosts to trading contests — here's what's on, and what's coming next.", ("See tournaments", "tournaments.html"), ("Free demo", "demo.html")) + '''
<section class="page-section"><div class="wrap">
<h2>Current offers</h2>
<div class="feat-grid">
<div class="feat-card"><div class="feat-ic">🎁</div><h3>Demo starter boost</h3><p>New demo accounts open with $10,000 virtual — refillable any time from your dashboard.</p></div>
<div class="feat-card"><div class="feat-ic">🏆</div><h3>Tournament prizes</h3><p>Season one prize pools will be announced at launch. Demo traders enter free.</p></div>
<div class="feat-card"><div class="feat-ic">🤝</div><h3>Partner launch rates</h3><p>Early affiliates lock in preferred revenue-share tiers before public launch.</p></div>
</div>
<p class="sub">All promotions carry clear terms — no hidden turnover traps. Full terms publish with each offer.</p>
</div></section>
''' + cta_band("Don't miss the next drop", "Promotions are announced to account holders first.", "Create free account", "app/signup.html"))

# ============ PAYMENTS ============
add("payments.html", "Payments", "Deposits and withdrawals on Trexora — cards, e-wallets and crypto, with a $10 minimum.",
hero("Payments", "Money in and out, without drama", "Cards, e-wallets and crypto. $10 minimums, transparent timing, and every transaction tracked in your dashboard.", ("Open demo", "demo.html"), ("Talk to support", "support.html")) + '''
<section class="page-section"><div class="wrap">
<h2>Methods</h2>
<div class="feat-grid">
<div class="feat-card"><div class="feat-ic">💳</div><h3>Cards</h3><p>Visa and Mastercard deposits with instant crediting.</p></div>
<div class="feat-card"><div class="feat-ic">👛</div><h3>E-wallets</h3><p>Skrill, Neteller and more for fast regional transfers.</p></div>
<div class="feat-card"><div class="feat-ic">₿</div><h3>Crypto</h3><p>BTC, ETH and USDT — borderless and quick.</p></div>
<div class="feat-card"><div class="feat-ic">🏦</div><h3>Bank transfer</h3><p>For larger amounts, with full tracking.</p></div>
</div></div></section>
<section class="page-section"><div class="wrap">
<h2>Limits &amp; timing</h2>
<div class="table-wrap"><table class="data">
<tr><th></th><th>Minimum</th><th>Typical timing</th><th>Fee</th></tr>
<tr><td><strong>Deposit</strong></td><td>$10</td><td>Instant</td><td>$0</td></tr>
<tr><td><strong>Withdrawal</strong></td><td>$10</td><td>1–5 business days</td><td>$0</td></tr>
</table></div>
<p class="sub" style="margin-top:14px"><strong>Important:</strong> Trexora currently runs a demo environment — all balances are virtual and deposits/withdrawals are not yet active. The methods, limits and timing above describe the planned production setup and will be confirmed at launch.</p>
</div></section>
''' + cta_band("Practice with virtual funds meanwhile", "The demo gives you the full money experience with zero risk.", "Try the demo", "demo.html"))

# ============ MOBILE APP ============
add("mobile-app.html", "Mobile app", "Trexora on your phone — the full trading terminal as an installable web app, with native apps coming soon.",
hero("Mobile app", "The terminal, in your pocket", "Trexora runs beautifully on your phone today as an installable web app — and native iOS and Android apps are on the way.", ("Launch web app", "app/terminal.html"), ("Try the demo", "demo.html")) + '''
<section class="page-section"><div class="wrap">
<h2>Use it on mobile today</h2>
<div class="steps-grid">
<div class="step"><span class="step-n">1</span><h3>Open in your browser</h3><p>Visit Trexora on your phone — the terminal is fully mobile-optimized.</p></div>
<div class="step"><span class="step-n">2</span><h3>Add to home screen</h3><p>Use "Add to Home Screen" for an app-like, full-screen experience.</p></div>
<div class="step"><span class="step-n">3</span><h3>Trade anywhere</h3><p>Charts, tickets, history and signals — everything works on the go.</p></div>
</div></div></section>
<section class="page-section"><div class="wrap">
<h2>Native apps — coming soon</h2>
<p class="sub">iOS and Android apps with push price alerts and biometric login are in development. Web app users get notified first.</p>
<ul class="check-list">
<li><strong>Full terminal</strong> — every feature of the desktop platform.</li>
<li><strong>Live charts</strong> — TradingView charts tuned for touch.</li>
<li><strong>Instant alerts</strong> — signal and expiry notifications. <em>Native apps</em></li>
<li><strong>Biometric login</strong> — Face ID / fingerprint. <em>Native apps</em></li>
</ul></div></section>
''' + cta_band("Trade from your phone now", "No download needed — the web app is ready today.", "Open mobile terminal", "app/terminal.html"))

# ============ FAQ ============
FAQ_ITEMS = [
("What is a binary option?", "A binary option is a simple yes/no trade: you forecast whether an asset's price will be above or below the entry price when the contract expires. If you're right, you earn a fixed payout (shown before you trade). If you're wrong, you lose only your stake."),
("Is the demo really free?", "Yes. Every account opens with $10,000 in virtual funds. No card, no deposit, no time limit. You can refill the demo balance any time."),
("What is the minimum deposit?", "The planned minimum deposit is $10. Deposits are not active yet — Trexora currently runs a demo environment with virtual funds only."),
("How fast are withdrawals?", "Our target is 1–5 business days with a $10 minimum and $0 platform fees. Withdrawals activate with real-money launch."),
("Can I lose more than my stake?", "No. On a binary trade your maximum loss is the amount you staked. There is no margin call and no negative balance on binary contracts."),
("What markets can I trade?", "Forex, crypto, gold & metals, stocks and indices — 410+ instruments with live charts."),
("Is Trexora available in my country?", "Binary options are restricted in some jurisdictions. Check your local regulations before trading; the platform may block restricted regions at launch."),
("How do I contact support?", "Use the <a href='support.html'>support page</a> — live chat and email, with 24/7 coverage planned."),
]
faq_body = "".join(f'<div class="acc-item"><button class="acc-q">{q}<span class="acc-x">+</span></button><div class="acc-a"><p>{a}</p></div></div>' for q, a in FAQ_ITEMS)
add("faq.html", "FAQ", "Answers to common Trexora questions — demo accounts, payouts, deposits, withdrawals and platform basics.",
hero("FAQ", "Questions, answered", "Everything traders ask before they start — demo, payouts, payments and platform basics.", ("Still stuck? Contact support", "support.html"),) + f'''
<section class="page-section"><div class="wrap"><div class="faq-full acc-list">
{faq_body}
</div></div></section>
''' + cta_band("Ready to try it yourself?", "The demo answers better than any FAQ.", "Open free demo", "demo.html"))

# ============ SUPPORT ============
add("support.html", "Support", "Contact Trexora support — live chat, email and a help center for demo and platform questions.",
hero("Support", "We're here to help", "Questions about the demo, the terminal or your account — reach us below. Real humans, fast replies.", ("Open the FAQ", "faq.html"),) + '''
<section class="page-section"><div class="wrap">
<div class="feat-grid">
<div class="feat-card"><div class="feat-ic">💬</div><h3>Live chat</h3><p>In-terminal chat, planned 24/7. Currently available during demo hours inside the app.</p></div>
<div class="feat-card"><div class="feat-ic">✉️</div><h3>Email</h3><p><a href="mailto:support@trexora.pdfedit.website">support@trexora.pdfedit.website</a> — we reply within one business day.</p></div>
<div class="feat-card"><div class="feat-ic">📚</div><h3>Help articles</h3><p>Step-by-step guides are being published in the <a href="blog.html">Learn</a> section.</p></div>
</div></div></section>
<section class="page-section"><div class="wrap">
<h2>Before you write in</h2>
<ul class="check-list">
<li><strong>Demo access issues</strong> — try the <a href="demo.html">demo page</a>; most login trouble is a cached session.</li>
<li><strong>How payouts work</strong> — covered in the <a href="faq.html">FAQ</a>.</li>
<li><strong>Partnerships</strong> — see the <a href="affiliate.html">affiliate program</a> page.</li>
<li><strong>Press</strong> — email <a href="mailto:press@trexora.pdfedit.website">press@trexora.pdfedit.website</a>.</li>
</ul></div></section>
''' + cta_band("Can't find your answer?", "Send us a message and we'll get back within one business day.", "Email support", "mailto:support@trexora.pdfedit.website"))

# ============ BLOG ============
add("blog.html", "Learn", "Trexora Learn — guides to binary options basics, chart reading, risk management and platform tutorials.",
hero("Learn", "Get sharper, one article at a time", "Practical guides — no fluff. Binary basics, chart reading, risk management and platform how-tos.", ("Start with the basics", "demo.html"),) + '''
<section class="page-section"><div class="wrap"><div class="blog-grid">
<a class="blog-card" href="demo.html"><div class="art">📈</div><div class="body"><span class="tag">Basics</span><h3>Binary options explained in 5 minutes</h3><p>Higher/Lower, expiries, payouts and what "in the money" actually means.</p></div></a>
<a class="blog-card" href="indicators.html"><div class="art">📊</div><div class="body"><span class="tag">Charts</span><h3>Reading a candlestick chart</h3><p>Bodies, wicks and what price action is telling you on short timeframes.</p></div></a>
<a class="blog-card" href="faq.html"><div class="art">🛡️</div><div class="body"><span class="tag">Risk</span><h3>Risk management for binary traders</h3><p>Stake sizing, daily limits and why most retail traders lose — and how not to.</p></div></a>
<a class="blog-card" href="platform.html"><div class="art">⚡</div><div class="body"><span class="tag">Tutorial</span><h3>Your first trade on Trexora</h3><p>From demo signup to settled trade in under five minutes.</p></div></a>
<a class="blog-card" href="signals.html"><div class="art">🔔</div><div class="body"><span class="tag">Tutorial</span><h3>How to use Trexora signals</h3><p>What each signal means, which expiries fit, and what to ignore.</p></div></a>
<a class="blog-card" href="payments.html"><div class="art">💳</div><div class="body"><span class="tag">Guide</span><h3>Deposits &amp; withdrawals, explained</h3><p>Methods, minimums, timing and verification — the full money picture.</p></div></a>
</div>
<p class="sub" style="margin-top:18px">Full-length articles publish weekly. The cards above link to the relevant guides available today.</p>
</div></section>
''' + cta_band("Learn by doing", "Reading helps — practicing teaches. The demo is free.", "Open free demo", "demo.html"))

# ============ LEGAL ============
def legal_doc(title, updated, sections):
    body = "".join(f"<h2>{h}</h2>" + "".join(f"<p>{p}</p>" if isinstance(p, str) else "<ul>" + "".join(f"<li>{li}</li>" for li in p) + "</ul>" for p in ps) for h, ps in sections)
    return hero("Legal", title, "The fine print, in plain language.",) + f'''
<section class="page-section"><div class="wrap"><div class="doc">
<p class="updated">Last updated: {updated}</p>
{body}
</div></div></section>'''

add("legal/terms.html", "Terms of service", "Trexora terms of service — account rules, demo terms, acceptable use and liability.",
legal_doc("Terms of service", "29 September 2026", [
("1. The service", ["Trexora provides a binary options trading interface. The service is currently a <strong>demo environment</strong>: all balances, trades and payouts are virtual and carry no monetary value."]),
("2. Eligibility", ["You must be at least 18 years old (or the age of majority in your jurisdiction) to use Trexora. Binary options may be restricted or prohibited in your country — it is your responsibility to check local law before using the service."]),
("3. Accounts", ["One account per person. You are responsible for keeping your login credentials confidential and for all activity under your account.", "Demo balances are virtual, refillable, and may be reset at any time."]),
("4. Trading", ["Binary contracts pay a fixed payout if your forecast is correct at expiry; otherwise you lose your stake. Payouts, expiries and available assets are set by Trexora and may change.", "Trexora may void trades affected by technical errors, price feed disruptions or abuse."]),
("5. Acceptable use", ["You agree not to:", ["Misuse the platform, attempt to manipulate prices or feeds, or exploit bugs.", "Use automated systems to abuse demo contests or promotions.", "Use the service for any unlawful purpose."]]),
("6. Intellectual property", ["The Trexora name, logo, design and content are owned by Trexora. You may not copy or redistribute them without permission."]),
("7. Liability", ["The service is provided 'as is'. To the maximum extent permitted by law, Trexora is not liable for trading losses, missed opportunities, or service interruptions."]),
("8. Changes", ["We may update these terms; continued use of the service after changes means you accept them."]),
("9. Contact", ["Questions about these terms: <a href='mailto:legal@trexora.pdfedit.website'>legal@trexora.pdfedit.website</a>."]),
]))

add("legal/privacy.html", "Privacy policy", "How Trexora collects, uses and protects your personal data.",
legal_doc("Privacy policy", "29 September 2026", [
("1. What we collect", ["Account details you provide (name, email).", "Usage data: pages visited, trades placed on demo, device and browser information.", "We do not collect payment details in the demo environment."]),
("2. How we use it", ["To operate your account and the demo platform.", "To improve the product and prevent abuse.", "To send service updates you can opt out of marketing at any time."]),
("3. Sharing", ["We do not sell your personal data. We share it only with infrastructure providers needed to run the service (hosting, analytics), under confidentiality obligations."]),
("4. Cookies", ["We use essential cookies for login sessions and theme preferences. Analytics cookies, if enabled, help us understand usage in aggregate."]),
("5. Your rights", ["You may request access, correction or deletion of your personal data at <a href='mailto:privacy@trexora.pdfedit.website'>privacy@trexora.pdfedit.website</a>."]),
("6. Security", ["We apply industry-standard safeguards, but no online service is perfectly secure."]),
("7. Changes", ["We will post updates to this policy here with a revised date."]),
]))

add("legal/risk-disclosure.html", "Risk disclosure", "Understand the risks of binary options trading before you start — read this first.",
legal_doc("Risk disclosure", "29 September 2026", [
("Please read carefully", ["Binary options are high-risk speculative instruments. <strong>Most retail traders lose money trading them.</strong> Never trade with money you cannot afford to lose."]),
("Key risks", [["<strong>Total loss of stake:</strong> every losing trade loses 100% of the amount staked on it.", "<strong>Short timeframes:</strong> fast expiries amplify the role of chance and market noise.", "<strong>Volatility:</strong> news events can move prices sharply against your position with no way to exit except early-close offers.", "<strong>No ownership:</strong> binary options do not give you ownership of any underlying asset.", "<strong>Regulatory risk:</strong> binary options are banned or restricted in several jurisdictions."]]),
("Demo vs real trading", ["The demo environment removes financial risk but also removes the psychological pressure of real trading. Success on demo does not guarantee results with real funds."]),
("No advice", ["Nothing on Trexora — including signals, indicators and educational content — is financial advice. Decisions are yours alone; consider consulting a licensed advisor."]),
]))

add("legal/aml-kyc.html", "AML & KYC policy", "Trexora anti-money-laundering and know-your-customer policy for real-money launch.",
legal_doc("AML & KYC policy", "29 September 2026", [
("1. Purpose", ["Trexora is committed to preventing money laundering, terrorist financing and fraud. This policy describes the controls that apply when real-money services launch."]),
("2. Verification (KYC)", ["Before deposits or withdrawals, account holders complete identity verification: government-issued ID and proof of address. Additional checks may apply for larger transactions."]),
("3. Monitoring", ["Transactions are monitored for suspicious patterns. Accounts may be limited or closed where verification fails or abuse is suspected."]),
("4. Withdrawal rules", ["Withdrawals return to the original funding source where possible. Name mismatches between account and payment method will block withdrawals pending review."]),
("5. Current status", ["Trexora currently operates a demo environment with virtual funds only — no real-money transactions occur, so verification is not yet required. This policy takes full effect at real-money launch."]),
("6. Contact", ["Compliance questions: <a href='mailto:compliance@trexora.pdfedit.website'>compliance@trexora.pdfedit.website</a>."]),
]))

# ============ BUILD ============
def build():
    # 1. inner pages
    for slug, title, desc, body in PAGES:
        p = "../" if slug.startswith("legal/") else ""
        out = os.path.join(ROOT, slug)
        os.makedirs(os.path.dirname(out), exist_ok=True)
        with open(out, "w") as f:
            f.write(page(title, desc, slug, body, p))
        print("wrote", slug)
    # 2. shared CSS
    css_path = os.path.join(ROOT, "styles.css")
    css = open(css_path).read()
    if "/* ---- inner pages ---- */" not in css:
        with open(css_path, "a") as f:
            f.write(PAGE_CSS)
        print("css appended")
    # 3. index.html header/footer sync
    idx = os.path.join(ROOT, "index.html")
    s = open(idx).read()
    s = re.sub(r"<!--HEADER-->.*?<!--/HEADER-->", "<!--HEADER-->\n" + header("") + "\n<!--/HEADER-->", s, flags=re.S)
    s = re.sub(r"<!--FOOTER-->.*?<!--/FOOTER-->", "<!--FOOTER-->\n" + footer("") + "\n<!--/FOOTER-->", s, flags=re.S)
    # homepage nav pointed at in-page anchors; keep section ids (harmless)
    open(idx, "w").write(s)
    print("index.html header/footer synced")
    # 4. sitemap
    sm = os.path.join(ROOT, "sitemap.xml")
    urls = [""] + [slug for slug, _, _, _ in PAGES]
    xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    for u in urls:
        xml += f"  <url><loc>{SITE}/{u}</loc></url>\n"
    xml += "</urlset>\n"
    open(sm, "w").write(xml)
    print("sitemap.xml updated:", len(urls), "urls")

if __name__ == "__main__":
    build()
