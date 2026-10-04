/* Companion Club — responsive browser application. */
(function () {
'use strict';
var Rules = window.CCRules, Content = window.CCContent, Audio = window.CCAudio;
var Store = window.CCStore, Platform = window.CCPlatform;
var doc = Store.load();                 // persisted save document (offline cache)
var state = null, selected = null, startedAt = 0, message = '';
var roundStreak = 0, roundRecorded = false;
var root = document.getElementById('cc-root');
var Fx = window.CCFx, Settings = window.CCSettings;
if (Fx && doc.settings && doc.settings.reducedMotion) Fx.setReducedMotion(true);
function settingsButton() { return Settings ? Settings.buttonHtml() : ''; }
function bindSettings() { var b = document.getElementById('cc-settings-open'); if (b && Settings) b.addEventListener('click', Settings.open); }
function hex(n) { return '#' + ('00000' + (n >>> 0).toString(16)).slice(-6); }

// ---- platform strings (title account line, sign-in, invite) ----
var PT = {
  'en-US': { offline: 'Offline — progress is stored on this device.', playing: 'Playing as {name}', synced: 'progress synced', saving: 'saving…', nosync: 'cloud sync unavailable', signIn: 'Sign in with StarHermit', invite: 'Invite a friend', copied: 'Invite link copied to the clipboard.', copyFail: 'Could not copy — invite link: {link}' },
  'en-GB': { offline: 'Offline — progress is stored on this device.', playing: 'Playing as {name}', synced: 'progress synced', saving: 'saving…', nosync: 'cloud sync unavailable', signIn: 'Sign in with StarHermit', invite: 'Invite a friend', copied: 'Invite link copied to the clipboard.', copyFail: 'Could not copy — invite link: {link}' },
  'es-419': { offline: 'Sin conexión: el progreso se guarda en este dispositivo.', playing: 'Jugando como {name}', synced: 'progreso sincronizado', saving: 'guardando…', nosync: 'sincronización en la nube no disponible', signIn: 'Iniciar sesión con StarHermit', invite: 'Invitar a un amigo', copied: 'Enlace de invitación copiado al portapapeles.', copyFail: 'No se pudo copiar. Enlace de invitación: {link}' },
  'es-ES': { offline: 'Sin conexión: el progreso se guarda en este dispositivo.', playing: 'Jugando como {name}', synced: 'progreso sincronizado', saving: 'guardando…', nosync: 'sincronización en la nube no disponible', signIn: 'Iniciar sesión con StarHermit', invite: 'Invitar a un amigo', copied: 'Enlace de invitación copiado al portapapeles.', copyFail: 'No se ha podido copiar. Enlace de invitación: {link}' },
  'de-DE': { offline: 'Offline – der Fortschritt wird auf diesem Gerät gespeichert.', playing: 'Du spielst als {name}', synced: 'Fortschritt synchronisiert', saving: 'wird gespeichert…', nosync: 'Cloud-Synchronisierung nicht verfügbar', signIn: 'Mit StarHermit anmelden', invite: 'Freund einladen', copied: 'Einladungslink in die Zwischenablage kopiert.', copyFail: 'Kopieren fehlgeschlagen – Einladungslink: {link}' },
  'fr-FR': { offline: 'Hors ligne : la progression est enregistrée sur cet appareil.', playing: 'Vous jouez en tant que {name}', synced: 'progression synchronisée', saving: 'enregistrement…', nosync: 'synchronisation cloud indisponible', signIn: 'Se connecter avec StarHermit', invite: 'Inviter un ami', copied: 'Lien d’invitation copié dans le presse-papiers.', copyFail: 'Copie impossible — lien d’invitation : {link}' },
  'fr-CA': { offline: 'Hors ligne : la progression est enregistrée sur cet appareil.', playing: 'Vous jouez en tant que {name}', synced: 'progression synchronisée', saving: 'enregistrement…', nosync: 'synchronisation infonuagique non disponible', signIn: 'Se connecter avec StarHermit', invite: 'Inviter un ami', copied: 'Lien d’invitation copié dans le presse-papiers.', copyFail: 'Copie impossible — lien d’invitation : {link}' },
  'pt-BR': { offline: 'Offline — o progresso fica salvo neste dispositivo.', playing: 'Jogando como {name}', synced: 'progresso sincronizado', saving: 'salvando…', nosync: 'sincronização na nuvem indisponível', signIn: 'Entrar com StarHermit', invite: 'Convidar um amigo', copied: 'Link de convite copiado para a área de transferência.', copyFail: 'Não foi possível copiar — link de convite: {link}' },
  'it-IT': { offline: 'Offline: i progressi sono salvati su questo dispositivo.', playing: 'Giochi come {name}', synced: 'progressi sincronizzati', saving: 'salvataggio…', nosync: 'sincronizzazione cloud non disponibile', signIn: 'Accedi con StarHermit', invite: 'Invita un amico', copied: 'Link di invito copiato negli appunti.', copyFail: 'Impossibile copiare. Link di invito: {link}' }
};
var P = PT[(Settings && Settings.locale) || 'en-US'] || PT['en-US'];

// ---- key bindings (platform overrides via StarHermit controls) ----
var DEFAULT_KEYS = { up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'], serve: ['KeyS'], tidy: ['KeyT'], hint: ['KeyH'] };
var keyAction = {};
function setBindings(b) {
  keyAction = {};
  Object.keys(b).forEach(function (a) { (b[a] || []).forEach(function (code) { keyAction[code] = a; }); });
}
setBindings(DEFAULT_KEYS);

// ---- platform handshake: token, cloud save (remote wins), settings, account line ----
try { Platform.init(); } catch (e) { /* offline */ }
function syncFromPlatform() {
  if (!Platform.hosted) return;
  try { Platform.fetchProfile().then(renderAccountLine).catch(function () {}); } catch (e) { /* ok */ }
  Platform.loadCloud().then(function (remoteRaw) {
    var remote = remoteRaw ? Store.loadRaw(remoteRaw) : null;
    if (remote) { doc = remote; Store.save(remote); } // local cache mirrors the remote doc
    renderAccountLine();
  }).catch(function () {});
  Platform.getSettings().then(function (s) {
    if (s && s.graphics && Fx && Fx.replace) Fx.replace(s.graphics); // platform value wins
  }).catch(function () {});
  Platform.loadBindings(DEFAULT_KEYS).then(setBindings).catch(function () {});
}
try { Platform.onSync(renderAccountLine); } catch (e) { /* ok */ }
try { Platform.onAuth(function () { if (!state) title(); else renderAccountLine(); syncFromPlatform(); }); } catch (e) { /* ok */ }
syncFromPlatform();

function accountLine() {
  var html = '<p class="cc-account" id="cc-account" aria-live="polite"></p>';
  var btns = '';
  if (Platform.canSignIn && Platform.canSignIn()) btns += '<button type="button" id="cc-signin" class="cc-secondary">' + P.signIn + '</button>';
  if (Platform.hosted && Platform.inviteLink()) btns += '<button type="button" id="cc-invite" class="cc-secondary">' + P.invite + '</button>';
  return html + (btns ? '<div class="cc-title-actions cc-platform-actions">' + btns + '</div>' : '');
}
function renderAccountLine() {
  var el = document.getElementById('cc-account');
  if (!el) return;
  if (!Platform.hosted) { el.textContent = P.offline; return; }
  var name = Platform.profile ? Platform.profile.name : '…';
  var syncTxt = Platform.sync === 'synced' ? P.synced : Platform.sync === 'saving' ? P.saving : P.nosync;
  el.textContent = P.playing.replace('{name}', name) + ' · ' + syncTxt;
}
var toastTimer = null;
function toast(text) {
  var el = document.getElementById('cc-toast');
  if (!el) { el = document.createElement('div'); el.id = 'cc-toast'; el.className = 'cc-toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.textContent = text; el.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.hidden = true; }, 4000);
}
function invite() {
  var link = Platform.inviteLink();
  if (!link) return;
  var done = function () { toast(P.copied); }, fail = function () { toast(P.copyFail.replace('{link}', link)); };
  try { navigator.clipboard.writeText(link).then(done, fail); } catch (e) { fail(); }
}
function bindPlatform() {
  var si = document.getElementById('cc-signin'); if (si) si.addEventListener('click', function () { Platform.signIn(); });
  var iv = document.getElementById('cc-invite'); if (iv) iv.addEventListener('click', invite);
}

function title() {
  root.innerHTML = '<main class="cc-title"><img class="cc-title-art" src="./assets/key-art.webp" alt="" onerror="this.remove()"><section><h1>Companion Club</h1><p>Guide clubhouse friends, serve their wishes, and keep every station tidy.</p>' + accountLine() + '<div class="cc-title-actions"><button id="cc-play" type="button">Play</button>' + settingsButton() + '</div></section></main>';
  renderAccountLine();
  bindSettings();
  bindPlatform();
  document.getElementById('cc-play').addEventListener('click', start);
}
function start() {
  if (Audio) { Audio.start(); Audio.play('ui'); }
  state = Rules.createGame(Content.JOURNEY[0]); selected = state.companions[0]?.id || null; startedAt = performance.now();
  roundStreak = 0; roundRecorded = false;
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
  out.events.forEach(function (e) { if (e.type === 'serve' && e.streak > roundStreak) roundStreak = e.streak; });
  if (state.terminal && !roundRecorded) { roundRecorded = true; recordRound(); }
  render();
  sparkle(out.events);
}
// Effects-layer bursts at the cells where things happened (no-op when the
// particles setting is off or motion is reduced).
function sparkle(events) {
  if (!Fx) return;
  var cols = state.cfg.board.cols, cells = root.querySelectorAll('.cc-board .cc-cell');
  function rectAt(cell) { var el = cell && cells[cell.y * cols + cell.x]; return el ? el.getBoundingClientRect() : null; }
  events.forEach(function (e) {
    if (e.type === 'serve') { var c = companion(e.companion); Fx.burst(c && rectAt(c), 'serve'); }
    else if (e.type === 'tidy') Fx.burst(rectAt(e.cell), 'tidy');
    else if (e.type === 'win') Fx.burst({ left: 0, top: 0, width: innerWidth, height: innerHeight }, 'win');
  });
}

// Persist the finished round and unlock the achievements the game can
// compute from it (the rest unlock as their modes ship). The save goes
// through CCStore.save → localStorage + the platform cloud slot.
function recordRound() {
  var p = doc.progress, st = doc.progress.stats;
  st.rounds++;
  if (state.terminal.won) st.wins++;
  st.serves += state.fulfilled || 0;
  if (roundStreak > st.bestStreak) st.bestStreak = roundStreak;
  st.playMs += Math.round(performance.now() - startedAt);
  p.sparkle += state.score.total || 0;
  p.sparkleEarned += state.score.total || 0;

  var unlocked = [];
  function grant(key) {
    if (!p.achievements[key]) {
      p.achievements[key] = Date.now();
      var def = Content.ACHIEVEMENTS.find(function (a) { return a.key === key; });
      if (def) unlocked.push(def.name);
    }
  }
  if (st.serves > 0) grant('first-serve');
  if (st.wins > 0) grant('first-win');
  if (st.bestStreak >= 5) grant('streak-5');
  if (st.serves >= 100) grant('serves-100');
  if (p.sparkleEarned >= 5000) grant('sparkle-5000');
  Store.save(doc);
  if (unlocked.length) message = 'Achievement unlocked: ' + unlocked.join(', ');
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
    // A station keeps its identity (and messy badge) while a companion stands on it.
    var stationLabel = s ? activityName(s.activity)+(s.messy?', messy':'') : '';
    var label=c ? companionName(c.id)+(s?' at '+stationLabel:'') : s ? stationLabel : blocked?'Wall':'Open floor';
    var badge = s && c ? '<i class="cc-station-badge'+(s.messy?' messy':'')+'" aria-hidden="true">'+(Content.ACTIVITIES[s.activity]?.icon || '◆')+(s.messy?'!':'')+'</i>' : '';
    var tint = c ? Content.COMPANIONS[c.id]?.color : s ? Content.ACTIVITIES[s.activity]?.color : null;
    html += '<button type="button"'+(tint!=null?' style="--tint:'+hex(tint)+(s?';--station-tint:'+hex(Content.ACTIVITIES[s.activity]?.color||0)+'"':'"'):'')+' class="cc-cell '+(c?'friend ':'')+(s?'station ':'')+(s&&s.messy?'messy ':'')+(blocked?'blocked ':'')+(c&&c.id===selected?'selected':'')+'" '+(c?'data-friend="'+c.id+'"':'disabled')+' aria-label="Row '+(y+1)+', column '+(x+1)+': '+label+'">'+badge+'<b aria-hidden="true">'+text+'</b><span>'+label+'</span></button>';
  }
  return html;
}
function renderFriends() {
  return state.companions.map(function (c) { return '<button type="button" style="--tint:'+hex(Content.COMPANIONS[c.id]?.color||0)+'" class="cc-friend '+(c.id===selected?'selected':'')+'" data-friend="'+c.id+'"><b>'+companionName(c.id)+'</b><span>Wants '+activityName(c.wish?.activity)+' · '+(c.wish?.patience ?? '—')+' patience</span></button>'; }).join('');
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
  root.innerHTML = '<main class="cc-game"><header><div><h1>Companion Club</h1><p>Clubhouse Day 1</p></div><div>Served <b>'+state.fulfilled+'/'+state.cfg.goal+'</b> · Turns <b>'+state.tick+'</b> · Score <b>'+state.score.total+'</b></div>'+settingsButton()+'</header><section class="cc-layout"><aside><h2>Friends</h2><div class="cc-friends">'+renderFriends()+'</div><p class="cc-message" role="status">'+message+'</p><div class="cc-pad"><button data-dir="up">↑</button><button data-dir="left">←</button><button data-dir="down">↓</button><button data-dir="right">→</button></div><div class="cc-actions"><button id="cc-serve">Serve wish</button><button id="cc-tidy">Tidy</button><button id="cc-hint">Hint</button></div></aside><section class="cc-board-wrap"><h2>Clubhouse floor</h2><div class="cc-board" style="--cols:'+state.cfg.board.cols+';--rows:'+state.cfg.board.rows+'">'+renderBoard()+'</div></section></section>'+(state.terminal?resultHtml():'')+'</main>';
  root.querySelectorAll('[data-friend]').forEach(function (b) { b.addEventListener('click', function () { choose(b.dataset.friend); }); });
  root.querySelectorAll('[data-dir]').forEach(function (b) { b.addEventListener('click', function () { move(b.dataset.dir); }); });
  document.getElementById('cc-serve').addEventListener('click', serve); document.getElementById('cc-tidy').addEventListener('click', tidy); document.getElementById('cc-hint').addEventListener('click', hint);
  bindSettings();
  var again=document.getElementById('cc-again'); if(again){ again.addEventListener('click',start); again.focus(); }
  else if (focusSel) { var el = root.querySelector(focusSel); if (el) el.focus(); }
}
window.addEventListener('keydown', function(e){ if(!state||state.terminal||(Settings&&Settings.isOpen()))return; if(e.ctrlKey||e.metaKey||e.altKey)return; var a=keyAction[e.code]; if(!a)return; e.preventDefault(); if(a==='serve')serve(); else if(a==='tidy')tidy(); else if(a==='hint')hint(); else move(a); });
document.addEventListener('visibilitychange', function(){ if(!Audio) return; if(document.hidden) Audio.suspend && Audio.suspend(); else Audio.resume && Audio.resume(); });
title();
})();
