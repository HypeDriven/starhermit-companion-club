/* Companion Club — Settings panel (Graphics section). The panel lives outside
 * #cc-root so re-renders of the game never touch it. Its own strings are
 * localized for the nine supported locales; the locale comes from
 * navigator.languages. Browser global: window.CCSettings.
 */
(function () {
  'use strict';
  var Gfx = window.CCGfx, Fx = window.CCFx;

  var STRINGS = {
    'en-US': {
      settings: 'Settings', graphics: 'Graphics', close: 'Close', quality: 'Quality',
      auto: 'Auto (detected: {tier})', fromPreset: 'From preset ({tier})', renderScale: 'Render scale',
      presets: { low: 'Low', balanced: 'Balanced', high: 'High', ultra: 'Ultra' },
      cats: { shadows: 'Shadows', bloom: 'Glow', grade: 'Color grade', particles: 'Particles', ambient: 'Ambient motion', detail: 'Surface detail' },
      tiers: { off: 'Off', low: 'Low', medium: 'Medium', high: 'High', on: 'On', static: 'Static', animated: 'Animated', plain: 'Plain', detailed: 'Detailed' },
      adaptive: 'Adaptive resolution', showFps: 'Show frame rate',
      note: 'The effects layer is unavailable; the game draws without it.', unknownGpu: 'Unknown GPU',
      sum: { shadows: 'shadows', bloom: 'glow', grade: 'color grade', particles: 'particles', ambient: 'ambient motion', detail: 'detailed surfaces', none: 'no effects', tiers: { low: 'low', medium: 'medium', high: 'high' } }
    },
    'en-GB': {
      settings: 'Settings', graphics: 'Graphics', close: 'Close', quality: 'Quality',
      auto: 'Auto (detected: {tier})', fromPreset: 'From preset ({tier})', renderScale: 'Render scale',
      presets: { low: 'Low', balanced: 'Balanced', high: 'High', ultra: 'Ultra' },
      cats: { shadows: 'Shadows', bloom: 'Glow', grade: 'Colour grade', particles: 'Particles', ambient: 'Ambient motion', detail: 'Surface detail' },
      tiers: { off: 'Off', low: 'Low', medium: 'Medium', high: 'High', on: 'On', static: 'Static', animated: 'Animated', plain: 'Plain', detailed: 'Detailed' },
      adaptive: 'Adaptive resolution', showFps: 'Show frame rate',
      note: 'The effects layer is unavailable; the game draws without it.', unknownGpu: 'Unknown GPU',
      sum: { shadows: 'shadows', bloom: 'glow', grade: 'colour grade', particles: 'particles', ambient: 'ambient motion', detail: 'detailed surfaces', none: 'no effects', tiers: { low: 'low', medium: 'medium', high: 'high' } }
    },
    'es-419': {
      settings: 'Configuración', graphics: 'Gráficos', close: 'Cerrar', quality: 'Calidad',
      auto: 'Automática (detectada: {tier})', fromPreset: 'Según el preajuste ({tier})', renderScale: 'Escala de renderizado',
      presets: { low: 'Baja', balanced: 'Equilibrada', high: 'Alta', ultra: 'Ultra' },
      cats: { shadows: 'Sombras', bloom: 'Resplandor', grade: 'Corrección de color', particles: 'Partículas', ambient: 'Movimiento ambiental', detail: 'Detalle de superficies' },
      tiers: { off: 'Desactivado', low: 'Bajo', medium: 'Medio', high: 'Alto', on: 'Activado', static: 'Estático', animated: 'Animado', plain: 'Simple', detailed: 'Detallado' },
      adaptive: 'Resolución adaptable', showFps: 'Mostrar cuadros por segundo',
      note: 'La capa de efectos no está disponible; el juego se dibuja sin ella.', unknownGpu: 'GPU desconocida',
      sum: { shadows: 'sombras', bloom: 'resplandor', grade: 'corrección de color', particles: 'partículas', ambient: 'movimiento ambiental', detail: 'superficies detalladas', none: 'sin efectos', tiers: { low: 'bajas', medium: 'medias', high: 'altas' } }
    },
    'es-ES': {
      settings: 'Ajustes', graphics: 'Gráficos', close: 'Cerrar', quality: 'Calidad',
      auto: 'Automática (detectada: {tier})', fromPreset: 'Según el preajuste ({tier})', renderScale: 'Escala de renderizado',
      presets: { low: 'Baja', balanced: 'Equilibrada', high: 'Alta', ultra: 'Ultra' },
      cats: { shadows: 'Sombras', bloom: 'Resplandor', grade: 'Gradación de color', particles: 'Partículas', ambient: 'Movimiento ambiental', detail: 'Detalle de superficies' },
      tiers: { off: 'Desactivado', low: 'Bajo', medium: 'Medio', high: 'Alto', on: 'Activado', static: 'Estático', animated: 'Animado', plain: 'Sencillo', detailed: 'Detallado' },
      adaptive: 'Resolución adaptativa', showFps: 'Mostrar fotogramas por segundo',
      note: 'La capa de efectos no está disponible; el juego se dibuja sin ella.', unknownGpu: 'GPU desconocida',
      sum: { shadows: 'sombras', bloom: 'resplandor', grade: 'gradación de color', particles: 'partículas', ambient: 'movimiento ambiental', detail: 'superficies detalladas', none: 'sin efectos', tiers: { low: 'bajas', medium: 'medias', high: 'altas' } }
    },
    'de-DE': {
      settings: 'Einstellungen', graphics: 'Grafik', close: 'Schließen', quality: 'Qualität',
      auto: 'Automatisch (erkannt: {tier})', fromPreset: 'Aus Voreinstellung ({tier})', renderScale: 'Renderskalierung',
      presets: { low: 'Niedrig', balanced: 'Ausgewogen', high: 'Hoch', ultra: 'Ultra' },
      cats: { shadows: 'Schatten', bloom: 'Leuchten', grade: 'Farbkorrektur', particles: 'Partikel', ambient: 'Umgebungsbewegung', detail: 'Oberflächendetails' },
      tiers: { off: 'Aus', low: 'Niedrig', medium: 'Mittel', high: 'Hoch', on: 'An', static: 'Statisch', animated: 'Animiert', plain: 'Schlicht', detailed: 'Detailliert' },
      adaptive: 'Adaptive Auflösung', showFps: 'Bildrate anzeigen',
      note: 'Die Effektebene ist nicht verfügbar; das Spiel wird ohne sie dargestellt.', unknownGpu: 'Unbekannte GPU',
      sum: { shadows: 'Schatten', bloom: 'Leuchten', grade: 'Farbkorrektur', particles: 'Partikel', ambient: 'Umgebungsbewegung', detail: 'detaillierte Oberflächen', none: 'keine Effekte', tiers: { low: 'niedrig', medium: 'mittel', high: 'hoch' } }
    },
    'fr-FR': {
      settings: 'Paramètres', graphics: 'Graphismes', close: 'Fermer', quality: 'Qualité',
      auto: 'Auto (détectée : {tier})', fromPreset: 'Selon le préréglage ({tier})', renderScale: 'Échelle de rendu',
      presets: { low: 'Faible', balanced: 'Équilibrée', high: 'Élevée', ultra: 'Ultra' },
      cats: { shadows: 'Ombres', bloom: 'Lueur', grade: 'Étalonnage des couleurs', particles: 'Particules', ambient: 'Mouvement d’ambiance', detail: 'Détail des surfaces' },
      tiers: { off: 'Désactivé', low: 'Faible', medium: 'Moyen', high: 'Élevé', on: 'Activé', static: 'Statique', animated: 'Animé', plain: 'Simple', detailed: 'Détaillé' },
      adaptive: 'Résolution adaptative', showFps: 'Afficher la fréquence d’images',
      note: 'La couche d’effets est indisponible ; le jeu s’affiche sans elle.', unknownGpu: 'GPU inconnu',
      sum: { shadows: 'ombres', bloom: 'lueur', grade: 'étalonnage', particles: 'particules', ambient: 'mouvement d’ambiance', detail: 'surfaces détaillées', none: 'aucun effet', tiers: { low: 'faibles', medium: 'moyennes', high: 'élevées' } }
    },
    'fr-CA': {
      settings: 'Paramètres', graphics: 'Graphiques', close: 'Fermer', quality: 'Qualité',
      auto: 'Auto (détectée: {tier})', fromPreset: 'Selon le préréglage ({tier})', renderScale: 'Échelle de rendu',
      presets: { low: 'Faible', balanced: 'Équilibrée', high: 'Élevée', ultra: 'Ultra' },
      cats: { shadows: 'Ombres', bloom: 'Lueur', grade: 'Colorimétrie', particles: 'Particules', ambient: 'Mouvement d’ambiance', detail: 'Détail des surfaces' },
      tiers: { off: 'Désactivé', low: 'Faible', medium: 'Moyen', high: 'Élevé', on: 'Activé', static: 'Statique', animated: 'Animé', plain: 'Simple', detailed: 'Détaillé' },
      adaptive: 'Résolution adaptative', showFps: 'Afficher le nombre d’images par seconde',
      note: 'La couche d’effets n’est pas disponible; le jeu s’affiche sans elle.', unknownGpu: 'GPU inconnu',
      sum: { shadows: 'ombres', bloom: 'lueur', grade: 'colorimétrie', particles: 'particules', ambient: 'mouvement d’ambiance', detail: 'surfaces détaillées', none: 'aucun effet', tiers: { low: 'faibles', medium: 'moyennes', high: 'élevées' } }
    },
    'pt-BR': {
      settings: 'Configurações', graphics: 'Gráficos', close: 'Fechar', quality: 'Qualidade',
      auto: 'Automática (detectada: {tier})', fromPreset: 'Da predefinição ({tier})', renderScale: 'Escala de renderização',
      presets: { low: 'Baixa', balanced: 'Equilibrada', high: 'Alta', ultra: 'Ultra' },
      cats: { shadows: 'Sombras', bloom: 'Brilho', grade: 'Correção de cor', particles: 'Partículas', ambient: 'Movimento ambiente', detail: 'Detalhe das superfícies' },
      tiers: { off: 'Desligado', low: 'Baixo', medium: 'Médio', high: 'Alto', on: 'Ligado', static: 'Estático', animated: 'Animado', plain: 'Simples', detailed: 'Detalhado' },
      adaptive: 'Resolução adaptável', showFps: 'Mostrar taxa de quadros',
      note: 'A camada de efeitos está indisponível; o jogo é desenhado sem ela.', unknownGpu: 'GPU desconhecida',
      sum: { shadows: 'sombras', bloom: 'brilho', grade: 'correção de cor', particles: 'partículas', ambient: 'movimento ambiente', detail: 'superfícies detalhadas', none: 'sem efeitos', tiers: { low: 'baixas', medium: 'médias', high: 'altas' } }
    },
    'it-IT': {
      settings: 'Impostazioni', graphics: 'Grafica', close: 'Chiudi', quality: 'Qualità',
      auto: 'Automatica (rilevata: {tier})', fromPreset: 'Dal preset ({tier})', renderScale: 'Scala di rendering',
      presets: { low: 'Bassa', balanced: 'Bilanciata', high: 'Alta', ultra: 'Ultra' },
      cats: { shadows: 'Ombre', bloom: 'Bagliore', grade: 'Correzione colore', particles: 'Particelle', ambient: 'Movimento ambientale', detail: 'Dettaglio superfici' },
      tiers: { off: 'Disattivato', low: 'Basso', medium: 'Medio', high: 'Alto', on: 'Attivato', static: 'Statico', animated: 'Animato', plain: 'Semplice', detailed: 'Dettagliato' },
      adaptive: 'Risoluzione adattiva', showFps: 'Mostra frequenza fotogrammi',
      note: 'Il livello degli effetti non è disponibile; il gioco viene disegnato senza.', unknownGpu: 'GPU sconosciuta',
      sum: { shadows: 'ombre', bloom: 'bagliore', grade: 'correzione colore', particles: 'particelle', ambient: 'movimento ambientale', detail: 'superfici dettagliate', none: 'nessun effetto', tiers: { low: 'basse', medium: 'medie', high: 'alte' } }
    }
  };
  var FALLBACK = { en: 'en-US', es: 'es-419', de: 'de-DE', fr: 'fr-FR', pt: 'pt-BR', it: 'it-IT' };

  function pickLocale(list) {
    for (var i = 0; i < list.length; i++) {
      var tag = String(list[i] || '');
      var exact = Object.keys(STRINGS).find(function (k) { return k.toLowerCase() === tag.toLowerCase(); });
      if (exact) return exact;
      if (/^es-(ES)$/i.test(tag)) return 'es-ES';
      if (/^en-(GB|IE|AU|NZ|ZA|IN)$/i.test(tag)) return 'en-GB';
      if (/^fr-CA$/i.test(tag)) return 'fr-CA';
      var base = tag.split('-')[0].toLowerCase();
      if (FALLBACK[base]) return FALLBACK[base];
    }
    return 'en-US';
  }
  var locale = pickLocale((navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language]).concat(['en-US']));
  var T = STRINGS[locale];
  function fmt(s, tier) { return s.replace('{tier}', tier); }

  var panel = null, opener = null;

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function build() {
    panel = document.createElement('div');
    panel.className = 'cc-settings';
    panel.hidden = true;
    var cats = Object.keys(Gfx.CATEGORIES).map(function (cat) {
      return '<label class="cc-set-row" for="gfx-' + cat + '"><span>' + esc(T.cats[cat]) + '</span><select id="gfx-' + cat + '" data-gfx="' + cat + '"></select></label>';
    }).join('');
    panel.innerHTML =
      '<div class="cc-settings-card" role="dialog" aria-modal="true" aria-labelledby="cc-settings-title" lang="' + locale + '">' +
      '<header><h2 id="cc-settings-title">' + esc(T.settings) + '</h2><button type="button" id="cc-settings-close">' + esc(T.close) + '</button></header>' +
      '<section class="cc-settings-body" aria-labelledby="cc-gfx-title"><h3 id="cc-gfx-title">' + esc(T.graphics) + '</h3>' +
      '<label class="cc-set-row" for="gfx-preset"><span>' + esc(T.quality) + '</span><select id="gfx-preset" data-gfx="preset"></select></label>' +
      '<label class="cc-set-row" for="gfx-scale"><span>' + esc(T.renderScale) + ' <output id="gfx-scale-out" for="gfx-scale"></output></span><input type="range" id="gfx-scale" data-gfx="render_scale" min="50" max="200" step="10"></label>' +
      cats +
      '<label class="cc-set-check" for="gfx-adaptive"><input type="checkbox" id="gfx-adaptive" data-gfx="adaptive"><span>' + esc(T.adaptive) + '</span></label>' +
      '<label class="cc-set-check" for="gfx-fps"><input type="checkbox" id="gfx-fps" data-gfx="show_fps"><span>' + esc(T.showFps) + '</span></label>' +
      '<p class="cc-set-summary" id="gfx-summary" aria-live="polite"></p>' +
      '<p class="cc-set-note" id="gfx-note" hidden>' + esc(T.note) + '</p>' +
      '</section></div>';
    document.body.appendChild(panel);

    panel.addEventListener('change', function (e) {
      var k = e.target.dataset && e.target.dataset.gfx;
      if (!k) return;
      if (k === 'render_scale') Fx.set(k, e.target.value / 100);
      else if (k === 'adaptive' || k === 'show_fps') Fx.set(k, e.target.checked);
      else Fx.set(k, e.target.value);
      refresh();
    });
    panel.querySelector('#gfx-scale').addEventListener('input', function (e) {
      panel.querySelector('#gfx-scale-out').textContent = e.target.value + '%';
    });
    panel.querySelector('#cc-settings-close').addEventListener('click', close);
    panel.addEventListener('click', function (e) { if (e.target === panel) close(); });
    panel.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key === 'Tab') { // keep focus inside the dialog
        var f = panel.querySelectorAll('button, select, input');
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
      e.stopPropagation(); // the game's shortcut keys stay inactive
    });
    Fx.onChange(function () { if (panel && !panel.hidden) summary(); });
  }

  function options(sel, list, value) {
    sel.innerHTML = list.map(function (o) { return '<option value="' + o[0] + '">' + esc(o[1]) + '</option>'; }).join('');
    sel.value = value;
  }

  function refresh() {
    var inf = Fx.info(), s = inf.saved, r = inf.resolved;
    var pre = [['auto', fmt(T.auto, T.presets[inf.detected])]].concat(Gfx.PRESETS.map(function (p) { return [p, T.presets[p]]; }));
    options(panel.querySelector('#gfx-preset'), pre, Gfx.PRESETS.indexOf(s.preset) >= 0 ? s.preset : 'auto');
    Object.keys(Gfx.CATEGORIES).forEach(function (cat) {
      var list = [['preset', fmt(T.fromPreset, T.tiers[Gfx.presetTier(r.preset, cat)])]].concat(Gfx.CATEGORIES[cat].map(function (t) { return [t, T.tiers[t]]; }));
      options(panel.querySelector('#gfx-' + cat), list, Gfx.CATEGORIES[cat].indexOf(s[cat]) >= 0 ? s[cat] : 'preset');
    });
    var pct = Math.round(r.userScale * 100);
    panel.querySelector('#gfx-scale').value = pct;
    panel.querySelector('#gfx-scale-out').textContent = pct + '%';
    panel.querySelector('#gfx-adaptive').checked = r.adaptive;
    panel.querySelector('#gfx-fps').checked = r.showFps;
    summary();
  }
  function summary() {
    var inf = Fx.info();
    panel.querySelector('#gfx-summary').textContent = (inf.gpu || T.unknownGpu) + ' · ' + Gfx.describe(inf.resolved, inf.pixels, T.sum);
    panel.querySelector('#gfx-note').hidden = !inf.unavailable;
  }

  function open() {
    if (!panel) build();
    opener = document.activeElement && document.activeElement.id ? document.activeElement.id : null;
    refresh();
    panel.hidden = false;
    document.documentElement.classList.add('cc-settings-open');
    panel.querySelector('#gfx-preset').focus();
  }
  function close() {
    if (!panel || panel.hidden) return;
    panel.hidden = true;
    document.documentElement.classList.remove('cc-settings-open');
    var el = opener && document.getElementById(opener);
    if (el) el.focus();
  }

  /** Markup for the Settings button (title screen and in-game header). */
  function buttonHtml() {
    return '<button type="button" id="cc-settings-open" class="cc-gear" aria-label="' + esc(T.settings) + '"><span aria-hidden="true">⚙</span><span class="cc-gear-label">' + esc(T.settings) + '</span></button>';
  }

  window.CCSettings = {
    open: open, close: close, buttonHtml: buttonHtml,
    isOpen: function () { return !!(panel && !panel.hidden); },
    locale: locale, STRINGS: STRINGS, pickLocale: pickLocale
  };
})();
