/* DerivFeed — the single live price truth for the Trexora terminal. v1.
 *
 * Deriv public WebSocket (no key, no app_id):
 *   wss://api.derivws.com/trading/v1/options/ws/public
 *
 * One socket multiplexes every watched asset. For each asset we subscribe
 * `ticks_history` with style "candles": Deriv returns up to 500 M1..H1
 * candles as the snapshot, then keeps pushing live `ohlc` updates on the
 * SAME subscription. Chart, ticket price, and trade settlement all read
 * from this one feed object — there is only one price path, so the chart
 * can never disagree with the settlement price.
 *
 * Timestamps: Deriv sends Unix SECONDS (epoch / open_time). Lightweight
 * Charts v5 wants Unix seconds too — no conversion, but every value is
 * still run through normTime() as a guard against millisecond leaks.
 *
 * IRON RULE: never invents a price. No ticks => no price. States are
 * honest: LOADING / LIVE / STALE / RECONNECTING / CLOSED / OFFLINE.
 * Closed markets (weekend, gold daily break 21:00-22:00 UTC) show CLOSED,
 * never a fake flatline presented as live.
 */
(function () {
  "use strict";

  var WS_URL = "wss://api.derivws.com/trading/v1/options/ws/public";
  var SOURCE = "Deriv";

  /* assetId (Trexora) -> Deriv symbol. Verified against Deriv active_symbols. */
  var SYMBOLS = {
    eurusd: { deriv: "frxEURUSD", digits: 5 },
    gbpusd: { deriv: "frxGBPUSD", digits: 5 },
    usdjpy: { deriv: "frxUSDJPY", digits: 3 },
    audusd: { deriv: "frxAUDUSD", digits: 5 },
    gbpjpy: { deriv: "frxGBPJPY", digits: 3 },
    usdchf: { deriv: "frxUSDCHF", digits: 5 },
    xauusd: { deriv: "frxXAUUSD", digits: 2, metal: true },
    btcusd: { deriv: "cryBTCUSD", digits: 2, crypto: true },
    ethusd: { deriv: "cryETHUSD", digits: 2, crypto: true }
  };

  var HISTORY_COUNT = 500;
  var STALE_AFTER_MS = 15000;   // no message this long -> STALE (suspect)
  var DEAD_AFTER_MS = 35000;    // no message this long -> reconnect
  var MAX_BACKOFF_MS = 30000;
  var CACHE_KEY = "tx_deriv_candles_v1";

  /* ---------------- tiny utils ---------------- */
  function normTime(t) {
    t = Number(t);
    if (!isFinite(t) || t <= 0) return 0;
    if (t > 1e12) return Math.floor(t / 1000); // ms leak guard
    if (t > 1e10) return Math.floor(t / 1000); // us guard
    return Math.floor(t);
  }
  function num(v) { var n = parseFloat(v); return isFinite(n) ? n : null; }
  function loadCache() { try { return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}"); } catch (e) { return {}; } }
  function saveCache(c) { try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch (e) {} }

  /* ---------------- market hours ----------------
   * frx* follow real FX hours. Crypto (cry*) is 24/7.
   * Closed: all day Saturday (UTC), Sunday before 22:00 UTC,
   * and the gold daily break 21:00-22:00 UTC Mon-Fri. */
  function marketClosedNow(meta) {
    if (meta.crypto) return false;
    var d = new Date(), day = d.getUTCDay(), h = d.getUTCHours();
    if (day === 6) return true;                       // Saturday
    if (day === 0 && h < 22) return true;              // Sunday before 22:00 UTC
    if (meta.metal && day >= 1 && day <= 5 && h === 21) return true; // daily break
    return false;
  }

  /* ---------------- feed state ---------------- */
  var ws = null;
  var reqId = 0;
  var backoffMs = 1000;
  var wantOpen = false;          // false after user navigates away / explicit stop
  var lastMsgAt = 0;
  var connecting = false;
  var stores = {};               // assetId -> { gran -> { candles:[], state, updatedAt, attempts } }
  var listeners = { candles: [], state: [] };
  var watched = {};              // assetId -> { gran -> refcount }
  var priceCache = {};           // assetId -> last close (fast path for settlement)

  function storeFor(assetId, gran, create) {
    var s = stores[assetId];
    if (!s) { if (!create) return null; s = stores[assetId] = {}; }
    var g = s[gran];
    if (!g && create) {
      g = s[gran] = { candles: [], state: "LOADING", updatedAt: 0, attempts: 0, gran: gran };
      // seed from local cache so reopen never shows a blank "loading" as broken
      var c = loadCache()[assetId + ":" + gran];
      if (c && c.candles && c.candles.length) {
        g.candles = c.candles.filter(validCandle);
        g.updatedAt = c.savedAt || 0;
      }
    }
    return g || null;
  }
  function validCandle(c) {
    return c && c.time > 0 && isFinite(c.open) && isFinite(c.high) && isFinite(c.low) && isFinite(c.close);
  }
  function persist(assetId, gran) {
    var g = storeFor(assetId, gran, false);
    if (!g || !g.candles.length) return;
    var c = loadCache();
    c[assetId + ":" + gran] = { candles: g.candles.slice(-300), savedAt: Date.now() };
    saveCache(c);
  }

  function setState(assetId, gran, state) {
    var g = storeFor(assetId, gran, true);
    if (g.state === state) return;
    g.state = state;
    emit("state", { assetId: assetId, gran: gran, state: state, source: SOURCE, updatedAt: g.updatedAt });
  }
  function emit(kind, data) {
    listeners[kind].forEach(function (fn) { try { fn(data); } catch (e) {} });
  }

  /* ---------------- websocket ---------------- */
  function send(obj) {
    if (ws && ws.readyState === 1) { ws.send(JSON.stringify(obj)); return true; }
    return false;
  }
  function subscribeCandles(assetId, gran) {
    var meta = SYMBOLS[assetId];
    if (!meta) return;
    reqId += 1;
    send({
      ticks_history: meta.deriv,
      style: "candles",
      granularity: gran,
      count: HISTORY_COUNT,
      end: "latest",
      subscribe: 1,
      req_id: reqId,
      passthrough: { assetId: assetId, gran: gran }
    });
  }
  function resubscribeAll() {
    send({ forget_all: ["candles"] });
    Object.keys(watched).forEach(function (assetId) {
      Object.keys(watched[assetId]).forEach(function (gran) {
        var g = storeFor(assetId, Number(gran), true);
        setState(assetId, Number(gran), marketClosedNow(SYMBOLS[assetId]) ? "CLOSED" : "RECONNECTING");
        g.attempts += 1;
        subscribeCandles(assetId, Number(gran));
      });
    });
  }

  function connect() {
    if (!wantOpen || connecting || (ws && (ws.readyState === 0 || ws.readyState === 1))) return;
    connecting = true;
    var sock;
    try { sock = new WebSocket(WS_URL); } catch (e) { connecting = false; scheduleReconnect(); return; }
    ws = sock;
    var openTimer = setTimeout(function () {
      try { sock.close(); } catch (e) {}
    }, 12000);

    sock.onopen = function () {
      clearTimeout(openTimer);
      connecting = false;
      backoffMs = 1000;
      lastMsgAt = Date.now();
      resubscribeAll();
    };
    sock.onmessage = function (ev) {
      lastMsgAt = Date.now();
      var m;
      try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.error) { handleError(m); return; }
      var pt = (m.echo_req && m.echo_req.passthrough) || (m.passthrough) || {};
      if (m.msg_type === "candles" && m.candles && pt.assetId) {
        handleHistory(pt.assetId, pt.gran, m.candles);
      } else if (m.msg_type === "ohlc" && m.ohlc) {
        handleOhlc(m.ohlc);
      }
    };
    var onDown = function () {
      clearTimeout(openTimer);
      connecting = false;
      ws = null;
      Object.keys(watched).forEach(function (assetId) {
        Object.keys(watched[assetId]).forEach(function (gran) {
          gran = Number(gran);
          if (marketClosedNow(SYMBOLS[assetId])) setState(assetId, gran, "CLOSED");
          else setState(assetId, gran, "OFFLINE");
        });
      });
      scheduleReconnect();
    };
    sock.onclose = onDown;
    sock.onerror = function () { try { sock.close(); } catch (e) {} };
  }
  function handleError(m) {
    // Deriv error e.g. InputValidationFailed on a bad symbol — mark that asset OFFLINE, keep the socket.
    var pt = (m.echo_req && m.echo_req.passthrough) || {};
    if (pt.assetId && pt.gran) setState(pt.assetId, pt.gran, "OFFLINE");
  }
  function scheduleReconnect() {
    if (!wantOpen) return;
    var delay = Math.min(backoffMs, MAX_BACKOFF_MS) * (0.8 + Math.random() * 0.4);
    backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS);
    setTimeout(function () { if (wantOpen) connect(); }, delay);
  }

  /* ---------------- data handling ---------------- */
  function handleHistory(assetId, gran, arr) {
    var g = storeFor(assetId, gran, true);
    var out = [];
    for (var i = 0; i < arr.length; i++) {
      var c = arr[i];
      var t = normTime(c.epoch);
      var o = num(c.open), h = num(c.high), l = num(c.low), cl = num(c.close);
      if (!t || o == null || h == null || l == null || cl == null) continue;
      out.push({ time: t, open: o, high: h, low: l, close: cl });
    }
    out.sort(function (a, b) { return a.time - b.time; });
    // dedupe on time, keep the latest occurrence
    var seen = {}, ded = [];
    for (var j = out.length - 1; j >= 0; j--) {
      if (!seen[out[j].time]) { seen[out[j].time] = 1; ded.push(out[j]); }
    }
    ded.reverse();
    g.candles = ded.slice(-HISTORY_COUNT);
    g.updatedAt = Date.now();
    if (g.candles.length) priceCache[assetId] = g.candles[g.candles.length - 1].close;
    setState(assetId, gran, "LIVE");
    persist(assetId, gran);
    emit("candles", { assetId: assetId, gran: gran, candles: g.candles, full: true });
  }
  function handleOhlc(o) {
    var t = normTime(o.open_time);
    var cl = num(o.close);
    if (!t || cl == null) return;
    var open = num(o.open), high = num(o.high), low = num(o.low);
    if (open == null || high == null || low == null) return;
    // find which watched (asset,gran) this belongs to — match by symbol + granularity
    Object.keys(watched).forEach(function (assetId) {
      var meta = SYMBOLS[assetId];
      if (!meta || meta.deriv !== o.symbol) return;
      var gran = Number(o.granularity);
      if (!watched[assetId][gran]) return;
      var g = storeFor(assetId, gran, true);
      var last = g.candles[g.candles.length - 1];
      if (last && last.time === t) {
        last.high = Math.max(last.high, high);
        last.low = Math.min(last.low, low);
        last.close = cl;
        if (open < last.open) last.open = open; // correction, not append
      } else if (!last || t > last.time) {
        g.candles.push({ time: t, open: open, high: high, low: low, close: cl });
        if (g.candles.length > HISTORY_COUNT) g.candles.splice(0, g.candles.length - HISTORY_COUNT);
      } else {
        // late tick for an older candle: correct it in place, never append
        for (var i = g.candles.length - 1; i >= 0 && g.candles[i].time >= t - gran; i--) {
          if (g.candles[i].time === t) {
            g.candles[i].high = Math.max(g.candles[i].high, high);
            g.candles[i].low = Math.min(g.candles[i].low, low);
            g.candles[i].close = cl;
            break;
          }
        }
      }
      g.updatedAt = Date.now();
      priceCache[assetId] = cl;
      if (g.state !== "LIVE") setState(assetId, gran, "LIVE");
      emit("candles", { assetId: assetId, gran: gran, candles: g.candles, full: false });
    });
  }

  /* ---------------- watchdog ---------------- */
  setInterval(function () {
    if (!wantOpen || !ws || ws.readyState !== 1) return;
    var now = Date.now(), idle = now - lastMsgAt;
    Object.keys(watched).forEach(function (assetId) {
      var meta = SYMBOLS[assetId];
      Object.keys(watched[assetId]).forEach(function (gran) {
        gran = Number(gran);
        var g = storeFor(assetId, gran, false);
        if (!g || g.state === "CLOSED") return;
        if (marketClosedNow(meta)) { setState(assetId, gran, "CLOSED"); return; }
        if (idle > DEAD_AFTER_MS) { try { ws.close(); } catch (e) {} return; }
        if (idle > STALE_AFTER_MS && g.state === "LIVE") setState(assetId, gran, "STALE");
      });
    });
  }, 5000);
  // keep market-hours badge truthful even with zero traffic
  setInterval(function () {
    Object.keys(watched).forEach(function (assetId) {
      var meta = SYMBOLS[assetId];
      Object.keys(watched[assetId]).forEach(function (gran) {
        gran = Number(gran);
        var g = storeFor(assetId, gran, false);
        if (!g) return;
        var closed = marketClosedNow(meta);
        if (closed && g.state !== "CLOSED") setState(assetId, gran, "CLOSED");
        if (!closed && g.state === "CLOSED") { setState(assetId, gran, "RECONNECTING"); connect(); }
      });
    });
  }, 30000);

  /* ---------------- public API ---------------- */
  window.DerivFeed = {
    SOURCE: SOURCE,
    symbols: SYMBOLS,
    start: function () { wantOpen = true; connect(); },
    stop: function () { wantOpen = false; try { ws && ws.close(); } catch (e) {} ws = null; },
    watch: function (assetId, gran) {
      gran = gran || 60;
      if (!SYMBOLS[assetId]) return false;
      watched[assetId] = watched[assetId] || {};
      var first = !watched[assetId][gran];
      watched[assetId][gran] = (watched[assetId][gran] || 0) + 1;
      var g = storeFor(assetId, gran, true);
      if (marketClosedNow(SYMBOLS[assetId])) { setState(assetId, gran, "CLOSED"); return true; }
      if (first) {
        // Fresh (asset,timeframe) subscription. If the socket is already open,
        // connect() would return early and the new timeframe would NEVER get
        // its ticks_history subscription — blank chart forever. Subscribe now.
        // Cached candles on screen = we are refreshing, not cold-connecting.
        setState(assetId, gran, g.candles.length ? "RECONNECTING" : "LOADING");
        g.attempts += 1;
        if (ws && ws.readyState === 1) subscribeCandles(assetId, gran);
        else connect(); // connecting/opening socket picks this up via resubscribeAll
      }
      return true;
    },
    unwatch: function (assetId, gran) {
      gran = gran || 60;
      var w = watched[assetId];
      if (!w || !w[gran]) return;
      w[gran] -= 1;
      if (w[gran] <= 0) {
        delete w[gran];
        persist(assetId, gran);
      }
      if (!Object.keys(w).length) delete watched[assetId];
    },
    /* THE price: last Deriv close, or null. Settlement and ticket MUST use this. */
    priceOf: function (assetId) {
      var p = priceCache[assetId];
      if (p != null && isFinite(p)) return p;
      var s = stores[assetId];
      if (s) {
        var best = 0, px = null;
        Object.keys(s).forEach(function (gran) {
          var g = s[gran];
          if (g.candles.length && g.updatedAt >= best) { best = g.updatedAt; px = g.candles[g.candles.length - 1].close; }
        });
        if (px != null) return px;
      }
      return null;
    },
    candlesOf: function (assetId, gran) {
      var g = storeFor(assetId, gran || 60, false);
      return g ? g.candles : [];
    },
    stateOf: function (assetId, gran) {
      var g = storeFor(assetId, gran || 60, false);
      return g ? { state: g.state, source: SOURCE, updatedAt: g.updatedAt, attempts: g.attempts } : { state: "LOADING", source: SOURCE, updatedAt: 0, attempts: 0 };
    },
    digitsOf: function (assetId) { var m = SYMBOLS[assetId]; return m ? m.digits : 2; },
    on: function (kind, fn) { if (listeners[kind]) listeners[kind].push(fn); },
    marketClosed: function (assetId) { var m = SYMBOLS[assetId]; return m ? marketClosedNow(m) : false; }
  };
})();
