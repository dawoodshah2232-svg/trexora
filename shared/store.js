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

  /* ---------- payment methods (demo/paper) ----------
     Admin-operated list of deposit/withdrawal methods. Crypto = manual QR +
     address flow (no API): the user sends funds, taps "I've sent the payment",
     the admin confirms manually. Gateway methods carry API key/secret/
     merchant-ID fields the admin fills with THEIR OWN keys.
     DEMO ONLY: credentials live in this demo localStorage store. A real
     production backend MUST keep secrets server-side (never in localStorage)
     and deposits must move no real money until licensing, KYC/AML and real
     payment providers exist. Never hardcode real keys here. */
  var PAY_TYPES = { card: "Card gateway", ewallet: "E-wallet", crypto: "Crypto", bank: "Bank transfer", other: "Other" };
  var PAY_PROVIDERS = {
    card: [["stripe", "Card processor / Stripe"], ["custom", "Custom"]],
    ewallet: [["skrill", "Skrill"], ["neteller", "Neteller"], ["perfectmoney", "Perfect Money"], ["advcash", "AdvCash"], ["astropay", "AstroPay"], ["jeton", "Jeton"], ["sticpay", "Sticpay"], ["binancepay", "Binance Pay"], ["custom", "Custom"]],
    crypto: [["manual", "Manual (QR + address, no API)"]],
    bank: [["manual", "Manual bank transfer"]],
    other: [["applepay", "Apple Pay"], ["googlepay", "Google Pay"], ["custom", "Custom"]]
  };
  function payMethod(o) {
    return {
      id: o.id, name: o.name, type: o.type, provider: o.provider || (PAY_PROVIDERS[o.type] ? PAY_PROVIDERS[o.type][0][0] : "custom"),
      enabled: false, sort: o.sort || 0, min: o.min != null ? o.min : 10, max: o.max != null ? o.max : 10000,
      instructions: o.instructions || "",
      apiKey: "", apiSecret: "", merchantId: "",
      coin: o.coin || "", network: o.network || "", wallet: "", qr: "",
      bankName: "", accountName: "", iban: ""
    };
  }
  function defaultPayMethods() {
    var cardNote = "Demo card gateway — paste your processor keys in Admin → Payments, then approve deposits manually. No real money moves on demo.";
    var ewNote = "Demo e-wallet — configure API credentials in Admin → Payments. Deposits are approved manually until a live integration exists.";
    var cryptoNote = "Send the exact amount to the wallet address below, then tap “I’ve sent the payment”. The admin confirms it manually — no API needed.";
    var bankNote = "Transfer to the bank details below, then submit your deposit request. The admin confirms it manually — demo only, no real money moves.";
    var otherNote = "Demo method — configure it in Admin → Payments. No real money moves on demo.";
    var list = [
      payMethod({ id: "pm_visa", name: "Visa", type: "card", sort: 1, instructions: cardNote }),
      payMethod({ id: "pm_mc", name: "Mastercard", type: "card", sort: 2, instructions: cardNote }),
      payMethod({ id: "pm_skrill", name: "Skrill", type: "ewallet", provider: "skrill", sort: 3, instructions: ewNote }),
      payMethod({ id: "pm_neteller", name: "Neteller", type: "ewallet", provider: "neteller", sort: 4, instructions: ewNote }),
      payMethod({ id: "pm_pm", name: "Perfect Money", type: "ewallet", provider: "perfectmoney", sort: 5, instructions: ewNote }),
      payMethod({ id: "pm_advcash", name: "AdvCash", type: "ewallet", provider: "advcash", sort: 6, instructions: ewNote }),
      payMethod({ id: "pm_astropay", name: "AstroPay", type: "ewallet", provider: "astropay", sort: 7, instructions: ewNote }),
      payMethod({ id: "pm_jeton", name: "Jeton", type: "ewallet", provider: "jeton", sort: 8, instructions: ewNote }),
      payMethod({ id: "pm_sticpay", name: "Sticpay", type: "ewallet", provider: "sticpay", sort: 9, instructions: ewNote }),
      payMethod({ id: "pm_btc", name: "Bitcoin (BTC)", type: "crypto", sort: 10, coin: "BTC", network: "Bitcoin", instructions: cryptoNote }),
      payMethod({ id: "pm_eth", name: "Ethereum (ETH)", type: "crypto", sort: 11, coin: "ETH", network: "Ethereum / ERC20", instructions: cryptoNote }),
      payMethod({ id: "pm_usdttrc", name: "Tether USDT — TRC20", type: "crypto", sort: 12, coin: "USDT", network: "Tron / TRC20", instructions: cryptoNote }),
      payMethod({ id: "pm_usdterc", name: "Tether USDT — ERC20", type: "crypto", sort: 13, coin: "USDT", network: "Ethereum / ERC20", instructions: cryptoNote }),
      payMethod({ id: "pm_ltc", name: "Litecoin (LTC)", type: "crypto", sort: 14, coin: "LTC", network: "Litecoin", instructions: cryptoNote }),
      payMethod({ id: "pm_trx", name: "Tron (TRX)", type: "crypto", sort: 15, coin: "TRX", network: "Tron / TRC20", instructions: cryptoNote }),
      payMethod({ id: "pm_bnb", name: "BNB (BEP20)", type: "crypto", sort: 16, coin: "BNB", network: "BNB Smart Chain / BEP20", instructions: cryptoNote }),
      payMethod({ id: "pm_bank", name: "Bank wire transfer", type: "bank", sort: 17, instructions: bankNote }),
      payMethod({ id: "pm_binancepay", name: "Binance Pay", type: "ewallet", provider: "binancepay", sort: 18, instructions: ewNote }),
      payMethod({ id: "pm_applepay", name: "Apple Pay", type: "other", provider: "applepay", sort: 19, instructions: otherNote }),
      payMethod({ id: "pm_gpay", name: "Google Pay", type: "other", provider: "googlepay", sort: 20, instructions: otherNote })
    ];
    return list;
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
        email: { provider: "smtp", apiKey: "", smtpHost: "", smtpPort: 587, encryption: "tls", smtpUser: "", smtpPass: "", fromName: "Trexora", fromEmail: "noreply@trexora.example" },
        branding: { logo: "", company: "Trexora", supportEmail: "support@trexora.example", website: "https://trexora.pdfedit.website" },
        notifications: { welcome: true, deposit: true, wdApproved: true, wdRejected: true, tourWin: true },
        sms: { provider: "twilio", apiKey: "", apiSecret: "", senderId: "Trexora" },
        payments: { provider: "manual", apiKey: "", secretKey: "", merchantId: "" },
        api: { enabled: false, key: "", whTrade: "", whDeposit: "", whKyc: "", whWithdraw: "" },
        chart: { style: "candles", theme: "auto", tf: 60, up: "#2F80FF", down: "#F23645" },
        payMethods: defaultPayMethods() }
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
    /* charts: single Deriv-fed Lightweight chart — admin controls style/theme/timeframe/colors (no provider).
       Migrates legacy keys (tvStyle/tvTheme/tvTf/lwTf/lwUp/lwDown/provider) to the new schema, preserving values. */
    var cdef = { style: "candles", theme: "auto", tf: 60, up: "#2F80FF", down: "#F23645" };
    if (s.settings.chart == null || typeof s.settings.chart !== "object") {
      s.settings.chart = cdef;
      changed = true;
    } else {
      var ch = s.settings.chart, cch = false, hex = /^#[0-9a-fA-F]{6}$/;
      if (["candles", "line", "area"].indexOf(ch.style) === -1) {
        ch.style = ["candles", "line", "area"].indexOf(ch.tvStyle) !== -1 ? ch.tvStyle : "candles"; cch = true;
      }
      if (["auto", "dark", "light"].indexOf(ch.theme) === -1) {
        ch.theme = ["auto", "dark", "light"].indexOf(ch.tvTheme) !== -1 ? ch.tvTheme : "auto"; cch = true;
      }
      var tfv = parseInt(ch.tf != null ? ch.tf : (ch.tvTf != null ? ch.tvTf : ch.lwTf), 10);
      var tfm = tfv === 300 ? 300 : tfv === 900 ? 900 : tfv === 1 ? 60 : tfv === 5 ? 300 : tfv === 15 ? 900 : 60;
      if (ch.tf !== tfm) { ch.tf = tfm; cch = true; }
      if (!hex.test(ch.up || "")) { ch.up = hex.test(ch.lwUp || "") ? ch.lwUp : "#2F80FF"; cch = true; }
      if (!hex.test(ch.down || "")) { ch.down = hex.test(ch.lwDown || "") ? ch.lwDown : "#F23645"; cch = true; }
      ["provider", "tvStyle", "tvTheme", "tvTf", "lwTf", "lwUp", "lwDown"].forEach(function (k) {
        if (k in ch) { delete ch[k]; cch = true; }
      });
      if (cch) changed = true;
    }
    if (s.settings.api == null || typeof s.settings.api !== "object") {
      s.settings.api = { enabled: false, key: "", whTrade: "", whDeposit: "", whKyc: "", whWithdraw: "" };
      changed = true;
    }
    /* payment methods manager: seed the full demo method list once on old stores.
       Admin enable/disable/sort/edits are preserved on later loads. */
    if (!Array.isArray(s.settings.payMethods)) {
      s.settings.payMethods = defaultPayMethods();
      changed = true;
    } else {
      /* backfill any fields newer code expects, without touching admin values */
      s.settings.payMethods.forEach(function (m) {
        if (m.enabled == null) m.enabled = false;
        if (m.sort == null) m.sort = 0;
        if (m.min == null) m.min = 10;
        if (m.max == null) m.max = 10000;
        if (m.instructions == null) m.instructions = "";
        ["apiKey", "apiSecret", "merchantId", "coin", "network", "wallet", "qr", "bankName", "accountName", "iban"].forEach(function (k) {
          if (m[k] == null) m[k] = "";
        });
      });
    }
    /* company branding + notification prefs + email encryption backfill for older demo stores */
    if (!s.settings.branding || typeof s.settings.branding !== "object") {
      s.settings.branding = { logo: "", company: "Trexora", supportEmail: "support@trexora.example", website: "https://trexora.pdfedit.website" };
      changed = true;
    } else {
      ["logo", "company", "supportEmail", "website"].forEach(function (k) {
        if (s.settings.branding[k] == null) { s.settings.branding[k] = ""; changed = true; }
      });
      if (!s.settings.branding.company) { s.settings.branding.company = "Trexora"; changed = true; }
    }
    if (!s.settings.notifications || typeof s.settings.notifications !== "object") {
      s.settings.notifications = { welcome: true, deposit: true, wdApproved: true, wdRejected: true, tourWin: true };
      changed = true;
    } else {
      ["welcome", "deposit", "wdApproved", "wdRejected", "tourWin"].forEach(function (k) {
        if (s.settings.notifications[k] == null) { s.settings.notifications[k] = true; changed = true; }
      });
    }
    if (s.settings.email && s.settings.email.encryption == null) { s.settings.email.encryption = "tls"; changed = true; }
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
  var MON_S = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function pad2(n) { return String(n).padStart(2, "0"); }
  function fmtTime(ts) {
    /* Honors the client's timezone preference (tx_tz, e.g. "(UTC+04:00) Dubai").
       Falls back to the browser's local timezone when unset (admin portal). */
    try {
      var z = localStorage.getItem("tx_tz") || "";
      var m = /UTC([+-])(\d{2}):(\d{2})/.exec(z);
      if (m) {
        var off = (m[1] === "-" ? -1 : 1) * (parseInt(m[2], 10) * 60 + parseInt(m[3], 10));
        var d = new Date(ts + off * 60000);
        return pad2(d.getUTCDate()) + " " + MON_S[d.getUTCMonth()] + ", " + pad2(d.getUTCHours()) + ":" + pad2(d.getUTCMinutes());
      }
    } catch (e) {}
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
    defaultPayMethods: defaultPayMethods,
    PAY_TYPES: PAY_TYPES, PAY_PROVIDERS: PAY_PROVIDERS,
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
