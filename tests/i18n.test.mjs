// Localization coverage: every English key the code and content use is
// translated in every locale (en-GB → en-US, es-ES → es-419, fr-CA → fr-FR
// inherit), placeholders survive, and the language follows sh-language.js and
// switches live.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadTables, codeKeys, htmlKeys, audit, bootI18n } from './i18n-common.mjs';

const ROOT = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');
function load(name, deps = {}) {
  const module = { exports: {} };
  new Function('module', 'require', read('js/' + name))(module, (d) => deps[d.split('/').pop()]);
  return module.exports;
}
const RNG = load('rng.js');
const Content = load('content.js', { 'rng.js': RNG });

export function usedKeys() {
  const keys = new Set(htmlKeys(read('index.html')));
  codeKeys(read('js/main.js')).forEach((k) => keys.add(k));
  codeKeys(read('js/platform.js'), ['tr']).forEach((k) => keys.add(k));
  for (const a of Object.values(Content.ACTIVITIES)) keys.add(a.label);
  for (const a of Content.ACHIEVEMENTS) keys.add(a.name);
  for (const j of Content.JOURNEY) if (j.intro) keys.add(j.intro);
  return [...keys].filter((k) => /[A-Za-z]/.test(k)).sort();
}

test('every used key is translated in every locale; placeholders intact', () => {
  assert.deepEqual(audit(loadTables(ROOT, 'js/strings.js', 'CC_STRINGS'), usedKeys()), []);
});

test('the locale follows sh-language and switches live', () => {
  const { I18N, events, doc } = bootI18n(ROOT, { strings: 'js/strings.js', i18n: 'js/i18n.js', global: 'CCI18N', languages: ['de-DE'] });
  assert.equal(I18N.lang, 'de-DE');
  assert.equal(doc.documentElement.lang, 'de-DE');
  assert.equal(I18N.T('Play'), 'Spielen');
  I18N.language.setChoice('fr-CA');
  assert.equal(I18N.lang, 'fr-CA');
  assert.equal(events.at(-1), 'fr-CA');
  I18N.language.setChoice('en-GB');
  assert.equal(I18N.T('Tidying'), 'Tidying');
});
