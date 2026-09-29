/* Trexora v1 interactions */
(function(){
  "use strict";

  /* Theme toggle (persisted) */
  var root = document.documentElement;
  var toggle = document.getElementById('themeToggle');
  function setLabel(){
    var light = root.getAttribute('data-theme') === 'light';
    toggle.setAttribute('aria-label', light ? 'Switch to dark theme' : 'Switch to light theme');
  }
  toggle.addEventListener('click', function(){
    var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', next);
    try{ localStorage.setItem('trexora-theme', next); }catch(e){}
    setLabel();
  });
  setLabel();

  /* Mobile nav drawer */
  var navToggle = document.getElementById('navToggle');
  var nav = document.getElementById('mainNav');
  navToggle.addEventListener('click', function(){
    var open = nav.classList.toggle('open');
    navToggle.classList.toggle('open', open);
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  });
  nav.querySelectorAll('a').forEach(function(a){
    a.addEventListener('click', function(){
      nav.classList.remove('open');
      navToggle.classList.remove('open');
      navToggle.setAttribute('aria-expanded','false');
    });
  });

  /* FAQ accordion */
  document.querySelectorAll('.acc-item').forEach(function(item){
    var head = item.querySelector('.acc-head');
    var body = item.querySelector('.acc-body');
    if (!head || !body) return;
    head.addEventListener('click', function(){
      var isOpen = item.classList.contains('open');
      document.querySelectorAll('.acc-item.open').forEach(function(o){
        o.classList.remove('open');
        o.querySelector('.acc-body').style.maxHeight = null;
        o.querySelector('.acc-head').setAttribute('aria-expanded','false');
      });
      if(!isOpen){
        item.classList.add('open');
        body.style.maxHeight = body.scrollHeight + 'px';
        head.setAttribute('aria-expanded','true');
      }
    });
  });

  /* Scroll reveal */
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){ e.target.classList.add('visible'); io.unobserve(e.target); }
    });
  }, {threshold:.12});
  document.querySelectorAll('.reveal').forEach(function(el){ io.observe(el); });

  /* Seeded candlestick charts (deterministic, illustrative) */
  function mulberry(seed){
    return function(){
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function drawCandles(svg, seed, w, h, n){
    if(!svg) return;
    var rnd = mulberry(seed);
    var NS = 'http://www.w3.org/2000/svg';
    var pad = 14, cw = (w - pad*2) / n, bw = Math.max(3, cw * .55);
    var prices = [], p = 100;
    for(var i=0;i<n;i++){ p += (rnd()-.48)*3.2; prices.push(p); }
    var min = Math.min.apply(null,prices), max = Math.max.apply(null,prices);
    function y(v){ return h - pad - ((v-min)/(max-min)) * (h - pad*2); }
    // grid lines
    for(var g=1; g<4; g++){
      var gl = document.createElementNS(NS,'line');
      gl.setAttribute('x1',pad); gl.setAttribute('x2',w-pad);
      gl.setAttribute('y1',pad+g*(h-pad*2)/4); gl.setAttribute('y2',pad+g*(h-pad*2)/4);
      gl.setAttribute('stroke','currentColor'); gl.setAttribute('opacity','.08');
      svg.appendChild(gl);
    }
    prices.forEach(function(c, i){
      var o = i===0 ? c : prices[i-1];
      var hi = Math.max(o,c) + rnd()*1.4, lo = Math.min(o,c) - rnd()*1.4;
      var x = pad + i*cw + cw/2, up = c >= o;
      var col = up ? '#2F80FF' : '#F23645';
      var wick = document.createElementNS(NS,'line');
      wick.setAttribute('x1',x); wick.setAttribute('x2',x);
      wick.setAttribute('y1',y(hi)); wick.setAttribute('y2',y(lo));
      wick.setAttribute('stroke',col); wick.setAttribute('stroke-width',Math.max(1.2,cw*.12));
      var body = document.createElementNS(NS,'rect');
      body.setAttribute('x', x - bw/2);
      body.setAttribute('y', y(Math.max(o,c)));
      body.setAttribute('width', bw);
      body.setAttribute('height', Math.max(2, Math.abs(y(o)-y(c))));
      body.setAttribute('rx', 1.5);
      body.setAttribute('fill', col);
      svg.appendChild(wick); svg.appendChild(body);
    });
    // last-price line
    var lp = document.createElementNS(NS,'line');
    lp.setAttribute('x1',pad); lp.setAttribute('x2',w-pad);
    lp.setAttribute('y1',y(prices[n-1])); lp.setAttribute('y2',y(prices[n-1]));
    lp.setAttribute('stroke','#D9A441'); lp.setAttribute('stroke-dasharray','5 4');
    lp.setAttribute('stroke-width','1.4'); lp.setAttribute('opacity','.8');
    svg.appendChild(lp);
  }
  drawCandles(document.getElementById('phoneChart'), 777, 300, 150, 22);
  drawCandles(document.getElementById('appChart'), 4242, 300, 150, 22);

  /* Hero curtain parallax — the page slides up and "eats" the hero on scroll */
  (function heroParallax(){
    var hero = document.querySelector('.hero');
    var inner = document.querySelector('.hero-inner');
    var curtain = document.querySelector('.page-curtain');
    if (!hero || !inner || !curtain) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var ticking = false, heroH = 0;
    function measure(){ heroH = hero.offsetHeight; }
    function update(){
      ticking = false;
      var y = window.scrollY || 0;
      if (y < 0) y = 0;
      if (y > heroH) { inner.style.transform = ''; inner.style.opacity = ''; return; }
      var p = y / Math.max(1, heroH);
      inner.style.transform = 'translateY(' + Math.round(y * 0.28) + 'px) scale(' + (1 - p * 0.05).toFixed(4) + ')';
      inner.style.opacity = (1 - p * 0.85).toFixed(3);
    }
    function onScroll(){ if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function(){ measure(); onScroll(); });
    update();
  })();
  (function heroBg(){
    /* One-color "video" backdrop: brand-blue candles streaming right -> left,
       two parallax layers for depth. Pure canvas, 60fps, pauses off-screen. */
    var cv = document.getElementById('heroBg');
    if (!cv || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var ctx = cv.getContext('2d');
    var W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    var COL = '47,128,255'; /* single brand-blue for every candle */
    function resize(){
      var r = cv.parentElement.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function makeLayer(cw, bw, vol, alpha, speed){
      return { cw: cw, bw: bw, vol: vol, alpha: alpha, speed: speed, candles: [], price: 100, t: 0, px: 0 };
    }
    var back = makeLayer(64, 34, 3.2, 0.20, 0.30);  /* far layer: big, faint, slow */
    var front = makeLayer(34, 18, 2.4, 0.55, 0.62); /* near layer: crisp, faster */
    function newCandle(L){
      var o = L.price;
      var drift = Math.sin(L.t / 70) * 0.45;
      var c = o + (Math.random() - 0.5) * 2 * L.vol + drift;
      var h = Math.max(o, c) + Math.random() * L.vol * 0.8;
      var l = Math.min(o, c) - Math.random() * L.vol * 0.8;
      L.price = c; L.t++;
      return { o: o, h: h, l: l, c: c, a: 0.72 + Math.random() * 0.28 };
    }
    function seed(L){
      L.candles = []; L.price = 100; L.t = 0; L.px = 0;
      var n = Math.ceil(W / L.cw) + 6, i;
      for (i = 0; i < n; i++) L.candles.push(newCandle(L));
    }
    function draw(L){
      L.px += L.speed;
      if (L.px >= L.cw) { L.px -= L.cw; L.candles.push(newCandle(L)); }
      while (L.candles.length > Math.ceil(W / L.cw) + 8) L.candles.shift();
      var n = L.candles.length, i, cd;
      var min = Infinity, max = -Infinity;
      for (i = 0; i < n; i++) { cd = L.candles[i]; if (cd.l < min) min = cd.l; if (cd.h > max) max = cd.h; }
      var pad = (max - min) * 0.3 || 1; min -= pad; max += pad;
      function y(p){ return H * 0.08 + (1 - (p - min) / (max - min)) * H * 0.84; }
      var off = L.px, xc;
      ctx.lineWidth = Math.max(1.2, L.bw * 0.07);
      for (i = 0; i < n; i++) {
        cd = L.candles[i];
        var x = W - (n - 1 - i) * L.cw - off - L.bw; /* right -> left */
        if (x < -L.cw || x > W + L.cw) continue;
        xc = x + L.bw / 2;
        ctx.strokeStyle = 'rgba(' + COL + ',' + (L.alpha * cd.a).toFixed(3) + ')';
        ctx.fillStyle = ctx.strokeStyle;
        ctx.beginPath(); ctx.moveTo(xc, y(cd.h)); ctx.lineTo(xc, y(cd.l)); ctx.stroke();
        var yo = y(cd.o), yc = y(cd.c);
        ctx.fillRect(x, Math.min(yo, yc), L.bw, Math.max(2.5, Math.abs(yc - yo)));
      }
    }
    var visible = true;
    function frame(){
      if (!visible || document.hidden) { requestAnimationFrame(frame); return; }
      ctx.clearRect(0, 0, W, H);
      draw(back);
      draw(front);
      requestAnimationFrame(frame);
    }
    resize(); seed(back); seed(front);
    window.addEventListener('resize', function(){ resize(); seed(back); seed(front); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function(en){ visible = en[0].isIntersecting; }, { threshold: 0 }).observe(cv);
    }
    requestAnimationFrame(frame);
  })();

  /* Live TradingView chart in the pitch demo frame */
  try{
    var pitchEl = document.getElementById('pitchChart');
    if(pitchEl && typeof TradingView !== 'undefined'){
      new TradingView.widget({
        autosize: true,
        symbol: 'FOREXCOM:EURUSD',
        interval: '5',
        timezone: 'Asia/Dubai',
        theme: 'dark',
        style: '1',
        locale: 'en',
        enable_publishing: false,
        allow_symbol_change: true,
        hide_volume: true,
        container_id: 'pitchChart'
      });
    }
  }catch(e){/* demo frame stays as a styled placeholder */}

  /* ============ Trexora 2.0 ============ */
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Navbar: glass pill gains background on scroll */
  (function navScroll(){
    var header = document.querySelector('.site-header');
    if(!header) return;
    function upd(){ header.classList.toggle('scrolled', (window.scrollY || 0) > 24); }
    window.addEventListener('scroll', upd, {passive:true});
    upd();
  })();

  /* "More" dropdown — click support for touch */
  (function navMore(){
    var wrap = document.querySelector('.nav-more');
    var btn = document.querySelector('.nav-more-btn');
    if(!wrap || !btn) return;
    btn.addEventListener('click', function(e){
      e.stopPropagation();
      var open = wrap.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('click', function(){ wrap.classList.remove('open'); });
  })();

  /* Stagger grid reveals */
  document.querySelectorAll('.ind-grid,.feat-grid,.trust-grid,.mkt-pills').forEach(function(grid){
    grid.querySelectorAll('.reveal').forEach(function(el,i){
      el.style.setProperty('--d', Math.min(i * 0.08, 0.4).toFixed(2) + 's');
    });
  });

  /* Stats — animated count-up on reveal */
  (function statCount(){
    var nums = document.querySelectorAll('.stat-card .num[data-count]');
    if(!nums.length) return;
    function fmt(v, el){
      return (el.dataset.prefix || '') + Math.round(v).toLocaleString('en-US') + (el.dataset.suffix || '');
    }
    function run(el){
      if(el.dataset.done) return;
      el.dataset.done = '1';
      var target = +el.dataset.count;
      if(reduceMotion){ el.textContent = fmt(target, el); return; }
      var t0 = null, dur = 1400;
      function step(t){
        if(!t0) t0 = t;
        var p = Math.min((t - t0) / dur, 1), e = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(target * e, el);
        if(p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }
    if('IntersectionObserver' in window){
      var sio = new IntersectionObserver(function(es){
        es.forEach(function(e){ if(e.isIntersecting){ run(e.target); sio.unobserve(e.target); } });
      }, {threshold:.4});
      nums.forEach(function(n){ sio.observe(n); });
    } else { nums.forEach(run); }
  })();

  /* Markets tabs — auto-rotate ~5s, click to jump */
  (function markets(){
    var MKTS = {
      forex:  {name:'Forex',  desc:'Majors and minors with tight fixed payouts — the most traded market in the world, on your screen in one tap.', pair:'EUR/USD', pay:'82%', seed:11, pills:[['EUR/USD','82%'],['GBP/USD','80%'],['USD/JPY','79%'],['AUD/USD','78%']]},
      crypto: {name:'Crypto', desc:'Bitcoin, Ethereum and more — trade crypto 24/7: nights, weekends and holidays.', pair:'BTC/USD', pay:'85%', seed:22, pills:[['BTC/USD','85%'],['ETH/USD','84%'],['SOL/USD','83%'],['XRP/USD','82%']]},
      metals: {name:'Metals', desc:'Gold and silver — classic safe-haven instruments with fixed payouts on every trade.', pair:'XAU/USD', pay:'78%', seed:33, pills:[['XAU/USD','78%'],['XAG/USD','76%']]},
      indices:{name:'Indices',desc:'US30, NAS100 and S&P 500 — trade the whole market in a single position.', pair:'US30', pay:'81%', seed:44, pills:[['US30','81%'],['NAS100','80%'],['SPX500','79%']]}
    };
    var tabs = document.querySelectorAll('.mkt-tab');
    if(!tabs.length) return;
    var order = ['forex','crypto','metals','indices'], idx = 0, timer = null;
    function show(key){
      var m = MKTS[key]; if(!m) return;
      tabs.forEach(function(t){
        var on = t.getAttribute('data-mkt') === key;
        t.classList.toggle('active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      document.getElementById('mktName').textContent = m.name;
      document.getElementById('mktDesc').textContent = m.desc;
      document.getElementById('mktPair').textContent = m.pair;
      document.getElementById('mktPay').textContent = m.pay;
      document.getElementById('mktPills').innerHTML = m.pills.map(function(p,i){
        return '<span class="mkt-pill" style="animation-delay:' + (i*0.06).toFixed(2) + 's"><b>' + p[1] + '</b>' + p[0] + '</span>';
      }).join('');
      var svg = document.getElementById('mktChart');
      if(svg){ svg.innerHTML = ''; drawCandles(svg, m.seed, 300, 150, 22); }
      idx = order.indexOf(key);
    }
    function auto(){ timer = setInterval(function(){ show(order[(idx+1) % order.length]); }, 5000); }
    tabs.forEach(function(t){
      t.addEventListener('click', function(){ clearInterval(timer); show(t.getAttribute('data-mkt')); auto(); });
    });
    show('forex'); auto();
  })();

  /* Hero phone — live-animated mini candlesticks (blue up / red down) */
  (function heroPhoneChart(){
    var cv = document.getElementById('heroPhoneChart');
    if(!cv || reduceMotion) return;
    var ctx = cv.getContext('2d');
    var W = 0, H = 150, dpr = Math.min(window.devicePixelRatio || 1, 2);
    var CW = 15, BW = 8, candles = [], price = 100, px = 0, t = 0, visible = true;
    function newCandle(){
      var o = price;
      var c = o + (Math.random() - 0.5) * 3.4 + Math.sin(t / 9) * 0.5;
      var h = Math.max(o,c) + Math.random() * 1.6, l = Math.min(o,c) - Math.random() * 1.6;
      price = c; t++;
      return {o:o,h:h,l:l,c:c};
    }
    function seed(){ candles = []; price = 100; t = 0; px = 0; var n = Math.ceil(W / CW) + 4; for(var i=0;i<n;i++) candles.push(newCandle()); }
    function resize(){
      W = Math.max(1, cv.parentElement.clientWidth);
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr,0,0,dpr,0,0);
      seed();
    }
    function frame(){
      if(!visible || document.hidden){ requestAnimationFrame(frame); return; }
      px += 0.55;
      if(px >= CW){ px -= CW; candles.push(newCandle()); }
      while(candles.length > Math.ceil(W / CW) + 6) candles.shift();
      var n = candles.length, i, cd, min = Infinity, max = -Infinity;
      for(i=0;i<n;i++){ cd=candles[i]; if(cd.l<min)min=cd.l; if(cd.h>max)max=cd.h; }
      var pad = (max-min)*0.35 || 1; min-=pad; max+=pad;
      function y(p){ return 8 + (1-(p-min)/(max-min)) * (H-16); }
      ctx.clearRect(0,0,W,H);
      ctx.strokeStyle = 'rgba(140,175,255,.09)'; ctx.lineWidth = 1;
      for(var g=1;g<4;g++){ var gy = 8 + g*(H-16)/4; ctx.beginPath(); ctx.moveTo(0,gy); ctx.lineTo(W,gy); ctx.stroke(); }
      for(i=0;i<n;i++){
        cd = candles[i];
        var x = W - (n-1-i)*CW - px, xc = x + BW/2;
        if(x < -CW || x > W+CW) continue;
        var up = cd.c >= cd.o, col = up ? '#2F80FF' : '#F23645';
        ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(xc,y(cd.h)); ctx.lineTo(xc,y(cd.l)); ctx.stroke();
        var yo=y(cd.o), yc=y(cd.c);
        ctx.fillRect(x, Math.min(yo,yc), BW, Math.max(2,Math.abs(yc-yo)));
      }
      requestAnimationFrame(frame);
    }
    resize();
    window.addEventListener('resize', resize);
    if('IntersectionObserver' in window){ new IntersectionObserver(function(en){ visible = en[0].isIntersecting; },{threshold:0}).observe(cv); }
    requestAnimationFrame(frame);
  })();

  /* Hero phone — subtle mouse parallax (fine pointers only) */
  (function heroParallaxPhone(){
    var phone = document.getElementById('heroPhone');
    var hero = document.querySelector('.hero');
    if(!phone || !hero || reduceMotion) return;
    if(!window.matchMedia('(pointer:fine)').matches) return;
    hero.addEventListener('mousemove', function(e){
      var r = hero.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      phone.style.setProperty('--px', (x * 16).toFixed(1) + 'px');
      phone.style.setProperty('--py', (y * 12).toFixed(1) + 'px');
    });
    hero.addEventListener('mouseleave', function(){
      phone.style.setProperty('--px', '0px');
      phone.style.setProperty('--py', '0px');
    });
  })();
})();
