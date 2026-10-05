/* Companion Club — graphics runtime. Applies the resolved quality model
 * (CCGfx) to the page: data-gfx-* attributes on <html> drive the CSS effects
 * in css/gfx.css, and one fixed, click-through canvas draws dust motes in the
 * lamp light plus serve/tidy/win sparkle bursts. Also owns GPU detection,
 * adaptive resolution and the frame-rate readout. Browser global: window.CCFx.
 * Never logs to the console.
 */
(function () {
  'use strict';
  var Gfx = window.CCGfx;
  var KEY = 'companionclub.graphics.v1';
  var html = document.documentElement;

  var saved = load();
  var mobile = isMobile();
  var gpuName = detectGpu();
  var detected = Gfx.detectPreset(gpuName, { mobile: mobile });
  var r = null;                    // resolved settings
  var adaptiveScale = 1;
  var canvas = null, ctx = null, unavailable = false;
  var motes = [], bursts = [];
  var raf = 0, lastT = 0, frameSum = 0, frameN = 0, fpsAcc = 0, fpsN = 0, fpsT = 0;
  var fpsEl = null, listeners = [];
  var rmQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var reducedSetting = false;

  function load() {
    try { var v = JSON.parse(localStorage.getItem(KEY) || 'null'); return v && typeof v === 'object' ? v : {}; }
    catch (e) { return {}; }
  }
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) { /* private mode */ } }

  function isMobile() {
    var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    return !!(coarse || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || ''));
  }

  // Unmasked GPU name. failIfMajorPerformanceCaveat makes software fallbacks
  // (SwiftShader) refuse the context instead of printing a fallback warning.
  function detectGpu() {
    try {
      var c = document.createElement('canvas');
      var gl = c.getContext('webgl', { failIfMajorPerformanceCaveat: true });
      if (!gl) return 'Software renderer';
      var name = '';
      if (!/Firefox/i.test(navigator.userAgent || '')) {
        var ext = gl.getExtension('WEBGL_debug_renderer_info');
        if (ext) name = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
      }
      if (!name) name = gl.getParameter(gl.RENDERER);
      var lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
      return String(name || '');
    } catch (e) { return ''; }
  }

  function reduced() { return reducedSetting || !!(rmQuery && rmQuery.matches); }

  // ---------- apply ----------
  function apply() {
    r = Gfx.resolve(saved, detected);
    html.dataset.gfxPreset = r.preset;
    Object.keys(Gfx.CATEGORIES).forEach(function (cat) {
      html.dataset['gfx' + cat.charAt(0).toUpperCase() + cat.slice(1)] = r[cat];
    });
    if (reduced()) html.dataset.reducedMotion = 'true'; else delete html.dataset.reducedMotion;
    if (!r.adaptive) adaptiveScale = 1;
    setupCanvas();
    setupFps();
    schedule();
    listeners.forEach(function (fn) { try { fn(); } catch (e) { /* ignore */ } });
  }

  function setupCanvas() {
    if (!r.canvas || unavailable) { removeCanvas(); return; }
    if (!canvas) {
      try {
        canvas = document.createElement('canvas');
        canvas.className = 'cc-fx';
        canvas.setAttribute('aria-hidden', 'true');
        ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('2d');
        document.body.appendChild(canvas);
      } catch (e) {
        unavailable = true; removeCanvas(); return;
      }
    }
    resize();
    seedMotes();
  }
  function removeCanvas() {
    if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
    canvas = null; ctx = null; bursts = [];
  }
  function ratio() { return Gfx.pixelRatio(r, window.devicePixelRatio || 1, r.adaptive ? adaptiveScale : 1); }
  function resize() {
    if (!canvas) return;
    var k = ratio();
    var w = Math.max(1, Math.round(window.innerWidth * k)), h = Math.max(1, Math.round(window.innerHeight * k));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    if (!raf) drawFrame(performance.now());
  }
  function seedMotes() {
    var n = r.motes;
    while (motes.length < n) motes.push({ x: Math.random(), y: Math.random(), s: 0.6 + Math.random() * 1.6, p: Math.random() * 6.28, v: 0.004 + Math.random() * 0.01 });
    motes.length = n;
  }

  function setupFps() {
    if (r.showFps && !fpsEl) {
      fpsEl = document.createElement('div');
      fpsEl.className = 'cc-fps'; fpsEl.id = 'cc-fps';
      fpsEl.setAttribute('aria-hidden', 'true');
      fpsEl.textContent = '— fps';
      document.body.appendChild(fpsEl);
    } else if (!r.showFps && fpsEl) { fpsEl.remove(); fpsEl = null; }
  }

  // The loop runs only when something animates or the fps readout is on.
  function wantsLoop() {
    if (document.hidden) return false;
    return !!(r.showFps || (canvas && !reduced()));
  }
  function schedule() {
    if (wantsLoop()) { if (!raf) { lastT = 0; raf = requestAnimationFrame(tick); } }
    else if (raf) { cancelAnimationFrame(raf); raf = 0; if (canvas) drawFrame(performance.now()); }
  }

  function tick(t) {
    raf = 0;
    var dt = lastT ? t - lastT : 16;
    lastT = t;
    if (dt < 250) {
      fpsAcc += dt; fpsN++;
      if (fpsEl && t - fpsT > 500) { fpsEl.textContent = Math.round(1000 / (fpsAcc / fpsN)) + ' fps'; fpsAcc = 0; fpsN = 0; fpsT = t; }
      if (canvas && r.adaptive) {
        frameSum += dt; frameN++;
        if (frameN >= 90) {
          var next = Gfx.adaptStep(adaptiveScale, frameSum / frameN);
          frameSum = 0; frameN = 0;
          if (next !== adaptiveScale) { adaptiveScale = next; resize(); listeners.forEach(function (fn) { fn(); }); }
        }
      }
    }
    if (canvas) drawFrame(t, Math.min(dt, 50) / 1000);
    if (wantsLoop()) raf = requestAnimationFrame(tick);
  }

  // ---------- drawing ----------
  function drawFrame(t, dt) {
    if (!ctx) return;
    var W = canvas.width, H = canvas.height, k = W / Math.max(1, window.innerWidth);
    var still = reduced() || !raf && !dt;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    // Lamp light from the upper right, flickering gently like a hearth.
    if (r.bloom === 'on' && r.ambient === 'animated') {
      var fl = still ? 0 : Math.sin(t * 0.0021) * 0.35 + Math.sin(t * 0.0053 + 1.3) * 0.25 + Math.sin(t * 0.011) * 0.12;
      var rad = Math.max(W, H) * 0.75;
      var g = ctx.createRadialGradient(W * 0.86, -H * 0.05, 0, W * 0.86, -H * 0.05, rad);
      g.addColorStop(0, 'rgba(255,190,110,' + (0.11 + fl * 0.03).toFixed(3) + ')');
      g.addColorStop(0.5, 'rgba(255,160,80,' + (0.04 + fl * 0.012).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(255,150,70,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    // Dust motes drifting through the light.
    for (var i = 0; i < motes.length; i++) {
      var m = motes[i];
      if (!still && dt) {
        m.y -= m.v * dt * 1.2; m.x += Math.sin(t * 0.0004 + m.p) * 0.00012;
        if (m.y < -0.02) { m.y = 1.02; m.x = Math.random(); }
      }
      var a = 0.18 + 0.22 * (0.5 + 0.5 * Math.sin(t * 0.0012 + m.p * 3));
      ctx.fillStyle = 'rgba(255,221,170,' + (still ? 0.25 : a).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(m.x * W, m.y * H, m.s * k * ((window.UIScale && window.UIScale.value) || 1), 0, 6.2832); ctx.fill();
    }
    // Bursts.
    for (var j = bursts.length - 1; j >= 0; j--) {
      var b = bursts[j];
      b.life -= dt || 0;
      if (b.life <= 0) { bursts.splice(j, 1); continue; }
      b.vy += b.g * (dt || 0); b.x += b.vx * (dt || 0); b.y += b.vy * (dt || 0); b.rot += b.spin * (dt || 0);
      var al = Math.min(1, b.life / b.max * 1.6);
      ctx.save();
      ctx.globalAlpha = al;
      ctx.translate(b.x * k, b.y * k); ctx.rotate(b.rot);
      ctx.fillStyle = b.color;
      if (b.shape === 'star') star(ctx, b.size * k);
      else if (b.shape === 'bubble') { ctx.strokeStyle = b.color; ctx.lineWidth = 1.2 * k; ctx.beginPath(); ctx.arc(0, 0, b.size * k, 0, 6.2832); ctx.stroke(); ctx.globalAlpha = al * 0.25; ctx.fill(); }
      else ctx.fillRect(-b.size * k, -b.size * 0.5 * k, b.size * 2 * k, b.size * k);
      ctx.restore();
    }
  }
  function star(c, s) {
    c.beginPath();
    for (var i = 0; i < 8; i++) { var rr = i % 2 ? s * 0.38 : s; var a = i * Math.PI / 4; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    c.closePath(); c.fill();
  }

  /** Sparkles at a viewport rect: kind = serve | tidy | win. */
  function burst(rect, kind) {
    if (!canvas || reduced() || !rect) return;
    var many = r.particles === 'high';
    var cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    var n = kind === 'win' ? (many ? 110 : 50) : (many ? 26 : 12);
    var colors = kind === 'serve' ? ['#ffd27a', '#f6b85f', '#fff1c9']
      : kind === 'tidy' ? ['#dff2ff', '#bfe3ff', '#ffffff']
      : ['#e07b39', '#f0d9a8', '#6fa8dc', '#5d9c59', '#8e6fc0', '#f6b85f', '#d9534f'];
    for (var i = 0; i < n; i++) {
      var ang = Math.random() * Math.PI * 2, sp = (kind === 'win' ? 160 : 70) + Math.random() * (kind === 'win' ? 260 : 110);
      var p = {
        x: kind === 'win' ? window.innerWidth * (0.2 + Math.random() * 0.6) : cx + (Math.random() - 0.5) * rect.width * 0.4,
        y: kind === 'win' ? window.innerHeight * 0.35 : cy,
        vx: Math.cos(ang) * sp, vy: kind === 'tidy' ? -40 - Math.random() * 60 : Math.sin(ang) * sp - (kind === 'win' ? 200 : 60),
        g: kind === 'tidy' ? -20 : kind === 'win' ? 420 : 160,
        life: kind === 'win' ? 1.8 + Math.random() * 0.8 : 0.7 + Math.random() * 0.5,
        size: kind === 'tidy' ? 2.5 + Math.random() * 4 : kind === 'win' ? 3 + Math.random() * 2.5 : 2.5 + Math.random() * 3,
        color: colors[i % colors.length], shape: kind === 'serve' ? 'star' : kind === 'tidy' ? 'bubble' : 'confetti',
        rot: Math.random() * 6.28, spin: (Math.random() - 0.5) * 8
      };
      if (kind === 'tidy') p.vx *= 0.35;
      // Particles live in viewport px; grow them with the zoomed UI on large screens.
      var u = (window.UIScale && window.UIScale.value) || 1;
      if (u !== 1) { p.vx *= u; p.vy *= u; p.g *= u; p.size *= u; }
      p.max = p.life;
      bursts.push(p);
    }
    schedule();
  }

  // ---------- public ----------
  function set(key, value) {
    if (key === 'preset') saved = Gfx.choosePreset(saved, value);
    else if (key === 'render_scale') saved.render_scale = Math.min(2, Math.max(0.5, Number(value) || 1));
    else if (key === 'adaptive' || key === 'show_fps') saved[key] = !!value;
    else if (Gfx.CATEGORIES[key]) { if (value === 'preset') delete saved[key]; else saved[key] = value; }
    persist();
    apply();
  }
  /** Replace the whole saved graphics object (platform settings sync). */
  function replace(obj) {
    if (!obj || typeof obj !== 'object') return;
    saved = JSON.parse(JSON.stringify(obj));
    persist();
    apply();
  }
  function info() {
    var k = canvas ? null : Math.min(window.devicePixelRatio || 1, r.cap);
    return {
      gpu: gpuName, detected: detected, saved: saved, resolved: r, unavailable: unavailable,
      adaptiveScale: adaptiveScale,
      pixels: canvas ? [canvas.width, canvas.height] : [Math.round(window.innerWidth * k), Math.round(window.innerHeight * k)]
    };
  }
  function setReducedMotion(on) { reducedSetting = !!on; apply(); }

  window.addEventListener('resize', function () { if (r) { resize(); listeners.forEach(function (fn) { fn(); }); } });
  document.addEventListener('visibilitychange', schedule);
  if (rmQuery && rmQuery.addEventListener) rmQuery.addEventListener('change', apply);

  window.CCFx = {
    KEY: KEY, set: set, replace: replace, info: info, burst: burst, setReducedMotion: setReducedMotion,
    onChange: function (fn) { listeners.push(fn); }
  };
  apply();
})();
