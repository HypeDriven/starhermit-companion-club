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

  // Auto picks the preset from the StarHermit hardware level (0 = Galaxy S20 / Intel UHD or weaker, 20 = RTX
  // 5090; js/gpu-level.js → window.StarHermitGpu): Low from 0, Balanced from 4, High from 10, Ultra from 17.
  // Phones, tablets and ≤ 4 GB machines are capped at level 9 (Balanced); software renderers and a failed
  // probe (no GPU name) are level 0.
  var PRESET_LEVELS = { low: 0, balanced: 4, high: 10, ultra: 17 };
  function gpuApi() { return (typeof self !== 'undefined' ? self : globalThis).StarHermitGpu; }

  /** Hardware level (0–20) for an unmasked renderer string plus StarHermitGpu.detectSystem() facts. */
  function detectLevel(gpu, system) {
    var G = gpuApi();
    if (!String(gpu || '')) return 0;
    if (!G) return PRESET_LEVELS.balanced;
    return G.detectLevel(Object.assign({}, system || {}, { gpu: String(gpu) }));
  }
  /** The preset Auto starts from for a hardware level. */
  function presetForLevel(level) {
    var G = gpuApi();
    if (G) return G.presetForLevel(level, PRESET_LEVELS);
    return level >= 17 ? 'ultra' : level >= 10 ? 'high' : level >= 4 ? 'balanced' : 'low';
  }
  /** Best preset for a GPU (the hardware level already caps phones/tablets at Balanced). */
  function detectPreset(gpu, system) { return presetForLevel(detectLevel(gpu, system)); }

  /** Scale a count tuned at the preset's floor level up for faster GPUs (≤ 4×, never below the floor). */
  function scaleCount(n, preset, level) {
    var G = gpuApi();
    var floor = PRESET_LEVELS[preset] || 0;
    return G ? G.scaleBudget(n, Math.max(Number(level) || 0, floor), floor) : n;
  }

  /*
   * Per-preset effect budget for the DOM board and its 2D effects canvas. Each preset is tuned to hold
   * 60 FPS on the weakest GPU Auto gives it (Low → level 0, Balanced → 4, High → 10, Ultra → 17; measured
   * with tests/gfx-bench.mjs).
   *   canvasCap  effects-canvas pixel-ratio cap (with the preset's render scale on top);
   *   motes      dust motes at the floor level (the Particles tier caps them: off 0, low 40);
   *   burst      serve/tidy/win sparkle count multiplier at the floor level (win: 110 × burst);
   *   lampRes    the hearth-light gradient is cached once per resize in an offscreen layer at this fraction
   *              of the canvas and only blitted with a flickering alpha each frame.
   */
  var BUDGETS = {
    low:      { canvasCap: 1,    motes: 12, burst: 0.4, lampRes: 0.25 },
    balanced: { canvasCap: 1.25, motes: 22, burst: 0.5, lampRes: 0.25 },
    high:     { canvasCap: 1.5,  motes: 56, burst: 1,   lampRes: 0.5 },
    ultra:    { canvasCap: 2,    motes: 90, burst: 1.5, lampRes: 0.5 }
  };
  var MOTE_CAP = { off: 0, low: 40, high: 240 };
  var BURST_CAP = { off: 0, low: 0.5, high: 4 };

  /** A preset's concrete budget for a hardware level and Particles tier. */
  function budgetFor(preset, level, particles) {
    var b = Object.assign({}, BUDGETS[preset] || BUDGETS.balanced);
    b.motes = Math.min(MOTE_CAP[particles] == null ? MOTE_CAP.high : MOTE_CAP[particles], Math.round(scaleCount(b.motes, preset, level)));
    b.burst = Math.min(BURST_CAP[particles] == null ? BURST_CAP.high : BURST_CAP[particles], Math.round(scaleCount(b.burst, preset, level) * 100) / 100);
    return b;
  }

  /**
   * Resolve saved settings into concrete tiers.
   * saved: { preset: 'auto'|preset, render_scale (0.5–2), adaptive, show_fps,
   *          <category>: 'preset'|tier }.
   */
  function resolve(saved, detected, level) {
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
    out.level = level == null ? PRESET_LEVELS[preset] : level;
    out.budget = budgetFor(preset, out.level, out.particles);
    out.motes = out.budget.motes;
    out.cap = Math.min(out.cap, out.budget.canvasCap);
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
    PRESET_LEVELS: PRESET_LEVELS, BUDGETS: BUDGETS, MOTE_CAP: MOTE_CAP, BURST_CAP: BURST_CAP,
    detectLevel: detectLevel, presetForLevel: presetForLevel, budgetFor: budgetFor,
    detectPreset: detectPreset, resolve: resolve, choosePreset: choosePreset,
    presetTier: presetTier, pixelRatio: pixelRatio, describe: describe, adaptStep: adaptStep
  };
});
