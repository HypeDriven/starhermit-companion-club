/** Companion Club — graphics quality model unit tests (node --test). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const file = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'js', 'gfx.js');
const module = { exports: {} };
new Function('module', readFileSync(file, 'utf8'))(module);
const Gfx = module.exports;

test('detectPreset maps GPU strings to tiers', () => {
  assert.equal(Gfx.detectPreset('ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)'), 'low');
  assert.equal(Gfx.detectPreset('llvmpipe (LLVM 15.0.7, 256 bits)'), 'low');
  assert.equal(Gfx.detectPreset('Software renderer'), 'low');
  assert.equal(Gfx.detectPreset(''), 'low');
  assert.equal(Gfx.detectPreset('ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 Direct3D11 vs_5_0 ps_5_0)'), 'high');
  assert.equal(Gfx.detectPreset('Apple M2'), 'high');
  assert.equal(Gfx.detectPreset('AMD Radeon RX 6800'), 'high');
  assert.equal(Gfx.detectPreset('ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11)'), 'balanced');
  assert.equal(Gfx.detectPreset('Mali-G78'), 'balanced');
  assert.equal(Gfx.detectPreset('Apple M2', { mobile: true }), 'balanced', 'mobile caps Auto at balanced');
  assert.equal(Gfx.detectPreset('Adreno (TM) 740', { mobile: true }), 'balanced');
});

test('resolve: auto uses the detected preset, explicit preset wins', () => {
  const a = Gfx.resolve({}, 'low');
  assert.equal(a.preset, 'low'); assert.equal(a.auto, true);
  assert.equal(a.shadows, 'off'); assert.equal(a.particles, 'off'); assert.equal(a.detail, 'plain');
  assert.equal(a.canvas, false, 'Low draws no effects canvas');
  const h = Gfx.resolve({ preset: 'high' }, 'low');
  assert.equal(h.preset, 'high'); assert.equal(h.auto, false);
  assert.equal(h.shadows, 'medium'); assert.equal(h.ambient, 'animated'); assert.equal(h.canvas, true);
  assert.equal(Gfx.resolve({ preset: 'bogus' }, 'ultra').preset, 'ultra');
  assert.equal(Gfx.resolve({}, undefined).preset, 'balanced');
});

test('resolve: per-category overrides and invalid tiers', () => {
  const r = Gfx.resolve({ preset: 'high', particles: 'off', bloom: 'off', shadows: 'huge' }, 'low');
  assert.equal(r.particles, 'off');
  assert.equal(r.bloom, 'off');
  assert.equal(r.shadows, 'medium', 'invalid tier falls back to the preset');
  assert.equal(r.canvas, false, 'no particles and no glow flicker -> no canvas');
  assert.equal(Gfx.resolve({ preset: 'low', detail: 'detailed' }).detail, 'detailed');
});

test('resolve: render scale clamps to 50–200% and multiplies the preset scale', () => {
  assert.equal(Gfx.resolve({ preset: 'high', render_scale: 5 }).scale, 2);
  assert.equal(Gfx.resolve({ preset: 'high', render_scale: 0.1 }).scale, 0.5);
  assert.equal(Gfx.resolve({ preset: 'ultra', render_scale: 1 }).scale, 1.25);
  assert.equal(Gfx.resolve({ preset: 'high' }).scale, 1);
  const r = Gfx.resolve({ preset: 'low' });
  assert.equal(Gfx.pixelRatio(r, 3, 1), 1, 'Low caps the pixel ratio at 1');
  assert.equal(Gfx.pixelRatio(Gfx.resolve({ preset: 'balanced' }), 3, 1), 1.5);
  assert.equal(Gfx.pixelRatio(Gfx.resolve({ preset: 'high' }), 3, 0.6), 1.2);
});

test('toggles default: adaptive on, fps off', () => {
  const r = Gfx.resolve({}, 'low');
  assert.equal(r.adaptive, true); assert.equal(r.showFps, false);
  const s = Gfx.resolve({ adaptive: false, show_fps: true }, 'low');
  assert.equal(s.adaptive, false); assert.equal(s.showFps, true);
});

test('choosing a preset clears overrides but keeps scale and toggles', () => {
  const next = Gfx.choosePreset({ preset: 'high', particles: 'off', grade: 'off', render_scale: 1.5, show_fps: true }, 'ultra');
  assert.deepEqual(next, { preset: 'ultra', render_scale: 1.5, show_fps: true });
  assert.equal(Gfx.resolve(next).particles, 'high');
  assert.deepEqual(Gfx.choosePreset({ preset: 'low' }, 'auto'), { preset: 'auto' });
});

test('presetTier and describe', () => {
  assert.equal(Gfx.presetTier('balanced', 'particles'), 'low');
  assert.equal(Gfx.presetTier('ultra', 'shadows'), 'high');
  assert.equal(Gfx.presetTier('nope', 'shadows'), undefined);
  assert.equal(Gfx.describe(Gfx.resolve({ preset: 'low' }), [800, 600]), 'no effects · 800×600 px');
  const d = Gfx.describe(Gfx.resolve({ preset: 'high' }), [1280, 800]);
  assert.match(d, /shadows medium/); assert.match(d, /particles high/); assert.match(d, /1280×800 px$/);
});

test('adaptive steps: down 0.1 to 0.6, up 0.05 to 1', () => {
  assert.equal(Gfx.adaptStep(1, 30), 0.9);
  assert.equal(Gfx.adaptStep(0.65, 40), 0.6);
  assert.equal(Gfx.adaptStep(0.6, 40), 0.6);
  assert.equal(Gfx.adaptStep(0.9, 10), 0.95);
  assert.equal(Gfx.adaptStep(1, 10), 1);
  assert.equal(Gfx.adaptStep(0.8, 20), 0.8);
});
