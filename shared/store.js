/* Trexora v2 — shared demo data layer (client portal + admin portal, same origin localStorage).
   DEMO ONLY: virtual funds, no real money. Prices: live quotes via CoinGecko (free, no key). */
(function () {
  "use strict";

  var STORE_KEY = "trexora_v2_store";
  var CLIENT_SESSION = "trexora_v2_session";
  var ADMIN_SESSION = "trexora_v2_admin";

  var DEMO_CLIENT = { email: "trader@trexora.demo", password: "trexora123" };
  var DEMO_ADMIN = { email: "admin@trexora.demo", password: "trexora123" };

  function uid(prefix) {
    return prefix + "_" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
  }

  function defaultAssets() {
    return [
      { id: "eurusd", name: "EUR/USD", tv: "FX:EURUSD", kind: "fiat", base: "EUR", quote: "USD", payout: 82, min: 1, max: 1000, enabled: true },
      { id: "gbpusd", name: "GBP/USD", tv: "FX:GBPUSD", kind: "fiat", base: "GBP", quote: "USD", payout: 80, min: 1, max: 1000, enabled: true },
      { id: "usdjpy", name: "USD/JPY", tv: "FX:USDJPY", kind: "fiat", base: "USD", quote: "JPY", payout: 79, min: 1, max: 1000, enabled: true },
      { id: "audusd", name: "AUD/USD", tv: "FX:AUDUSD", kind: "fiat", base: "AUD", quote: "USD", payout: 78, min: 1, max: 1000, enabled: true },
      { id: "gbpjpy", name: "GBP/JPY", tv: "FX:GBPJPY", kind: "fiat", base: "GBP", quote: "JPY", payout: 77, min: 1, max: 1000, enabled: true },
      { id: "usdchf", name: "USD/CHF", tv: "FX:USDCHF", kind: "fiat", base: "USD", quote: "CHF", payout: 76, min: 1, max: 1000, enabled: true },
      { id: "xauusd", name: "XAU/USD · Gold", tv: "OANDA:XAUUSD", kind: "crypto", code: "pax-gold", base: "XAU", quote: "USD", payout: 78, min: 1, max: 1000, enabled: true },
      { id: "btcusd", name: "BTC/USD", tv: "BITSTAMP:BTCUSD", kind: "crypto", code: "bitcoin", base: "BTC", quote: "USD", payout: 84, min: 1, max: 1000, enabled: true },
      { id: "ethusd", name: "ETH/USD", tv: "BITSTAMP:ETHUSD", kind: "crypto", code: "ethereum", base: "ETH", quote: "USD", payout: 82, min: 1, max: 1000, enabled: true }
    ];
  }

  function seed() {
    var now = Date.now();
    var users = [
      { id: "u_demo", email: DEMO_CLIENT.email, name: "Demo Trader", password: DEMO_CLIENT.password, balance: 10000, disabled: false, createdAt: now - 86400000 * 12 },
      { id: "u_1", email: "aria@demo.mail", name: "Aria K.", password: "trexora123", balance: 12450.75, disabled: false, createdAt: now - 86400000 * 30 },
      { id: "u_2", email: "omar@demo.mail", name: "Omar S.", password: "trexora123", balance: 8320.00, disabled: false, createdAt: now - 86400000 * 21 },
      { id: "u_3", email: "liam@demo.mail", name: "Liam D.", password: "trexora123", balance: 2100.50, disabled: false, createdAt: now - 86400000 * 9 },
      { id: "u_4", email: "sara@demo.mail", name: "Sara M.", password: "trexora123", balance: 15680.25, disabled: false, createdAt: now - 86400000 * 45 },
      { id: "u_5", email: "blocked@demo.mail", name: "Blocked User", password: "trexora123", balance: 500.00, disabled: true, createdAt: now - 86400000 * 6 }
    ];
    var assets = defaultAssets();
    var dirs = ["up", "down"];
    var trades = [];
    for (var i = 0; i < 14; i++) {
      var a = assets[i % assets.length];
      var u = users[1 + (i % 4)];
      var amt = [10, 25, 50, 100, 250][i % 5];
      var win = i % 3 !== 2;
      var entry = 1.085 + i * 0.0007;
      var exit = win ? entry + 0.0004 : entry - 0.0004;
      var opened = now - 86400000 * (i % 7) - 3600000 * (i % 9);
      trades.push({
        id: "t_seed_" + i, userId: u.id, userEmail: u.email,
        assetId: a.id, assetName: a.name, dir: dirs[i % 2],
        amount: amt, payout: a.payout, entryPrice: +entry.toFixed(5), exitPrice: +exit.toFixed(5),
        openedAt: opened, expiresAt: opened + 300000, closedAt: opened + 300000,
        status: "closed", result: win ? "win" : "loss",
        pl: win ? +(amt * a.payout / 100).toFixed(2) : -amt,
        note: "seeded demo data"
      });
    }
    var requests = [
      { id: "r_1", userId: "u_2", userEmail: "omar@demo.mail", type: "deposit", amount: 500, method: "Visa", status: "pending", createdAt: now - 3600000 * 5, note: "seeded demo data" },
      { id: "r_2", userId: "u_4", userEmail: "sara@demo.mail", type: "withdrawal", amount: 1200, method: "Bank transfer", status: "pending", createdAt: now - 3600000 * 2, note: "seeded demo data" },
      { id: "r_3", userId: "u_1", userEmail: "aria@demo.mail", type: "deposit", amount: 250, method: "Mastercard", status: "approved", createdAt: now - 86400000 * 2, note: "seeded demo data" }
    ];
    var promos = [
      { id: "p_dep50", code: "DEPOSIT50", pct: 50, category: "Deposit Bonus", expiry: "29/10/2030", enabled: true, usedBy: [], createdAt: now - 86400000 * 20 },
      { id: "p_dep40", code: "DEPOSIT40", pct: 40, category: "Deposit Bonus", expiry: "29/10/2030", enabled: true, usedBy: [], createdAt: now - 86400000 * 20 },
      { id: "p_dep30", code: "DEPOSIT30", pct: 30, category: "Deposit Bonus", expiry: "29/10/2030", enabled: true, usedBy: [], createdAt: now - 86400000 * 20 }
    ];
    var tournaments = [
      { id: "t_crazy", name: "Crazy Wednesday", prize: 9000, entry: 10, startsAt: now + 86400000 * 2, durationH: 24, enabled: true },
      { id: "t_free", name: "Free Friday", prize: 1000, entry: 0, startsAt: now + 86400000 * 4, durationH: 12, enabled: true },
      { id: "t_weekend", name: "Weekend Battle", prize: 5000, entry: 1, startsAt: now + 86400000 * 6, durationH: 48, enabled: true }
    ];
    var signals = [];
    return {
      v: 4, seededAt: now, seq: 1000,
      users: users, assets: assets, trades: trades, requests: requests,
      promos: promos, tournaments: tournaments, tourJoins: [], signals: signals,
      verifyQueue: [], ledger: [], announcements: [],
      roles: [{ id: "r_admin", email: DEMO_ADMIN.email, password: DEMO_ADMIN.password, role: "admin", createdAt: now - 86400000 * 60 }],
      settings: { defaultPayout: 80, minTrade: 1, maxTrade: 5000, maxPayout: 95, maxOpen: 20, earlyClose: true, signups: true, maintenance: false, signalsOn: true, expiries: ["1m", "5m", "10m", "15m", "30m", "1h", "4h", "1d"],
        kyc: { mode: "manual", provider: "sumsub", appToken: "", secretKey: "", webhookSecret: "", testMode: true },
        email: { provider: "smtp", apiKey: "", smtpHost: "", smtpPort: 587, smtpUser: "", smtpPass: "", fromName: "Trexora", fromEmail: "noreply@trexora.example" },
        sms: { provider: "twilio", apiKey: "", apiSecret: "", senderId: "Trexora" },
        payments: { provider: "manual", apiKey: "", secretKey: "", merchantId: "" },
        api: { enabled: false, key: "", whTrade: "", whDeposit: "", whKyc: "", whWithdraw: "" } }
    };
  }

  function migrate(s) {
    /* v2 -> v3: backfill asset fields (base/quote/kind/code/name/tv) that older
       seeds lacked, so cached localStorage stores render correctly with new code.
       Admin overrides (enabled/payout/min/max) are always preserved. */
    var defs = defaultAssets(), changed = false;
    (s.assets || []).forEach(function (a) {
      var d = null;
      defs.forEach(function (x) { if (x.id === a.id) d = x; });
      if (d) ["name", "tv", "kind", "code", "base", "quote"].forEach(function (k) {
        if (a[k] == null && d[k] != null) { a[k] = d[k]; changed = true; }
      });
    });
    defs.forEach(function (d) {
      var found = false;
      (s.assets || []).forEach(function (a) { if (a.id === d.id) found = true; });
      if (!found) { s.assets.push(d); changed = true; }
    });
    /* v3 -> v4: ensure new admin-operated collections exist */
    [["promos", []], ["tournaments", []], ["tourJoins", []], ["signals", []],
     ["verifyQueue", []], ["ledger", []], ["announcements", []], ["roles", []]].forEach(function (pair) {
      if (!Array.isArray(s[pair[0]])) { s[pair[0]] = pair[1]; changed = true; }
    });
    if (!s.settings) { s.settings = {}; changed = true; }
    [["signalsOn", true], ["earlyClose", true], ["signups", true], ["maintenance", false],
     ["defaultPayout", 80], ["minTrade", 1], ["maxTrade", 5000], ["maxPayout", 95], ["maxOpen", 20]
    ].forEach(function (pair) {
      if (s.settings[pair[0]] == null) { s.settings[pair[0]] = pair[1]; changed = true; }
    });
    if (!Array.isArray(s.settings.expiries) || !s.settings.expiries.length) {
      s.settings.expiries = ["1m", "5m", "10m", "15m", "30m", "1h", "4h", "1d"]; changed = true;
    }
    /* integrations: KYC / email / sms / payments / platform API (admin-operated) */
    if (s.settings.kyc == null || typeof s.settings.kyc !== "object") {
      s.settings.kyc = { mode: "manual", provider: "sumsub", appToken: "", secretKey: "", webhookSecret: "", testMode: true };
      changed = true;
    }
    if (s.settings.email == null || typeof s.settings.email !== "object") {
      s.settings.email = { provider: "smtp", apiKey: "", smtpHost: "", smtpPort: 587, smtpUser: "", smtpPass: "", fromName: "Trexora", fromEmail: "noreply@trexora.example" };
      changed = true;
    }
    if (s.settings.sms == null || typeof s.settings.sms !== "object") {
      s.settings.sms = { provider: "twilio", apiKey: "", apiSecret: "", senderId: "Trexora" };
      changed = true;
    }
    if (s.settings.payments == null || typeof s.settings.payments !== "object") {
      s.settings.payments = { provider: "manual", apiKey: "", secretKey: "", merchantId: "" };
      changed = true;
    }
    if (s.settings.api == null || typeof s.settings.api !== "object") {
      s.settings.api = { enabled: false, key: "", whTrade: "", whDeposit: "", whKyc: "", whWithdraw: "" };
      changed = true;
    }
    /* seed default promos/tournaments/admin role once on old stores */
    var fresh = seed();
    if (!Array.isArray(s.promos)) { s.promos = fresh.promos; changed = true; }
    if (!Array.isArray(s.tournaments)) { s.tournaments = fresh.tournaments; changed = true; }
    if (!Array.isArray(s.roles)) { s.roles = fresh.roles; changed = true; }
    if (s.v !== 4) { s.v = 4; changed = true; }
    if (changed) save(s);
    return s;
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        var s = JSON.parse(raw);
        if (s && (s.v === 2 || s.v === 3 || s.v === 4)) return migrate(s);
      }
    } catch (e) {}
    var s2 = seed();
    save(s2);
    return s2;
  }

  function save(s) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (e) {}
  }

  /* ---------- live price engine (CoinGecko, free, no key) ---------- */
  var cache = { ts: 0, rates: null, crypto: {} };

  function fetchJSON(url, timeoutMs) {
    return new Promise(function (resolve) {
      var done = false;
      var timer = setTimeout(function () { if (!done) { done = true; resolve(null); } }, timeoutMs || 12000);
      fetch(url).then(function (r) {
        if (done) return; done = true; clearTimeout(timer);
        resolve(r.ok ? r.json().catch(function () { return null; }) : null);
      }).catch(function () { if (!done) { done = true; clearTimeout(timer); resolve(null); } });
    });
  }

  function refreshPrices(force) {
    var now = Date.now();
    if (!force && cache.rates && now - cache.ts < 45000) return Promise.resolve(true);
    return Promise.all([
      fetchJSON("https://api.coingecko.com/api/v3/exchange_rates"),
      fetchJSON("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,pax-gold&vs_currencies=usd")
    ]).then(function (res) {
      if (res[0] && res[0].rates) cache.rates = res[0].rates;
      if (res[1]) cache.crypto = res[1];
      if (cache.rates) { cache.ts = now; return true; }
      return false;
    });
  }

  function priceOf(asset) {
    if (!asset) return null;
    if (asset.kind === "crypto") {
      var c = cache.crypto[asset.code];
      return c && c.usd ? +c.usd : null;
    }
    if (!cache.rates) return null;
    var b = cache.rates[(asset.base || "").toLowerCase()];
    var q = cache.rates[(asset.quote || "").toLowerCase()];
    if (!b || !q || !q.value || !b.value) return null;
    return q.value / b.value; /* rates are per-1-BTC: USD-per-BTC / EUR-per-BTC = EUR/USD */
  }

  function feedAge() { return Date.now() - cache.ts; }
  function feedOk() { return !!cache.rates; }

  /* ---------- helpers ---------- */
  function fmt(n, dec) {
    return "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: dec == null ? 2 : dec, maximumFractionDigits: dec == null ? 2 : dec });
  }
  function fmtTime(ts) {
    return new Date(ts).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ---------- auth ---------- */
  function clientSession() {
    try { return JSON.parse(localStorage.getItem(CLIENT_SESSION) || "null"); } catch (e) { return null; }
  }
  function setClientSession(email) {
    try {
      if (email) localStorage.setItem(CLIENT_SESSION, JSON.stringify({ email: email, ts: Date.now() }));
      else localStorage.removeItem(CLIENT_SESSION);
    } catch (e) {}
  }
  function adminAuthed() {
    try { return localStorage.getItem(ADMIN_SESSION) === "1"; } catch (e) { return false; }
  }
  function setAdminAuthed(on) {
    try {
      if (on) localStorage.setItem(ADMIN_SESSION, "1");
      else localStorage.removeItem(ADMIN_SESSION);
    } catch (e) {}
  }

  window.TX = {
    load: load, save: save, uid: uid,
    fmt: fmt, fmtTime: fmtTime, esc: esc,
    refreshPrices: refreshPrices, priceOf: priceOf, feedOk: feedOk, feedAge: feedAge,
    clientSession: clientSession, setClientSession: setClientSession,
    adminAuthed: adminAuthed, setAdminAuthed: setAdminAuthed,
    DEMO_CLIENT: DEMO_CLIENT, DEMO_ADMIN: DEMO_ADMIN,
    defaultAssets: defaultAssets,
    /* Proper asset icons: forex flags (flagcdn), crypto logos (cryptocurrency-icons),
       minted-coin SVG for metals. Falls back to the currency letters if an image fails. */
    CUR_SYM: { EUR: "€", USD: "$", GBP: "£", JPY: "¥", AUD: "A$", CHF: "Fr", XAU: "Au", XAG: "Ag", BTC: "₿", ETH: "Ξ" },
    FLAG_CC: { EUR: "eu", GBP: "gb", USD: "us", JPY: "jp", AUD: "au", CHF: "ch", CAD: "ca", NZD: "nz" },
    assetIconHTML: function (a) {
      var base = String((a && a.base) || "").toUpperCase();
      var kind = a && a.kind;
      var fb = esc((this.CUR_SYM && this.CUR_SYM[base]) || base.slice(0, 2) || "?");
      var inner = "";
      if ((kind === "fiat" || kind === "forex") && this.FLAG_CC[base]) {
        inner = '<img src="https://flagcdn.com/w80/' + this.FLAG_CC[base] + '.png" alt="' + esc(base) + ' flag" loading="lazy" onerror="this.remove()">';
      } else if (base === "XAU" || base === "XAG") {
        var c1 = base === "XAU" ? "#f7cd5a" : "#d7dde3", c2 = base === "XAU" ? "#a86e0a" : "#7d8894";
        var gid = "txm" + base;
        inner = '<svg viewBox="0 0 40 40" aria-hidden="true"><defs><radialGradient id="' + gid + '" cx="35%" cy="30%" r="80%">' +
          '<stop offset="0%" stop-color="' + c1 + '"/><stop offset="100%" stop-color="' + c2 + '"/></radialGradient></defs>' +
          '<circle cx="20" cy="20" r="17" fill="url(#' + gid + ')"/>' +
          '<circle cx="20" cy="20" r="13" fill="none" stroke="rgba(255,255,255,.6)" stroke-width="2"/>' +
          '<text x="20" y="25.5" text-anchor="middle" font-size="11" font-weight="800" fill="#3a2a04" font-family="Arial,sans-serif">' + base.slice(0, 2) + "</text></svg>";
      } else if (kind === "crypto" && /^[A-Z0-9]{2,10}$/.test(base)) {
        inner = '<img src="https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fae5/svg/color/' + base.toLowerCase() + '.svg" alt="' + esc(base) + ' logo" loading="lazy" onerror="this.remove()">';
      }
      return '<span class="tx-ico">' + inner + "<i>" + fb + "</i></span>";
    },
    ledger: function (store, userId, amount, kind, note) {
      store.ledger.push({ id: uid("l"), userId: userId, amount: amount, kind: kind, note: note || "", createdAt: Date.now() });
    },
    resetDemo: function () { try { localStorage.removeItem(STORE_KEY); } catch (e) {} return load(); }
  };
})();
