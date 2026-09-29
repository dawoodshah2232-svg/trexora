/* Trexora homepage live data — native Deriv WebSocket feed (no third-party widgets).
 * Powers: market ticker tape, pitch demo chart, markets-section live chart.
 * All prices are real Deriv ticks; honest LIVE / RECONNECTING / OFFLINE states. */
(function () {
  "use strict";

  var WS_URL = "wss://api.derivws.com/trading/v1/options/ws/public";

  /* ---------------- tiny Deriv WS client ---------------- */
  function DerivLite() {
    this.ws = null;
    this.reqId = 0;
    this.backoff = 1000;
    this.wantOpen = true;
    this.online = false;
    this.tickSubs = {};   /* symbol -> { cbs:[], subId:null } */
    this.pending = {};    /* req_id -> resolve */
    this.statusCbs = [];
    this._timer = null;
    this._queue = [];   /* messages waiting for the socket to open */
  }
  DerivLite.prototype.onStatus = function (cb) { this.statusCbs.push(cb); };
  DerivLite.prototype._setOnline = function (on) {
    if (this.online === on) return;
    this.online = on;
    for (var i = 0; i < this.statusCbs.length; i++) { try { this.statusCbs[i](on); } catch (e) {} }
  };
  DerivLite.prototype.connect = function () {
    var self = this;
    if (!this.wantOpen) return;
    var ws;
    try { ws = new WebSocket(WS_URL); } catch (e) { this._retry(); return; }
    this.ws = ws;
    ws.onopen = function () {
      self.backoff = 1000;
      self._setOnline(true);
      var q = self._queue; self._queue = [];
      q.forEach(function (obj) { self._send(obj); });
      Object.keys(self.tickSubs).forEach(function (sym) { self._sendTickSub(sym); });
    };
    ws.onmessage = function (ev) {
      var m;
      try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.error) {
        var r = self.pending[m.req_id];
        if (r) { delete self.pending[m.req_id]; r(null); }
        return;
      }
      if (m.tick && m.tick.symbol && self.tickSubs[m.tick.symbol]) {
        var px = parseFloat(m.tick.quote);
        if (isFinite(px)) {
          var arr = self.tickSubs[m.tick.symbol].cbs;
          for (var i = 0; i < arr.length; i++) { try { arr[i](px, m.tick.epoch); } catch (e) {} }
        }
        return;
      }
      if (m.history && m.req_id && self.pending[m.req_id]) {
        var res = self.pending[m.req_id]; delete self.pending[m.req_id];
        res(m.history);
        return;
      }
      if (m.active_symbols && m.req_id && self.pending[m.req_id]) {
        var r2 = self.pending[m.req_id]; delete self.pending[m.req_id];
        r2(m.active_symbols);
      }
    };
    ws.onclose = function () { self._setOnline(false); self._retry(); };
    ws.onerror = function () { try { ws.close(); } catch (e) {} };
  };
  DerivLite.prototype._retry = function () {
    var self = this;
    if (!this.wantOpen) return;
    clearTimeout(this._timer);
    this._timer = setTimeout(function () { self.connect(); }, this.backoff);
    this.backoff = Math.min(this.backoff * 2, 30000);
  };
  DerivLite.prototype._send = function (obj) {
    if (this.ws && this.ws.readyState === 1) { this.ws.send(JSON.stringify(obj)); return true; }
    if (this.wantOpen) this._queue.push(obj);   /* socket not open yet — flush on open */
    return false;
  };
  DerivLite.prototype._sendTickSub = function (sym) {
    this.reqId++;
    this._send({ ticks: sym, subscribe: 1, req_id: this.reqId });
  };
  DerivLite.prototype.subscribeTicks = function (sym, cb) {
    var s = this.tickSubs[sym];
    if (!s) { s = this.tickSubs[sym] = { cbs: [] }; if (this.online) this._sendTickSub(sym); }
    if (s.cbs.indexOf(cb) < 0) s.cbs.push(cb);
  };
  DerivLite.prototype.unsubscribeTicks = function (sym, cb) {
    var s = this.tickSubs[sym];
    if (!s) return;
    var i = s.cbs.indexOf(cb);
    if (i >= 0) s.cbs.splice(i, 1);
  };
  DerivLite.prototype.ticksHistory = function (sym, count) {
    var self = this;
    return new Promise(function (resolve) {
      self.reqId++;
      var id = self.reqId;
      self.pending[id] = function (h) {
        if (!h || !h.times || !h.prices) { resolve([]); return; }
        var out = [];
        for (var i = 0; i < h.times.length; i++) {
          var px = parseFloat(h.prices[i]);
          if (isFinite(px) && h.times[i] > 0) out.push({ time: h.times[i], value: px });
        }
        resolve(out);
      };
      if (!self._send({ ticks_history: sym, count: count || 120, end: "latest", style: "ticks", req_id: id })) {
        if (!self.wantOpen) { delete self.pending[id]; resolve([]); }
        /* else queued — flushed when the socket opens */
      }
      setTimeout(function () { if (self.pending[id]) { delete self.pending[id]; resolve([]); } }, 12000);
    });
  };
  DerivLite.prototype.activeSymbols = function () {
    var self = this;
    return new Promise(function (resolve) {
      self.reqId++;
      var id = self.reqId;
      self.pending[id] = function (list) { resolve(list || []); };
      if (!self._send({ active_symbols: "brief", product_type: "basic", req_id: id })) {
        if (!self.wantOpen) { delete self.pending[id]; resolve([]); }
        /* else queued — flushed when the socket opens */
      }
      setTimeout(function () { if (self.pending[id]) { delete self.pending[id]; resolve([]); } }, 12000);
    });
  };

  var feed = new DerivLite();
  feed.connect();

  function fmt(px, digits) {
    return Number(px).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }
  function el(id) { return document.getElementById(id); }

  /* ---------------- 1. ticker tape ---------------- */
  (function ticker() {
    var track = el("tickerTrack");
    var badge = document.querySelector("#liveTicker .ticker-live");
    if (!track) return;
    var SYMS = [
      ["EUR/USD", "frxEURUSD", 5, "€", "#2F80FF"],
      ["GBP/USD", "frxGBPUSD", 5, "£", "#7C5CFF"],
      ["USD/JPY", "frxUSDJPY", 3, "¥", "#F23645"],
      ["AUD/USD", "frxAUDUSD", 5, "A$", "#22C55E"],
      ["Gold", "frxXAUUSD", 2, "Au", "#F5A623"],
      ["Silver", "frxXAGUSD", 2, "Ag", "#9AA7B8"],
      ["BTC/USD", "cryBTCUSD", 2, "₿", "#F7931A"],
      ["ETH/USD", "cryETHUSD", 2, "Ξ", "#8A9CFF"]
    ];
    var items = {}; /* sym -> {px, chg, open, refs} */
    function build() {
      track.innerHTML = "";
      var frag = document.createDocumentFragment();
      SYMS.forEach(function (s) {
        var it = document.createElement("span");
        it.className = "tk-item";
        it.innerHTML = '<span class="tk-ico" style="background:' + s[4] + '22;color:' + s[4] + '">' + s[3] + "</span>" +
          '<span class="tk-name">' + s[0] + "</span>" +
          '<span class="tk-px">—</span><span class="tk-chg"></span>';
        frag.appendChild(it);
        items[s[1]] = { d: s[2], open: 0, pxEl: it.querySelector(".tk-px"), chgEl: it.querySelector(".tk-chg"), row: it };
      });
      /* duplicate for a seamless -50% marquee loop */
      var frag2 = frag.cloneNode(true);
      track.appendChild(frag);
      track.appendChild(frag2);
      /* map clone refs */
      var rows = track.querySelectorAll(".tk-item");
      SYMS.forEach(function (s, i) {
        items[s[1]].pxEl2 = rows[i + SYMS.length].querySelector(".tk-px");
        items[s[1]].chgEl2 = rows[i + SYMS.length].querySelector(".tk-chg");
        items[s[1]].row2 = rows[i + SYMS.length];
      });
    }
    function onTick(sym, px) {
      var it = items[sym];
      if (!it) return;
      if (!it.open) it.open = px;
      var chg = it.open ? ((px - it.open) / it.open) * 100 : 0;
      var pxt = fmt(px, it.d);
      var cht = (chg >= 0 ? "+" : "") + chg.toFixed(2) + "%";
      var cls = chg >= 0 ? "tk-up" : "tk-dn";
      [it, { pxEl: it.pxEl2, chgEl: it.chgEl2, row: it.row2 }].forEach(function (r) {
        if (!r.pxEl) return;
        r.pxEl.textContent = pxt;
        r.chgEl.textContent = cht;
        r.row.classList.remove("tk-up", "tk-dn");
        r.row.classList.add(cls);
      });
    }
    function setBadge(state) {
      if (!badge) return;
      badge.classList.remove("is-live", "is-re", "is-off");
      if (state === "live") { badge.classList.add("is-live"); badge.innerHTML = '<span class="live-dot"></span>LIVE'; }
      else if (state === "re") { badge.classList.add("is-re"); badge.innerHTML = '<span class="live-dot"></span>RECONNECTING'; }
      else { badge.classList.add("is-off"); badge.innerHTML = '<span class="live-dot"></span>OFFLINE'; }
    }
    build();
    setBadge("re");
    var gotFirst = false;
    SYMS.forEach(function (s) {
      feed.subscribeTicks(s[1], function (px) {
        if (!gotFirst) { gotFirst = true; setBadge("live"); }
        onTick(s[1], px);
      });
    });
    feed.onStatus(function (on) {
      if (!on) setBadge("re");
      else if (gotFirst) setBadge("live");
    });
    /* if nothing arrives in 12s, say so honestly */
    setTimeout(function () {
      if (!gotFirst) {
        setBadge("off");
        track.innerHTML = '<span class="ticker-err">Live prices unavailable right now. <button type="button" id="tickerRetry">Retry</button></span>';
        el("tickerRetry").addEventListener("click", function () { location.reload(); });
      }
    }, 12000);
  })();

  /* ---------------- chart helpers ---------------- */
  function hasLWC() { return typeof window.LightweightCharts !== "undefined"; }
  function mkChart(box, lineColor) {
    var chart = LightweightCharts.createChart(box, {
      width: box.clientWidth || 300,
      height: box.clientHeight || 220,
      layout: { background: { type: "solid", color: "transparent" }, textColor: "rgba(160,175,200,.55)", fontSize: 10, attributionLogo: false },
      grid: { vertLines: { visible: false }, horzLines: { color: "rgba(255,255,255,.05)" } },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: false },
      crosshair: { vertLine: { visible: false }, horzLine: { visible: false } }
    });
    var series = chart.addSeries(LightweightCharts.LineSeries, {
      color: lineColor, lineWidth: 2, priceLineVisible: false, lastValueVisible: true,
      topColor: lineColor, bottomColor: "transparent"
    });
    new ResizeObserver(function () {
      try { chart.applyOptions({ width: box.clientWidth, height: box.clientHeight }); } catch (e) {}
    }).observe(box);
    return { chart: chart, series: series };
  }

  /* ---------------- 2. pitch demo chart ---------------- */
  (function pitch() {
    var box = el("pitchChart");
    if (!box || !hasLWC()) return;
    box.style.position = "relative";
    var cs = mkChart(box, "#2F80FF");
    var liveCb = null, gotData = false;
    var note = document.createElement("div");
    note.className = "pitch-state";
    note.innerHTML = "<div>Connecting to the live market…</div>";
    box.appendChild(note);
    feed.ticksHistory("frxEURUSD", 180).then(function (data) {
      if (data.length) { cs.series.setData(data); gotData = true; note.hidden = true; }
      liveCb = function (px, t) {
        if (!gotData) { gotData = true; note.hidden = true; }
        try { cs.series.update({ time: t, value: px }); } catch (e) {}
      };
      feed.subscribeTicks("frxEURUSD", liveCb);
    });
    setTimeout(function () {
      if (!gotData) note.innerHTML = "<div>Live chart unavailable right now.<br>Open a free demo to trade live.</div>";
    }, 12000);
    window.addEventListener("beforeunload", function () { if (liveCb) feed.unsubscribeTicks("frxEURUSD", liveCb); });
  })();

  /* ---------------- 3. markets section ---------------- */
  (function markets() {
    var tabs = document.querySelectorAll(".mkt-tab");
    if (!tabs.length || !el("mktChart")) return;
    var CATS = {
      forex: { name: "Forex", desc: "Majors and minors with tight fixed payouts — the most traded market in the world, on your screen in one tap.", pay: "Up to 82% payout", pairs: [["EUR/USD", "frxEURUSD", 5], ["GBP/USD", "frxGBPUSD", 5], ["USD/JPY", "frxUSDJPY", 3], ["AUD/USD", "frxAUDUSD", 5]] },
      crypto: { name: "Crypto", desc: "Bitcoin, Ethereum and more — trade crypto 24/7: nights, weekends and holidays.", pay: "Up to 85% payout", pairs: [["BTC/USD", "cryBTCUSD", 2], ["ETH/USD", "cryETHUSD", 2]] },
      metals: { name: "Metals", desc: "Gold and silver — classic safe-haven instruments with fixed payouts on every trade.", pay: "Up to 78% payout", pairs: [["Gold", "frxXAUUSD", 2], ["Silver", "frxXAGUSD", 2]] },
      indices: { name: "Indices", desc: "Major world indices — trade the whole market in a single position.", pay: "Up to 81% payout", pairs: [] }
    };
    var cur = { cat: "forex", pair: 0, sym: null, digits: 5, open: 0, cb: null };
    var chartObj = hasLWC() ? mkChart(el("mktChart"), "#2F80FF") : null;
    var stateEl = el("mktChartState");

    function setState(html) {
      if (!stateEl) return;
      if (!html) { stateEl.hidden = true; return; }
      stateEl.hidden = false;
      stateEl.innerHTML = '<div class="cs-ico">◌</div><div>' + html + "</div>";
    }
    function digitsOf(pip) {
      var s = String(pip == null ? "0.01" : pip);
      var i = s.indexOf(".");
      return i < 0 ? 0 : Math.min(5, s.length - i - 1);
    }
    function discoverIndices() {
      feed.activeSymbols().then(function (list) {
        if (!list || !list.length) return;
        var cands = list.filter(function (a) {
          return a && a.market === "stock_index" && a.exchange_is_open !== false && a.symbol && a.display_name;
        });
        var prefer = [/US 30/i, /Wall Street/i, /US Tech 100/i, /US 500/i, /NAS/i, /S&P/i, /Germany 40/i, /UK 100/i];
        var picked = [];
        prefer.forEach(function (re) {
          var f = cands.filter(function (a) { return re.test(a.display_name); });
          f.forEach(function (a) {
            if (picked.length < 4 && picked.indexOf(a) < 0) picked.push(a);
          });
        });
        if (!picked.length) picked = cands.slice(0, 4);
        CATS.indices.pairs = picked.map(function (a) {
          return [a.display_name.replace(/\s*\(.*?\)\s*/g, ""), a.symbol, digitsOf(a.pip)];
        });
        if (cur.cat === "indices") selectPair("indices", 0);
      });
    }
    function selectPair(catKey, idx) {
      var cat = CATS[catKey];
      if (!cat || !cat.pairs.length || idx >= cat.pairs.length) return;
      if (cur.cb && cur.sym) feed.unsubscribeTicks(cur.sym, cur.cb);
      cur.cat = catKey; cur.pair = idx;
      var p = cat.pairs[idx];
      cur.sym = p[1]; cur.digits = p[2]; cur.open = 0;
      el("mktPrice").textContent = "—";
      var chg = el("mktChg"); chg.textContent = "—"; chg.className = "";
      setState("Connecting to " + p[0] + "…");
      renderPills();
      if (!chartObj) { setState("Chart unavailable."); return; }
      feed.ticksHistory(cur.sym, 120).then(function (data) {
        if (cur.sym !== p[1]) return; /* user switched away */
        if (data.length) {
          chartObj.series.setData(data);
          setState(null);
          onTick(data[data.length - 1].value, data[data.length - 1].time);
        } else {
          setState("Live data for " + p[0] + " is unavailable right now.");
        }
        cur.cb = function (px, t) {
          if (cur.sym !== p[1]) return;
          onTick(px, t);
          try { chartObj.series.update({ time: t, value: px }); } catch (e) {}
        };
        feed.subscribeTicks(cur.sym, cur.cb);
      });
    }
    function onTick(px, t) {
      if (!cur.open) cur.open = px;
      el("mktPrice").textContent = fmt(px, cur.digits);
      var chg = el("mktChg");
      var d = ((px - cur.open) / cur.open) * 100;
      chg.textContent = (d >= 0 ? "+" : "") + d.toFixed(2) + "%";
      chg.className = d >= 0 ? "pos" : "neg";
    }
    function renderPills() {
      var box = el("mktPills");
      var cat = CATS[cur.cat];
      box.innerHTML = "";
      cat.pairs.forEach(function (p, i) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "mkt-pill" + (i === cur.pair ? " on" : "");
        b.setAttribute("role", "tab");
        b.setAttribute("aria-selected", i === cur.pair ? "true" : "false");
        b.innerHTML = "<b>" + p[0] + "</b>";
        b.addEventListener("click", function () { selectPair(cur.cat, i); });
        box.appendChild(b);
      });
      if (!cat.pairs.length) box.innerHTML = '<span class="mkt-pill-static">Loading pairs…</span>';
    }
    function showCat(key) {
      var cat = CATS[key];
      if (!cat) return;
      tabs.forEach(function (t) {
        var on = t.getAttribute("data-mkt") === key;
        t.classList.toggle("active", on);
        t.setAttribute("aria-selected", on ? "true" : "false");
      });
      el("mktName").textContent = cat.name;
      el("mktDesc").textContent = cat.desc;
      el("mktPay").textContent = cat.pay;
      selectPair(key, 0);
    }
    tabs.forEach(function (t) {
      t.addEventListener("click", function () { showCat(t.getAttribute("data-mkt")); });
    });
    if (!hasLWC()) setState("Chart unavailable.");
    showCat("forex");
    discoverIndices();
  })();
})();
