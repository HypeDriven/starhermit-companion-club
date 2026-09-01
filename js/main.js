/* Companion Club — responsive browser application. */
(function () {
'use strict';
var Rules = window.CCRules, Content = window.CCContent, Audio = window.CCAudio;
var state = null, selected = null, startedAt = 0, message = '';
var root = document.getElementById('cc-root');

function title() {
  root.innerHTML = '<main class="cc-title"><section><h1>Companion Club</h1><p>Guide clubhouse friends, serve their wishes, and keep every station tidy.</p><button id="cc-play" type="button">Play</button></section></main>';
  document.getElementById('cc-play').addEventListener('click', start);
}
function start() {
  if (Audio) Audio.start();
  state = Rules.createGame(Content.JOURNEY[0]); selected = state.companions[0]?.id || null; startedAt = performance.now();
  message = state.cfg.intro || 'Choose a friend and guide them toward the station matching their wish.'; render();
}
function companion(id) { return state.companions.find(function (c) { return c.id === id; }); }
function activityName(id) { return Content.ACTIVITIES[id]?.label || id || 'rest'; }
function command(cmd) {
  cmd.atMs = performance.now() - startedAt;
  var out = Rules.applyCommand(state, cmd);
  if (!out.ok) { message = String(out.reason || 'That action is unavailable.').replace(/-/g, ' '); Audio && Audio.play && Audio.play('invalid'); return; }
  state = out.state;
  message = out.events.length ? out.events.map(function (e) { return e.type.replace(/-/g, ' '); }).join(' · ') : 'Turn complete';
  if (Audio && Audio.play) out.events.forEach(function (e) { Audio.play(e.type); });
  render();
}
function choose(id) { selected = id; message = (Content.COMPANIONS[id]?.name || id) + ' selected.'; render(); }
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
  var a = h.action; message = 'Hint: ' + a.type + (a.dir ? ' ' + a.dir : '') + ' with ' + (Content.COMPANIONS[a.companion]?.name || a.companion) + '.'; selected = a.companion; render();
}
function renderBoard() {
  var html = '';
  for (var y=0;y<state.cfg.board.rows;y++) for (var x=0;x<state.cfg.board.cols;x++) {
    var c=state.companions.find(function (p) { return p.x===x&&p.y===y; });
    var s=state.stations.find(function (p) { return p.x===x&&p.y===y; });
    var blocked=state.grid[y][x]==='#';
    var text=c ? (Content.COMPANIONS[c.id]?.icon || '●') : s ? (Content.ACTIVITIES[s.activity]?.icon || '◆') : blocked ? '▦' : '·';
    var label=c ? (Content.COMPANIONS[c.id]?.name || c.id) : s ? activityName(s.activity)+(s.messy?', messy':'') : blocked?'Wall':'Open floor';
    html += '<button type="button" class="cc-cell '+(c?'friend ':'')+(s?'station ':'')+(blocked?'blocked ':'')+(c&&c.id===selected?'selected':'')+'" '+(c?'data-friend="'+c.id+'"':'disabled')+' aria-label="Row '+(y+1)+', column '+(x+1)+': '+label+'"><b aria-hidden="true">'+text+'</b><span>'+label+'</span></button>';
  }
  return html;
}
function renderFriends() {
  return state.companions.map(function (c) { var d=Content.COMPANIONS[c.id]||{}; return '<button type="button" class="cc-friend '+(c.id===selected?'selected':'')+'" data-friend="'+c.id+'"><b>'+(d.name||c.id)+'</b><span>Wants '+activityName(c.wish?.activity)+' · '+(c.wish?.patience ?? '—')+' patience</span></button>'; }).join('');
}
function render() {
  root.innerHTML = '<main class="cc-game"><header><div><h1>Companion Club</h1><p>Clubhouse Day 1</p></div><div>Served <b>'+state.fulfilled+'/'+state.cfg.goal+'</b> · Turns <b>'+state.tick+'</b> · Score <b>'+state.score.total+'</b></div></header><section class="cc-layout"><aside><h2>Friends</h2><div class="cc-friends">'+renderFriends()+'</div><p class="cc-message" role="status">'+message+'</p><div class="cc-pad"><button data-dir="up">↑</button><button data-dir="left">←</button><button data-dir="down">↓</button><button data-dir="right">→</button></div><div class="cc-actions"><button id="cc-serve">Serve wish</button><button id="cc-tidy">Tidy</button><button id="cc-hint">Hint</button></div></aside><section class="cc-board-wrap"><h2>Clubhouse floor</h2><div class="cc-board" style="--cols:'+state.cfg.board.cols+'">'+renderBoard()+'</div></section></section>'+(state.terminal?'<section class="cc-result"><h2>'+(state.terminal.won?'Club day complete!':'Club day ended')+'</h2><button id="cc-again">Play again</button></section>':'')+'</main>';
  root.querySelectorAll('[data-friend]').forEach(function (b) { b.addEventListener('click', function () { choose(b.dataset.friend); }); });
  root.querySelectorAll('[data-dir]').forEach(function (b) { b.addEventListener('click', function () { move(b.dataset.dir); }); });
  document.getElementById('cc-serve').addEventListener('click', serve); document.getElementById('cc-tidy').addEventListener('click', tidy); document.getElementById('cc-hint').addEventListener('click', hint);
  var again=document.getElementById('cc-again'); if(again) again.addEventListener('click',start);
}
window.addEventListener('keydown', function(e){ if(!state||state.terminal)return; var d={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'}[e.key]; if(d){e.preventDefault();move(d);} else if(e.key.toLowerCase()==='s')serve(); else if(e.key.toLowerCase()==='t')tidy(); else if(e.key.toLowerCase()==='h')hint(); });
title();
})();
