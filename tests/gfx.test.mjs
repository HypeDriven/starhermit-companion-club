/** Companion Club — graphics quality model unit tests (node --test). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// The shared hardware-level module, as the page's classic script (window.StarHermitGpu).
const gpuFile = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'js', 'gpu-level.js');
const gpuModule = { exports: {} };
new Function('module', readFileSync(gpuFile, 'utf8'))(gpuModule);
globalThis.StarHermitGpu = gpuModule.exports;
const file = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'js', 'gfx.js');
const module = { exports: {} };
new Function('module', readFileSync(file, 'utf8'))(module);
const Gfx = module.exports;

const DESK = { webgl: true, webgl2: true, cores: 8, memoryGb: 8 };
const PHONE = { webgl: true, webgl2: true, mobile: true, cores: 8, memoryGb: 8 };

test('hardware level → preset: Low 0, Balanced 4, High 10, Ultra 17', () => {
  assert.equal(Gfx.detectPreset('ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)', DESK), 'low');
  assert.equal(Gfx.detectLevel('llvmpipe (LLVM 15.0.7, 256 bits)', DESK), 0);
  assert.equal(Gfx.detectPreset('ANGLE (AMD, AMD Radeon(TM) Graphics Direct3D11 vs_5_0 ps_5_0)', DESK), 'low');
  assert.equal(Gfx.detectPreset('ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11)', DESK), 'low');
  assert.equal(Gfx.detectPreset('ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11)', DESK), 'balanced');
  assert.equal(Gfx.detectPreset('ANGLE (NVIDIA, NVIDIA GeForce GTX 1070 Direct3D11 vs_5_0 ps_5_0)', DESK), 'high');
  assert.equal(Gfx.detectPreset('ANGLE (NVIDIA, NVIDIA GeForce RTX 4080 Direct3D11 vs_5_0 ps_5_0)', DESK), 'ultra');
  assert.equal(Gfx.detectLevel('ANGLE (NVIDIA, NVIDIA GeForce RTX 5090 Direct3D11 vs_5_0 ps_5_0)', DESK), 20);
  assert.equal(Gfx.detectPreset('ANGLE (NVIDIA, NVIDIA GeForce RTX 5090 Direct3D11 vs_5_0 ps_5_0)', DESK), 'ultra');
  assert.equal(Gfx.presetForLevel(3), 'low');
  assert.equal(Gfx.presetForLevel(16), 'high');
});

test('phones and tablets are capped at Balanced; software GPUs stay Low', () => {
  assert.equal(Gfx.detectPreset('Adreno (TM) 740', PHONE), 'balanced');
  assert.ok(Gfx.detectLevel('Adreno (TM) 740', PHONE) <= 9);
  assert.equal(Gfx.detectPreset('NVIDIA GeForce RTX 5090', PHONE), 'balanced');
  assert.equal(Gfx.detectPreset('SwiftShader', PHONE), 'low');
});

test('every preset has an explicit budget that grows from Low to Ultra and scales with the level', () => {
  const order = ['low', 'balanced', 'high', 'ultra'];
  for (const p of order) for (const k of ['canvasCap', 'motes', 'burst', 'lampRes']) assert.ok(Gfx.BUDGETS[p][k] != null, `${p}.${k}`);
  for (let i = 1; i < order.length; i++) {
    for (const k of ['canvasCap', 'motes', 'burst', 'lampRes']) assert.ok(Gfx.BUDGETS[order[i]][k] >= Gfx.BUDGETS[order[i - 1]][k], `${order[i]}.${k}`);
  }
    assert.deepEqual(Gfx.resolve({ preset: 'ultra' }, 'low', 0).budget, Gfx.resolve({ preset: 'ultra' }, 'ultra', 17).budget,
    'a manual Ultra on a weak GPU keeps the Ultra floor budget');
  assert.equal(Gfx.detectPreset('', DESK), 'low', 'a failed probe (no GPU name) is Low');
  assert.equal(Gfx.detectPreset('Software renderer', DESK), 'low');
  const b4 = Gfx.resolve({ preset: 'high' }, 'high', 10).budget, b14 = Gfx.resolve({ preset: 'high' }, 'high', 14).budget;
  assert.ok(b14.motes > b4.motes && b14.burst > b4.burst, 'counts scale up within the preset');
  assert.equal(Gfx.resolve({ preset: 'ultra', particles: 'low' }, 'ultra', 20).budget.motes, Gfx.MOTE_CAP.low, 'Particles tier caps');
  assert.equal(Gfx.resolve({ preset: 'low' }, 'low', 0).budget.motes, 0, 'Low: Particles off');
  assert.equal(Gfx.resolve({ preset: 'balanced' }, 'balanced').cap, 1.25, 'Balanced canvas cap');
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
  assert.equal(Gfx.pixelRatio(Gfx.resolve({ preset: 'balanced' }), 3, 1), 1.25, 'Balanced: canvas cap 1.25');
  assert.ok(Math.abs(Gfx.pixelRatio(Gfx.resolve({ preset: 'high' }), 3, 0.6) - 0.9) < 1e-9, 'High: canvas cap 1.5 × adaptive 0.6');
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
