/* Companion Club — graphics quality model: presets, per-category overrides,
 * GPU detection and a cost summary. Pure (no DOM), so the Graphics panel,
 * the effects runtime (fx.js) and the unit tests agree on what a setting
 * means. Browser global: window.CCGfx; Node: module.exports.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CCGfx = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var PRESETS = ['low', 'balanced', 'high', 'ultra'];

  // Category -> allowed tiers, cheapest first. Only effects this DOM/canvas
  // game actually has: no anti-aliasing or AO categories (nothing to apply).
  var CATEGORIES = {
    shadows: ['off', 'low', 'medium', 'high'],   // drop shadows under panels, tiles, friends
    bloom: ['off', 'on'],                         // glow on highlights, lamp light
    grade: ['off', 'on'],                         // warm colour grade + vignette on imagery
    particles: ['off', 'low', 'high'],            // dust motes + serve/tidy/win sparkles
    ambient: ['static', 'animated'],              // idle bob, lamp flicker, art drift
    detail: ['plain', 'detailed']                 // bevelled tiles, tinted stations, friend tokens
  };

  // Each preset row: tiers + render scale (multiplies the effects-canvas pixel
  // ratio) + pixel-ratio cap. Low is exactly the pre-upgrade look: no canvas,
  // no animation, no extra shadows.
  var TABLE = {
    low:      { scale: 1,    cap: 1,   shadows: 'off',    bloom: 'off', grade: 'off', particles: 'off',  ambient: 'static',   detail: 'plain' },
    balanced: { scale: 1,    cap: 1.5, shadows: 'low',    bloom: 'on',  grade: 'on',  particles: 'low',  ambient: 'static',   detail: 'detailed' },
    high:     { scale: 1,    cap: 2,   shadows: 'medium', bloom: 'on',  grade: 'on',  particles: 'high', ambient: 'animated', detail: 'detailed' },
    ultra:    { scale: 1.25, cap: 2,   shadows: 'high',   bloom: 'on',  grade: 'on',  particles: 'high', ambient: 'animated', detail: 'detailed' }
  };

  // Ambient dust motes drawn per tier (bursts come on top).
  var MOTES = { off: 0, low: 22, high: 56 };

  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

  /** Best preset for this GPU from the unmasked renderer string. */
  function detectPreset(gpu, opts) {
    var g = String(gpu || '').toLowerCase();
    var tier;
    if (!g || /swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic/.test(g)) tier = 'low';
    else if (/nvidia|geforce|rtx|gtx|quadro|radeon rx|radeon pro|amd radeon(?! graphics)|apple m\d/.test(g)) tier = 'high';
    else tier = 'balanced';
    // Touch/mobile devices never auto-pick above Balanced.
    if (opts && opts.mobile && (tier === 'high' || tier === 'ultra')) tier = 'balanced';
    return tier;
  }

  /**
   * Resolve saved settings into concrete tiers.
   * saved: { preset: 'auto'|preset, render_scale (0.5–2), adaptive, show_fps,
   *          <category>: 'preset'|tier }.
   */
  function resolve(saved, detected) {
    var s = saved || {};
    var auto = PRESETS.indexOf(s.preset) < 0;
    var preset = auto ? (PRESETS.indexOf(detected) >= 0 ? detected : 'balanced') : s.preset;
    var row = TABLE[preset];
    var user = clamp(Number(s.render_scale) || 1, 0.5, 2);
    var out = { preset: preset, auto: auto, userScale: user, scale: row.scale * user, cap: row.cap };
    Object.keys(CATEGORIES).forEach(function (cat) {
      out[cat] = CATEGORIES[cat].indexOf(s[cat]) >= 0 ? s[cat] : row[cat];
    });
    out.adaptive = s.adaptive !== false;
    out.showFps = !!s.show_fps;
    out.motes = MOTES[out.particles];
    // The effects canvas exists only when something draws on it; otherwise
    // the page costs exactly what the plain DOM board costs.
    out.canvas = out.particles !== 'off' || (out.ambient === 'animated' && out.bloom === 'on');
    return out;
  }

  /** Settings after choosing a preset: overrides cleared, scale/toggles kept. */
  function choosePreset(saved, preset) {
    var s = saved || {};
    var out = { preset: preset === 'auto' || PRESETS.indexOf(preset) >= 0 ? preset : 'auto' };
    if (s.render_scale != null) out.render_scale = s.render_scale;
    if (s.adaptive != null) out.adaptive = s.adaptive;
    if (s.show_fps != null) out.show_fps = s.show_fps;
    return out;
  }

  /** The preset's own tier for a category (for "From preset (…)" labels). */
  function presetTier(preset, cat) { return TABLE[preset] ? TABLE[preset][cat] : undefined; }

  /** Canvas pixel ratio: min(dpr, cap) × preset/user scale × adaptive scale. */
  function pixelRatio(r, dpr, adaptiveScale) {
    return clamp(Math.min(dpr || 1, r.cap) * r.scale * (adaptiveScale || 1), 0.25, 4);
  }

  var EN = {
    shadows: 'shadows', bloom: 'glow', grade: 'colour grade', particles: 'particles',
    ambient: 'ambient motion', detail: 'detailed surfaces', none: 'no effects',
    tiers: { low: 'low', medium: 'medium', high: 'high' }
  };

  /** Human cost summary; `labels` localizes the words (English default). */
  function describe(r, pixels, labels) {
    var L = labels || EN, T = L.tiers || EN.tiers;
    var parts = [];
    if (r.shadows !== 'off') parts.push(L.shadows + ' ' + (T[r.shadows] || r.shadows));
    if (r.bloom === 'on') parts.push(L.bloom);
    if (r.grade === 'on') parts.push(L.grade);
    if (r.particles !== 'off') parts.push(L.particles + ' ' + (T[r.particles] || r.particles));
    if (r.ambient === 'animated') parts.push(L.ambient);
    if (r.detail === 'detailed') parts.push(L.detail);
    if (!parts.length) parts.push(L.none);
    if (pixels) parts.push(pixels[0] + '×' + pixels[1] + ' px');
    return parts.join(' · ');
  }

  /** Adaptive-resolution step from an average frame time (ms). */
  function adaptStep(scale, avgMs) {
    if (avgMs > 26) return Math.max(0.6, Math.round((scale - 0.1) * 100) / 100);
    if (avgMs < 14) return Math.min(1, Math.round((scale + 0.05) * 100) / 100);
    return scale;
  }

  return {
    PRESETS: PRESETS, CATEGORIES: CATEGORIES, MOTES: MOTES,
    detectPreset: detectPreset, resolve: resolve, choosePreset: choosePreset,
    presetTier: presetTier, pixelRatio: pixelRatio, describe: describe, adaptStep: adaptStep
  };
});
