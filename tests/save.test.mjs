// The engine save and the migration from the browser build: the old cloud
// slot's save.json (the checksummed { sum, payload } document the JS SDK
// stored) becomes { v: 1, progress }; two devices' copies merge to the
// better of both. (native/platform.ts wires these into starhermit:storage;
// signed-in paths cannot run here, so their logic is covered by these tests.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const memory = new Map();
globalThis.localStorage = { getItem: (k) => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, String(v)), removeItem: (k) => memory.delete(k) };
const Store = require('../js/store.js');
const J = (v) => JSON.parse(JSON.stringify(v));

function browserSave(progress, settings) {
  const doc = Store.fresh();
  Object.assign(doc.progress, progress);
  Object.assign(doc.settings, settings);
  return Store.save(doc); // the wrapped text the SDK's saveJSON stored as save.json
}

test('the browser build\'s cloud save converts to the engine save', () => {
  const text = browserSave({ achievements: { 'first-serve': 5 }, sparkle: 945, sparkleEarned: 945, stats: { rounds: 3, wins: 2, serves: 9, wishesMissed: 0, bestStreak: 3, playMs: 1000 } },
    { music: 0.2, graphicsTier: 'high', reducedMotion: true });
  const doc = Store.fromBrowserSave(text);
  assert.equal(doc.v, 1);
  assert.deepEqual(Object.keys(doc), ['v', 'progress'], 'settings are the runtime\'s Options now');
  assert.equal(doc.progress.sparkle, 945);
  assert.equal(doc.progress.stats.wins, 2);
  assert.equal(doc.progress.achievements['first-serve'], 5);
  assert.deepEqual(J(Store.docFromSave(doc)), J(doc), 'the converted save reads back');
});

test('a corrupt, foreign or newer save is ignored', () => {
  assert.equal(Store.fromBrowserSave('not json'), null);
  assert.equal(Store.fromBrowserSave(null), null);
  assert.equal(Store.fromBrowserSave(JSON.stringify({ sum: 'x', payload: '{}' })), null);
  const payload = JSON.stringify({ v: 9, progress: {} });
  assert.equal(Store.fromBrowserSave(JSON.stringify({ sum: Store.checksum(payload), payload })), null);
  assert.equal(Store.docFromSave({ v: 2, progress: {} }), null);
  assert.equal(Store.docFromSave([]), null);
  assert.equal(Store.docFromSave({ v: 1 }), null);
});

test('an engine save missing parts reads with defaults', () => {
  const d = Store.docFromSave({ v: 1, progress: { sparkle: 3 } });
  assert.equal(d.progress.sparkle, 3);
  assert.equal(d.progress.stats.rounds, 0);
  assert.deepEqual(J(d.progress.achievements), {});
});

test('save-conflict merge keeps the better of both devices', () => {
  const a = Store.fresh().progress, b = Store.fresh().progress;
  Object.assign(a, { tutorialDone: { t1: true }, journeyStars: { j01: 1 }, achievements: { 'first-serve': 500 }, sparkle: 40, sparkleEarned: 90, decor: { rug: true } });
  a.stats.rounds = 9; a.stats.bestStreak = 2;
  Object.assign(b, { tutorialDone: { t2: true }, journeyStars: { j01: 3, j02: 1 }, achievements: { 'first-serve': 100, 'first-win': 200 }, sparkle: 70, sparkleEarned: 70, decor: { fern: true } });
  b.stats.rounds = 4; b.stats.bestStreak = 5;
  const m = Store.mergeProgress(a, b);
  assert.deepEqual(J(m.tutorialDone), { t2: true, t1: true });
  assert.deepEqual(J(m.journeyStars), { j01: 3, j02: 1 });
  assert.deepEqual(J(m.achievements), { 'first-serve': 100, 'first-win': 200 });
  assert.equal(m.sparkle, 70);
  assert.equal(m.sparkleEarned, 90);
  assert.deepEqual(Object.keys(m.decor).sort(), ['fern', 'rug']);
  assert.equal(m.stats.rounds, 9);
  assert.equal(m.stats.bestStreak, 5);
  const docs = Store.mergeDocs({ v: 1, progress: a }, { v: 1, progress: b });
  assert.deepEqual(J(docs.progress), J(m));
  assert.equal(Store.mergeDocs(null, { v: 1, progress: b }).progress.sparkle, 70);
  assert.equal(Store.mergeDocs(null, undefined), null);
});
