/* Companion Club — responsive browser application. */
(function () {
'use strict';
var Rules = window.CCRules, Content = window.CCContent, Audio = window.CCAudio;
var state = null, selected = null, startedAt = 0, message = '';
var root = document.getElementById('cc-root');

function title() {
  root.innerHTML = '<main class="cc-title"><img class="cc-title-art" src="./assets/key-art.webp" alt="" onerror="this.remove()"><section><h1>Companion Club</h1><p>Guide clubhouse friends, serve their wishes, and keep every station tidy.</p><button id="cc-play" type="button">Play</button></section></main>';
  document.getElementById('cc-play').addEventListener('click', start);
}
function start() {
  if (Audio) { Audio.start(); Audio.play('ui'); }
  state = Rules.createGame(Content.JOURNEY[0]); selected = state.companions[0]?.id || null; startedAt = performance.now();
  message = state.cfg.intro || 'Choose a friend and guide them toward the station matching their wish.'; render();
}
function companion(id) { return state.companions.find(function (c) { return c.id === id; }); }
function companionName(id) { return Content.COMPANIONS[id]?.label || id; }
function activityName(id) { return Content.ACTIVITIES[id]?.label || id || 'rest'; }
function command(cmd) {
  cmd.atMs = performance.now() - startedAt;
  var out = Rules.applyCommand(state, cmd);
  if (!out.ok) { message = String(out.reason || 'That action is unavailable.').replace(/-/g, ' '); Audio && Audio.play && Audio.play('invalid'); render(); return; }
  state = out.state;
  message = out.events.length ? out.events.map(function (e) { return e.type.replace(/-/g, ' '); }).join(' · ') : 'Turn complete';
  if (Audio && Audio.play) {
    out.events.forEach(function (e) {
      Audio.play(e.type);
      if (e.type === 'serve' && e.together > 0) Audio.play('together');
      if (e.type === 'serve' && e.streak >= 3) Audio.play('streak');
    });
    if (!state.terminal) {
      if (state.companions.some(function (c) { return c.wish && c.wish.patience === 2; })) Audio.play('patience-low');
      if (state.cfg.dayLength && state.cfg.dayLength - state.tick === 5) Audio.play('day-late');
    }
  }
  render();
}
function choose(id) { selected = id; message = companionName(id) + ' selected.'; Audio && Audio.play && Audio.play('select'); render(); }
function move(dir) { if (selected) command({ type: 'move', companion: selected, dir: dir }); }
function serve() { if (selected) command({ type: 'serve', companion: selected }); }
function tidy() {
  var c = companion(selected), station = c && state.stations.find(function (s) { return s.messy && Math.abs(s.x-c.x)+Math.abs(s.y-c.y)<=1; });
  if (!station) { message = 'No messy station is within reach.'; render(); return; }
  command({ type: 'tidy', companion: selected, x: station.x, y: station.y });
}
function hint() {
  var h = Rules.hint(state);
  if (!h) { message = 'No legal action is available.'; render(); return; }
  var a = h.action; message = 'Hint: ' + a.type + (a.dir ? ' ' + a.dir : '') + ' with ' + companionName(a.companion) + '.'; selected = a.companion; Audio && Audio.play && Audio.play('hint'); render();
}
function renderBoard() {
  var html = '';
  for (var y=0;y<state.cfg.board.rows;y++) for (var x=0;x<state.cfg.board.cols;x++) {
    var c=state.companions.find(function (p) { return p.x===x&&p.y===y; });
    var s=state.stations.find(function (p) { return p.x===x&&p.y===y; });
    var blocked=state.grid[y][x]==='#';
    var text=c ? (Content.COMPANIONS[c.id]?.icon || '●') : s ? (Content.ACTIVITIES[s.activity]?.icon || '◆') : blocked ? '▦' : '·';
    var label=c ? companionName(c.id) : s ? activityName(s.activity)+(s.messy?', messy':'') : blocked?'Wall':'Open floor';
    html += '<button type="button" class="cc-cell '+(c?'friend ':'')+(s?'station ':'')+(blocked?'blocked ':'')+(c&&c.id===selected?'selected':'')+'" '+(c?'data-friend="'+c.id+'"':'disabled')+' aria-label="Row '+(y+1)+', column '+(x+1)+': '+label+'"><b aria-hidden="true">'+text+'</b><span>'+label+'</span></button>';
  }
  return html;
}
function renderFriends() {
  return state.companions.map(function (c) { return '<button type="button" class="cc-friend '+(c.id===selected?'selected':'')+'" data-friend="'+c.id+'"><b>'+companionName(c.id)+'</b><span>Wants '+activityName(c.wish?.activity)+' · '+(c.wish?.patience ?? '—')+' patience</span></button>'; }).join('');
}
function resultHtml() {
  var t = state.terminal, s = state.score;
  var why = {
    'goal-complete': 'Every wish on the club list was fulfilled in time.',
    'harmony-lost': 'Too many wishes expired and the club’s harmony broke.',
    'day-ended': 'The day ended before the club goal was met.',
    'no-actions': 'No legal actions remained.',
    'resigned': 'The club day was given up early.'
  }[t.reason] || '';
  var parts = [
    ['Serving', s.serve], ['Patience bonus', s.patienceBonus], ['Together bonus', s.togetherBonus],
    ['Streak bonus', s.streakBonus], ['Tidying', s.tidy], ['Wave bonus', s.roundBonus],
    ['Day bonus', s.dayBonus], ['Mood bonus', s.moodBonus]
  ].filter(function (p) { return p[1]; });
  var rows = parts.map(function (p) { return '<tr><td>'+p[0]+'</td><td>'+p[1]+'</td></tr>'; }).join('');
  return '<section class="cc-result" role="dialog" aria-modal="true" aria-labelledby="cc-result-title"><div class="cc-result-card"><img class="cc-result-art" src="./assets/results-art.webp" alt="" onerror="this.remove()"><h2 id="cc-result-title">'+(t.won?'Club day complete!':'Club day ended')+'</h2><p>'+why+'</p><table class="cc-score"><tbody>'+rows+'<tr class="cc-score-total"><td>Total</td><td>'+s.total+'</td></tr></tbody></table><button id="cc-again">Play again</button></div></section>';
}
function render() {
  var active = document.activeElement;
  var focusSel = active && root.contains(active)
    ? (active.id ? '#' + active.id
      : active.dataset && active.dataset.friend ? '[data-friend="' + active.dataset.friend + '"]'
      : active.dataset && active.dataset.dir ? '[data-dir="' + active.dataset.dir + '"]'
      : null)
    : null;
  root.innerHTML = '<main class="cc-game"><header><div><h1>Companion Club</h1><p>Clubhouse Day 1</p></div><div>Served <b>'+state.fulfilled+'/'+state.cfg.goal+'</b> · Turns <b>'+state.tick+'</b> · Score <b>'+state.score.total+'</b></div></header><section class="cc-layout"><aside><h2>Friends</h2><div class="cc-friends">'+renderFriends()+'</div><p class="cc-message" role="status">'+message+'</p><div class="cc-pad"><button data-dir="up">↑</button><button data-dir="left">←</button><button data-dir="down">↓</button><button data-dir="right">→</button></div><div class="cc-actions"><button id="cc-serve">Serve wish</button><button id="cc-tidy">Tidy</button><button id="cc-hint">Hint</button></div></aside><section class="cc-board-wrap"><h2>Clubhouse floor</h2><div class="cc-board" style="--cols:'+state.cfg.board.cols+'">'+renderBoard()+'</div></section></section>'+(state.terminal?resultHtml():'')+'</main>';
  root.querySelectorAll('[data-friend]').forEach(function (b) { b.addEventListener('click', function () { choose(b.dataset.friend); }); });
  root.querySelectorAll('[data-dir]').forEach(function (b) { b.addEventListener('click', function () { move(b.dataset.dir); }); });
  document.getElementById('cc-serve').addEventListener('click', serve); document.getElementById('cc-tidy').addEventListener('click', tidy); document.getElementById('cc-hint').addEventListener('click', hint);
  var again=document.getElementById('cc-again'); if(again){ again.addEventListener('click',start); again.focus(); }
  else if (focusSel) { var el = root.querySelector(focusSel); if (el) el.focus(); }
}
window.addEventListener('keydown', function(e){ if(!state||state.terminal)return; var d={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'}[e.key]; if(d){e.preventDefault();move(d);} else if(e.key.toLowerCase()==='s')serve(); else if(e.key.toLowerCase()==='t')tidy(); else if(e.key.toLowerCase()==='h')hint(); });
document.addEventListener('visibilitychange', function(){ if(!Audio) return; if(document.hidden) Audio.suspend && Audio.suspend(); else Audio.resume && Audio.resume(); });
title();
})();
