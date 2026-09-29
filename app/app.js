/* Trexora v2 — client terminal logic (demo, localStorage). Quotex-style layout. */
(function () {
  "use strict";

  var ses = TX.clientSession();
  if (!ses) { window.location.replace("login.html"); return; }

  function $(id) { return document.getElementById(id); }
  function toast(msg) {
    var t = $("toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove("show"); }, 2600);
  }

  var store = TX.load();
  var user = null;
  for (var i = 0; i < store.users.length; i++) {
    if (store.users[i].email.toLowerCase() === String(ses.email).toLowerCase()) { user = store.users[i]; break; }
  }
  if (!user || user.disabled) { TX.setClientSession(null); window.location.replace("login.html"); return; }

  var EXP = [15, 30, 60, 120, 300, 900, 1800, 3600, 14400];
  var EXP_L = ["15s", "30s", "1m", "2m", "5m", "15m", "30m", "1h", "4h"];
  var CHIPS = [10, 25, 50, 100, 250, 500];
  var state = { assetId: null, tabs: [], expIdx: 2, amount: 10, sheetMode: "switch" };

  /* ---------- theme / top bar ---------- */
  var root = document.documentElement;
  function toggleTheme() {
    var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("trexora-theme", next); } catch (e) {}
    if (state.assetId) loadChart();
  }
  $("themeToggle2").addEventListener("click", toggleTheme);
  $("logoutBtn").addEventListener("click", function () {
    TX.setClientSession(null); window.location.replace("login.html");
  });
  $("burger").addEventListener("click", function () { $("rail").classList.toggle("open"); });
  $("depTop").addEventListener("click", function () { showView("account"); });
  $("wdTop").addEventListener("click", function () { showView("account"); });
  $("acctBtn").addEventListener("click", function (e) {
    e.stopPropagation();
    var m = $("acctMenu"), open = m.hidden;
    m.hidden = !open;
    $("acctBtn").setAttribute("aria-expanded", String(open));
  });
  document.addEventListener("click", function () { $("acctMenu").hidden = true; });

  /* ---------- views ---------- */
  function showView(name) {
    document.querySelectorAll(".view").forEach(function (v) { v.classList.toggle("active", v.id === "view-" + name); });
    document.querySelectorAll("#rail button[data-view], #mobileBar button[data-view]").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-view") === name);
    });
    $("rail").classList.remove("open");
    if (name === "history") renderHistory();
    if (name === "account") renderWallet();
    if (name === "markets") renderMarkets();
    if (name === "tournaments") renderTours();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  document.querySelectorAll("#rail button[data-view], #mobileBar button[data-view]").forEach(function (b) {
    b.addEventListener("click", function () { showView(b.getAttribute("data-view")); });
  });
  $("qpHistBtn").addEventListener("click", function () { showView("history"); });

  /* ---------- support modal ---------- */
  function openSupport() { $("supportModal").hidden = false; $("supportBack").hidden = false; }
  function closeSupport() { $("supportModal").hidden = true; $("supportBack").hidden = true; }
  $("supportBtn").addEventListener("click", openSupport);
  $("supportClose").addEventListener("click", closeSupport);
  $("supportBack").addEventListener("click", closeSupport);
  $("chatBtn").addEventListener("click", function () { closeSupport(); toast("Live chat is a demo placeholder — use the help center."); });

  /* ---------- balance ---------- */
  function renderBalance() {
    $("topBal").textContent = TX.fmt(user.balance);
    $("walletBal").textContent = TX.fmt(user.balance);
    $("acctEmail").textContent = user.email;
  }
  $("refillBtn").addEventListener("click", function () {
    user.balance = 10000; TX.save(store); renderBalance();
    toast("Demo balance refilled to $10,000.");
  });

  /* ---------- assets ---------- */
  var CUR_SYM = { EUR: "€", USD: "$", GBP: "£", JPY: "¥", AUD: "A$", CHF: "Fr", XAU: "Au", XAG: "Ag", BTC: "₿", ETH: "Ξ" };
  var CUR_NAME = { EUR: "Euro", USD: "U.S. Dollar", GBP: "British Pound", JPY: "Japanese Yen", AUD: "Australian Dollar", CHF: "Swiss Franc", XAU: "Gold", XAG: "Silver", BTC: "Bitcoin", ETH: "Ethereum" };
  function assetCat(a) { return a.id === "xauusd" ? "Metals" : (a.kind === "fiat" ? "Forex" : "Crypto"); }
  function assetIcon(a) { return CUR_SYM[a.base] || String(a.base || "?").slice(0, 2); }
  function assetSub(a) {
    if (a.id === "xauusd") return "Gold · Spot";
    return (CUR_NAME[a.base] || a.base) + " / " + (CUR_NAME[a.quote] || a.quote);
  }
  function fmtPrice(a, p) {
    if (p == null) return "—";
    return a.kind === "fiat" ? p.toFixed(5) : TX.fmt(p);
  }
  function enabledAssets() { return store.assets.filter(function (a) { return a.enabled; }); }
  function getAsset(id) {
    for (var i = 0; i < store.assets.length; i++) if (store.assets[i].id === id) return store.assets[i];
    return null;
  }

  /* ----- asset tabs (Quotex-style) ----- */
  function renderTabs() {
    var box = $("assetTabs"); box.innerHTML = "";
    state.tabs.forEach(function (id) {
      var a = getAsset(id); if (!a) return;
      var t = document.createElement("div");
      t.className = "qx-tab" + (id === state.assetId ? " active" : "");
      t.innerHTML =
        '<span class="qt-ico">' + TX.esc(assetIcon(a)) + "</span>" +
        '<span class="qt-t"><b>' + TX.esc(a.name) + '</b><small data-px="' + a.id + '">' + fmtPrice(a, TX.priceOf(a)) + "</small></span>" +
        '<span class="qt-pay">' + a.payout + '%</span>' +
        (state.tabs.length > 1 ? '<button class="qt-x" type="button" aria-label="Close tab">✕</button>' : "");
      t.addEventListener("click", function (e) {
        if (e.target.classList.contains("qt-x")) {
          state.tabs = state.tabs.filter(function (x) { return x !== id; });
          if (state.assetId === id) selectAsset(state.tabs[0]);
          else renderTabs();
          return;
        }
        selectAsset(id);
      });
      box.appendChild(t);
    });
    var add = document.createElement("button");
    add.type = "button"; add.className = "qx-tab-add"; add.textContent = "+";
    add.setAttribute("aria-label", "Add asset tab");
    add.addEventListener("click", function () { state.sheetMode = "add"; openSheet(); });
    box.appendChild(add);
  }

  /* ----- asset bottom sheet ----- */
  var sheet = { tab: "All", q: "" };
  function sheetCats() {
    var cats = ["All"], seen = {};
    enabledAssets().forEach(function (a) { var c = assetCat(a); if (!seen[c]) { seen[c] = 1; cats.push(c); } });
    return cats;
  }
  function renderSheetTabs() {
    var box = $("assetSheetTabs"); box.innerHTML = "";
    sheetCats().forEach(function (c) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "sheet-tab" + (c === sheet.tab ? " active" : "");
      b.textContent = c;
      b.addEventListener("click", function () { sheet.tab = c; renderSheetTabs(); renderSheetList(); });
      box.appendChild(b);
    });
  }
  function renderSheetList() {
    var box = $("assetSheetList"); box.innerHTML = "";
    var q = sheet.q.toLowerCase();
    var list = enabledAssets().filter(function (a) {
      if (sheet.tab !== "All" && assetCat(a) !== sheet.tab) return false;
      if (q && (a.name.toLowerCase().indexOf(q) === -1 && assetSub(a).toLowerCase().indexOf(q) === -1)) return false;
      return true;
    });
    if (!list.length) { box.innerHTML = '<div class="empty" style="margin:12px 0">No assets match.</div>'; return; }
    list.forEach(function (a) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "asset-row" + (a.id === state.assetId ? " active" : "");
      b.innerHTML =
        '<span class="ar-icon">' + TX.esc(assetIcon(a)) + "</span>" +
        '<span class="ar-names"><strong>' + TX.esc(a.name) + "</strong><small>" + TX.esc(assetSub(a)) + " · " + TX.esc(assetCat(a)) + "</small></span>" +
        '<span class="ar-right"><span class="ar-price" data-px="' + a.id + '">' + fmtPrice(a, TX.priceOf(a)) + '</span><br><span class="ar-payout">' + a.payout + "%</span></span>";
      b.addEventListener("click", function () {
        if (state.sheetMode === "add") {
          if (state.tabs.indexOf(a.id) === -1) {
            state.tabs.push(a.id);
            if (state.tabs.length > 6) state.tabs.shift();
          }
        }
        closeSheet(); selectAsset(a.id); showView("trade");
      });
      box.appendChild(b);
    });
  }
  function openSheet() {
    sheet.q = ""; $("assetSheetSearch").value = "";
    renderSheetTabs(); renderSheetList();
    var s = $("assetSheet"), bd = $("assetSheetBackdrop");
    s.hidden = false; bd.hidden = false;
    void s.offsetWidth;
    s.classList.add("show"); bd.classList.add("show");
    TX.refreshPrices(false).then(function () { renderSheetList(); refreshPx(); });
    setTimeout(function () { $("assetSheetSearch").focus(); }, 350);
  }
  function closeSheet() {
    var s = $("assetSheet"), bd = $("assetSheetBackdrop");
    s.classList.remove("show"); bd.classList.remove("show");
    setTimeout(function () { s.hidden = true; bd.hidden = true; }, 340);
  }
  $("assetSheetClose").addEventListener("click", closeSheet);
  $("assetSheetBackdrop").addEventListener("click", closeSheet);
  $("assetSheetSearch").addEventListener("input", function () { sheet.q = this.value.trim(); renderSheetList(); });

  function selectAsset(id) {
    if (!id) return;
    state.assetId = id;
    if (state.tabs.indexOf(id) === -1) state.tabs.push(id);
    var a = getAsset(id);
    $("qpIcon").textContent = a ? assetIcon(a) : "?";
    $("qpName").textContent = a ? a.name : "—";
    $("qpSub").textContent = a ? assetSub(a) + " · " + assetCat(a) : "—";
    $("qpPay").textContent = a ? a.payout + "%" : "—";
    renderTabs();
    updatePreview();
    loadChart();
    renderTradeBar();
  }

  /* ---------- TradingView chart ---------- */
  var tvLoading = false;
  function ensureTV(cb) {
    if (typeof TradingView !== "undefined") { cb(true); return; }
    if (tvLoading) return;
    tvLoading = true;
    var done = false;
    function fin(ok) { if (!done) { done = true; tvLoading = false; cb(ok); } }
    var s = document.createElement("script");
    s.src = "https://s3.tradingview.com/tv.js";
    s.async = true;
    s.onload = function () { fin(typeof TradingView !== "undefined"); };
    s.onerror = function () { fin(false); };
    document.head.appendChild(s);
    setTimeout(function () { fin(typeof TradingView !== "undefined"); }, 15000);
  }
  function loadChart() {
    var a = getAsset(state.assetId);
    if (!a) return;
    var el = $("tv_chart");
    $("chartFallback").hidden = true;
    el.innerHTML = '<div class="chart-loading"><span class="spin"></span>Loading live chart…</div>';
    ensureTV(function (ok) {
      if (!ok || getAsset(state.assetId) !== a) { if (!ok) { el.innerHTML = ""; $("chartFallback").hidden = false; } return; }
      try {
        el.innerHTML = "";
        new TradingView.widget({
          autosize: true,
          symbol: a.tv,
          interval: "5",
          timezone: "Asia/Dubai",
          theme: root.getAttribute("data-theme") === "light" ? "light" : "dark",
          style: "1",
          locale: "en",
          enable_publishing: false,
          allow_symbol_change: false,
          hide_volume: false,
          container_id: "tv_chart"
        });
      } catch (e) { el.innerHTML = ""; $("chartFallback").hidden = false; }
    });
  }
  $("chartRetry").addEventListener("click", loadChart);
  $("chartReload").addEventListener("click", loadChart);

  /* ---------- live prices ---------- */
  function refreshPx() {
    document.querySelectorAll("[data-px]").forEach(function (el) {
      var a = getAsset(el.getAttribute("data-px"));
      if (a) el.textContent = fmtPrice(a, TX.priceOf(a));
    });
  }
  function refreshPrices() {
    TX.refreshPrices(false).then(function () {
      refreshPx();
      if (!$("assetSheet").hidden) renderSheetList();
      if ($("view-markets").classList.contains("active")) renderMarkets();
      renderSentiment();
    });
  }
  setInterval(refreshPrices, 60000);

  /* ---------- demo book sentiment ---------- */
  function renderSentiment() {
    var open = store.trades.filter(function (t) { return t.status === "open"; });
    var up = open.filter(function (t) { return t.dir === "up"; }).length;
    var pct = open.length ? Math.round(up / open.length * 100) : 50;
    $("sentUp").textContent = pct + "%";
    $("sentDn").textContent = (100 - pct) + "%";
    $("sentFill").style.height = pct + "%";
    $("sentBar").title = "Demo book sentiment · " + open.length + " open demo positions";
  }

  /* ---------- trade panel ---------- */
  function limits() {
    var a = getAsset(state.assetId);
    var s = store.settings;
    var lo = Math.max(a ? a.min : 1, s.minTrade);
    var hi = Math.min(a ? a.max : 100000, s.maxTrade);
    return { lo: lo, hi: hi };
  }
  function expLabel() { return EXP_L[state.expIdx]; }
  function updatePreview() {
    var a = getAsset(state.assetId);
    var l = limits();
    state.amount = Math.min(Math.max(state.amount, l.lo), l.hi);
    $("aVal").textContent = state.amount;
    $("tVal").textContent = expLabel();
    var ret = a ? state.amount * (1 + a.payout / 100) : 0;
    $("qpPayout").textContent = TX.fmt(ret);
    $("upReturn").textContent = "win " + TX.fmt(ret);
    $("downReturn").textContent = "win " + TX.fmt(ret);
  }
  function stepAmt(d) {
    var a = state.amount;
    var step = a < 10 ? 1 : a < 100 ? 10 : 50;
    state.amount = Math.max(1, Math.round((a + d * step) * 100) / 100);
    updatePreview();
  }
  $("aDown").addEventListener("click", function () { stepAmt(-1); });
  $("aUp").addEventListener("click", function () { stepAmt(1); });
  $("tDown").addEventListener("click", function () { state.expIdx = Math.max(0, state.expIdx - 1); updatePreview(); });
  $("tUp").addEventListener("click", function () { state.expIdx = Math.min(EXP.length - 1, state.expIdx + 1); updatePreview(); });
  $("aSwitch").addEventListener("click", function () {
    var box = $("qpChips");
    if (box.hidden) {
      box.innerHTML = "";
      CHIPS.forEach(function (c) {
        var b = document.createElement("button");
        b.type = "button"; b.textContent = "$" + c;
        if (c === state.amount) b.classList.add("active");
        b.addEventListener("click", function () { state.amount = c; updatePreview(); box.hidden = true; });
        box.appendChild(b);
      });
      box.hidden = false;
    } else box.hidden = true;
  });
  $("tSwitch").addEventListener("click", function () {
    var box = $("qpTimes");
    if (box.hidden) {
      box.innerHTML = "";
      EXP_L.forEach(function (lab, i) {
        var b = document.createElement("button");
        b.type = "button"; b.textContent = lab;
        if (i === state.expIdx) b.classList.add("active");
        b.addEventListener("click", function () { state.expIdx = i; updatePreview(); box.hidden = true; });
        box.appendChild(b);
      });
      box.hidden = false;
    } else box.hidden = true;
  });

  function placeTrade(dir) {
    if (store.settings.maintenance) { toast("Trading is paused for maintenance."); return; }
    var a = getAsset(state.assetId);
    if (!a) { toast("Select an asset first."); return; }
    var l = limits(), amt = Math.round(state.amount * 100) / 100;
    if (!(amt >= l.lo)) { toast("Minimum trade is " + TX.fmt(l.lo) + "."); return; }
    if (amt > l.hi) { toast("Maximum trade is " + TX.fmt(l.hi) + "."); return; }
    if (amt > user.balance) { toast("Insufficient demo balance."); return; }
    var maxOpen = store.settings.maxOpenPerUser || 10;
    var openN = store.trades.filter(function (t) { return t.userId === user.id && t.status === "open"; }).length;
    if (openN >= maxOpen) { toast("Position limit reached (" + maxOpen + " open). Close one first."); return; }
    toast("Locking live price…");
    TX.refreshPrices(true).then(function (ok) {
      var entry = TX.priceOf(a);
      if (!ok || entry == null) { toast("Live price unavailable — try again."); return; }
      user.balance = Math.round((user.balance - amt) * 100) / 100;
      var now = Date.now();
      var secs = EXP[state.expIdx];
      store.trades.push({
        id: TX.uid("t"), userId: user.id, userEmail: user.email,
        assetId: a.id, assetName: a.name, dir: dir,
        amount: amt, payout: a.payout, entryPrice: entry,
        openedAt: now, expiresAt: now + secs * 1000,
        status: "open", retries: 0
      });
      store.seq++; TX.save(store);
      renderBalance(); renderPositions(); renderTradeBar(); renderSentiment();
      toast("Position opened: " + a.name + " " + dir.toUpperCase() + " " + TX.fmt(amt));
    });
  }
  $("btnUp").addEventListener("click", function () { placeTrade("up"); });
  $("btnDown").addEventListener("click", function () { placeTrade("down"); });

  /* ---------- positions + settlement ---------- */
  function openTrades() {
    return store.trades.filter(function (t) { return t.userId === user.id && t.status === "open"; })
      .sort(function (a, b) { return a.expiresAt - b.expiresAt; });
  }
  function fmtCountdown(ms) {
    if (ms < 0) ms = 0;
    var s = Math.ceil(ms / 1000);
    var m = Math.floor(s / 60), ss = s % 60;
    return (m < 10 ? "0" + m : m) + ":" + (ss < 10 ? "0" + ss : ss);
  }
  function renderPositions() {
    var box = $("openList");
    var list = openTrades();
    $("posCount").textContent = list.length ? "(" + list.length + ")" : "";
    if (!list.length) { box.innerHTML = '<div class="qp-empty">No open trades.<br>Pick a direction to start.</div>'; return; }
    box.innerHTML = "";
    list.forEach(function (t) {
      var a = getAsset(t.assetId);
      var d = document.createElement("div");
      d.className = "qp-trade";
      d.innerHTML =
        '<span class="qt-ico sm">' + TX.esc(a ? assetIcon(a) : "?") + "</span>" +
        '<span class="qpt-t"><b>' + TX.esc(t.assetName) + ' <em class="' + t.dir + '">' + t.dir.toUpperCase() + "</em></b>" +
        "<small>" + TX.fmt(t.amount) + " · entry " + (t.entryPrice == null ? "—" : t.entryPrice) + "</small></span>" +
        '<span class="qpt-r"><b class="countdown" data-exp="' + t.expiresAt + '">--:--</b>' +
        '<small class="pos-live" data-live="' + t.id + '"><i></i><em>live</em></small></span>' +
        (store.settings.earlyClose ? '<button class="qpt-x" data-early="' + t.id + '" type="button" title="Early close">✕</button>' : "");
      box.appendChild(d);
    });
    box.querySelectorAll("[data-early]").forEach(function (b) {
      b.addEventListener("click", function () { earlyClose(b.getAttribute("data-early")); });
    });
    tickCountdowns();
  }
  function renderTradeBar() {
    var bar = $("tradeBar");
    var t = openTrades().filter(function (x) { return x.assetId === state.assetId; })[0];
    if (!t) { bar.hidden = true; return; }
    bar.hidden = false;
    var a = getAsset(t.assetId);
    $("tradeBarIco").textContent = a ? assetIcon(a) : "?";
    $("tradeBarName").textContent = t.assetName + " · " + t.dir.toUpperCase() + " " + TX.fmt(t.amount);
    $("tradeBarSub").textContent = "entry " + (t.entryPrice == null ? "—" : t.entryPrice) + " · payout " + t.payout + "%";
    bar.setAttribute("data-tid", t.id);
  }
  function tickCountdowns() {
    var now = Date.now();
    document.querySelectorAll(".countdown").forEach(function (el) {
      el.textContent = fmtCountdown(parseInt(el.getAttribute("data-exp"), 10) - now);
    });
    document.querySelectorAll("[data-live]").forEach(function (el) {
      var t = null;
      for (var i = 0; i < store.trades.length; i++) if (store.trades[i].id === el.getAttribute("data-live")) t = store.trades[i];
      if (!t) return;
      var a = getAsset(t.assetId), cur = a ? TX.priceOf(a) : null;
      if (cur == null || t.entryPrice == null) { el.className = "pos-live flat"; return; }
      var winning = t.dir === "up" ? cur > t.entryPrice : cur < t.entryPrice;
      var tied = cur === t.entryPrice;
      el.className = "pos-live " + (tied ? "flat" : winning ? "up" : "down");
    });
    /* trade bar on chart */
    var bar = $("tradeBar");
    if (!bar.hidden) {
      var t = null, tid = bar.getAttribute("data-tid");
      for (var i = 0; i < store.trades.length; i++) if (store.trades[i].id === tid) t = store.trades[i];
      if (!t || t.status !== "open") { bar.hidden = true; }
      else {
        $("tradeBarCount").textContent = fmtCountdown(t.expiresAt - now);
        var p = (now - t.openedAt) / Math.max(1, t.expiresAt - t.openedAt);
        $("tradeBarProg").style.width = Math.min(100, Math.max(0, p * 100)) + "%";
      }
    }
  }

  /* ---------- settlement notification (iOS style) + bell ---------- */
  var noteQueue = [], noteBusy = false;
  function unread(n) {
    var b = $("bellBadge");
    if (!n) { b.hidden = true; return; }
    b.hidden = false; b.textContent = n > 9 ? "9+" : n;
  }
  function bumpBell() {
    var n = parseInt($("bellBadge").textContent, 10);
    unread((isNaN(n) ? 0 : n) + 1);
  }
  $("bellBtn").addEventListener("click", function () { unread(0); showView("history"); });
  function notifySettle(t) {
    bumpBell();
    var title, cls;
    if (t.result === "win") { title = "Trade won  +" + TX.fmt(t.pl); cls = "win"; }
    else if (t.result === "loss") { title = "Trade lost  " + TX.fmt(t.pl); cls = "loss"; }
    else if (t.result === "tie") { title = "Trade tied — stake refunded"; cls = "tie"; }
    else if (t.result === "early") { title = "Closed early  " + (t.pl >= 0 ? "+" : "") + TX.fmt(t.pl); cls = t.pl >= 0 ? "win" : "loss"; }
    else return;
    noteQueue.push({ t: t, title: title, cls: cls });
    pumpNotes();
  }
  function pumpNotes() {
    if (noteBusy || !noteQueue.length) return;
    noteBusy = true;
    var n = noteQueue.shift(), t = n.t;
    var titleEl = $("snTitle");
    titleEl.textContent = n.title;
    titleEl.className = "sn-title " + n.cls;
    $("snSub").textContent = t.assetName + " · " + String(t.dir).toUpperCase() + " · " + TX.fmt(t.amount);
    var el = $("settleNote");
    el.hidden = false;
    el.classList.remove("hide");
    void el.offsetWidth;
    el.classList.add("show");
    var done = false;
    function dismiss(go) {
      if (done) return; done = true;
      clearTimeout(el._h);
      el.classList.remove("show"); el.classList.add("hide");
      setTimeout(function () { el.hidden = true; el.classList.remove("hide"); noteBusy = false; pumpNotes(); }, 280);
      if (go) { showView("history"); highlightTrade(t.id); }
    }
    el.onclick = function () { dismiss(true); };
    el._h = setTimeout(function () { dismiss(false); }, 5200);
  }
  function highlightTrade(id) {
    setTimeout(function () {
      var row = document.getElementById("hist_" + id);
      if (row) {
        row.scrollIntoView({ block: "center", behavior: "smooth" });
        row.classList.remove("flash");
        void row.offsetWidth;
        row.classList.add("flash");
        setTimeout(function () { row.classList.remove("flash"); }, 2600);
      }
    }, 380);
  }

  function earlyClose(id) {
    var t = null;
    for (var i = 0; i < store.trades.length; i++) if (store.trades[i].id === id) t = store.trades[i];
    if (!t || t.status !== "open") return;
    TX.refreshPrices(true).then(function (ok) {
      var a = getAsset(t.assetId);
      var cur = a ? TX.priceOf(a) : null;
      if (!ok || cur == null) { toast("Live price unavailable — try again."); return; }
      var total = t.expiresAt - t.openedAt, elapsed = Math.min(Math.max(Date.now() - t.openedAt, 0), total);
      var frac = total > 0 ? elapsed / total : 1;
      var winning = t.dir === "up" ? cur > t.entryPrice : cur < t.entryPrice;
      var value = winning
        ? t.amount + (t.amount * t.payout / 100) * 0.5 * frac
        : t.amount * 0.5 * (1 - frac);
      value = Math.round(value * 100) / 100;
      t.status = "closed"; t.result = "early"; t.exitPrice = cur;
      t.closedAt = Date.now(); t.pl = Math.round((value - t.amount) * 100) / 100;
      user.balance = Math.round((user.balance + value) * 100) / 100;
      TX.save(store);
      renderBalance(); renderPositions(); renderTradeBar(); renderSentiment();
      notifySettle(t);
      toast("Closed early: " + TX.fmt(value) + " returned.");
    });
  }

  function settleDue() {
    var now = Date.now();
    var due = store.trades.filter(function (t) { return t.userId === user.id && t.status === "open" && t.expiresAt <= now; });
    if (!due.length) return;
    TX.refreshPrices(true).then(function (ok) {
      var changed = false;
      due.forEach(function (t) {
        var a = getAsset(t.assetId);
        var exit = a ? TX.priceOf(a) : null;
        if (!ok || exit == null) {
          t.retries = (t.retries || 0) + 1;
          if (t.retries >= 8) {
            t.status = "closed"; t.result = "void"; t.exitPrice = null;
            t.closedAt = Date.now(); t.pl = 0; t.note = "feed unavailable — stake refunded";
            user.balance = Math.round((user.balance + t.amount) * 100) / 100;
            changed = true;
            toast("A trade was voided (price feed unavailable) — stake refunded.");
          }
          return;
        }
        var win = t.dir === "up" ? exit > t.entryPrice : exit < t.entryPrice;
        var tie = exit === t.entryPrice;
        t.status = "closed"; t.exitPrice = exit; t.closedAt = Date.now();
        if (tie) { t.result = "tie"; t.pl = 0; user.balance = Math.round((user.balance + t.amount) * 100) / 100; }
        else if (win) {
          t.result = "win";
          var credit = t.amount * (1 + t.payout / 100);
          t.pl = Math.round((credit - t.amount) * 100) / 100;
          user.balance = Math.round((user.balance + credit) * 100) / 100;
        } else { t.result = "loss"; t.pl = -t.amount; }
        changed = true;
        notifySettle(t);
      });
      if (changed) {
        TX.save(store); renderBalance(); renderPositions(); renderTradeBar(); renderSentiment();
        if ($("view-history").classList.contains("active")) renderHistory();
      }
    });
  }
  setInterval(function () { tickCountdowns(); settleDue(); tourTick(); }, 1000);

  /* ---------- history ---------- */
  var histFilter = "";
  $("histFilters").addEventListener("click", function (e) {
    var b = e.target.closest("[data-f]"); if (!b) return;
    document.querySelectorAll("#histFilters .fpill").forEach(function (p) { p.classList.remove("active"); });
    b.classList.add("active");
    histFilter = b.getAttribute("data-f");
    renderHistory();
  });
  function renderHistory() {
    var all = store.trades.filter(function (t) { return t.userId === user.id && t.status === "closed"; })
      .sort(function (a, b) { return b.closedAt - a.closedAt; });
    var pl = all.reduce(function (x, t) { return x + (t.pl || 0); }, 0);
    var c = all.filter(function (t) { return t.result !== "void"; });
    var w = c.filter(function (t) { return t.result === "win"; }).length;
    var plEl = $("hPL"); plEl.textContent = (pl >= 0 ? "+" : "−") + TX.fmt(Math.abs(pl));
    plEl.style.color = pl >= 0 ? "#4ade80" : "#ff8a94";
    $("hWR").textContent = c.length ? Math.round(w / c.length * 100) + "%" : "—";
    $("hCount").textContent = all.length;
    var rows = all.filter(function (t) {
      if (histFilter === "win") return t.result === "win";
      if (histFilter === "loss") return t.result === "loss";
      if (histFilter === "other") return t.result !== "win" && t.result !== "loss";
      return true;
    }).slice(0, 100);
    var tb = $("histTable").querySelector("tbody"); tb.innerHTML = "";
    $("histEmpty").hidden = rows.length > 0;
    $("histTable").style.display = rows.length ? "" : "none";
    rows.forEach(function (t) {
      var tr = document.createElement("tr");
      tr.id = "hist_" + t.id;
      var rc = t.result === "win" ? "result-win" : (t.result === "loss" ? "result-loss" : "result-void");
      tr.innerHTML = "<td>" + TX.fmtTime(t.closedAt) + "</td><td>" + TX.esc(t.assetName) + "</td>" +
        "<td>" + t.dir.toUpperCase() + "</td><td>" + TX.fmt(t.amount) + "</td>" +
        "<td>" + (t.entryPrice == null ? "—" : t.entryPrice) + "</td>" +
        "<td>" + (t.exitPrice == null ? "—" : t.exitPrice) + "</td>" +
        '<td class="' + rc + '">' + (t.pl > 0 ? "+" : "") + TX.fmt(t.pl) + (t.result === "early" ? " (early)" : t.result === "tie" ? " (tie)" : t.result === "void" ? " (void)" : "") + "</td>";
      tb.appendChild(tr);
    });
  }

  /* ---------- markets ---------- */
  var mkt = { tab: "All", q: "" };
  $("mktSearch").addEventListener("input", function () { mkt.q = this.value.trim(); renderMarkets(); });
  function renderMarkets() {
    var tabs = $("mktTabs"); tabs.innerHTML = "";
    sheetCats().forEach(function (c) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "sheet-tab" + (c === mkt.tab ? " active" : "");
      b.textContent = c;
      b.addEventListener("click", function () { mkt.tab = c; renderMarkets(); });
      tabs.appendChild(b);
    });
    var grid = $("mktGrid"); grid.innerHTML = "";
    var q = mkt.q.toLowerCase();
    enabledAssets().filter(function (a) {
      if (mkt.tab !== "All" && assetCat(a) !== mkt.tab) return false;
      if (q && (a.name.toLowerCase().indexOf(q) === -1 && assetSub(a).toLowerCase().indexOf(q) === -1)) return false;
      return true;
    }).forEach(function (a) {
      var d = document.createElement("div");
      d.className = "mkt-card";
      d.innerHTML =
        '<span class="ar-icon">' + TX.esc(assetIcon(a)) + "</span>" +
        '<span class="mkt-t"><b>' + TX.esc(a.name) + "</b><small>" + TX.esc(assetSub(a)) + "</small>" +
        '<strong class="mkt-px">' + fmtPrice(a, TX.priceOf(a)) + "</strong></span>" +
        '<span class="mkt-r"><span class="ar-payout">' + a.payout + '%</span><button class="btn btn-primary btn-sm" type="button">Trade</button></span>';
      d.querySelector("button").addEventListener("click", function () {
        if (state.tabs.indexOf(a.id) === -1) { state.tabs.push(a.id); if (state.tabs.length > 6) state.tabs.shift(); }
        selectAsset(a.id); showView("trade");
      });
      grid.appendChild(d);
    });
    if (!grid.children.length) grid.innerHTML = '<div class="empty">No assets match.</div>';
  }

  /* ---------- tournaments (demo) ---------- */
  var TOURS = [
    { id: "sprint", name: "Demo Sprint", desc: "All assets · highest demo P/L wins", prize: 500, days: 7 },
    { id: "crypto", name: "Crypto Clash", desc: "BTC & ETH only · highest demo P/L wins", prize: 250, days: 3 },
    { id: "rookie", name: "Rookie Cup", desc: "Accounts under 30 days · highest win rate", prize: 100, days: 5 }
  ];
  function tourEnd(t) {
    var now = new Date();
    var end = new Date(now.getTime() + t.days * 86400000);
    return end.getTime();
  }
  function tourJoined() {
    try { return JSON.parse(sessionStorage.getItem("tx_tours") || "[]"); }
    catch (e) { return []; }
  }
  function renderTours() {
    var grid = $("tourGrid"); grid.innerHTML = "";
    var joined = tourJoined();
    TOURS.forEach(function (t) {
      var d = document.createElement("div");
      d.className = "tour-card";
      var isIn = joined.indexOf(t.id) !== -1;
      d.innerHTML =
        '<div class="tour-top"><span class="tour-ico">🏆</span><div><b>' + t.name + "</b><small>" + t.desc + "</small></div></div>" +
        '<div class="tour-meta"><span>Prize <b class="gold">$' + t.prize + ' <small>virtual</small></b></span>' +
        '<span>Ends in <b class="countdown tour-cd" data-tour="' + t.id + '">--:--</b></span></div>' +
        '<button class="btn ' + (isIn ? "btn-ghost" : "btn-primary") + ' btn-sm" type="button" style="width:100%">' + (isIn ? "Joined ✓" : "Join free") + "</button>";
      if (!isIn) d.querySelector("button").addEventListener("click", function () {
        joined.push(t.id);
        try { sessionStorage.setItem("tx_tours", JSON.stringify(joined)); } catch (e) {}
        toast("You're in the " + t.name + " — good luck (demo).");
        renderTours();
      });
      grid.appendChild(d);
    });
    /* leaderboard — demo P/L this week */
    var weekAgo = Date.now() - 7 * 86400000;
    var rows = store.users.filter(function (u) { return !u.disabled; }).map(function (u) {
      var ts = store.trades.filter(function (x) { return x.userId === u.id && x.status === "closed" && x.closedAt >= weekAgo && x.result !== "void"; });
      var pl = ts.reduce(function (s, x) { return s + (x.pl || 0); }, 0);
      var w = ts.filter(function (x) { return x.result === "win"; }).length;
      return { email: u.email, n: ts.length, wr: ts.length ? Math.round(w / ts.length * 100) : 0, pl: pl };
    }).filter(function (r) { return r.n > 0; })
      .sort(function (a, b) { return b.pl - a.pl; }).slice(0, 10);
    var tb = $("tourTable").querySelector("tbody"); tb.innerHTML = "";
    rows.forEach(function (r, i) {
      var tr = document.createElement("tr");
      var medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : (i + 1);
      var name = r.email.split("@")[0];
      tr.innerHTML = "<td>" + medal + "</td><td>" + TX.esc(name) + (r.email === user.email ? " <b>(you)</b>" : "") + "</td>" +
        "<td>" + r.n + "</td><td>" + r.wr + "%</td>" +
        '<td style="font-weight:700;color:' + (r.pl >= 0 ? "#4ade80" : "#ff8a94") + '">' + (r.pl >= 0 ? "+" : "−") + TX.fmt(Math.abs(r.pl)) + "</td>";
      tb.appendChild(tr);
    });
    if (!rows.length) tb.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--faint)">No demo trades this week yet.</td></tr>';
    tourTick();
  }
  function tourTick() {
    var now = Date.now();
    document.querySelectorAll(".tour-cd").forEach(function (el) {
      var t = null;
      for (var i = 0; i < TOURS.length; i++) if (TOURS[i].id === el.getAttribute("data-tour")) t = TOURS[i];
      if (!t) return;
      var ms = tourEnd(t) - now;
      var d = Math.floor(ms / 86400000), h = Math.floor(ms % 86400000 / 3600000), m = Math.floor(ms % 3600000 / 60000);
      el.textContent = d + "d " + h + "h " + m + "m";
    });
  }

  /* ---------- wallet ---------- */
  function renderWallet() {
    renderBalance();
    var rows = store.requests.filter(function (r) { return r.userId === user.id; })
      .sort(function (a, b) { return b.createdAt - a.createdAt; });
    var tb = $("reqTable").querySelector("tbody"); tb.innerHTML = "";
    $("reqEmpty").hidden = rows.length > 0;
    $("reqTable").style.display = rows.length ? "" : "none";
    rows.forEach(function (r) {
      var tr = document.createElement("tr");
      tr.innerHTML = "<td>" + TX.fmtTime(r.createdAt) + "</td><td style='text-transform:capitalize'>" + r.type + "</td>" +
        "<td>" + TX.fmt(r.amount) + "</td><td>" + TX.esc(r.method) + "</td>" +
        '<td class="status-' + r.status + '">' + r.status + "</td>";
      tb.appendChild(tr);
    });
    var moves = [];
    store.trades.filter(function (t) { return t.userId === user.id; }).forEach(function (t) {
      moves.push({ at: t.openedAt, label: t.assetName + " " + t.dir.toUpperCase() + " — stake", amt: -t.amount });
      if (t.status === "closed") {
        if (t.result === "win") moves.push({ at: t.closedAt, label: t.assetName + " — payout", amt: t.amount + (t.pl || 0) });
        else if (t.result === "tie" || t.result === "void") moves.push({ at: t.closedAt, label: t.assetName + " — stake refunded", amt: t.amount });
        else if (t.result === "early") moves.push({ at: t.closedAt, label: t.assetName + " — early close value", amt: t.amount + (t.pl || 0) });
      }
    });
    store.requests.filter(function (r) { return r.userId === user.id && r.status !== "pending"; }).forEach(function (r) {
      moves.push({
        at: r.createdAt,
        label: (r.type === "deposit" ? "Deposit via " : "Withdrawal via ") + r.method + (r.status === "rejected" ? " — rejected" : ""),
        amt: r.status === "approved" ? (r.type === "deposit" ? r.amount : -r.amount) : 0
      });
    });
    moves.sort(function (a, b) { return b.at - a.at; });
    var lb = $("ledgerTable").querySelector("tbody"); lb.innerHTML = "";
    $("ledgerEmpty").hidden = moves.length > 0;
    $("ledgerTable").style.display = moves.length ? "" : "none";
    moves.slice(0, 100).forEach(function (m) {
      var tr = document.createElement("tr");
      tr.innerHTML = "<td>" + TX.fmtTime(m.at) + "</td><td>" + TX.esc(m.label) + "</td>" +
        '<td style="font-weight:700;color:' + (m.amt > 0 ? "#4ade80" : m.amt < 0 ? "#ff8a94" : "var(--muted)") + '">' +
        (m.amt > 0 ? "+" : m.amt < 0 ? "−" : "") + TX.fmt(Math.abs(m.amt)) + "</td>";
      lb.appendChild(tr);
    });
  }
  $("depBtn").addEventListener("click", function () {
    var amt = Math.round(parseFloat($("depAmt").value) * 100) / 100;
    if (!(amt >= 10)) { toast("Minimum request is $10."); return; }
    store.requests.push({ id: TX.uid("r"), userId: user.id, userEmail: user.email, type: "deposit", amount: amt, method: $("depMethod").value, status: "pending", createdAt: Date.now() });
    TX.save(store); renderWallet();
    toast("Deposit request sent — admin will approve it.");
  });
  $("wdBtn").addEventListener("click", function () {
    var amt = Math.round(parseFloat($("wdAmt").value) * 100) / 100;
    if (!(amt >= 10)) { toast("Minimum request is $10."); return; }
    if (amt > user.balance) { toast("Amount exceeds your demo balance."); return; }
    store.requests.push({ id: TX.uid("r"), userId: user.id, userEmail: user.email, type: "withdrawal", amount: amt, method: $("wdMethod").value, status: "pending", createdAt: Date.now() });
    TX.save(store); renderWallet();
    toast("Withdrawal request sent — admin will approve it.");
  });

  /* ---------- init ---------- */
  if (store.settings.maintenance) $("maintBanner").hidden = false;
  renderBalance();
  var ea = enabledAssets();
  state.tabs = ea.slice(0, 3).map(function (a) { return a.id; });
  selectAsset(state.tabs[0]);
  updatePreview();
  renderPositions();
  renderSentiment();
  refreshPrices();
})();
