/* Companion Club — pure deterministic rules engine.
 * No rendering, no DOM, no Date.now(): every transition derives from
 * (state, command) only. Usable from browser (window.CCRules) and Node.
 *
 * Core loop: companions around the clubhouse floor get wishes for
 * activities (snack, paint, music, nap, garden, read). Guide a companion
 * one step per turn, serve a wish at the matching station to earn
 * friendship, and tidy messy stations so they can be used again. Wishes
 * lose patience every turn; an expired wish is a miss — too many misses
 * break the club's harmony. Fulfill the day's goal before the day ends.
 *
 * Cooperative flavor: serving while another companion stands adjacent
 * earns a together bonus — plan gatherings, not just errands.
 */
(function (root, factory) {
  var RNG = (typeof module === 'object' && module.exports) ? require('./rng.js') : root.CCRNG;
  var api = factory(RNG);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CCRules = api;
})(typeof self !== 'undefined' ? self : this, function (RNG) {
  'use strict';

  var STATE_VERSION = 1;

  var SERVE_BASE = 100;
  var PATIENCE_PT = 5;       // per patience point remaining at serve time
  var TOGETHER_PT = 40;      // per adjacent companion at serve time
  var JOYFUL_PT = 10;        // serve while mood >= 80
  var JOYFUL_MOOD = 80;
  var STREAK_PT = 10;        // per current streak length beyond the first
  var TIDY_PT = 15;
  var ROUND_BONUS = 150;     // endless: per wave reached
  var DAY_PT_PER_TURN = 10;  // win bonus per turn left
  var MOOD_SERVE = 20;
  var MOOD_MISS = -15;
  var MOOD_START = 70;

  var DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

  var TERMINAL = {
    GOAL: 'goal-complete',
    HARMONY: 'harmony-lost',
    DAY: 'day-ended',
    NO_ACTIONS: 'no-actions',
    RESIGN: 'resigned'
  };

  var INVALID = {
    ENDED: 'game-ended',
    BAD_CMD: 'unknown-command',
    BAD_SHAPE: 'malformed-command',
    BAD_COMPANION: 'unknown-companion',
    BAD_DIR: 'bad-direction',
    OUT_OF_BOUNDS: 'out-of-bounds',
    BLOCKED: 'blocked-cell',
    OCCUPIED: 'occupied-cell',
    NO_WISH: 'no-active-wish',
    WRONG_STATION: 'wrong-station',
    STATION_MESSY: 'station-messy',
    NOT_ON_STATION: 'not-on-station',
    NOT_MESSY: 'station-not-messy',
    NOT_REACHABLE: 'station-not-reachable'
  };

  // ---------- helpers ----------

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function stableStringify(v) {
    if (v === null || typeof v !== 'object') return JSON.stringify(v);
    if (Array.isArray(v)) {
      var out = '[';
      for (var i = 0; i < v.length; i++) out += (i ? ',' : '') + stableStringify(v[i]);
      return out + ']';
    }
    var keys = Object.keys(v).sort(), s = '{';
    for (var k = 0; k < keys.length; k++) {
      s += (k ? ',' : '') + JSON.stringify(keys[k]) + ':' + stableStringify(v[keys[k]]);
    }
    return s + '}';
  }

  function hashState(state) {
    var copy = clone(state);
    delete copy.events;
    return RNG.hashString(stableStringify(copy));
  }

  function inBounds(state, x, y) {
    return Number.isInteger(x) && Number.isInteger(y) &&
      x >= 0 && y >= 0 && x < state.cfg.board.cols && y < state.cfg.board.rows;
  }

  function cellAt(state, x, y) { // 0 floor | '#' blocked | activity string
    if (!inBounds(state, x, y)) return '#';
    return state.grid[y][x];
  }

  function companionIndex(state, id) {
    for (var i = 0; i < state.companions.length; i++)
      if (state.companions[i].id === id) return i;
    return -1;
  }

  function companionAt(state, x, y) {
    for (var i = 0; i < state.companions.length; i++) {
      var c = state.companions[i];
      if (c.x === x && c.y === y) return c;
    }
    return null;
  }

  function stationAt(state, x, y) {
    for (var i = 0; i < state.stations.length; i++) {
      var s = state.stations[i];
      if (s.x === x && s.y === y) return s;
    }
    return null;
  }

  function isWalkable(state, x, y) {
    return cellAt(state, x, y) !== '#';
  }

  function activitiesOnBoard(state) {
    var seen = {}, out = [];
    state.stations.forEach(function (s) {
      if (!seen[s.activity]) { seen[s.activity] = true; out.push(s.activity); }
    });
    return out;
  }

  function drawWish(state, rng) {
    var acts = activitiesOnBoard(state);
    var lo = state.cfg.patience[0], hi = state.cfg.patience[1];
    var p = rng.range(lo, hi);
    return { activity: rng.pick(acts), patience: p, maxPatience: p };
  }

  // ---------- layout building ----------

  var FIXED_LETTERS = { S: 'snack', P: 'paint', M: 'music', N: 'nap', G: 'garden', R: 'read' };

  function buildFixedGrid(cfg) {
    var grid = [];
    for (var y = 0; y < cfg.board.rows; y++) {
      var row = [];
      var line = cfg.fixedLayout[y] || '';
      for (var x = 0; x < cfg.board.cols; x++) {
        var ch = line.charAt(x);
        if (ch === '#') row.push('#');
        else if (FIXED_LETTERS[ch]) row.push(FIXED_LETTERS[ch]);
        else row.push(0);
      }
      grid.push(row);
    }
    return grid;
  }

  function generateGrid(cfg, rng) {
    var cols = cfg.board.cols, rows = cfg.board.rows;
    for (var attempt = 0; attempt < 64; attempt++) {
      var cells = [];
      for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) cells.push([x, y]);
      rng.shuffle(cells);
      var grid = [], gx, gy;
      for (gy = 0; gy < rows; gy++) {
        var row = [];
        for (gx = 0; gx < cols; gx++) row.push(0);
        grid.push(row);
      }
      var idx = 0;
      for (var b = 0; b < (cfg.blocked || 0); b++) {
        var bc = cells[idx++];
        grid[bc[1]][bc[0]] = '#';
      }
      for (var a = 0; a < cfg.activities.length; a++) {
        var sc = cells[idx++];
        grid[sc[1]][sc[0]] = cfg.activities[a];
      }
      if (connected(grid)) return { grid: grid, freeCells: cells.slice(idx) };
    }
    throw new Error('could not generate a connected layout');
  }

  function connected(grid) {
    var rows = grid.length, cols = grid[0].length;
    var start = null, total = 0;
    for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
      if (grid[y][x] !== '#') { total++; if (!start) start = [x, y]; }
    }
    if (!start) return false;
    var seen = {}, q = [start], n = 0;
    seen[start[0] + ',' + start[1]] = true;
    while (q.length) {
      var c = q.pop(); n++;
      for (var d in DIRS) {
        var nx = c[0] + DIRS[d][0], ny = c[1] + DIRS[d][1];
        var key = nx + ',' + ny;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        if (grid[ny][nx] === '#' || seen[key]) continue;
        seen[key] = true; q.push([nx, ny]);
      }
    }
    return n === total;
  }

  // ---------- game creation ----------

  // cfg: { id, version, kind, name, seed, board:{cols,rows},
  //        fixedLayout|null, activities:[..], blocked,
  //        companions:[ids], fixedCompanions|null,
  //        patience:[lo,hi], cooldown, dayLength, goal,
  //        goalStep, dayBonusTurns, missLimit, par:{turns,timeSec},
  //        mechanics:{undo,hint}, endless, theme, intro, mastery }
  function createGame(cfg) {
    var seed = cfg.seed >>> 0;
    var rng = RNG.derive(seed, RNG.STREAM_RULES);

    var grid, freeCells = null;
    if (cfg.fixedLayout) {
      grid = buildFixedGrid(cfg);
      if (!connected(grid)) throw new Error('fixed layout is not connected');
    } else {
      var gen = generateGrid(cfg, rng);
      grid = gen.grid;
      freeCells = gen.freeCells;
    }

    var stations = [];
    for (var y = 0; y < cfg.board.rows; y++)
      for (var x = 0; x < cfg.board.cols; x++)
        if (grid[y][x] !== 0 && grid[y][x] !== '#')
          stations.push({ x: x, y: y, activity: grid[y][x], messy: false });
    if (cfg.fixedMessy) {
      cfg.fixedMessy.forEach(function (xy) {
        for (var si = 0; si < stations.length; si++)
          if (stations[si].x === xy[0] && stations[si].y === xy[1]) stations[si].messy = true;
      });
    }

    var companions = [];
    if (cfg.fixedCompanions) {
      cfg.fixedCompanions.forEach(function (fc) {
        companions.push({
          id: fc.id, x: fc.x, y: fc.y,
          wish: fc.wish ? { activity: fc.wish.activity, patience: fc.wish.patience, maxPatience: fc.wish.patience } : null,
          cooldown: 0, mood: MOOD_START
        });
      });
    } else {
      if (!freeCells) { // fixed layout without fixed companions: find floor cells
        freeCells = [];
        for (var fy = 0; fy < cfg.board.rows; fy++)
          for (var fx = 0; fx < cfg.board.cols; fx++)
            if (grid[fy][fx] === 0) freeCells.push([fx, fy]);
        rng.shuffle(freeCells);
      }
      cfg.companions.forEach(function (id, i) {
        var spot = freeCells[i % freeCells.length];
        companions.push({ id: id, x: spot[0], y: spot[1], wish: null, cooldown: 0, mood: MOOD_START });
      });
    }

    var state = {
      v: STATE_VERSION,
      cfg: clone(cfg),
      seed: seed,
      rngState: 0,
      tick: 0,
      grid: grid,
      stations: stations,
      companions: companions,
      score: { serve: 0, patienceBonus: 0, togetherBonus: 0, streakBonus: 0,
               tidy: 0, roundBonus: 0, dayBonus: 0, moodBonus: 0, serves: 0, total: 0 },
      streak: 0,
      streakBest: 0,
      fulfilled: 0,
      misses: 0,
      round: 1,
      elapsedMs: 0,
      terminal: null,
      events: []
    };

    // Initial wishes for companions that don't have one scripted.
    companions.forEach(function (c) {
      if (!c.wish && !c.cooldown) c.wish = drawWish(state, rng);
    });

    state.rngState = rng.state;
    return state;
  }

  // ---------- legality ----------

  function checkMove(state, id, dir) {
    if (state.terminal) return INVALID.ENDED;
    var ci = companionIndex(state, id);
    if (ci < 0) return INVALID.BAD_COMPANION;
    var d = DIRS[dir];
    if (!d) return INVALID.BAD_DIR;
    var c = state.companions[ci];
    var nx = c.x + d[0], ny = c.y + d[1];
    if (!inBounds(state, nx, ny)) return INVALID.OUT_OF_BOUNDS;
    if (cellAt(state, nx, ny) === '#') return INVALID.BLOCKED;
    if (companionAt(state, nx, ny)) return INVALID.OCCUPIED;
    return null;
  }

  function checkServe(state, id) {
    if (state.terminal) return INVALID.ENDED;
    var ci = companionIndex(state, id);
    if (ci < 0) return INVALID.BAD_COMPANION;
    var c = state.companions[ci];
    if (!c.wish) return INVALID.NO_WISH;
    var st = stationAt(state, c.x, c.y);
    if (!st) return INVALID.NOT_ON_STATION;
    if (st.activity !== c.wish.activity) return INVALID.WRONG_STATION;
    if (st.messy) return INVALID.STATION_MESSY;
    return null;
  }

  function checkTidy(state, id, x, y) {
    if (state.terminal) return INVALID.ENDED;
    var ci = companionIndex(state, id);
    if (ci < 0) return INVALID.BAD_COMPANION;
    var c = state.companions[ci];
    if (!inBounds(state, x, y)) return INVALID.OUT_OF_BOUNDS;
    var st = stationAt(state, x, y);
    if (!st) return INVALID.NOT_ON_STATION;
    var dist = Math.abs(c.x - x) + Math.abs(c.y - y);
    if (dist > 1) return INVALID.NOT_REACHABLE;
    if (!st.messy) return INVALID.NOT_MESSY;
    return null;
  }

  function legalActions(state) {
    if (state.terminal) return [];
    var out = [];
    state.companions.forEach(function (c) {
      for (var d in DIRS) {
        if (checkMove(state, c.id, d) === null)
          out.push({ type: 'move', companion: c.id, dir: d });
      }
      if (checkServe(state, c.id) === null)
        out.push({ type: 'serve', companion: c.id });
      state.stations.forEach(function (st) {
        if (st.messy && checkTidy(state, c.id, st.x, st.y) === null)
          out.push({ type: 'tidy', companion: c.id, x: st.x, y: st.y });
      });
    });
    return out;
  }

  // ---------- resolution ----------

  function applyCommand(state, cmd) {
    if (!cmd || typeof cmd !== 'object' || typeof cmd.type !== 'string') {
      return { ok: false, reason: INVALID.BAD_SHAPE, state: state, events: [] };
    }
    if (cmd.type === 'resign') {
      if (state.terminal) return { ok: false, reason: INVALID.ENDED, state: state, events: [] };
      var rs = clone(state);
      rs.events = [];
      rs.tick++;
      rs.terminal = { reason: TERMINAL.RESIGN, won: false };
      rs.events.push({ type: 'lose', reason: TERMINAL.RESIGN });
      finalizeScore(rs);
      return { ok: true, state: rs, events: rs.events };
    }
    if (cmd.type !== 'move' && cmd.type !== 'serve' && cmd.type !== 'tidy') {
      return { ok: false, reason: INVALID.BAD_CMD, state: state, events: [] };
    }

    var reason = cmd.type === 'move' ? checkMove(state, cmd.companion, cmd.dir)
      : cmd.type === 'serve' ? checkServe(state, cmd.companion)
      : checkTidy(state, cmd.companion, cmd.x, cmd.y);
    if (reason) return { ok: false, reason: reason, state: state, events: [] };

    var s = clone(state);
    s.events = [];
    s.tick++;
    if (typeof cmd.atMs === 'number' && isFinite(cmd.atMs) && cmd.atMs >= 0) {
      s.elapsedMs = Math.floor(cmd.atMs / 100) * 100; // quantized, replay-safe
    }
    var rng = RNG.create(s.rngState);
    var c = s.companions[companionIndex(s, cmd.companion)];

    if (cmd.type === 'move') {
      var d = DIRS[cmd.dir];
      var from = { x: c.x, y: c.y };
      c.x += d[0]; c.y += d[1];
      s.events.push({ type: 'move', companion: c.id, from: from, to: { x: c.x, y: c.y }, dir: cmd.dir });
    } else if (cmd.type === 'serve') {
      var st = stationAt(s, c.x, c.y);
      var adjacent = 0;
      s.companions.forEach(function (o) {
        if (o.id !== c.id && Math.abs(o.x - c.x) + Math.abs(o.y - c.y) === 1) adjacent++;
      });
      var patiencePts = PATIENCE_PT * c.wish.patience;
      var togetherPts = TOGETHER_PT * adjacent;
      var joyfulPts = c.mood >= JOYFUL_MOOD ? JOYFUL_PT : 0;
      s.streak++;
      s.streakBest = Math.max(s.streakBest, s.streak);
      var streakPts = STREAK_PT * (s.streak - 1);
      var pts = SERVE_BASE + patiencePts + togetherPts + joyfulPts + streakPts;
      s.score.serve += SERVE_BASE + joyfulPts;
      s.score.patienceBonus += patiencePts;
      s.score.togetherBonus += togetherPts;
      s.score.streakBonus += streakPts;
      s.score.serves++;
      s.fulfilled++;
      c.mood = Math.min(100, c.mood + MOOD_SERVE);
      var servedActivity = c.wish.activity;
      s.events.push({
        type: 'serve', companion: c.id, activity: servedActivity,
        cell: { x: c.x, y: c.y }, points: pts,
        together: adjacent, patience: c.wish.patience, streak: s.streak
      });
      c.wish = null;
      c.cooldown = s.cfg.cooldown;
      st.messy = true;
      s.events.push({ type: 'messy', cell: { x: st.x, y: st.y }, activity: st.activity });
    } else { // tidy
      var tst = stationAt(s, cmd.x, cmd.y);
      tst.messy = false;
      s.score.tidy += TIDY_PT;
      s.events.push({ type: 'tidy', companion: c.id, cell: { x: tst.x, y: tst.y }, activity: tst.activity, points: TIDY_PT });
    }

    // End of turn: patience decay, expiry, cooldowns, new wishes.
    s.companions.forEach(function (o) {
      if (o.wish) {
        o.wish.patience--;
        if (o.wish.patience <= 0) {
          var expired = o.wish.activity;
          o.wish = drawWish(s, rng);
          o.mood = Math.max(0, o.mood + MOOD_MISS);
          s.misses++;
          s.streak = 0;
          s.events.push({ type: 'wish-expired', companion: o.id, activity: expired });
          s.events.push({ type: 'wish-new', companion: o.id, activity: o.wish.activity, patience: o.wish.patience });
        }
      } else if (o.cooldown > 0) {
        o.cooldown--;
        if (o.cooldown === 0) {
          o.wish = drawWish(s, rng);
          s.events.push({ type: 'wish-new', companion: o.id, activity: o.wish.activity, patience: o.wish.patience });
        }
      }
    });

    // Terminal: goal first, then limits. Victory takes priority.
    if (s.fulfilled >= s.cfg.goal) {
      if (s.cfg.endless) {
        s.round++;
        s.score.roundBonus += ROUND_BONUS;
        s.cfg.goal += s.cfg.goalStep || 2;
        s.cfg.dayLength += s.cfg.dayBonusTurns || 25;
        s.events.push({ type: 'round', round: s.round, goal: s.cfg.goal, dayLength: s.cfg.dayLength });
      } else {
        s.terminal = { reason: TERMINAL.GOAL, won: true };
        s.score.dayBonus = DAY_PT_PER_TURN * Math.max(0, s.cfg.dayLength - s.tick);
        var moodSum = 0;
        s.companions.forEach(function (o) { moodSum += o.mood; });
        s.score.moodBonus = moodSum;
        s.events.push({ type: 'win', reason: TERMINAL.GOAL });
      }
    }
    if (!s.terminal && s.cfg.missLimit && s.misses >= s.cfg.missLimit) {
      s.terminal = { reason: TERMINAL.HARMONY, won: false };
      s.events.push({ type: 'lose', reason: TERMINAL.HARMONY });
    }
    if (!s.terminal && s.cfg.dayLength && s.tick >= s.cfg.dayLength) {
      s.terminal = { reason: TERMINAL.DAY, won: false };
      s.events.push({ type: 'lose', reason: TERMINAL.DAY });
    }
    // Safety net: a live state must always offer an action. Any board with a
    // walkable cell trivially has a move or serve, so this should never fire.
    if (!s.terminal && legalActions(s).length === 0) {
      s.terminal = { reason: TERMINAL.NO_ACTIONS, won: false };
      s.events.push({ type: 'lose', reason: TERMINAL.NO_ACTIONS });
    }

    s.rngState = rng.state;
    if (s.terminal) finalizeScore(s);
    return { ok: true, state: s, events: s.events };
  }

  function finalizeScore(s) {
    s.score.total = s.score.serve + s.score.patienceBonus + s.score.togetherBonus +
      s.score.streakBonus + s.score.tidy + s.score.roundBonus + s.score.dayBonus + s.score.moodBonus;
  }

  // ---------- pathfinding (hints use the same legality surface) ----------

  function bfsStep(state, from, isTarget) {
    // Returns the first step direction toward the nearest target cell, or null.
    var cols = state.cfg.board.cols, rows = state.cfg.board.rows;
    var seen = {}, q = [{ x: from.x, y: from.y, first: null }];
    seen[from.x + ',' + from.y] = true;
    while (q.length) {
      var cur = q.shift();
      if (isTarget(cur.x, cur.y)) return cur.first;
      for (var d in DIRS) {
        var nx = cur.x + DIRS[d][0], ny = cur.y + DIRS[d][1];
        var key = nx + ',' + ny;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || seen[key]) continue;
        if (cellAt(state, nx, ny) === '#') continue;
        var occ = companionAt(state, nx, ny);
        if (occ && !(nx === from.x && ny === from.y)) continue; // companions block paths
        seen[key] = true;
        q.push({ x: nx, y: ny, first: cur.first || d });
      }
    }
    return null;
  }

  function hint(state) {
    var actions = legalActions(state);
    if (!actions.length) return null;
    var i;

    // 1) a serve, most urgent wish first.
    var serves = actions.filter(function (a) { return a.type === 'serve'; });
    if (serves.length) {
      serves.sort(function (a, b) {
        var wa = state.companions[companionIndex(state, a.companion)].wish;
        var wb = state.companions[companionIndex(state, b.companion)].wish;
        return wa.patience - wb.patience;
      });
      var sc = state.companions[companionIndex(state, serves[0].companion)];
      return { action: serves[0], why: sc.wish.patience <= 2 ? 'serve-urgent' : 'serve' };
    }

    // 2) a companion standing on a messy station it still wants: tidy it.
    for (i = 0; i < state.companions.length; i++) {
      var c = state.companions[i];
      if (!c.wish) continue;
      var st = stationAt(state, c.x, c.y);
      if (st && st.messy && st.activity === c.wish.activity) {
        var t = actions.filter(function (a) {
          return a.type === 'tidy' && a.companion === c.id && a.x === st.x && a.y === st.y;
        })[0];
        if (t) return { action: t, why: 'tidy-to-serve' };
      }
    }

    // 3) guide the most urgent companion toward a matching free station.
    var urgent = null;
    for (i = 0; i < state.companions.length; i++) {
      var cc = state.companions[i];
      if (cc.wish && (!urgent || cc.wish.patience < urgent.wish.patience)) urgent = cc;
    }
    if (urgent) {
      var act = urgent.wish.activity;
      var step = bfsStep(state, urgent, function (x, y) {
        if (x === urgent.x && y === urgent.y) return false;
        var st2 = stationAt(state, x, y);
        return !!st2 && st2.activity === act && !st2.messy && !companionAt(state, x, y);
      });
      if (step) {
        return { action: { type: 'move', companion: urgent.id, dir: step }, why: 'guide' };
      }
      // All matching stations are messy: tidy the nearest one.
      var tidy = actions.filter(function (a) { return a.type === 'tidy'; });
      if (tidy.length) return { action: tidy[0], why: 'tidy' };
    }

    // 4) anything legal.
    return { action: actions[0], why: 'any' };
  }

  // ---------- validation (network / replay boundary) ----------

  function validateCommandShape(cmd, maxLen) {
    if (!cmd || typeof cmd !== 'object') return INVALID.BAD_SHAPE;
    if (JSON.stringify(cmd).length > (maxLen || 512)) return INVALID.BAD_SHAPE;
    if (cmd.type !== 'move' && cmd.type !== 'serve' && cmd.type !== 'tidy' && cmd.type !== 'resign')
      return INVALID.BAD_CMD;
    if (cmd.id != null && (typeof cmd.id !== 'string' || cmd.id.length > 64)) return INVALID.BAD_SHAPE;
    if (cmd.type === 'resign') return null;
    if (typeof cmd.companion !== 'string' || cmd.companion.length > 16) return INVALID.BAD_SHAPE;
    if (cmd.type === 'move' && !DIRS[cmd.dir]) return INVALID.BAD_DIR;
    if (cmd.type === 'tidy' && (!Number.isInteger(cmd.x) || !Number.isInteger(cmd.y))) return INVALID.BAD_SHAPE;
    return null;
  }

  // ---------- serialization ----------

  function serialize(state) { return JSON.stringify(state); }
  function deserialize(json) {
    var s = JSON.parse(json);
    if (s.v !== STATE_VERSION) throw new Error('unsupported state version ' + s.v);
    return s;
  }

  return {
    STATE_VERSION: STATE_VERSION,
    TERMINAL: TERMINAL,
    INVALID: INVALID,
    DIRS: DIRS,
    MOOD_START: MOOD_START,
    createGame: createGame,
    applyCommand: applyCommand,
    checkMove: checkMove,
    checkServe: checkServe,
    checkTidy: checkTidy,
    legalActions: legalActions,
    hint: hint,
    bfsStep: bfsStep,
    cellAt: cellAt,
    companionAt: companionAt,
    companionIndex: companionIndex,
    stationAt: stationAt,
    activitiesOnBoard: activitiesOnBoard,
    isWalkable: isWalkable,
    hashState: hashState,
    stableStringify: stableStringify,
    serialize: serialize,
    deserialize: deserialize,
    clone: clone,
    validateCommandShape: validateCommandShape
  };
});
