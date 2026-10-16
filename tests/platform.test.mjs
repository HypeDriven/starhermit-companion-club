/** Companion Club — StarHermit adapter unit tests (node --test).
 * Loads starhermit-sdk.js + js/platform.js into a vm sandbox with a stubbed
 * fetch and launch hash. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SLUG = 'companion-club';
const J = (o) => JSON.parse(JSON.stringify(o));
const b64u = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const JWT = `${b64u({ alg: 'none' })}.${b64u({ sub: 'u-12345678', game_scope: SLUG, exp: Math.floor(Date.now() / 1000) + 3600 })}.sig`;

function boot(hash) {
  const calls = [];
  const store = { save: null, settings: {} };
  const fetch = async (url, init = {}) => {
    const method = init.method || 'GET';
    calls.push({ url, method, init });
    const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } });
    if (url.endsWith('/api/v1/users/u-12345678/profile')) return json({ nickname: 'Pip' });
    if (url.includes('/api/v1/me/cloud-saves/') && url.endsWith('/info')) {
      return json(store.save ? { exists: true, etag: '"v' + calls.length + '"' } : { exists: false });
    }
    if (url.includes('/api/v1/me/cloud-saves/')) {
      // refuseNextPut: the next write loses to "another device" (conditional write refused).
      if (method === 'PUT' && store.refuseNextPut) { store.refuseNextPut = false; return json({ error: 'precondition-failed' }, 412); }
      if (method === 'PUT') { store.save = Buffer.from(JSON.parse(init.body).dataBase64, 'base64'); return json({ etag: '"v' + calls.length + '"' }); }
      return store.save ? new Response(store.save, { status: 200 }) : new Response('', { status: 404 });
    }
    if (url.endsWith(`/api/v1/games/${SLUG}/settings`)) {
      if (method === 'PATCH') { Object.assign(store.settings, JSON.parse(init.body).settings); return json({ settings: store.settings }); }
      return json({ settings: store.settings });
    }
    if (url.endsWith(`/api/v1/games/${SLUG}/controls`)) return json({ actions: [{ action: 'serve', codes: ['KeyX'] }] });
    return new Response('', { status: 404 });
  };
  const listeners = {};
  const location = { hash, search: '', pathname: '/', hostname: 'localhost', href: 'http://localhost/' + hash, origin: 'http://localhost' };
  const win = {
    location,
    history: { state: null, replaceState(_s, _t, url) { const i = url.indexOf('#'); location.hash = i >= 0 ? url.slice(i) : ''; } },
    addEventListener(t, fn) { (listeners[t] = listeners[t] || []).push(fn); },
    document: { hidden: false, addEventListener() {} },
    fetch, Response, Blob, URL, URLSearchParams, TextEncoder, TextDecoder, atob, btoa, Uint8Array, DataView, Map, Promise, JSON,
    setTimeout: (fn, ms) => { const t = setTimeout(fn, Math.min(ms, 20)); t.unref(); return t; },
    clearTimeout,
  };
  win.window = win; win.self = win;
  vm.createContext(win);
  vm.runInContext(readFileSync(path.join(ROOT, 'starhermit-sdk.js'), 'utf8'), win);
  vm.runInContext(readFileSync(path.join(ROOT, 'js', 'platform.js'), 'utf8'), win);
  return { win, P: win.CCPlatform, calls, store, listeners };
}

test('launch token: read from the fragment, fragment stripped, slug from claims', async () => {
  const { P, win } = boot('#game_token=' + JWT + '&session_id=abc');
  assert.equal(P.init(), true);
  assert.equal(P.hosted, true);
  assert.equal(P.slug, SLUG);
  assert.equal(P.userId, 'u-12345678');
  assert.equal(win.location.hash, '');
  assert.equal(P.headers().Authorization, 'Bearer ' + JWT);
});

test('profile name comes from the profile nickname', async () => {
  const { P } = boot('#game_token=' + JWT);
  P.init();
  const prof = await P.fetchProfile();
  assert.equal(prof.name, 'Pip');
});

test('cloud save round-trips through /api/v1/me/cloud-saves/game:<slug>', async () => {
  const { P, calls } = boot('#game_token=' + JWT);
  P.init();
  const wrapped = JSON.stringify({ sum: 'abc', payload: '{"v":1}' });
  P.onLocalSave(wrapped);
  assert.equal(P.sync, 'saving');
  assert.equal(await P.flushSave(true), true);
  const put = calls.find((c) => c.method === 'PUT');
  assert.ok(put.url.endsWith('/api/v1/me/cloud-saves/' + encodeURIComponent('game:' + SLUG)), put.url);
  assert.equal(put.init.keepalive, true);
  assert.equal(P.sync, 'synced');
  assert.equal(await P.loadCloud(), wrapped);
});

test('settings patch and bindings use the game routes', async () => {
  const { P, calls, store } = boot('#game_token=' + JWT);
  P.init();
  await P.patchSettings({ graphics: { preset: 'high' } });
  assert.deepEqual(J(store.settings.graphics), { preset: 'high' });
  assert.ok(calls.some((c) => c.method === 'PATCH' && c.url.endsWith(`/api/v1/games/${SLUG}/settings`)));
  assert.deepEqual(J((await P.getSettings()).graphics), { preset: 'high' });
  const b = await P.loadBindings({ serve: ['KeyS'], hint: ['KeyH'] });
  assert.deepEqual(J(b), { serve: ['KeyX'], hint: ['KeyH'] });
  assert.match(P.inviteLink(), /game-invite\/u-12345678\/companion-club$/);
});

test('standalone: no token means no fetch at all', async () => {
  const { P, calls } = boot('');
  assert.equal(P.init(), false);
  assert.equal(P.hosted, false);
  assert.equal(P.canSignIn(), false);
  assert.equal(P.inviteLink(), null);
  assert.equal(await P.fetchProfile(), null);
  assert.equal(await P.loadCloud(), null);
  P.onLocalSave(JSON.stringify({ sum: 'x', payload: '{}' }));
  await P.flushSave(true);
  await P.patchSettings({ a: 1 });
  assert.deepEqual(J(await P.getSettings()), {});
  assert.deepEqual(J(await P.loadBindings({ hint: ['KeyH'] })), { hint: ['KeyH'] });
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(calls.length, 0);
});

function loadStore() {
  const ctx = { self: null };
  ctx.self = ctx;
  vm.createContext(ctx);
  vm.runInContext(readFileSync(path.join(ROOT, 'js', 'store.js'), 'utf8'), ctx);
  return ctx.CCStore;
}

test('save-conflict merge keeps the better of both devices', () => {
  const Store = loadStore();
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
});

test('a refused cloud write reloads the newer copy for the game to merge', async () => {
  const { P, store } = boot('#game_token=' + JWT);
  P.init();
  assert.equal(await P.loadCloud(), null);
  const other = JSON.stringify({ sum: 'x', payload: '{"from":"other"}' });
  P.onLocalSave(other);
  assert.equal(await P.flushSave(true), true, 'other device saved first');
  const reloaded = new Promise((resolve) => P.onConflict(resolve));
  store.refuseNextPut = true;
  P.onLocalSave(JSON.stringify({ sum: 'y', payload: '{"from":"mine"}' }));
  assert.equal(await P.flushSave(true), false, 'stale write refused');
  assert.equal(await reloaded, other);
  P.onLocalSave(JSON.stringify({ sum: 'z', payload: '{"from":"merged"}' }));
  assert.equal(await P.flushSave(true), true, 'merged doc saved');
});
