/* Companion Club — responsive browser application. */
(function () {
'use strict';
var Rules = window.CCRules, Content = window.CCContent, Audio = window.CCAudio;
var Store = window.CCStore, Platform = window.CCPlatform;
var doc = Store.load();                 // persisted save document (offline cache)
var state = null, selected = null, startedAt = 0, message = '';
var roundStreak = 0, roundRecorded = false;
var root = document.getElementById('cc-root');
// Localization (js/i18n.js, window.CCI18N): English source strings are the
// keys; T() translates now, N() only marks a string for display-time T().
function T(key, vars) {
  if (window.CCI18N) return window.CCI18N.T(key, vars);
  return String(key).replace(/\{(\w+)\}/g, function (m, k) { return vars && k in vars ? String(vars[k]) : m; });
}
function N(key) { return key; }
function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function curLang() { return (window.CCI18N && window.CCI18N.lang) || (Settings && Settings.locale) || 'en-US'; }
var Fx = window.CCFx, Settings = window.CCSettings;
if (Fx && doc.settings && doc.settings.reducedMotion) Fx.setReducedMotion(true);
function settingsButton() { return Settings ? Settings.buttonHtml() : ''; }
function bindSettings() { var b = document.getElementById('cc-settings-open'); if (b && Settings) b.addEventListener('click', Settings.open); }
function hex(n) { return '#' + ('00000' + (n >>> 0).toString(16)).slice(-6); }

// ---- platform strings (title account line, sign-in, invite) ----
var PT = {
  'en-US': { offline: 'Offline — progress is stored on this device.', playing: 'Playing as {name}', synced: 'progress synced', saving: 'saving…', nosync: 'cloud sync unavailable', signIn: 'Sign in with StarHermit', invite: 'Invite a friend', copied: 'Invite link copied to the clipboard.', copyFail: 'Could not copy — invite link: {link}', lbPosting: 'Posting score to the leaderboard…', lbRank: 'Leaderboard rank: #{rank}', lbPosted: 'Score posted to the leaderboard.', lbFailed: 'Score not posted to the leaderboard.' },
  'en-GB': { offline: 'Offline — progress is stored on this device.', playing: 'Playing as {name}', synced: 'progress synced', saving: 'saving…', nosync: 'cloud sync unavailable', signIn: 'Sign in with StarHermit', invite: 'Invite a friend', copied: 'Invite link copied to the clipboard.', copyFail: 'Could not copy — invite link: {link}', lbPosting: 'Posting score to the leaderboard…', lbRank: 'Leaderboard rank: #{rank}', lbPosted: 'Score posted to the leaderboard.', lbFailed: 'Score not posted to the leaderboard.' },
  'es-419': { offline: 'Sin conexión: el progreso se guarda en este dispositivo.', playing: 'Jugando como {name}', synced: 'progreso sincronizado', saving: 'guardando…', nosync: 'sincronización en la nube no disponible', signIn: 'Iniciar sesión con StarHermit', invite: 'Invitar a un amigo', copied: 'Enlace de invitación copiado al portapapeles.', copyFail: 'No se pudo copiar. Enlace de invitación: {link}', lbPosting: 'Publicando la puntuación en la clasificación…', lbRank: 'Puesto en la clasificación: #{rank}', lbPosted: 'Puntuación publicada en la clasificación.', lbFailed: 'No se publicó la puntuación en la clasificación.' },
  'es-ES': { offline: 'Sin conexión: el progreso se guarda en este dispositivo.', playing: 'Jugando como {name}', synced: 'progreso sincronizado', saving: 'guardando…', nosync: 'sincronización en la nube no disponible', signIn: 'Iniciar sesión con StarHermit', invite: 'Invitar a un amigo', copied: 'Enlace de invitación copiado al portapapeles.', copyFail: 'No se ha podido copiar. Enlace de invitación: {link}', lbPosting: 'Publicando la puntuación en la clasificación…', lbRank: 'Puesto en la clasificación: #{rank}', lbPosted: 'Puntuación publicada en la clasificación.', lbFailed: 'No se ha publicado la puntuación en la clasificación.' },
  'de-DE': { offline: 'Offline – der Fortschritt wird auf diesem Gerät gespeichert.', playing: 'Du spielst als {name}', synced: 'Fortschritt synchronisiert', saving: 'wird gespeichert…', nosync: 'Cloud-Synchronisierung nicht verfügbar', signIn: 'Mit StarHermit anmelden', invite: 'Freund einladen', copied: 'Einladungslink in die Zwischenablage kopiert.', copyFail: 'Kopieren fehlgeschlagen – Einladungslink: {link}', lbPosting: 'Punktzahl wird in die Bestenliste eingetragen…', lbRank: 'Platz in der Bestenliste: #{rank}', lbPosted: 'Punktzahl in die Bestenliste eingetragen.', lbFailed: 'Punktzahl nicht in die Bestenliste eingetragen.' },
  'fr-FR': { offline: 'Hors ligne : la progression est enregistrée sur cet appareil.', playing: 'Vous jouez en tant que {name}', synced: 'progression synchronisée', saving: 'enregistrement…', nosync: 'synchronisation cloud indisponible', signIn: 'Se connecter avec StarHermit', invite: 'Inviter un ami', copied: 'Lien d’invitation copié dans le presse-papiers.', copyFail: 'Copie impossible — lien d’invitation : {link}', lbPosting: 'Envoi du score au classement…', lbRank: 'Rang au classement : #{rank}', lbPosted: 'Score envoyé au classement.', lbFailed: 'Score non envoyé au classement.' },
  'fr-CA': { offline: 'Hors ligne : la progression est enregistrée sur cet appareil.', playing: 'Vous jouez en tant que {name}', synced: 'progression synchronisée', saving: 'enregistrement…', nosync: 'synchronisation infonuagique non disponible', signIn: 'Se connecter avec StarHermit', invite: 'Inviter un ami', copied: 'Lien d’invitation copié dans le presse-papiers.', copyFail: 'Copie impossible — lien d’invitation : {link}', lbPosting: 'Envoi du pointage au classement…', lbRank: 'Rang au classement : #{rank}', lbPosted: 'Pointage envoyé au classement.', lbFailed: 'Pointage non envoyé au classement.' },
  'pt-BR': { offline: 'Offline — o progresso fica salvo neste dispositivo.', playing: 'Jogando como {name}', synced: 'progresso sincronizado', saving: 'salvando…', nosync: 'sincronização na nuvem indisponível', signIn: 'Entrar com StarHermit', invite: 'Convidar um amigo', copied: 'Link de convite copiado para a área de transferência.', copyFail: 'Não foi possível copiar — link de convite: {link}', lbPosting: 'Enviando a pontuação para o ranking…', lbRank: 'Posição no ranking: #{rank}', lbPosted: 'Pontuação enviada para o ranking.', lbFailed: 'Pontuação não enviada para o ranking.' },
  'it-IT': { offline: 'Offline: i progressi sono salvati su questo dispositivo.', playing: 'Giochi come {name}', synced: 'progressi sincronizzati', saving: 'salvataggio…', nosync: 'sincronizzazione cloud non disponibile', signIn: 'Accedi con StarHermit', invite: 'Invita un amico', copied: 'Link di invito copiato negli appunti.', copyFail: 'Impossibile copiare. Link di invito: {link}', lbPosting: 'Invio del punteggio alla classifica…', lbRank: 'Posizione in classifica: #{rank}', lbPosted: 'Punteggio inviato alla classifica.', lbFailed: 'Punteggio non inviato alla classifica.' }
};
var P = PT[curLang()] || PT['en-US']; // follows the game language (re-picked on a change)

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
// Save conflict: merge the newer cloud progress into this device's and save
// the merge (CCStore.mergeProgress keeps the better of both).
try {
  Platform.onConflict(function (raw) {
    var remote = raw ? Store.loadRaw(raw) : null;
    if (remote) doc.progress = Store.mergeProgress(doc.progress, remote.progress);
    Store.save(doc);
  });
} catch (e) { /* ok */ }
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
  root.innerHTML = '<main class="cc-title"><img class="cc-title-art" src="./assets/key-art.webp" alt="" onerror="this.remove()"><section><h1>Companion Club</h1><p>' + esc(T('Guide clubhouse friends, serve their wishes, and keep every station tidy.')) + '</p>' + accountLine() + '<div class="cc-title-actions"><button id="cc-play" type="button">' + esc(T('Play')) + '</button>' + settingsButton() + '</div></section></main>';
  renderAccountLine();
  bindSettings();
  bindPlatform();
  document.getElementById('cc-play').addEventListener('click', start);
}
function start() {
  if (Audio) { Audio.start(); Audio.play('ui'); }
  state = Rules.createGame(Content.JOURNEY[0]); selected = state.companions[0]?.id || null; startedAt = performance.now();
  roundStreak = 0; roundRecorded = false; lbLine = null;
  var intro = state.cfg.intro;
  message = function () { return intro ? T(intro) : T('Choose a friend and guide them toward the station matching their wish.'); }; render();
}
function companion(id) { return state.companions.find(function (c) { return c.id === id; }); }
function companionName(id) { return Content.COMPANIONS[id]?.label || id; }
function activityName(id) { return Content.ACTIVITIES[id] ? T(Content.ACTIVITIES[id].label) : id || T('rest'); }
// Rule refusals and event types in the player's language.
var REASONS = {
  'game-ended': N('The club day is over.'), 'unknown-command': N('Unknown action.'), 'malformed-command': N('That action was not understood.'),
  'unknown-companion': N('That friend is not in the club.'), 'bad-direction': N('That is not a direction.'),
  'out-of-bounds': N('That would leave the clubhouse.'), 'blocked-cell': N('Furniture blocks the way.'),
  'occupied-cell': N('Another friend is standing there.'), 'no-active-wish': N('This friend has no wish right now.'),
  'wrong-station': N('This station does not match the wish.'), 'station-messy': N('Tidy this station first.'),
  'not-on-station': N('Stand on a station to serve.'), 'station-not-messy': N('That station is already tidy.'),
  'station-not-reachable': N('That station is out of reach.')
};
var EVENTS = {
  move: N('move'), serve: N('serve'), tidy: N('tidy'), messy: N('messy'), round: N('round'),
  win: N('win'), lose: N('lose'), 'wish-expired': N('wish expired'), 'wish-new': N('wish new')
};
function command(cmd) {
  cmd.atMs = performance.now() - startedAt;
  var out = Rules.applyCommand(state, cmd);
  if (!out.ok) {
    var reason = out.reason;
    message = function () { return REASONS[reason] ? T(REASONS[reason]) : reason ? String(reason).replace(/-/g, ' ') : T('That action is unavailable.'); };
    Audio && Audio.play && Audio.play('invalid'); render(); return;
  }
  state = out.state;
  var types = out.events.map(function (e) { return e.type; });
  message = function () { return types.length ? types.map(function (t) { return EVENTS[t] ? T(EVENTS[t]) : t.replace(/-/g, ' '); }).join(' · ') : T('Turn complete'); };
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
  if (state.terminal && !roundRecorded) { roundRecorded = true; recordRound(); postToLeaderboard(state.score.total); }
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
  if (unlocked.length) message = function () { return T('Achievement unlocked: {names}', { names: unlocked.map(function (n) { return T(n); }).join(', ') }); };
}
function choose(id) { selected = id; message = function () { return T('{name} selected.', { name: companionName(id) }); }; Audio && Audio.play && Audio.play('select'); render(); }
function move(dir) { if (selected) command({ type: 'move', companion: selected, dir: dir }); }
function serve() { if (selected) command({ type: 'serve', companion: selected }); }
function tidy() {
  var c = companion(selected), station = c && state.stations.find(function (s) { return s.messy && Math.abs(s.x-c.x)+Math.abs(s.y-c.y)<=1; });
  if (!station) { message = function () { return T('No messy station is within reach.'); }; render(); return; }
  command({ type: 'tidy', companion: selected, x: station.x, y: station.y });
}
function hint() {
  var h = Rules.hint(state);
  if (!h) { message = function () { return T('No legal action is available.'); }; render(); return; }
  var a = h.action;
  var DIRS = { up: N('up'), down: N('down'), left: N('left'), right: N('right') };
  var ACTS = { move: N('move'), serve: N('serve'), tidy: N('tidy') };
  message = function () {
    var what = (ACTS[a.type] ? T(ACTS[a.type]) : a.type) + (a.dir ? ' ' + (DIRS[a.dir] ? T(DIRS[a.dir]) : a.dir) : '');
    return T('Hint: {action} with {name}.', { action: what, name: companionName(a.companion) });
  };
  selected = a.companion; Audio && Audio.play && Audio.play('hint'); render();
}
function renderBoard() {
  var html = '';
  for (var y=0;y<state.cfg.board.rows;y++) for (var x=0;x<state.cfg.board.cols;x++) {
    var c=state.companions.find(function (p) { return p.x===x&&p.y===y; });
    var s=state.stations.find(function (p) { return p.x===x&&p.y===y; });
    var blocked=state.grid[y][x]==='#';
    var text=c ? (Content.COMPANIONS[c.id]?.icon || '●') : s ? (Content.ACTIVITIES[s.activity]?.icon || '◆') : blocked ? '▦' : '·';
    // A station keeps its identity (and messy badge) while a companion stands on it.
    var stationLabel = s ? (s.messy ? T('{activity}, messy', { activity: activityName(s.activity) }) : activityName(s.activity)) : '';
    var label=c ? (s ? T('{name} at {station}', { name: companionName(c.id), station: stationLabel }) : companionName(c.id)) : s ? stationLabel : blocked?T('Wall'):T('Open floor');
    var badge = s && c ? '<i class="cc-station-badge'+(s.messy?' messy':'')+'" aria-hidden="true">'+(Content.ACTIVITIES[s.activity]?.icon || '◆')+(s.messy?'!':'')+'</i>' : '';
    var tint = c ? Content.COMPANIONS[c.id]?.color : s ? Content.ACTIVITIES[s.activity]?.color : null;
    html += '<button type="button"'+(tint!=null?' style="--tint:'+hex(tint)+(s?';--station-tint:'+hex(Content.ACTIVITIES[s.activity]?.color||0)+'"':'"'):'')+' class="cc-cell '+(c?'friend ':'')+(s?'station ':'')+(s&&s.messy?'messy ':'')+(blocked?'blocked ':'')+(c&&c.id===selected?'selected':'')+'" '+(c?'data-friend="'+c.id+'"':'disabled')+' aria-label="'+esc(T('Row {row}, column {col}: {label}', { row: y+1, col: x+1, label: label }))+'">'+badge+'<b aria-hidden="true">'+text+'</b><span>'+label+'</span></button>';
  }
  return html;
}
function renderFriends() {
  return state.companions.map(function (c) { return '<button type="button" style="--tint:'+hex(Content.COMPANIONS[c.id]?.color||0)+'" class="cc-friend '+(c.id===selected?'selected':'')+'" data-friend="'+c.id+'"><b>'+companionName(c.id)+'</b><span>'+esc(T('Wants {activity} · {n} patience', { activity: activityName(c.wish?.activity), n: c.wish?.patience ?? '—' }))+'</span></button>'; }).join('');
}
// Hosted play only: post the finished day's total to the platform high-score
// board and show the player's rank on the results card (lbLine; null = hidden).
var lbLine = null;  // null (hidden) | function returning the line in the current language
function postToLeaderboard(total) {
  if (!Platform.hosted) { lbLine = null; return; }
  lbLine = function () { return P.lbPosting; };
  Platform.submitScore(total).then(function (r) {
    lbLine = function () { return !r.posted ? P.lbFailed : r.rank ? P.lbRank.replace('{rank}', r.rank) : P.lbPosted; };
    var el = document.getElementById('cc-result-lb');
    if (el) el.textContent = lbLine();
  });
}
function resultHtml() {
  var t = state.terminal, s = state.score;
  var why = {
    'goal-complete': N('Every wish on the club list was fulfilled in time.'),
    'harmony-lost': N('Too many wishes expired and the club’s harmony broke.'),
    'day-ended': N('The day ended before the club goal was met.'),
    'no-actions': N('No legal actions remained.'),
    'resigned': N('The club day was given up early.')
  }[t.reason];
  var parts = [
    [N('Serving'), s.serve], [N('Patience bonus'), s.patienceBonus], [N('Together bonus'), s.togetherBonus],
    [N('Streak bonus'), s.streakBonus], [N('Tidying'), s.tidy], [N('Wave bonus'), s.roundBonus],
    [N('Day bonus'), s.dayBonus], [N('Mood bonus'), s.moodBonus]
  ].filter(function (p) { return p[1]; });
  var rows = parts.map(function (p) { return '<tr><td>'+esc(T(p[0]))+'</td><td>'+p[1]+'</td></tr>'; }).join('');
  return '<section class="cc-result" role="dialog" aria-modal="true" aria-labelledby="cc-result-title"><div class="cc-result-card"><img class="cc-result-art" src="./assets/results-art.webp" alt="" onerror="this.remove()"><h2 id="cc-result-title">'+esc(t.won?T('Club day complete!'):T('Club day ended'))+'</h2><p>'+(why?esc(T(why)):'')+'</p><table class="cc-score"><tbody>'+rows+'<tr class="cc-score-total"><td>'+esc(T('Total'))+'</td><td>'+s.total+'</td></tr></tbody></table>'+(lbLine!=null?'<p id="cc-result-lb" class="cc-result-lb" aria-live="polite">'+esc(lbLine())+'</p>':'')+'<button id="cc-again">'+esc(T('Play again'))+'</button></div></section>';
}
function render() {
  var active = document.activeElement;
  var focusSel = active && root.contains(active)
    ? (active.id ? '#' + active.id
      : active.dataset && active.dataset.friend ? '[data-friend="' + active.dataset.friend + '"]'
      : active.dataset && active.dataset.dir ? '[data-dir="' + active.dataset.dir + '"]'
      : null)
    : null;
  var msg = typeof message === 'function' ? message() : message;
  var stats = T('Served {served} · Turns {turns} · Score {score}', { served: '\u0001' + state.fulfilled + '/' + state.cfg.goal + '\u0002', turns: '\u0001' + state.tick + '\u0002', score: '\u0001' + state.score.total + '\u0002' });
  stats = esc(stats).replace(/\u0001/g, '<b>').replace(/\u0002/g, '</b>');
  root.innerHTML = '<main class="cc-game"><header><div><h1>Companion Club</h1><p>'+esc(T('Clubhouse Day {n}', { n: 1 }))+'</p></div><div>'+stats+'</div>'+settingsButton()+'</header><section class="cc-layout"><aside><h2>'+esc(T('Friends'))+'</h2><div class="cc-friends">'+renderFriends()+'</div><p class="cc-message" role="status">'+esc(msg)+'</p><div class="cc-pad"><button data-dir="up" aria-label="'+esc(T('Move up'))+'">↑</button><button data-dir="left" aria-label="'+esc(T('Move left'))+'">←</button><button data-dir="down" aria-label="'+esc(T('Move down'))+'">↓</button><button data-dir="right" aria-label="'+esc(T('Move right'))+'">→</button></div><div class="cc-actions"><button id="cc-serve">'+esc(T('Serve wish'))+'</button><button id="cc-tidy">'+esc(T('Tidy'))+'</button><button id="cc-hint">'+esc(T('Hint'))+'</button></div></aside><section class="cc-board-wrap"><h2>'+esc(T('Clubhouse floor'))+'</h2><div class="cc-board-fit"><div class="cc-board" style="--cols:'+state.cfg.board.cols+';--rows:'+state.cfg.board.rows+'">'+renderBoard()+'</div></div></section></section>'+(state.terminal?resultHtml():'')+'</main>';
  root.querySelectorAll('[data-friend]').forEach(function (b) { b.addEventListener('click', function () { choose(b.dataset.friend); }); });
  root.querySelectorAll('[data-dir]').forEach(function (b) { b.addEventListener('click', function () { move(b.dataset.dir); }); });
  document.getElementById('cc-serve').addEventListener('click', serve); document.getElementById('cc-tidy').addEventListener('click', tidy); document.getElementById('cc-hint').addEventListener('click', hint);
  bindSettings();
  var again=document.getElementById('cc-again'); if(again){ again.addEventListener('click',start); again.focus(); }
  else if (focusSel) { var el = root.querySelector(focusSel); if (el) el.focus(); }
}
window.addEventListener('keydown', function(e){ if(!state||state.terminal||(Settings&&Settings.isOpen()))return; if(e.ctrlKey||e.metaKey||e.altKey)return; var a=keyAction[e.code]; if(!a)return; e.preventDefault(); if(a==='serve')serve(); else if(a==='tidy')tidy(); else if(a==='hint')hint(); else move(a); });
document.addEventListener('visibilitychange', function(){ if(!Audio) return; if(document.hidden) Audio.suspend && Audio.suspend(); else Audio.resume && Audio.resume(); });
// Game language changed (Settings → Language, or the account preference
// arrived): re-render the visible screen in the new language. The round state
// is untouched (render() only redraws from it).
document.addEventListener('cc-language', function () {
  P = PT[curLang()] || PT['en-US'];
  if (Settings && Settings.relocalize) Settings.relocalize();
  if (state) render(); else title();
});

title();
})();
