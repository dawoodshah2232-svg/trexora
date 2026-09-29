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
    applyChartTheme();
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
    if (name === "market") renderMarket();
    if (name === "analytics") renderAnalytics();
    window.scrollTo(0, 0);
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
    if ($("acctBal")) $("acctBal").textContent = TX.fmt(user.balance);
    if ($("acctAvail")) $("acctAvail").textContent = TX.fmt(user.balance);
    if ($("wdBal")) $("wdBal").textContent = TX.fmt(user.balance);
    if ($("wdAvail")) $("wdAvail").textContent = TX.fmt(user.balance);
    if ($("amDemoBal")) $("amDemoBal").textContent = TX.fmt(user.balance);
    if ($("amEmail")) $("amEmail").textContent = user.email;
    if ($("amId")) $("amId").textContent = String(user.id).replace(/[^0-9]/g, "").slice(-8) || "94064839";
    renderWdReq();
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
  /* THE price: Deriv's live quote is the single truth for ticket, chart, and
   * settlement. CoinGecko (TX.priceOf) is only a fallback so the UI never
   * shows "—" when the socket is briefly down. */
  function pxOf(a) {
    if (!a) return null;
    if (window.DerivFeed) {
      var p = DerivFeed.priceOf(a.id);
      if (p != null) return p;
    }
    return TX.priceOf(a);
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
        '<span class="qt-ico">' + TX.assetIconHTML(a) + "</span>" +
        '<span class="qt-t"><b>' + TX.esc(a.name) + '</b><small data-px="' + a.id + '">' + fmtPrice(a, pxOf(a)) + "</small></span>" +
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
        '<span class="ar-icon">' + TX.assetIconHTML(a) + "</span>" +
        '<span class="ar-names"><strong>' + TX.esc(a.name) + "</strong><small>" + TX.esc(assetSub(a)) + " · " + TX.esc(assetCat(a)) + "</small></span>" +
        '<span class="ar-right"><span class="ar-price" data-px="' + a.id + '">' + fmtPrice(a, pxOf(a)) + '</span><br><span class="ar-payout">' + a.payout + "%</span></span>";
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
    $("qpIcon").innerHTML = TX.assetIconHTML(a);
    $("qpName").textContent = a ? a.name : "—";
    $("qpSub").textContent = a ? assetSub(a) + " · " + assetCat(a) : "—";
    $("qpPay").textContent = a ? a.payout + "%" : "—";
    renderTabs();
    updatePreview();
    loadChart();
    drawMini();
    renderTradeBar();
  }

  /* ---------- live chart: bundled Lightweight Charts v5 + Deriv feed ----------
   * OWNER CHART STANDARD: one implementation only — no hosted TradingView
   * widget, no runtime CDN. Lightweight Charts v5 is bundled in app/vendor/.
   * DerivFeed owns quotes, candles and settlement prices: the chart, the
   * ticket price and trade settlement all read the same Deriv WebSocket feed.
   * The chart renders Deriv's own candles (Unix-seconds timestamps) and the
   * feed badge next to it always tells the truth about the feed state
   * (LIVE/STALE/RECONNECTING/CLOSED/OFFLINE). Never presents simulated
   * prices as live.
   * Admin (Settings > Charts & Market Data) controls: style, theme, default
   * timeframe and up/down colors — applied to this single chart on next load.
   * settings.chart = { style:'candles'|'line'|'area', theme:'auto'|'dark'|'light',
   *   tf:60|300|900, up:'#2F80FF', down:'#F23645' } */
  function chartSettings() {
    var d = { style: "candles", theme: "auto", tf: 60, up: "#2F80FF", down: "#F23645" };
    try {
      var c = (TX.load().settings || {}).chart;
      if (c && typeof c === "object") {
        var st = c.style || c.tvStyle; /* tvStyle = legacy key */
        if (["candles", "line", "area"].indexOf(st) !== -1) d.style = st;
        var th = c.theme || c.tvTheme; /* tvTheme = legacy key */
        if (["auto", "dark", "light"].indexOf(th) !== -1) d.theme = th;
        var raw = c.tf != null ? c.tf : (c.tvTf != null ? c.tvTf : c.lwTf); /* legacy keys */
        var tf = parseInt(raw, 10);
        if (tf === 60 || tf === 300 || tf === 900) d.tf = tf;
        else if (tf === 1) d.tf = 60;
        else if (tf === 5) d.tf = 300;
        else if (tf === 15) d.tf = 900;
        var up = c.up || c.lwUp, down = c.down || c.lwDown; /* lwUp/lwDown = legacy keys */
        if (/^#[0-9a-fA-F]{6}$/.test(up || "")) d.up = up;
        if (/^#[0-9a-fA-F]{6}$/.test(down || "")) d.down = down;
      }
    } catch (e) {}
    return d;
  }
  var chartCS = null; /* current admin chart settings */
  var chartTF = 60, chartTFInit = false; /* seconds: 60=M1 300=M5 900=M15 */
  var lwChart = null, lwSeries = null, chartAssetId = null, chartGran = 0, chartKind = "";
  var TFS = [{ g: 60, l: "M1" }, { g: 300, l: "M5" }, { g: 900, l: "M15" }];

  function seriesKind(cs) {
    return (cs && (cs.style === "line" || cs.style === "area")) ? cs.style : "candles";
  }
  function hexA(hex, a) {
    var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return "rgba(" + r + "," + g + "," + b + "," + a + ")";
  }
  /* Trexora theme: navy #0A1322 chart background in dark mode, #F1F5FB in light — never black. */
  function chartTheme() {
    var siteLight = root.getAttribute("data-theme") === "light";
    var light = chartCS && chartCS.theme === "dark" ? false : chartCS && chartCS.theme === "light" ? true : siteLight;
    return {
      layout: { background: { type: "solid", color: light ? "#F1F5FB" : "#0A1322" },
                textColor: light ? "#4A5B7C" : "#8FA3C7", attributionLogo: true },
      grid: { vertLines: { color: light ? "rgba(14,27,51,0.07)" : "rgba(143,163,199,0.08)" },
              horzLines: { color: light ? "rgba(14,27,51,0.07)" : "rgba(143,163,199,0.08)" } },
      timeScale: { borderColor: light ? "rgba(14,27,51,0.14)" : "rgba(143,163,199,0.16)", timeVisible: true, secondsVisible: false },
      rightPriceScale: { borderColor: light ? "rgba(14,27,51,0.14)" : "rgba(143,163,199,0.16)" },
      crosshair: { vertLine: { color: light ? "#8FA3C7" : "#5B6B8C", labelBackgroundColor: light ? "#1B63D6" : "#2F80FF" },
                   horzLine: { color: light ? "#8FA3C7" : "#5B6B8C", labelBackgroundColor: light ? "#1B63D6" : "#2F80FF" } }
    };
  }
  function applyChartTheme() {
    if (!lwChart) return;
    try { chartCS = chartSettings(); lwChart.applyOptions(chartTheme()); } catch (e) {}
  }
  function addChartSeries(cs) {
    var kind = seriesKind(cs);
    if (kind === "line") return lwChart.addSeries(LightweightCharts.LineSeries, {
      color: cs.up, lineWidth: 2, priceLineVisible: true, lastValueVisible: true, crosshairMarkerVisible: true });
    if (kind === "area") return lwChart.addSeries(LightweightCharts.AreaSeries, {
      lineColor: cs.up, topColor: hexA(cs.up, 0.35), bottomColor: hexA(cs.up, 0),
      lineWidth: 2, priceLineVisible: true, lastValueVisible: true, crosshairMarkerVisible: true });
    return lwChart.addSeries(LightweightCharts.CandlestickSeries, {
      upColor: cs.up, downColor: cs.down, wickUpColor: cs.up, wickDownColor: cs.down,
      borderVisible: false, priceLineVisible: true, lastValueVisible: true });
  }
  function ensureChart() {
    var el = $("tv_chart");
    if (!window.LightweightCharts) { el.innerHTML = ""; $("chartFallback").hidden = false; return false; }
    $("chartFallback").hidden = true;
    var kind = seriesKind(chartCS);
    if (lwChart && chartAssetId === state.assetId && chartGran === chartTF && chartKind === kind) return true;
    try { if (lwChart) { lwChart.remove(); } } catch (e) {}
    lwChart = null; lwSeries = null;
    el.innerHTML = "";
    try {
      lwChart = LightweightCharts.createChart(el, Object.assign({ width: el.clientWidth || 320, height: el.clientHeight || 300 }, chartTheme()));
      lwSeries = addChartSeries(chartCS || chartSettings());
      chartKind = kind;
      lwChart.timeScale().scrollToRealTime();
      new ResizeObserver(function () {
        try { lwChart.applyOptions({ width: el.clientWidth, height: el.clientHeight }); } catch (e2) {}
      }).observe(el);
    } catch (e) { el.innerHTML = ""; $("chartFallback").hidden = false; return false; }
    chartAssetId = state.assetId; chartGran = chartTF;
    renderTfPills();
    return true;
  }
  function renderTfPills() {
    var box = $("tfPills");
    if (!box) return;
    box.style.display = "";
    box.innerHTML = "";
    TFS.forEach(function (t) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "tf-pill" + (t.g === chartTF ? " on" : "");
      b.textContent = t.l;
      b.addEventListener("click", function () {
        if (chartTF === t.g) return;
        if (chartAssetId) DerivFeed.unwatch(chartAssetId, chartTF);
        chartTF = t.g;
        loadChart();
      });
      box.appendChild(b);
    });
  }
  function paintCandles(assetId, gran, candles, full) {
    if (!lwSeries || assetId !== chartAssetId || gran !== chartGran) return;
    try {
      var data = candles;
      if (chartKind !== "candles") {
        data = [];
        for (var i = 0; i < candles.length; i++) {
          var k = candles[i];
          if (k && isFinite(k.close)) data.push({ time: k.time, value: k.close });
        }
      }
      if (full) { lwSeries.setData(data); }
      else if (data.length) { lwSeries.update(data[data.length - 1]); }
    } catch (e) {}
  }
  function loadChart() {
    var a = getAsset(state.assetId);
    if (!a || !window.DerivFeed) return;
    chartCS = chartSettings();
    if (!chartTFInit) { chartTF = chartCS.tf; chartTFInit = true; }
    var sl = $("chartSrcLabel"); if (sl) sl.hidden = true;
    if (!DerivFeed.symbols[a.id]) { /* asset without a Deriv mapping: honest fallback */
      var el = $("tv_chart");
      el.innerHTML = "";
      $("chartFallback").hidden = false;
      renderFeedBadge(a.id, chartTF, { state: "OFFLINE", source: "Deriv", updatedAt: 0 });
      return;
    }
    ensurePriceWatch(a.id);
    var prevId = chartAssetId, prevGran = chartGran;
    if (!ensureChart()) return;
    if (prevId && (prevId !== a.id || prevGran !== chartTF)) DerivFeed.unwatch(prevId, prevGran);
    // seed instantly from cache, then live
    var cached = DerivFeed.candlesOf(a.id, chartTF);
    if (cached.length) paintCandles(a.id, chartTF, cached, true);
    DerivFeed.watch(a.id, chartTF);
    chartAssetId = a.id; chartGran = chartTF;
    var st = DerivFeed.stateOf(a.id, chartTF);
    renderFeedBadge(a.id, chartTF, st);
    if (st.state === "LIVE") {
      var live = DerivFeed.candlesOf(a.id, chartTF);
      if (live.length) paintCandles(a.id, chartTF, live, true);
    }
  }
  /* ----- price watch: Deriv always feeds ticket + settlement ----- */
  var priceWatchId = null;
  function ensurePriceWatch(assetId) {
    if (!window.DerivFeed || !DerivFeed.symbols[assetId]) return;
    if (priceWatchId && priceWatchId !== assetId) { try { DerivFeed.unwatch(priceWatchId, 60); } catch (e) {} }
    if (priceWatchId !== assetId) { DerivFeed.watch(assetId, 60); priceWatchId = assetId; }
  }

  /* feed -> chart + price displays */
  if (window.DerivFeed) {
    DerivFeed.on("candles", function (ev) {
      paintCandles(ev.assetId, ev.gran, ev.candles, ev.full);
      if (ev.assetId === state.assetId) refreshPx();
    });
    DerivFeed.on("state", function (ev) {
      if (ev.assetId === state.assetId && ev.gran === chartTF) renderFeedBadge(ev.assetId, ev.gran, ev);
    });
  }
  var BADGE_TXT = { LOADING: "Connecting…", LIVE: "LIVE", STALE: "STALE", RECONNECTING: "RECONNECTING", CLOSED: "CLOSED", OFFLINE: "OFFLINE" };
  var BADGE_CLS = { LOADING: "b-load", LIVE: "b-live", STALE: "b-stale", RECONNECTING: "b-re", CLOSED: "b-closed", OFFLINE: "b-off" };
  function renderFeedBadge(assetId, gran, st) {
    var b = $("feedBadge");
    if (!b) return;
    st = st || { state: "LOADING", source: "Deriv", updatedAt: 0, attempts: 0 };
    var ago = st.updatedAt ? Math.max(0, Math.round((Date.now() - st.updatedAt) / 1000)) : -1;
    var extra = "";
    if (st.state === "LIVE" && ago >= 0) extra = " · " + ago + "s ago";
    else if (st.state === "STALE" && ago >= 0) extra = " · " + ago + "s without tick";
    else if (st.state === "RECONNECTING" && st.attempts > 0) extra = " · try " + st.attempts;
    else if (st.state === "CLOSED") extra = " · market closed";
    b.className = "feed-badge " + (BADGE_CLS[st.state] || "b-load");
    b.innerHTML = '<i></i><span>' + TX.esc(BADGE_TXT[st.state] || st.state) + extra + '</span><em>' + TX.esc(st.source || "Deriv") + "</em>";
    b.title = "Price source: " + (st.source || "Deriv") + (st.updatedAt ? " · last update " + new Date(st.updatedAt).toLocaleTimeString("en-GB") : "");
  }
  setInterval(function () {
    if (state.assetId && window.DerivFeed) renderFeedBadge(state.assetId, chartTF, DerivFeed.stateOf(state.assetId, chartTF));
  }, 2000);
  $("chartRetry").addEventListener("click", loadChart);
  $("chartReload").addEventListener("click", loadChart);


  /* ---------- live prices ---------- */
  function refreshPx() {
    document.querySelectorAll("[data-px]").forEach(function (el) {
      var a = getAsset(el.getAttribute("data-px"));
      if (a) el.textContent = fmtPrice(a, pxOf(a));
    });
  }
  function refreshPrices() {
    TX.refreshPrices(false).then(function () {
      refreshPx();
      drawMini();
      if (!$("assetSheet").hidden) renderSheetList();
      if ($("view-markets").classList.contains("active")) renderMarkets();
      renderSentiment();
    });
  }
  setInterval(refreshPrices, 60000);

  /* ---------- mini live chart in ticket (real quote trail only) ---------- */
  var pxHist = {};
  function pushPx(id, px) {
    if (px == null || !isFinite(px)) return;
    var h = pxHist[id] || (pxHist[id] = []);
    if (h.length && h[h.length - 1] === px) return;
    h.push(px);
    if (h.length > 90) h.shift();
  }
  function drawMini() {
    var cv = $("qpMiniCv");
    if (!cv) return;
    var a = getAsset(state.assetId);
    if (!a) return;
    var px = pxOf(a);
    if (px != null) pushPx(a.id, px);
    var h = pxHist[a.id] || [];
    var pxEl = $("qpMiniPx"), chgEl = $("qpMiniChg");
    if (pxEl) pxEl.textContent = px != null ? fmtPrice(a, px) : "—";
    if (chgEl) {
      if (h.length > 1 && h[0]) {
        var ch = (h[h.length - 1] - h[0]) / h[0] * 100;
        chgEl.textContent = (ch >= 0 ? "+" : "") + ch.toFixed(2) + "%";
        chgEl.className = "qp-mini-chg " + (ch >= 0 ? "up" : "dn");
      } else { chgEl.textContent = "—"; chgEl.className = "qp-mini-chg"; }
    }
    var dpr = window.devicePixelRatio || 1;
    var W = cv.clientWidth, H = cv.clientHeight;
    if (!W || !H) return;
    if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    var ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (h.length < 2) {
      ctx.strokeStyle = "rgba(148,163,184,.25)";
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(148,163,184,.65)";
      ctx.font = "11px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("Building live trail…", W / 2, H / 2 - 10);
      return;
    }
    var min = Math.min.apply(null, h), max = Math.max.apply(null, h);
    if (max === min) max = min * 1.001 + 1e-9;
    var pad = 8;
    function X(i) { return pad + i * (W - 2 * pad) / (h.length - 1); }
    function Y(v) { return H - pad - (v - min) / (max - min) * (H - 2 * pad); }
    var up = h[h.length - 1] >= h[0];
    var col = up ? "#22c55e" : "#f23645";
    var gr = ctx.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, up ? "rgba(34,197,94,.30)" : "rgba(242,54,69,.30)");
    gr.addColorStop(1, "rgba(0,0,0,0)");
    ctx.beginPath();
    ctx.moveTo(X(0), Y(h[0]));
    for (var i = 1; i < h.length; i++) ctx.lineTo(X(i), Y(h[i]));
    ctx.lineTo(X(h.length - 1), H); ctx.lineTo(X(0), H); ctx.closePath();
    ctx.fillStyle = gr; ctx.fill();
    ctx.beginPath();
    ctx.moveTo(X(0), Y(h[0]));
    for (i = 1; i < h.length; i++) ctx.lineTo(X(i), Y(h[i]));
    ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.lineJoin = "round"; ctx.lineCap = "round";
    ctx.stroke();
    var lx = X(h.length - 1), ly = Y(h[h.length - 1]);
    ctx.beginPath(); ctx.arc(lx - 1, ly, 7, 0, 7); ctx.fillStyle = up ? "rgba(34,197,94,.22)" : "rgba(242,54,69,.22)"; ctx.fill();
    ctx.beginPath(); ctx.arc(lx - 1, ly, 3.2, 0, 7); ctx.fillStyle = col; ctx.fill();
  }
  window.addEventListener("resize", function () { drawMini(); });

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
      var entry = pxOf(a);
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
        '<span class="qt-ico sm">' + TX.assetIconHTML(a) + "</span>" +
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
    $("tradeBarIco").innerHTML = TX.assetIconHTML(a);
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
      var a = getAsset(t.assetId), cur = a ? pxOf(a) : null;
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
      var cur = a ? pxOf(a) : null;
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
        var exit = a ? pxOf(a) : null;
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
  setInterval(function () { tickCountdowns(); settleDue(); tourCdTick(); }, 1000);

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
        '<span class="ar-icon">' + TX.assetIconHTML(a) + "</span>" +
        '<span class="mkt-t"><b>' + TX.esc(a.name) + "</b><small>" + TX.esc(assetSub(a)) + "</small>" +
        '<strong class="mkt-px">' + fmtPrice(a, pxOf(a)) + "</strong></span>" +
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
    { id: "wed", name: "Crazy Wednesday", prize: 9000, entry: 10, dur: "1 day", startInH: 21.3, desc: "One day, all assets. Highest demo P/L takes the prize pool." },
    { id: "fri", name: "Free Friday", prize: 1000, entry: 0, dur: "1 day", startInH: 49, desc: "Free-entry Friday sprint. Highest demo P/L wins." },
    { id: "wknd", name: "Weekend Battle", prize: 5000, entry: 1, dur: "2 days", startInH: 73, desc: "Two-day battle on crypto & forex. Highest demo P/L wins." }
  ];
  var TOURS_DONE = [
    { id: "mon", name: "Monday Rush", prize: 2000, winner: "fx_hunter", wpl: 1840, when: "Finished 28 Sep" },
    { id: "thu", name: "Thursday Turbo", prize: 1500, winner: "gold_digger", wpl: 1215, when: "Finished 25 Sep" }
  ];
  function tourStartAt(t) {
    var m = {};
    try { m = JSON.parse(localStorage.getItem("tx_tour_starts") || "{}"); } catch (e) {}
    if (!m[t.id]) {
      m[t.id] = Date.now() + t.startInH * 3600000;
      try { localStorage.setItem("tx_tour_starts", JSON.stringify(m)); } catch (e2) {}
    }
    return m[t.id];
  }
  function tourJoined() {
    try { return JSON.parse(sessionStorage.getItem("tx_tours") || "[]"); }
    catch (e) { return []; }
  }
  function renderTours() {
    renderTourCards();
    renderTourDone();
    renderTourBoard();
    tourCdTick();
  }
  function renderTourCards() {
    var grid = $("tourGrid"); grid.innerHTML = "";
    var joined = tourJoined(), now = Date.now(), avail = 0;
    TOURS.forEach(function (t) {
      var start = tourStartAt(t), live = now >= start, isIn = joined.indexOf(t.id) !== -1;
      if (!live) avail++;
      var d = document.createElement("div"); d.className = "tx-card";
      d.innerHTML =
        '<span class="tx-cd' + (live ? " live" : "") + '" data-tourcd="' + t.id + '">' + (live ? "● LIVE" : "🕐 UNTIL START: --:--:--") + "</span>" +
        "<h4>" + TX.esc(t.name) + "</h4>" +
        '<div class="tx-prize"><small>PRIZE POOL</small><b>' + t.prize.toLocaleString("en-US") + " $</b></div>" +
        '<div class="tx-meta"><div><b>' + (t.entry ? t.entry + " $" : "Free") + "</b><small>Entry fee</small></div>" +
        "<div><b>" + t.dur + "</b><small>Duration</small></div></div>" +
        '<button class="tx-details" type="button" data-td="' + t.id + '">Details ⓘ</button>' +
        (isIn ? '<button class="tx-join joined" type="button" disabled>Joined ✓</button>'
              : '<button class="tx-join" type="button" data-tj="' + t.id + '">Join' + (t.entry ? " — " + t.entry + " $" : " free") + "</button>");
      grid.appendChild(d);
    });
    $("tourAvailN").textContent = avail;
    $("tourActiveN").textContent = TOURS.length;
    var mtb = $("mbTourBadge"); if (mtb) { mtb.textContent = TOURS.length; mtb.hidden = false; }
    grid.querySelectorAll("[data-td]").forEach(function (b) {
      b.addEventListener("click", function () { openTourModal(b.getAttribute("data-td")); });
    });
    grid.querySelectorAll("[data-tj]").forEach(function (b) {
      b.addEventListener("click", function () { joinTour(b.getAttribute("data-tj")); });
    });
  }
  function renderTourDone() {
    var grid = $("tourDoneGrid"); grid.innerHTML = "";
    var me = ((getProfile().nick || user.email.split("@")[0]) + "").toLowerCase();
    TOURS_DONE.forEach(function (t) {
      var d = document.createElement("div"); d.className = "tx-card" + (String(t.winner).toLowerCase() === me ? " won" : "");
      d.innerHTML = '<span class="tx-cd">🏁 ' + TX.esc(t.when) + "</span><h4>" + TX.esc(t.name) + "</h4>" +
        '<div class="tx-prize"><small>PRIZE POOL</small><b>' + t.prize.toLocaleString("en-US") + " $</b></div>" +
        '<div class="tx-meta"><div><b>🥇 ' + TX.esc(t.winner) + "</b><small>Winner</small></div>" +
        '<div><b>+' + TX.fmt(t.wpl) + "</b><small>Winning P/L</small></div></div>";
      grid.appendChild(d);
    });
  }
  function joinTour(id) {
    var t = null;
    TOURS.forEach(function (x) { if (x.id === id) t = x; });
    if (!t) return;
    if (t.entry > user.balance) { toast("Not enough demo balance for the entry fee."); return; }
    if (t.entry) {
      user.balance -= t.entry;
      store.requests.push({ id: TX.uid("r"), userId: user.id, userEmail: user.email, type: "tournament", amount: t.entry, method: t.name, status: "approved", createdAt: Date.now() });
    }
    var j = tourJoined(); j.push(id);
    try { sessionStorage.setItem("tx_tours", JSON.stringify(j)); } catch (e) {}
    TX.save(store); renderBalance(); renderTours();
    toast("You're in the " + t.name + " — good luck (demo).");
  }
  function openTourModal(id) {
    var t = null;
    TOURS.forEach(function (x) { if (x.id === id) t = x; });
    if (!t) return;
    var isIn = tourJoined().indexOf(id) !== -1;
    $("tourMName").textContent = t.name;
    $("tourMBody").innerHTML = "<p>" + TX.esc(t.desc) + "</p>" +
      '<ul class="tour-m-rules"><li>Entry fee: ' + (t.entry ? t.entry + " $ (virtual)" : "free") + "</li>" +
      "<li>Duration: " + t.dur + "</li><li>Prize pool: " + t.prize.toLocaleString("en-US") + " $ (virtual)</li>" +
      "<li>Winners are ranked by demo P/L on eligible trades.</li><li>One account per trader. Demo contest — no real money.</li></ul>" +
      (isIn ? '<button class="tx-join joined" type="button" disabled>Joined ✓</button>'
            : '<button class="tx-join" type="button" id="tourMJoin">Join' + (t.entry ? " — " + t.entry + " $" : " free") + "</button>");
    $("tourBack").hidden = false; $("tourModal").hidden = false;
    var jb = $("tourMJoin");
    if (jb) jb.addEventListener("click", function () { $("tourBack").hidden = true; $("tourModal").hidden = true; joinTour(id); });
  }
  function renderTourBoard() {
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
  }
  function tourCdTick() {
    var now = Date.now();
    document.querySelectorAll("[data-tourcd]").forEach(function (el) {
      var t = null;
      TOURS.forEach(function (x) { if (x.id === el.getAttribute("data-tourcd")) t = x; });
      if (!t) return;
      var ms = tourStartAt(t) - now;
      if (ms <= 0) { el.classList.add("live"); el.textContent = "● LIVE"; return; }
      var h = Math.floor(ms / 3600000), m = Math.floor(ms % 3600000 / 60000), s = Math.floor(ms % 60000 / 1000);
      el.textContent = "🕐 UNTIL START: " + String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
    });
  }
  $("tourTabActive").addEventListener("click", function () {
    $("tourTabActive").classList.add("active"); $("tourTabDone").classList.remove("active");
    $("tourGrid").hidden = false; $("tourDoneGrid").hidden = true; $("tourAvailWrap").hidden = false;
  });
  $("tourTabDone").addEventListener("click", function () {
    $("tourTabDone").classList.add("active"); $("tourTabActive").classList.remove("active");
    $("tourGrid").hidden = true; $("tourDoneGrid").hidden = false; $("tourAvailWrap").hidden = true;
  });
  $("tourClose").addEventListener("click", function () { $("tourBack").hidden = true; $("tourModal").hidden = true; });
  $("tourBack").addEventListener("click", function () { $("tourBack").hidden = true; $("tourModal").hidden = true; });
  setInterval(tourCdTick, 1000);


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
      var lbl = r.type === "deposit" ? "Deposit via " + r.method : r.type === "withdrawal" ? "Withdrawal via " + r.method :
        r.type === "bonus" ? "Promo bonus " + r.method : r.type === "tournament" ? "Tournament entry — " + r.method : r.type;
      moves.push({
        at: r.createdAt,
        label: lbl + (r.status === "rejected" ? " — rejected" : ""),
        amt: r.status === "approved" ? (r.type === "deposit" || r.type === "bonus" ? r.amount : -r.amount) : 0
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
    var k = kycCfg();
    if (k.requireForWithdrawals && getVerify().state !== "verified") {
      toast("Identity verification is required before withdrawals. Please verify first.");
      showView("account");
      if (typeof showAccountTab === "function") showAccountTab("account");
      return;
    }
    store.requests.push({ id: TX.uid("r"), userId: user.id, userEmail: user.email, type: "withdrawal", amount: amt, method: $("wdMethod").value, status: "pending", createdAt: Date.now() });
    TX.save(store); renderWallet();
    toast("Withdrawal request sent — admin will approve it.");
  });

    /* ---------- account tabs ---------- */
  var ACCT_TABS = [
    { id: "withdrawal", label: "Withdrawal", kind: "pane" },
    { id: "payments", label: "Payments", kind: "pane" },
    { id: "trades", label: "Trades", kind: "view", view: "history" },
    { id: "account", label: "My account", kind: "pane" },
    { id: "market", label: "Market", kind: "view", view: "market" },
    { id: "tournaments", label: "Tournaments", kind: "view", view: "tournaments" },
    { id: "analytics", label: "Analytics", kind: "view", view: "analytics" }
  ];
  function paintAcctTabs(activeId) {
    document.querySelectorAll("[data-accttabs] .acct-tab").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-atab") === activeId);
    });
  }
  function showAccountTab(id) {
    var t = null; ACCT_TABS.forEach(function (x) { if (x.id === id) t = x; });
    if (!t) return;
    if (t.kind === "view") { showView(t.view); paintAcctTabs(id); return; }
    showView("account");
    ACCT_TABS.forEach(function (x) { var p = $("atab-" + x.id); if (p) p.hidden = x.id !== id; });
    paintAcctTabs(id);
    if (id === "payments") renderWallet();
    if (id === "account") fillProfile();
  }
  document.querySelectorAll("[data-accttabs]").forEach(function (wrap) {
    ACCT_TABS.forEach(function (t) {
      var b = document.createElement("button");
      b.className = "acct-tab"; b.type = "button"; b.setAttribute("data-atab", t.id);
      b.textContent = t.label;
      b.addEventListener("click", function () { showAccountTab(t.id); });
      wrap.appendChild(b);
    });
  });
  var curChange = document.querySelector(".acct-balstrip .cur-change");
  if (curChange) curChange.addEventListener("click", function () {
    toast("USD is the only currency on the demo terminal.");
  });

  /* ---------- withdrawal requests (latest 5) ---------- */
  function renderWdReq() {
    var tb = $("reqRows"); if (!tb) return;
    tb.innerHTML = "";
    var rows = store.requests.filter(function (r) { return r.userId === user.id; })
      .sort(function (a, b) { return b.createdAt - a.createdAt; }).slice(0, 5);
    rows.forEach(function (r) {
      var tr = document.createElement("tr");
      tr.innerHTML = "<td style='text-transform:capitalize'>" + r.type + "</td><td>" + TX.fmt(r.amount) + "</td>" +
        "<td>" + TX.esc(r.method) + "</td>" + '<td class="status-' + r.status + '">' + r.status + "</td>" +
        "<td>" + TX.fmtTime(r.createdAt) + "</td>";
      tb.appendChild(tr);
    });
    if (!rows.length) tb.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--faint)">No requests yet.</td></tr>';
  }
  $("wdMakeDep").addEventListener("click", function () { showAccountTab("payments"); });
  $("wdFullHist").addEventListener("click", function () { showAccountTab("payments"); });
  $("wdFaqAll").addEventListener("click", function () { openSupport(); });
  document.querySelectorAll(".faq-q").forEach(function (q) {
    q.addEventListener("click", function () {
      var a = q.nextElementSibling, open = a.hidden;
      document.querySelectorAll(".faq-a").forEach(function (x) { x.hidden = true; });
      a.hidden = !open;
      q.classList.toggle("open", open);
    });
  });

  /* ---------- profile ---------- */
  var COUNTRIES = ["United Arab Emirates", "Saudi Arabia", "Qatar", "Kuwait", "Bahrain", "Oman", "India", "Pakistan", "Bangladesh", "Philippines", "Egypt", "Jordan", "Lebanon", "United Kingdom", "United States", "Canada", "Australia", "Germany", "France", "Spain", "Italy", "Netherlands", "Turkey", "Nigeria", "South Africa", "Kenya", "Indonesia", "Malaysia", "Singapore", "Thailand", "Vietnam", "China", "Japan", "South Korea", "Brazil", "Mexico", "Argentina", "Colombia", "Ukraine", "Kazakhstan", "Uzbekistan", "Morocco", "Algeria", "Tunisia", "Iraq"];
  var TZS = ["(UTC+04:00) Dubai", "(UTC+00:00) London", "(UTC+01:00) Berlin", "(UTC+03:00) Moscow", "(UTC+05:30) Mumbai", "(UTC+08:00) Singapore", "(UTC-05:00) New York", "(UTC-08:00) Los Angeles", "(UTC+10:00) Sydney"];
  function fillSel(sel, items) {
    if (!sel || sel.options.length) return;
    items.forEach(function (z) { var o = document.createElement("option"); o.textContent = z; sel.appendChild(o); });
  }
  fillSel($("tzSel"), TZS); fillSel($("setTz"), TZS); fillSel($("pfCountry"), COUNTRIES);
  function getProfile() {
    try { return JSON.parse(localStorage.getItem("tx_profile") || "{}"); } catch (e) { return {}; }
  }
  function numericId() { return String(user.id).replace(/[^0-9]/g, "").slice(-8) || "94064839"; }
  function fillProfile() {
    var p = getProfile();
    $("pfNick").value = p.nick || user.email.split("@")[0];
    $("pfFirst").value = p.first || "";
    $("pfLast").value = p.last || "";
    $("pfDob").value = p.dob || "";
    $("pfEmail2").value = p.email || user.email;
    if (p.country) $("pfCountry").value = p.country;
    $("pfAddr").value = p.addr || "";
    if (p.tz) $("tzSel").value = p.tz;
    $("pfDob").max = new Date().toISOString().slice(0, 10);
    $("pEmail").textContent = p.email || user.email;
    $("pId").textContent = numericId();
    renderVerify();
  }
  $("pfSave").addEventListener("click", function () {
    var em = $("pfEmail2").value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { toast("Enter a valid email address."); return; }
    if ($("pfDob").value && new Date($("pfDob").value) > new Date()) { toast("Date of birth can't be in the future."); return; }
    var p = { nick: $("pfNick").value.trim(), first: $("pfFirst").value.trim(), last: $("pfLast").value.trim(), dob: $("pfDob").value, email: em, country: $("pfCountry").value, addr: $("pfAddr").value.trim(), tz: $("tzSel").value };
    try { localStorage.setItem("tx_profile", JSON.stringify(p)); } catch (e) {}
    $("pEmail").textContent = em;
    toast("Profile saved.");
  });

  /* ---------- verification (demo) ---------- */
  function getVerify() {
    try { return JSON.parse(localStorage.getItem("tx_verify") || '{"state":"none"}'); }
    catch (e) { return { state: "none" }; }
  }
  function renderVerify() {
    var v = getVerify(), badge = $("vBadge");
    if (v.state === "verified") { badge.textContent = "✓ Verified"; badge.className = "vbadge ok"; }
    else if (v.state === "pending") { badge.textContent = "◷ Pending review"; badge.className = "vbadge pend"; }
    else { badge.textContent = "✕ Not verified"; badge.className = "vbadge not"; }
    $("verifyWarn").hidden = v.state !== "none";
    $("verifyOk").hidden = v.state !== "verified";
    $("verifyOpen").style.display = v.state === "verified" ? "none" : "";
  }
  var KYC_PROVIDERS = { sumsub: "Sumsub", veriff: "Veriff", jumio: "Jumio", onfido: "Onfido" };
  function kycCfg() {
    try { return (store.settings && store.settings.kyc) || { mode: "manual" }; }
    catch (e) { return { mode: "manual" }; }
  }
  $("verifyOpen").addEventListener("click", function () {
    var k = kycCfg(), auto = k.mode === "auto";
    $("vAuto").hidden = !auto;
    if (auto) $("vAutoName").textContent = KYC_PROVIDERS[k.provider] || "KYC provider";
    $("vBack").hidden = false; $("vModal").hidden = false;
  });
  $("vAutoBtn").addEventListener("click", function () {
    var k = kycCfg();
    try { localStorage.setItem("tx_verify", JSON.stringify({ state: "pending", at: Date.now(), via: k.provider || "auto" })); } catch (e) {}
    $("vBack").hidden = true; $("vModal").hidden = true; renderVerify();
    toast("Demo: would open " + (KYC_PROVIDERS[k.provider] || "provider") + " verification. Marked pending for practice.");
  });
  $("vClose").addEventListener("click", function () { $("vBack").hidden = true; $("vModal").hidden = true; });
  $("vCancel").addEventListener("click", function () { $("vBack").hidden = true; $("vModal").hidden = true; });
  $("vSubmit").addEventListener("click", function () {
    if (!$("vDocNum").value.trim() || !$("vName").value.trim()) { toast("Enter document number and full name."); return; }
    try { localStorage.setItem("tx_verify", JSON.stringify({ state: "pending", at: Date.now() })); } catch (e) {}
    $("vBack").hidden = true; $("vModal").hidden = true; renderVerify();
    toast("Demo verification submitted — practice flow, nothing is checked.");
  });

  /* ---------- security ---------- */
  function secGet() { try { return JSON.parse(localStorage.getItem("tx_sec") || "{}"); } catch (e) { return {}; } }
  function secPaint() {
    var s = secGet();
    $("tfaLogin").checked = !!s.faLogin;
    $("tfaWd").checked = !!s.faWd;
  }
  function secToggle(k, on) {
    var s = secGet(); s[k] = on;
    try { localStorage.setItem("tx_sec", JSON.stringify(s)); } catch (e) {}
    toast((on ? "Enabled" : "Disabled") + " (demo setting).");
  }
  $("tfaLogin").addEventListener("change", function () { secToggle("faLogin", $("tfaLogin").checked); });
  $("tfaWd").addEventListener("change", function () { secToggle("faWd", $("tfaWd").checked); });
  $("pwChange").addEventListener("click", function () { $("pwForm").hidden = !$("pwForm").hidden; });
  $("pwSave").addEventListener("click", function () {
    if ($("pwNew").value.length < 6) { toast("Password must be at least 6 characters."); return; }
    $("pwNew").value = ""; $("pwForm").hidden = true;
    toast("Password change is disabled on the demo terminal.");
  });
  var delArmed = false;
  $("delAcct").addEventListener("click", function () {
    if (!delArmed) {
      delArmed = true; $("delAcct").textContent = "✕ Click again to confirm";
      setTimeout(function () { delArmed = false; $("delAcct").textContent = "✕ Delete My account"; }, 4000);
      return;
    }
    delArmed = false; $("delAcct").textContent = "✕ Delete My account";
    toast("Demo accounts can't be deleted from the terminal.");
  });

  /* ---------- language / timezone ---------- */
  $("langSel").addEventListener("change", function () {
    try { localStorage.setItem("tx_lang", $("langSel").value); } catch (e) {}
    if ($("langSel").value !== "English") toast("English is the active language on this demo.");
  });
  (function () { try { var l = localStorage.getItem("tx_lang"); if (l) $("langSel").value = l; } catch (e) {} })();
  $("tzSel").addEventListener("change", function () {
    try { localStorage.setItem("tx_tz", $("tzSel").value); } catch (e) {}
    toast("Timezone preference saved (demo).");
  });
  (function () { try { var z = localStorage.getItem("tx_tz"); if (z) $("tzSel").value = z; } catch (e) {} })();

  /* ---------- market / promo codes ---------- */
  var PROMO_CATS = [
    { id: "risk", icon: "🛡", cls: "c-blue", title: "Risk Free", sub: "0 PROMO CODES AVAILABLE" },
    { id: "cashback", icon: "💜", cls: "c-purple", title: "Cashback", sub: "0 PROMO CODES AVAILABLE" },
    { id: "deposit", icon: "💰", cls: "c-orange", title: "Deposit Bonus", sub: "3 PROMO CODES AVAILABLE", green: true },
    { id: "turnover", icon: "％", cls: "c-pink", title: "Percentage of turnover", sub: "0 PROMO CODES AVAILABLE" },
    { id: "balance", icon: "🎁", cls: "c-indigo", title: "Balance Bonus", sub: "0 PROMO CODES AVAILABLE" },
    { id: "cancelx", icon: "🗑", cls: "c-teal", title: "Cancel X points", sub: "0 PROMO CODES AVAILABLE" }
  ];
  var PROMOS = {
    DEPOSIT30: { pct: 30, exp: "29/10/2030" },
    DEPOSIT40: { pct: 40, exp: "29/10/2030" },
    DEPOSIT50: { pct: 50, exp: "29/10/2030" }
  };
  function userPromos() {
    try { return JSON.parse(localStorage.getItem("tx_promos") || "{}"); } catch (e) { return {}; }
  }
  function renderMarket() {
    var grid = $("promoGrid"); grid.innerHTML = "";
    var used = userPromos(), avail = 0;
    Object.keys(PROMOS).forEach(function (c) { if (!used[c]) avail++; });
    PROMO_CATS.forEach(function (cat) {
      var d = document.createElement("div"); d.className = "promo-card";
      var body = "";
      if (cat.id === "deposit") {
        body = Object.keys(PROMOS).map(function (code) {
          var u = used[code];
          return '<div class="promo-row"><div><b>' + code + "</b><small>(" + PROMOS[code].pct + "%)</small></div>" +
            '<span class="promo-exp">' + (u ? "✓ used" : "✓ " + PROMOS[code].exp) + "</span>" +
            (u ? "" : '<button class="promo-use" type="button" data-puse="' + code + '">Use it ›</button>') + "</div>";
        }).join("");
      } else {
        body = '<div class="promo-table-h"><span>PROMO CODE</span><span>STATUS</span><span>USING</span></div>' +
          '<div class="promo-empty"><span class="box">📦</span><p>You don\'t have a promo code history yet. You can add a promo code using the button below.</p></div>';
      }
      d.innerHTML = '<div class="promo-head"><span class="promo-ico ' + cat.cls + '">' + cat.icon + "</span><div><h4>" + cat.title + "</h4>" +
        '<small class="' + (cat.green ? "green" : "") + '">' + (cat.id === "deposit" && avail === 0 ? "0 PROMO CODES AVAILABLE" : cat.sub) + "</small></div></div>" +
        body +
        '<div class="promo-foot"><button class="showall" type="button" data-pshow="' + cat.id + '">🕐 Show all</button>' +
        '<button class="btn btn-primary btn-sm" type="button" data-penter="' + cat.title + '">Enter promo code</button></div>';
      grid.appendChild(d);
    });
    var mb = $("marketBadge");
    mb.textContent = avail; mb.style.display = avail ? "" : "none";
    var mmb = $("mbMoreBadge"); if (mmb) { mmb.textContent = avail; mmb.hidden = avail ? false : true; }
    grid.querySelectorAll("[data-puse]").forEach(function (b) {
      b.addEventListener("click", function () { applyPromo(b.getAttribute("data-puse")); });
    });
    grid.querySelectorAll("[data-penter]").forEach(function (b) {
      b.addEventListener("click", function () { openCodeModal(b.getAttribute("data-penter")); });
    });
    grid.querySelectorAll("[data-pshow]").forEach(function (b) {
      b.addEventListener("click", function () { toast("Promo history is empty — activate a code to start."); });
    });
  }
  function openCodeModal(title) {
    $("codeTitle").textContent = title || "Promo code";
    $("codeInput").value = "";
    $("codeBack").hidden = false; $("codeModal").hidden = false;
    setTimeout(function () { $("codeInput").focus(); }, 60);
  }
  function closeCodeModal() { $("codeBack").hidden = true; $("codeModal").hidden = true; }
  $("codeClose").addEventListener("click", closeCodeModal);
  $("codeCancel").addEventListener("click", closeCodeModal);
  $("codeBack").addEventListener("click", closeCodeModal);
  $("codeApply").addEventListener("click", function () {
    var code = $("codeInput").value.trim().toUpperCase();
    if (!code) { toast("Enter a promo code."); return; }
    if (!PROMOS[code]) { toast("This code isn't valid on the demo."); return; }
    closeCodeModal(); applyPromo(code);
  });
  function applyPromo(code) {
    var used = userPromos();
    if (used[code]) { toast("Code already used."); return; }
    var pct = PROMOS[code].pct;
    var bonus = Math.max(Math.round(user.balance * pct) / 100, 1);
    user.balance = Math.round((user.balance + bonus) * 100) / 100;
    used[code] = { at: Date.now(), pct: pct, bonus: bonus };
    try { localStorage.setItem("tx_promos", JSON.stringify(used)); } catch (e) {}
    store.requests.push({ id: TX.uid("r"), userId: user.id, userEmail: user.email, type: "bonus", amount: bonus, method: code + " (" + pct + "% virtual bonus)", status: "approved", createdAt: Date.now() });
    TX.save(store); renderBalance(); renderMarket();
    toast("+" + TX.fmt(bonus) + " virtual bonus applied (" + code + ").");
  }
  $("promoBanner").addEventListener("click", function () { showView("market"); paintAcctTabs("market"); });

  /* ---------- signals drawer ---------- */
  var SIGS = [];
  function genSignals() {
    if (SIGS.length) return SIGS;
    var assets = enabledAssets().slice(0, 8);
    var deals = ["5m", "10m", "15m", "45m", "1h"];
    assets.forEach(function (a, i) {
      var dir = Math.random() < 0.5 ? "up" : "down";
      SIGS.push({ asset: a.name, assetId: a.id, dir: dir, deal: deals[i % deals.length], payout: a.payout, mom: Math.round(60 + Math.random() * 35) });
    });
    return SIGS;
  }
  function sigCard(s) {
    var d = document.createElement("div"); d.className = "sig-card";
    d.innerHTML = '<div class="sig-top"><b>' + TX.esc(s.asset) + '</b><span class="sig-dir ' + s.dir + '">' + (s.dir === "up" ? "▲" : "▼") + "</span></div>" +
      '<div class="sig-meta"><span>Deal time: <b>' + s.deal + "</b></span><span>Payout: <b>" + s.payout + "%</b></span><span>Momentum: <b>" + s.mom + "%</b></span></div>" +
      '<div class="sig-act"><button class="btn btn-primary btn-sm" type="button" data-sigtrade>Place Trade</button><small class="kyc-demo">Demo signal — paper trade only.</small></div>';
    d.querySelector("[data-sigtrade]").addEventListener("click", function () {
      var idx = EXP_L.indexOf(s.deal); if (idx < 0) idx = 2;
      state.expIdx = idx; /* keep the user's current investment amount — do not reset it */
      selectAsset(s.assetId); updatePreview();
      $("sigBack").hidden = true; $("sigDrawer").hidden = true;
      showView("trade");
      toast("Signal loaded on " + s.asset + " (" + s.dir.toUpperCase() + ", " + s.deal + ") — paper trade.");
    });
    return d;
  }
  function renderSignals() {
    var sigs = genSignals();
    var cur = $("sigCur"); cur.innerHTML = "";
    sigs.slice(0, 4).forEach(function (s) { cur.appendChild(sigCard(s)); });
    var past = $("sigPast"); past.innerHTML = "";
    sigs.forEach(function (s) {
      var win = s.mom >= 65;
      var r = document.createElement("div"); r.className = "sig-past-row";
      r.innerHTML = "<b>" + TX.esc(s.asset) + "</b><span>" + (s.dir === "up" ? "▲" : "▼") + " " + s.deal + "</span>" +
        '<span class="' + (win ? "win" : "loss") + '">' + (win ? "WIN" : "LOSS") + "</span>";
      past.appendChild(r);
    });
  }
  function openSig() { renderSignals(); $("sigBack").hidden = false; $("sigDrawer").hidden = false; }
  $("sigClose").addEventListener("click", function () { $("sigBack").hidden = true; $("sigDrawer").hidden = true; });
  $("sigBack").addEventListener("click", function () { $("sigBack").hidden = true; $("sigDrawer").hidden = true; });
  $("aboutSig").addEventListener("click", function () {
    toast("Signals are demo momentum hints — paper-trade them, never financial advice.");
  });

  /* ---------- leaderboard (TOP) drawer ---------- */
  function weeklyRows() {
    var weekAgo = Date.now() - 7 * 86400000;
    return store.users.filter(function (u) { return !u.disabled; }).map(function (u) {
      var ts = store.trades.filter(function (x) { return x.userId === u.id && x.status === "closed" && x.closedAt >= weekAgo && x.result !== "void"; });
      var pl = ts.reduce(function (s, x) { return s + (x.pl || 0); }, 0);
      return { email: u.email, n: ts.length, pl: pl };
    }).filter(function (r) { return r.n > 0; }).sort(function (a, b) { return b.pl - a.pl; });
  }
  function renderTop() {
    var rows = weeklyRows().slice(0, 20);
    var box = $("topList"); box.innerHTML = "";
    var myPos = "-", myPL = 0;
    weeklyRows().forEach(function (r, i) { if (r.email === user.email) { myPos = i + 1; myPL = r.pl; } });
    $("topMyId").textContent = numericId();
    $("topMyPos").textContent = myPos;
    $("topMyPL").textContent = (myPL >= 0 ? "+" : "−") + TX.fmt(Math.abs(myPL));
    rows.forEach(function (r, i) {
      var d = document.createElement("div"); d.className = "top-row" + (r.email === user.email ? " me" : "");
      var medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : (i + 1);
      d.innerHTML = "<span>" + medal + "</span><b>" + TX.esc(r.email.split("@")[0]) + (r.email === user.email ? " (you)" : "") + "</b>" +
        "<span>" + r.n + " trades</span>" +
        '<b style="color:' + (r.pl >= 0 ? "#4ade80" : "#ff8a94") + '">' + (r.pl >= 0 ? "+" : "−") + TX.fmt(Math.abs(r.pl)) + "</b>";
      box.appendChild(d);
    });
    if (!rows.length) box.innerHTML = '<p class="empty-note">No demo traders ranked this week yet.</p>';
  }
  function openTop() { renderTop(); $("topBack").hidden = false; $("topDrawer").hidden = false; }
  $("topClose").addEventListener("click", function () { $("topBack").hidden = true; $("topDrawer").hidden = true; });
  $("topBack").addEventListener("click", function () { $("topBack").hidden = true; $("topDrawer").hidden = true; });
  $("topHow").addEventListener("click", function () {
    toast("Ranked by demo P/L over the last 7 days. One account per trader.");
  });

  /* ---------- settings drawer ---------- */
  function applyTemplate(v, silent) {
    root.setAttribute("data-theme", v === "twilight" ? "twilight" : v === "light" ? "light" : "dark");
    try { localStorage.setItem("tx_template", v); } catch (e) {}
    document.querySelectorAll('.tpl-row input[name="tpl"]').forEach(function (inp) {
      inp.checked = inp.value === v || (v === "night" && inp.value === "dark");
      inp.closest(".tpl-row").classList.toggle("sel", inp.checked);
    });
    if (state.assetId) loadChart();
    if (!silent) toast("Template: " + v);
  }
  function openSettings() { $("setBack").hidden = false; $("setDrawer").hidden = false; }
  $("setClose").addEventListener("click", function () { $("setBack").hidden = true; $("setDrawer").hidden = true; });
  $("setBack").addEventListener("click", function () { $("setBack").hidden = true; $("setDrawer").hidden = true; });
  document.querySelectorAll('.tpl-row input[name="tpl"]').forEach(function (inp) {
    inp.closest(".tpl-row").addEventListener("click", function () { applyTemplate(inp.value === "dark" ? "night" : inp.value); });
  });
  $("setLang").addEventListener("change", function () { $("langSel").value = "English"; toast("English is the active language on this demo."); });
  $("setTz").addEventListener("change", function () {
    try { localStorage.setItem("tx_tz", $("setTz").value); } catch (e) {}
    toast("Timezone preference saved (demo).");
  });
  (function () {
    try {
      var v = localStorage.getItem("tx_template"), z = localStorage.getItem("tx_tz");
      if (v) applyTemplate(v, true);
      if (z && $("setTz").options.length) $("setTz").value = z;
    } catch (e) {}
  })();

  /* ---------- more drawer ---------- */
  function openMore() { $("moreBack").hidden = false; $("moreDrawer").hidden = false; }
  $("moreBtn").addEventListener("click", openMore);
  $("moreClose").addEventListener("click", function () { $("moreBack").hidden = true; $("moreDrawer").hidden = true; });
  $("moreBack").addEventListener("click", function () { $("moreBack").hidden = true; $("moreDrawer").hidden = true; });
  document.querySelectorAll(".qx-more-link").forEach(function (b) {
    b.addEventListener("click", function () {
      $("moreBack").hidden = true; $("moreDrawer").hidden = true;
      var g = b.getAttribute("data-goto");
      if (g === "signals") openSig();
      else if (g === "tournaments") openTop();
      else if (g === "settings") openSettings();
      else if (g === "market") { showView("market"); paintAcctTabs("market"); }
      else if (g === "history") { showView("analytics"); paintAcctTabs("analytics"); }
      else if (g === "deposit" || g === "payments") { showAccountTab("payments"); }
      else if (g === "withdrawal") { showAccountTab("withdrawal"); }
      else if (g === "trades") { showView("history"); }
    });
  });
  /* mobile bottom bar: help + more have no view of their own */
  var mbH = $("mbHelp"); if (mbH) mbH.addEventListener("click", openSupport);
  var mbM = $("mbMore"); if (mbM) mbM.addEventListener("click", openMore);
  var mOut = $("mLogout"); if (mOut) mOut.addEventListener("click", function () { TX.setClientSession(null); window.location.replace("login.html"); });
  var iApp = $("installApp"); if (iApp) iApp.addEventListener("click", function () { toast("The demo app is not published yet — the web terminal works everywhere."); });
  var jUs = $("joinUs"); if (jUs) jUs.addEventListener("click", function () { toast("Trexora demo — community links coming soon."); });
  var hTut = $("helpTutorials"); if (hTut) hTut.addEventListener("click", function () { closeSupport(); startTour(); });

  /* ---------- analytics ---------- */
  function svgLine(pts, w, h) {
    if (!pts.length) return '<p class="empty-note">No data yet.</p>';
    var min = Math.min.apply(null, pts.concat([0])), max = Math.max.apply(null, pts.concat([0]));
    var rng = (max - min) || 1;
    var step = w / Math.max(pts.length - 1, 1);
    var zero = (h - 8 - (0 - min) / rng * (h - 16)).toFixed(1);
    var d = pts.map(function (p, i) {
      var x = (i * step).toFixed(1), y = (h - 8 - (p - min) / rng * (h - 16)).toFixed(1);
      return (i ? "L" : "M") + x + "," + y;
    }).join(" ");
    var up = pts[pts.length - 1] >= 0;
    return '<svg viewBox="0 0 ' + w + " " + h + '" class="an-svg"><line x1="0" y1="' + zero + '" x2="' + w + '" y2="' + zero + '" class="an-zero"/>' +
      '<path d="' + d + '" class="an-line ' + (up ? "up" : "dn") + '"/></svg>';
  }
  function svgBars(rows, w, h) {
    if (!rows.length) return '<p class="empty-note">No data yet.</p>';
    var max = Math.max.apply(null, rows.map(function (r) { return Math.abs(r.v); }).concat([1]));
    var slot = (w - 20) / rows.length, bw = Math.min(46, slot - 10);
    var s = rows.map(function (r, i) {
      var bh = Math.max(3, Math.abs(r.v) / max * (h - 40));
      var x = 10 + i * slot + (slot - bw) / 2;
      var y = r.v >= 0 ? (h - 30 - bh) : (h - 30);
      return '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + bh.toFixed(1) +
        '" rx="4" class="' + (r.v >= 0 ? "b-up" : "b-dn") + '"/>' +
        '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (h - 12) + '" class="an-tick">' + TX.esc(r.k) + "</text>";
    }).join("");
    return '<svg viewBox="0 0 ' + w + " " + h + '" class="an-svg">' + s + "</svg>";
  }
  function renderAnalytics() {
    var per = parseInt($("anPeriod").value, 10) || 30;
    var cut = Date.now() - per * 86400000;
    var ts = store.trades.filter(function (t) { return t.userId === user.id && t.status === "closed" && t.closedAt >= cut && t.result !== "void"; });
    var wins = ts.filter(function (t) { return t.result === "win"; }).length;
    var pl = ts.reduce(function (s, t) { return s + (t.pl || 0); }, 0);
    var avg = ts.length ? pl / ts.length : 0;
    var best = ts.length ? Math.max.apply(null, ts.map(function (t) { return t.pl || 0; })) : 0;
    $("anEmail").textContent = user.email;
    $("anId").textContent = numericId();
    try { $("anLoc").textContent = getProfile().country || "United Arab Emirates"; } catch (e) {}
    $("anReal").textContent = TX.fmt(0);
    $("anDemo").textContent = TX.fmt(user.balance);
    var wr = ts.length ? Math.round(wins / ts.length * 100) : 0;
    $("anGen").innerHTML =
      '<div class="g"><span class="ring">' + ts.length + '</span><b>Deals</b><small>Total closed trades in the selected period</small></div>' +
      '<div class="g"><span class="ring">' + wr + '%</span><b>Win rate</b><small>Share of winning trades</small></div>' +
      '<div class="g"><b>' + (pl >= 0 ? "+" : "−") + TX.fmt(Math.abs(pl)) + '</b><small>Net P/L across all trades</small></div>' +
      '<div class="g"><b>' + (avg >= 0 ? "+" : "−") + TX.fmt(Math.abs(avg)) + '</b><small>Average P/L per trade</small></div>' +
      '<div class="g"><b>' + (best >= 0 ? "+" : "−") + TX.fmt(Math.abs(best)) + '</b><small>Best single trade</small></div>' +
      '<div class="g"><b>' + TX.fmt(user.balance) + '</b><small>Current demo balance</small></div>';
    var cum = [], s2 = 0;
    ts.slice().sort(function (a, b) { return a.closedAt - b.closedAt; }).forEach(function (t) { s2 += t.pl || 0; cum.push(Math.round(s2 * 100) / 100); });
    $("anChartPL").innerHTML = svgLine(cum, 600, 180);
    var byDay = {};
    ts.forEach(function (t) {
      var d = new Date(t.closedAt).toISOString().slice(5, 10);
      byDay[d] = byDay[d] || { w: 0, n: 0 };
      byDay[d].n++; if (t.result === "win") byDay[d].w++;
    });
    var wrows = Object.keys(byDay).sort().slice(-10).map(function (k) {
      return { k: k, v: Math.round(byDay[k].w / byDay[k].n * 100) };
    });
    $("anChartWR").innerHTML = svgBars(wrows, 600, 170);
    var byInst = {};
    ts.forEach(function (t) { byInst[t.assetName] = (byInst[t.assetName] || 0) + (t.pl || 0); });
    var irows = Object.keys(byInst).map(function (k) { return { k: k.length > 7 ? k.slice(0, 7) : k, v: Math.round(byInst[k] * 100) / 100 }; })
      .sort(function (a, b) { return b.v - a.v; }).slice(0, 8);
    $("anPLByInst").innerHTML = svgBars(irows, 600, 190);
    var tot2 = ts.length || 1, cnt = {};
    ts.forEach(function (t) { cnt[t.assetName] = (cnt[t.assetName] || 0) + 1; });
    var drows = Object.keys(cnt).map(function (k) { return { k: k.length > 7 ? k.slice(0, 7) : k, v: Math.round(cnt[k] / tot2 * 100) }; })
      .sort(function (a, b) { return b.v - a.v; }).slice(0, 8);
    $("anDistInst").innerHTML = svgBars(drows, 600, 170);
    var byCount = {};
    ts.forEach(function (t) { byCount[t.assetName] = (byCount[t.assetName] || 0) + 1; });
    var top = Object.keys(byCount).map(function (k) { return { k: k, n: byCount[k] }; })
      .sort(function (a, b) { return b.n - a.n; }).slice(0, 5);
    var tot = top.reduce(function (s, r) { return s + r.n; }, 0) || 1;
    var cols = ["#22c55e", "#3b82f6", "#a855f7", "#f59e0b", "#64748b"];
    var off = 25, segs = "";
    top.forEach(function (r, i) {
      var len = r.n / tot * 100;
      segs += '<circle cx="60" cy="60" r="45" class="donut-seg" stroke="' + cols[i] + '" stroke-dasharray="' + len.toFixed(1) + ' 100" stroke-dashoffset="' + (-off).toFixed(1) + '"/>';
      off += len;
    });
    $("anDonut").innerHTML = segs ? '<circle cx="60" cy="60" r="45" class="donut-bg"/>' + segs : "";
    var lg = $("anLegend"); lg.innerHTML = "";
    top.forEach(function (r, i) {
      var li = document.createElement("li");
      li.innerHTML = '<i style="background:' + cols[i] + '"></i><span>' + TX.esc(r.k) + "</span><b>" + r.n + "</b>";
      lg.appendChild(li);
    });
    if (!top.length) lg.innerHTML = '<li><span class="empty-note">No data yet.</span></li>';
  }
  $("anPeriod").addEventListener("change", renderAnalytics);

  /* ---------- account dropdown ---------- */
  var balHidden = false;
  function setBalText(t) {
    ["topBal", "amDemoBal", "acctBal", "wdBal", "anDemo"].forEach(function (id) { var el = $(id); if (el) el.textContent = t; });
  }
  $("amEye").addEventListener("click", function (e) {
    e.stopPropagation(); e.preventDefault();
    balHidden = !balHidden;
    setBalText(balHidden ? "••••••" : TX.fmt(user.balance));
    $("amEye").textContent = balHidden ? "🙈" : "👁";
  });
  $("amRefill").addEventListener("click", function (e) {
    e.stopPropagation(); e.preventDefault();
    user.balance = 10000; TX.save(store); renderBalance();
    toast("Demo balance refilled to $10,000.");
  });
  $("amCurChange").addEventListener("click", function (e) { e.stopPropagation(); e.preventDefault(); toast("USD is the only currency on the demo terminal."); });
  $("amSetLimit").addEventListener("click", function (e) { e.stopPropagation(); e.preventDefault(); toast("Daily limits apply to live accounts — demo has none."); });
  $("amLogout").addEventListener("click", function () { TX.setClientSession(null); window.location.replace("login.html"); });
  document.querySelectorAll("[data-amgo]").forEach(function (b) {
    b.addEventListener("click", function () {
      $("acctMenu").hidden = true;
      showAccountTab(b.getAttribute("data-amgo"));
    });
  });
  /* init account area state without leaving the default Trade view */
  ACCT_TABS.forEach(function (x) { var p = $("atab-" + x.id); if (p) p.hidden = x.id !== "account"; });
  paintAcctTabs("account");
  fillProfile();
  secPaint();

  /* ---------- welcome modal + onboarding tour ---------- */
  (function welcome() {
    var KEY = "trexora_welc_seen", TIPK = "trexora_onboard_tip";
    function seen(k) { try { return localStorage.getItem(k) === "1"; } catch (e) { return true; } }
    function mark(k) { try { localStorage.setItem(k, "1"); } catch (e) {} }
    var back = $("welcBack"), modal = $("welcModal");
    function hideWelc() { back.hidden = true; modal.hidden = true; mark(KEY); maybeTip(); }
    function maybeTip() {
      if (seen(TIPK)) return;
      var tip = $("onboardTip"), btn = $("supportBtn");
      if (!tip || !btn || window.innerWidth < 900) { mark(TIPK); return; }
      tip.hidden = false;
      setTimeout(function () { tip.hidden = true; mark(TIPK); }, 9000);
      tip.addEventListener("click", function () { tip.hidden = true; mark(TIPK); });
    }
    if (!seen(KEY)) setTimeout(function () { back.hidden = false; modal.hidden = false; }, 700);
    $("welcClose").addEventListener("click", hideWelc);
    $("welcLater").addEventListener("click", hideWelc);
    $("welcStart").addEventListener("click", function () { hideWelc(); startTour(); });

    var STEPS = [
      { sel: "chartBox", t: "Live chart", d: "Real Deriv market candles, updating tick-by-tick. The badge shows the live feed state." },
      { sel: "expStep", t: "Set the time", d: "Pick how long your trade runs — from 15 seconds up to 4 hours." },
      { sel: "amtStep", t: "Set the investment", d: "Choose your stake with the stepper or the quick amount chips." },
      { sel: "tradeBtns", t: "Up or Down", d: "Think the price will rise? Tap Up. Fall? Tap Down. Your payout shows right above." },
      { sel: "openList", t: "Track your trades", d: "Open trades count down here live. You can close early from the History tab." }
    ];
    var idx = 0, hl = $("spotHl"), tip = $("spotTip");
    function place(el) {
      var r = el.getBoundingClientRect(), pad = 6;
      hl.style.left = (r.left - pad) + "px"; hl.style.top = (r.top - pad) + "px";
      hl.style.width = (r.width + pad * 2) + "px"; hl.style.height = (r.height + pad * 2) + "px";
      var tw = Math.min(300, window.innerWidth * 0.86);
      var x = Math.max(10, Math.min(window.innerWidth - tw - 10, r.left));
      var below = r.bottom + pad + 12;
      var y = below + 190 < window.innerHeight ? below : Math.max(10, r.top - 200);
      if (window.innerWidth < 900) { x = (window.innerWidth - tw) / 2; y = window.innerHeight - 215; }
      tip.style.left = x + "px"; tip.style.top = y + "px"; tip.style.width = tw + "px";
    }
    function showStep() {
      var s = STEPS[idx], el = document.getElementById(s.sel);
      if (!el) { next(); return; }
      if (s.sel === "openList") showView("trade");
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
      setTimeout(function () {
        hl.hidden = false; tip.hidden = false;
        $("spotTitle").textContent = (idx + 1) + ". " + s.t;
        $("spotText").textContent = s.d;
        $("spotDots").textContent = "●".repeat(idx + 1) + "○".repeat(STEPS.length - idx - 1);
        $("spotNext").textContent = idx === STEPS.length - 1 ? "Finish ✓" : "Next →";
        place(el);
      }, 250);
    }
    function endTour() { hl.hidden = true; tip.hidden = true; }
    function next() { idx++; if (idx >= STEPS.length) endTour(); else showStep(); }
    window.__startTrexoraTour = startTour;
    function startTour() {
      showView("trade");
      idx = 0; showStep();
    }
    $("spotNext").addEventListener("click", next);
    $("spotSkip").addEventListener("click", endTour);
    window.addEventListener("resize", function () { if (!tip.hidden) showStep(); });
    var rt = $("replayTourBtn");
    if (rt) rt.addEventListener("click", function () { $("supportModal").hidden = true; startTour(); });
  })();

  /* ---------- init ---------- */
  if (store.settings.maintenance) $("maintBanner").hidden = false;
  renderBalance();
  var ea = enabledAssets();
  state.tabs = ea.slice(0, 3).map(function (a) { return a.id; });
  /* live Deriv feed: single price truth for chart, ticket, and settlement */
  if (window.DerivFeed) DerivFeed.start();
  selectAsset(state.tabs[0]);
  updatePreview();
  renderPositions();
  renderSentiment();
  refreshPrices();
})();
