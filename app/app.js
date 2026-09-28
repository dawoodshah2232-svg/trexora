/* Trexora v2 — client terminal logic (demo, localStorage). */
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

  var state = { assetId: null, expirySec: 60, tvReady: false };

  /* ---------- theme ---------- */
  var root = document.documentElement;
  $("themeToggle").addEventListener("click", function () {
    var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("trexora-theme", next); } catch (e) {}
    if (state.assetId) loadChart();
  });
  $("logoutBtn").addEventListener("click", function () {
    TX.setClientSession(null); window.location.replace("login.html");
  });

  /* ---------- views ---------- */
  function showView(name) {
    document.querySelectorAll(".view").forEach(function (v) { v.classList.toggle("active", v.id === "view-" + name); });
    document.querySelectorAll("#viewNav button, #viewNavMobile button").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-view") === name);
    });
    if (name === "positions") renderPositions();
    if (name === "history") renderHistory();
    if (name === "wallet") renderWallet();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  document.querySelectorAll("#viewNav button, #viewNavMobile button").forEach(function (b) {
    b.addEventListener("click", function () { showView(b.getAttribute("data-view")); });
  });

  /* ---------- balance ---------- */
  function renderBalance() {
    $("balanceVal").textContent = TX.fmt(user.balance);
    $("walletBal").textContent = TX.fmt(user.balance);
  }

  /* ---------- assets ---------- */
  function enabledAssets() {
    return store.assets.filter(function (a) { return a.enabled; });
  }
  function getAsset(id) {
    for (var i = 0; i < store.assets.length; i++) if (store.assets[i].id === id) return store.assets[i];
    return null;
  }
  function renderAssetChips(filter) {
    var box = $("assetChips"); box.innerHTML = "";
    var list = enabledAssets().filter(function (a) {
      return !filter || a.name.toLowerCase().indexOf(filter.toLowerCase()) !== -1;
    });
    if (!list.length) { box.innerHTML = '<span style="color:var(--faint);font-size:.85rem;padding:8px">No assets match.</span>'; return; }
    list.forEach(function (a) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "asset-chip-btn" + (a.id === state.assetId ? " active" : "");
      b.innerHTML = TX.esc(a.name) + "<small>" + a.payout + "%</small>";
      b.addEventListener("click", function () { selectAsset(a.id); });
      box.appendChild(b);
    });
    if (!getAsset(state.assetId) && list.length) selectAsset(list[0].id, true);
  }
  $("assetSearch").addEventListener("input", function () { renderAssetChips(this.value.trim()); });

  function selectAsset(id, silent) {
    state.assetId = id;
    var a = getAsset(id);
    $("selAssetName").textContent = a ? a.name : "—";
    renderAssetChips($("assetSearch").value.trim());
    updatePreview();
    if (!silent) loadChart();
    else loadChart();
    refreshPriceLine();
  }

  /* ---------- TradingView chart ---------- */
  function loadChart() {
    var a = getAsset(state.assetId);
    if (!a) return;
    var el = $("tv_chart");
    $("chartFallback").hidden = true;
    if (typeof TradingView === "undefined") { $("chartFallback").hidden = false; return; }
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
      state.tvReady = true;
    } catch (e) { $("chartFallback").hidden = false; }
  }

  /* ---------- live price line ---------- */
  function refreshPriceLine() {
    var a = getAsset(state.assetId);
    var badge = $("feedBadge"), lp = $("livePrice");
    TX.refreshPrices(false).then(function (ok) {
      var p = a ? TX.priceOf(a) : null;
      if (ok && p != null) {
        lp.textContent = (a.kind === "fiat" ? p.toFixed(5) : TX.fmt(p));
        var age = TX.feedAge();
        badge.textContent = age < 90000 ? "LIVE · CoinGecko" : "STALE · CoinGecko";
        badge.className = "badge " + (age < 90000 ? "live" : "stale");
      } else {
        lp.textContent = "—";
        badge.textContent = "FEED DOWN";
        badge.className = "badge down";
      }
    });
  }
  setInterval(refreshPriceLine, 60000);

  /* ---------- trade panel ---------- */
  function limits() {
    var a = getAsset(state.assetId);
    var s = store.settings;
    var lo = Math.max(a ? a.min : 1, s.minTrade);
    var hi = Math.min(a ? a.max : 100000, s.maxTrade);
    return { lo: lo, hi: hi };
  }
  function amount() {
    var v = parseFloat($("amount").value);
    return isNaN(v) ? 0 : v;
  }
  function updatePreview() {
    var a = getAsset(state.assetId);
    var l = limits(), amt = Math.min(Math.max(amount(), l.lo), l.hi);
    var ret = a ? amt * (1 + a.payout / 100) : 0;
    $("payoutPreview").textContent = TX.fmt(ret);
    $("upReturn").textContent = "win " + TX.fmt(ret);
    $("downReturn").textContent = "win " + TX.fmt(ret);
  }
  $("amount").addEventListener("input", updatePreview);
  $("amtDown").addEventListener("click", function () { $("amount").value = Math.max(1, amount() - 10); updatePreview(); });
  $("amtUp").addEventListener("click", function () { $("amount").value = amount() + 10; updatePreview(); });
  $("expRow").addEventListener("click", function (e) {
    var b = e.target.closest(".exp-pill"); if (!b) return;
    document.querySelectorAll("#expRow .exp-pill").forEach(function (p) { p.classList.remove("active"); });
    b.classList.add("active");
    state.expirySec = parseInt(b.getAttribute("data-sec"), 10);
  });

  function placeTrade(dir) {
    if (store.settings.maintenance) { toast("Trading is paused for maintenance."); return; }
    var a = getAsset(state.assetId);
    if (!a) { toast("Select an asset first."); return; }
    var l = limits(), amt = Math.round(amount() * 100) / 100;
    if (!(amt >= l.lo)) { toast("Minimum trade is " + TX.fmt(l.lo) + "."); return; }
    if (amt > l.hi) { toast("Maximum trade is " + TX.fmt(l.hi) + "."); return; }
    if (amt > user.balance) { toast("Insufficient demo balance."); return; }
    toast("Locking live price…");
    TX.refreshPrices(true).then(function (ok) {
      var entry = TX.priceOf(a);
      if (!ok || entry == null) { toast("Live price unavailable — try again."); return; }
      user.balance = Math.round((user.balance - amt) * 100) / 100;
      var now = Date.now();
      store.trades.push({
        id: TX.uid("t"), userId: user.id, userEmail: user.email,
        assetId: a.id, assetName: a.name, dir: dir,
        amount: amt, payout: a.payout, entryPrice: entry,
        openedAt: now, expiresAt: now + state.expirySec * 1000,
        status: "open", retries: 0
      });
      store.seq++; TX.save(store);
      renderBalance(); renderPositions(); updatePosCount();
      toast("Position opened: " + a.name + " " + dir.toUpperCase() + " " + TX.fmt(amt));
      showView("positions");
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
  function updatePosCount() {
    var n = openTrades().length;
    $("posCount").textContent = n ? "(" + n + ")" : "";
  }
  function renderPositions() {
    var box = $("openList");
    var list = openTrades();
    updatePosCount();
    if (!list.length) { box.innerHTML = '<div class="empty">No open positions. Open one from the Trade tab.</div>'; return; }
    box.innerHTML = "";
    list.forEach(function (t) {
      var d = document.createElement("div");
      d.className = "pos-card"; d.id = "pos_" + t.id;
      d.innerHTML =
        '<div class="pos-top"><span class="pos-asset">' + TX.esc(t.assetName) + '</span>' +
        '<span class="pos-dir ' + t.dir + '">' + t.dir + '</span></div>' +
        '<div class="pos-meta"><span>Amount <strong>' + TX.fmt(t.amount) + '</strong></span>' +
        '<span>Payout <strong>' + t.payout + '%</strong></span>' +
        '<span>Entry <strong>' + t.entryPrice + '</strong></span>' +
        '<span>Closes in <strong class="countdown" data-exp="' + t.expiresAt + '">--:--</strong></span></div>' +
        (store.settings.earlyClose ? '<div class="pos-actions"><button class="btn btn-ghost btn-sm" data-early="' + t.id + '" type="button">Early close</button></div>' : "");
      box.appendChild(d);
    });
    box.querySelectorAll("[data-early]").forEach(function (b) {
      b.addEventListener("click", function () { earlyClose(b.getAttribute("data-early")); });
    });
    tickCountdowns();
  }
  function tickCountdowns() {
    var now = Date.now();
    document.querySelectorAll(".countdown").forEach(function (el) {
      el.textContent = fmtCountdown(parseInt(el.getAttribute("data-exp"), 10) - now);
    });
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
      renderBalance(); renderPositions();
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
      });
      if (changed) {
        TX.save(store); renderBalance(); renderPositions(); updatePosCount();
        if ($("view-history").classList.contains("active")) renderHistory();
      }
    });
  }
  setInterval(function () { tickCountdowns(); settleDue(); }, 1000);

  /* ---------- history ---------- */
  function renderHistory() {
    var rows = store.trades.filter(function (t) { return t.userId === user.id && t.status === "closed"; })
      .sort(function (a, b) { return b.closedAt - a.closedAt; }).slice(0, 100);
    var tb = $("histTable").querySelector("tbody"); tb.innerHTML = "";
    $("histEmpty").hidden = rows.length > 0;
    $("histTable").style.display = rows.length ? "" : "none";
    rows.forEach(function (t) {
      var tr = document.createElement("tr");
      var rc = t.result === "win" ? "result-win" : (t.result === "loss" ? "result-loss" : "result-void");
      tr.innerHTML = "<td>" + TX.fmtTime(t.closedAt) + "</td><td>" + TX.esc(t.assetName) + "</td>" +
        "<td>" + t.dir.toUpperCase() + "</td><td>" + TX.fmt(t.amount) + "</td>" +
        "<td>" + (t.entryPrice == null ? "—" : t.entryPrice) + "</td>" +
        "<td>" + (t.exitPrice == null ? "—" : t.exitPrice) + "</td>" +
        '<td class="' + rc + '">' + (t.pl > 0 ? "+" : "") + TX.fmt(t.pl) + (t.result === "early" ? " (early)" : t.result === "tie" ? " (tie)" : t.result === "void" ? " (void)" : "") + "</td>";
      tb.appendChild(tr);
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
  renderAssetChips("");
  selectAsset((enabledAssets()[0] || {}).id);
  updatePreview();
  updatePosCount();
  refreshPriceLine();
})();
