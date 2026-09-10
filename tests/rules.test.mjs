/**
 * Companion Club — rules/content/store unit tests (node --test, no deps).
 * Exercises the pure modules exactly as the browser loads them.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// The js/ modules are UMD classic scripts (package.json is "type": "module",
// so plain require() would treat them as ESM). Evaluate them CommonJS-style.
const JS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'js');
const loaded = {};
function load(name) {
  if (loaded[name]) return loaded[name];
  const module = { exports: {} };
  const fn = new Function('module', 'require', readFileSync(path.join(JS, name), 'utf8'));
  fn(module, (dep) => load(path.basename(dep)));
  return (loaded[name] = module.exports);
}
const RNG = load('rng.js');
const Rules = load('rules.js');
const Content = load('content.js');
const Store = load('store.js');

function lesson(id) { return Content.tutorialLessons().find((l) => l.id === id).cfg; }
function together() {
  const cfg = JSON.parse(JSON.stringify(lesson('t2')));
  cfg.companions = ['pip', 'momo'];
  cfg.fixedCompanions.push({ id: 'momo', x: 2, y: 1, wish: { activity: 'snack', patience: 30 } });
  return cfg;
}

test('rng streams are deterministic and independent', () => {
  const a = RNG.streams(12345), b = RNG.streams(12345);
  assert.equal(a.rules.next(), b.rules.next());
  assert.notEqual(RNG.derive(1, RNG.STREAM_RULES).next(), RNG.derive(1, RNG.STREAM_AV).next());
  assert.equal(RNG.hashString('companionclub-daily-v1-2026-09-08'), RNG.hashString('companionclub-daily-v1-2026-09-08'));
});

test('every authored config builds a connected board with a legal opening', () => {
  const cfgs = [...Content.JOURNEY, ...Content.CHALLENGES, ...Content.PRACTICE, Content.SCORE_CHASE,
    ...Content.tutorialLessons().map((l) => l.cfg), Content.dailyConfig('2026-09-08'), Content.dailyConfig('2026-09-14')];
  assert.equal(Content.JOURNEY.length, 40);
  for (const cfg of cfgs) {
    const s = Rules.createGame(cfg);
    assert.equal(s.terminal, null, cfg.id);
    assert.ok(Rules.legalActions(s).length > 0, cfg.id + ' has no legal action');
    assert.equal(s.companions.length, cfg.companions.length);
    for (const c of s.companions) assert.ok(Rules.isWalkable(s, c.x, c.y));
  }
});

test('same seed + same commands → identical state hash', () => {
  const play = () => {
    let s = Rules.createGame(Content.JOURNEY[0]);
    for (let i = 0; i < 30 && !s.terminal; i++) {
      const h = Rules.hint(s);
      s = Rules.applyCommand(s, h.action).state;
    }
    return s;
  };
  assert.equal(Rules.hashState(play()), Rules.hashState(play()));
});

test('serve scoring: base + patience + together + streak; station goes messy', () => {
  // t2 lesson layout (Pip on the Snack Counter at (1,1)) plus Momo adjacent at (2,1), both patience 30.
  const s0 = Rules.createGame(together());
  const out = Rules.applyCommand(s0, { type: 'serve', companion: 'pip' });
  assert.ok(out.ok);
  const serve = out.events.find((e) => e.type === 'serve');
  assert.equal(serve.points, 100 + 5 * 30 + 40 * 1 + 0 + 0); // 290: mood 70 < 80 so no joyful bonus
  assert.equal(out.state.score.serve, 100);
  assert.equal(out.state.score.patienceBonus, 150);
  assert.equal(out.state.score.togetherBonus, 40);
  assert.equal(out.state.score.streakBonus, 0);
  assert.equal(out.state.score.total, 290);
  assert.ok(Rules.stationAt(out.state, 1, 1).messy);
  assert.equal(Rules.companionAt(out.state, 1, 1).cooldown, 1); // cfg.cooldown 2, decremented once at end of the serve turn
  assert.equal(Rules.companionAt(out.state, 1, 1).mood, 90);
  assert.ok(out.events.some((e) => e.type === 'messy'));
  assert.equal(Rules.checkServe(out.state, 'momo'), Rules.INVALID.NOT_ON_STATION);
});

test('tidy restores a station and scores 15; invalid reasons are specific', () => {
  const s0 = Rules.createGame(lesson('t3'));
  assert.equal(Rules.checkServe(s0, 'pip'), Rules.INVALID.STATION_MESSY);
  assert.equal(Rules.checkTidy(s0, 'pip', 0, 0), Rules.INVALID.NOT_ON_STATION);
  const out = Rules.applyCommand(s0, { type: 'tidy', companion: 'pip', x: 1, y: 1 });
  assert.ok(out.ok);
  assert.equal(out.state.score.tidy, 15);
  assert.equal(Rules.stationAt(out.state, 1, 1).messy, false);
  assert.equal(Rules.checkTidy(out.state, 'pip', 1, 1), Rules.INVALID.NOT_MESSY);
  assert.equal(Rules.checkMove(s0, 'pip', 'sideways'), Rules.INVALID.BAD_DIR);
  assert.equal(Rules.checkMove(s0, 'nobody', 'up'), Rules.INVALID.BAD_COMPANION);
  assert.equal(Rules.applyCommand(s0, { type: 'dance' }).reason, Rules.INVALID.BAD_CMD);
  assert.equal(Rules.applyCommand(s0, null).reason, Rules.INVALID.BAD_SHAPE);
});

test('patience decays each turn; expiry is a miss that resets the streak and lowers mood', () => {
  let s = Rules.createGame(lesson('t4')); // Pip patience 6, four steps from the counter
  assert.equal(s.companions[0].wish.patience, 6);
  const missCfg = Object.assign({}, lesson('t4'), { missLimit: 1 });
  s = Rules.createGame(missCfg);
  let expired = null;
  for (let i = 0; i < 8 && !expired; i++) {
    const out = Rules.applyCommand(s, { type: 'move', companion: 'pip', dir: i % 2 ? 'down' : 'up' });
    s = out.state;
    expired = out.events.find((e) => e.type === 'wish-expired') || null;
  }
  assert.ok(expired);
  assert.equal(s.misses, 1);
  assert.equal(s.companions[0].mood, 55);
  assert.equal(s.terminal.reason, Rules.TERMINAL.HARMONY);
  assert.equal(s.terminal.won, false);
});

test('goal completion wins with day + mood bonuses; day-ended loses; resign ends', () => {
  const cfg = Object.assign({}, lesson('t2'), { goal: 1, dayLength: 10 });
  const out = Rules.applyCommand(Rules.createGame(cfg), { type: 'serve', companion: 'pip' });
  assert.equal(out.state.terminal.reason, Rules.TERMINAL.GOAL);
  assert.equal(out.state.score.dayBonus, 10 * (10 - 1));
  assert.equal(out.state.score.moodBonus, 90);
  assert.equal(out.state.score.total, 100 + 150 + 90 + 90);

  let d = Rules.createGame(Object.assign({}, lesson('t1'), { dayLength: 2 }));
  d = Rules.applyCommand(d, { type: 'move', companion: 'pip', dir: 'left' }).state;
  d = Rules.applyCommand(d, { type: 'move', companion: 'pip', dir: 'left' }).state;
  assert.equal(d.terminal.reason, Rules.TERMINAL.DAY);

  const r = Rules.applyCommand(Rules.createGame(cfg), { type: 'resign' });
  assert.equal(r.state.terminal.reason, Rules.TERMINAL.RESIGN);
  assert.equal(Rules.applyCommand(r.state, { type: 'serve', companion: 'pip' }).reason, Rules.INVALID.ENDED);
});

test('endless ruleset advances waves instead of ending', () => {
  let s = Rules.createGame(Object.assign({}, Content.SCORE_CHASE, { goal: 0 }));
  s.cfg.goal = 0;
  const out = Rules.applyCommand(s, Rules.legalActions(s)[0]);
  assert.equal(out.state.round, 2);
  assert.equal(out.state.score.roundBonus, 150);
  assert.equal(out.state.cfg.goal, 2);
  assert.equal(out.state.cfg.dayLength, 60);
  assert.equal(out.state.terminal, null);
});

test('hint always returns a legal action and prefers the most urgent serve', () => {
  let s = Rules.createGame(Content.JOURNEY[5]);
  for (let i = 0; i < 40 && !s.terminal; i++) {
    const h = Rules.hint(s);
    assert.ok(Rules.legalActions(s).some((a) => JSON.stringify(a) === JSON.stringify(h.action)));
    s = Rules.applyCommand(s, h.action).state;
  }
  const t2 = Rules.createGame(together());
  assert.equal(Rules.hint(t2).action.type, 'serve');
});

test('daily config is a pure function of the date', () => {
  const a = Content.dailyConfig('2026-09-08'), b = Content.dailyConfig('2026-09-08'), c = Content.dailyConfig('2026-09-09');
  assert.deepEqual(a, b);
  assert.notEqual(a.seed, c.seed);
  assert.equal(Content.utcDateString(Date.UTC(2026, 8, 8, 23, 59)), '2026-09-08');
});

test('serialization round-trips and rejects unknown versions', () => {
  const s = Rules.createGame(Content.JOURNEY[0]);
  assert.equal(Rules.hashState(Rules.deserialize(Rules.serialize(s))), Rules.hashState(s));
  assert.throws(() => Rules.deserialize(JSON.stringify({ v: 99 })));
  assert.equal(Rules.validateCommandShape({ type: 'move', companion: 'pip', dir: 'up' }), null);
  assert.equal(Rules.validateCommandShape({ type: 'tidy', companion: 'pip', x: 1.5, y: 0 }), Rules.INVALID.BAD_SHAPE);
});

test('store: checksum, migration and tie-break ordering', () => {
  const doc = Store.fresh();
  assert.equal(doc.v, Store.SAVE_VERSION);
  assert.equal(Store.migrate({ v: 99 }), null);
  assert.equal(Store.migrate({ v: 0, progress: { sparkle: 5 } }).progress.sparkle, 5);
  const sorted = Store.sortEntries([
    { sessionId: 'b', score: 100, invalid: 0, durationMs: 900 },
    { sessionId: 'a', score: 100, invalid: 0, durationMs: 900 },
    { sessionId: 'c', score: 100, invalid: 1, durationMs: 100 },
    { sessionId: 'd', score: 120, invalid: 9, durationMs: 9999 }
  ]);
  assert.deepEqual(sorted.map((e) => e.sessionId), ['d', 'a', 'b', 'c']);
});
