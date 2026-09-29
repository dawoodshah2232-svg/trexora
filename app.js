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
      var col = up ? '#22C55E' : '#F23645';
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
  drawCandles(document.getElementById('heroChart'), 20260929, 560, 220, 34);
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
    var cv = document.getElementById('heroBg');
    if (!cv || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var ctx = cv.getContext('2d');
    var W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    var candles = [], price = 100, t = 0;
    var UP = '#22C55E', DN = '#F23645';
    function resize(){
      var r = cv.parentElement.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function newCandle(){
      var o = price;
      var drift = Math.sin(t / 90) * 0.35;
      var c = o + (Math.random() - 0.5) * 2.2 + drift;
      var h = Math.max(o, c) + Math.random() * 1.4;
      var l = Math.min(o, c) - Math.random() * 1.4;
      price = c; t++;
      return { o: o, h: h, l: l, c: c, age: 0 };
    }
    function seed(){
      candles = []; price = 100; t = 0;
      var n = Math.ceil(W / 26) + 8;
      for (var i = 0; i < n; i++) candles.push(newCandle());
    }
    var SPEED = 0.28, CW = 26, BW = 13;
    var running = true, visible = true;
    function frame(){
      if (!running || !visible || document.hidden) { requestAnimationFrame(frame); return; }
      ctx.clearRect(0, 0, W, H);
      var min = Infinity, max = -Infinity, i;
      for (i = 0; i < candles.length; i++) {
        var cd = candles[i];
        if (cd.l < min) min = cd.l;
        if (cd.h > max) max = cd.h;
      }
      var pad = (max - min) * 0.25 || 1;
      min -= pad; max += pad;
      function y(p){ return H - ((p - min) / (max - min)) * H; }
      var off = (t * SPEED) % CW;
      for (i = 0; i < candles.length; i++) {
        var x = W - (candles.length - 1 - i) * CW + off - CW;
        if (x < -CW || x > W + CW) continue;
        var c = candles[i];
        var col = c.c >= c.o ? UP : DN;
        ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(x, y(c.h)); ctx.lineTo(x, y(c.l)); ctx.stroke();
        var yo = y(c.o), yc = y(c.c);
        ctx.fillRect(x - BW / 2, Math.min(yo, yc), BW, Math.max(2.5, Math.abs(yc - yo)));
      }
      if ((t * SPEED) % CW < SPEED) candles.push(newCandle());
      while (candles.length > Math.ceil(W / CW) + 10) candles.shift();
      requestAnimationFrame(frame);
    }
    resize(); seed();
    window.addEventListener('resize', function(){ resize(); seed(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function(en){ visible = en[0].isIntersecting; }, { threshold: 0 }).observe(cv);
    }
    document.addEventListener('visibilitychange', function(){ running = !document.hidden; });
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
})();
