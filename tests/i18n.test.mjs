// Localization coverage: every English key the engine client (native/*.ts)
// and the content show is translated in every locale (en-GB → en-US,
// es-ES → es-419, fr-CA → fr-FR inherit), placeholders and markup survive,
// no table keeps a key nothing shows, the account lines exist in every
// locale, and the classic js/i18n.js switches locale as native/i18n.ts
// drives it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { loadTables, codeKeys, audit, bootI18n, LOCALES } from './i18n-common.mjs';

const require = createRequire(import.meta.url);
const ROOT = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');

export function usedKeys() {
  const keys = new Set();
  for (const f of readdirSync(new URL('native/', ROOT)).filter((n) => n.endsWith('.ts'))) {
    codeKeys(read('native/' + f), ['tr']).forEach((k) => keys.add(k));
  }
  const C = require('../js/content.js');
  for (const a of Object.values(C.ACTIVITIES)) keys.add(a.label);
  for (const a of C.ACHIEVEMENTS) keys.add(a.name);
  for (const j of C.JOURNEY) if (j.intro) keys.add(j.intro);
  return [...keys].filter((k) => /[A-Za-z]/.test(k)).sort();
}

test('every used key is translated in every locale; placeholders and markup intact', () => {
  assert.deepEqual(audit(loadTables(ROOT, 'js/strings.js', 'CC_STRINGS'), usedKeys()), []);
});

test('the account and leaderboard lines exist in every locale with their placeholders', () => {
  const P = require('../js/platform-strings.js');
  const en = P.platformStrings('en-US');
  for (const loc of LOCALES) {
    const t = P.platformStrings(loc);
    assert.deepEqual(Object.keys(t).sort(), Object.keys(en).sort(), loc);
    for (const k of Object.keys(en)) {
      assert.deepEqual((t[k].match(/\{\w+\}/g) || []).sort(), (en[k].match(/\{\w+\}/g) || []).sort(), `${loc} ${k}`);
    }
  }
  assert.equal(P.fmtPlatform(P.platformStrings('de-DE').lbRank, { rank: 4 }), 'Platz in der Bestenliste: #4');
});

test('the locale switches as the engine client sets it, with the regional tables', () => {
  const { I18N } = bootI18n(ROOT, { strings: 'js/strings.js', i18n: 'js/i18n.js', global: 'CCI18N' });
  assert.equal(I18N.lang, 'en-US');
  assert.equal(I18N.setLocale('de-DE'), 'de-DE');
  assert.equal(I18N.T('Play'), 'Spielen');
  I18N.setLocale('fr-CA');
  assert.equal(I18N.T('Snack'), 'Collation');
  assert.equal(I18N.T('Play'), 'Jouer');
  I18N.setLocale('en-GB');
  assert.equal(I18N.T('Tidying'), 'Tidying');
  I18N.setLocale('es-ES');
  assert.equal(I18N.T('Snack'), 'Merienda');
  assert.equal(I18N.setLocale('xx-YY'), 'en-US');
  assert.equal(I18N.T('{name} selected.', { name: 'Pip' }), 'Pip selected.');
});
