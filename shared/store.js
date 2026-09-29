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
    return {
      v: 2, seededAt: now, seq: 1000,
      users: users, assets: assets, trades: trades, requests: requests,
      settings: { defaultPayout: 80, minTrade: 1, maxTrade: 5000, earlyClose: true, signups: true, maintenance: false }
    };
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        var s = JSON.parse(raw);
        if (s && s.v === 2) return s;
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
    if (!b || !q || !q.value) return null;
    return b.value / q.value;
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
    resetDemo: function () { try { localStorage.removeItem(STORE_KEY); } catch (e) {} return load(); }
  };
})();
