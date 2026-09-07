/**
 * Companion Club — end-to-end playthrough (dev QA only, not shipped).
 *
 * Drives the real visible UI in headless Chrome against a self-contained
 * static server (ephemeral port). Flow per viewport pass:
 *   load → title → Play → journey stage 1 ("Welcome Mat") played turn by
 *   turn via on-screen controls (friend list, direction pad / arrow keys,
 *   Serve / Tidy / Hint buttons) until the results overlay → Play again.
 *
 * Synchronization uses a deterministic mirror of the rules engine
 * (window.CCRules + window.CCContent are exposed by the game; the mirror is
 * created by this test, not by game code). Every action is executed through
 * the real UI; the mirror only decides which visible control to press next
 * and detects the terminal state.
 *
 * Known limitation: this build's UI has no pause/resume or settings screens
 * (js/main.js implements title → play → result only), so those are not
 * covered. The repo's server.js is a plain static file server; this test
 * embeds its own equivalent server on an ephemeral port to stay
 * self-contained.
 */
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SHOT = (stage, tag) => `/tmp/companion-club-e2e-${stage}-${tag}.png`;
const browserNoise = /GL Driver Message|GPU stall due to ReadPixels|Automatic fallback to software WebGL|EnableWebGLDeveloperExtensions|AudioContext was not allowed to start/i;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.ico': 'image/x-icon', '.wav': 'audio/wav', '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg', '.opus': 'audio/ogg', '.glb': 'model/gltf-binary',
  '.woff2': 'font/woff2', '.ts': 'text/plain',
};

const server = http.createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (p === '/') p = '/index.html';
    const file = path.normalize(path.join(ROOT, p));
    if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403).end('forbidden'); return; }
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404).end('not found');
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const BASE = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--no-sandbox', '--enable-unsafe-swiftshader'],
});

const errors = [];
let failed = false;

async function runPass(tag, viewport, mobile) {
  const context = await browser.newContext({
    viewport,
    hasTouch: mobile,
    isMobile: mobile,
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(`[${tag}] pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !browserNoise.test(m.text())) errors.push(`[${tag}] console: ${m.text()}`);
  });

  const step = async (name, fn) => {
    await fn();
    console.log(`ok - [${tag}] ${name}`);
  };

  const header = () => page.locator('.cc-game header div').last().textContent();

  try {
    await step('load + title visible', async () => {
      await page.goto(BASE, { waitUntil: 'networkidle' });
      await page.waitForSelector('.cc-title #cc-play', { timeout: 10000 });
      await page.screenshot({ path: SHOT('title', tag) });
    });

    await step('start journey stage 1', async () => {
      await page.click('#cc-play');
      await page.waitForSelector('.cc-game .cc-board');
      const cells = await page.locator('.cc-cell').count();
      if (cells !== 16) throw new Error(`expected 16 board cells (4x4), got ${cells}`);
      const friends = await page.locator('.cc-friend').count();
      if (friends !== 2) throw new Error(`expected 2 companions, got ${friends}`);
      const head = await header();
      if (!/Served\s+0\/3/.test(head || '')) throw new Error('unexpected header: ' + head);
      // deterministic mirror of the rules engine for move decisions
      await page.evaluate(() => {
        window.__ccMirror = window.CCRules.createGame(window.CCContent.JOURNEY[0]);
      });
      await page.screenshot({ path: SHOT('board', tag) });
    });

    await step('hint button suggests a legal action', async () => {
      if (mobile) await page.tap('#cc-hint');
      else await page.keyboard.press('h');
      const msg = await page.locator('.cc-message').textContent();
      if (!/^Hint:/.test(msg || '')) throw new Error('no hint text: ' + msg);
      console.log(`  hint: ${msg}`);
    });

    await step('invalid action shows on-screen feedback', async () => {
      // At game start no companion stands on a station, so Serve is rejected
      // with 'not-on-station'; the UI must surface that reason.
      if (mobile) await page.tap('#cc-serve');
      else await page.click('#cc-serve');
      const msg = await page.locator('.cc-message').textContent();
      if (!/not on station/i.test(msg || '')) throw new Error('no invalid-action feedback: ' + msg);
      console.log(`  invalid feedback: ${msg}`);
    });

    await step('play turns via UI until results', async () => {
      for (let turn = 0; turn < 60; turn++) {
        const action = await page.evaluate(() => {
          const s = window.__ccMirror;
          if (s.terminal) return null;
          const h = window.CCRules.hint(s);
          if (!h) return null;
          const a = h.action;
          if (a.type === 'tidy') {
            // replicate the UI tidy() pick: first messy station within reach
            const c = s.companions.find((p) => p.id === a.companion);
            const st = s.stations.find((p) => p.messy && Math.abs(p.x - c.x) + Math.abs(p.y - c.y) <= 1);
            if (st) { a.x = st.x; a.y = st.y; }
          }
          return a;
        });
        if (!action) break;

        // 1) select the companion through the visible friends list
        const friendBtn = page.locator(`.cc-friend[data-friend="${action.companion}"]`);
        if (mobile) await friendBtn.tap();
        else await friendBtn.click();
        await page.waitForSelector(`.cc-friend[data-friend="${action.companion}"].selected`);

        // 2) perform the action through the visible controls
        if (action.type === 'move') {
          if (mobile) await page.tap(`.cc-pad button[data-dir="${action.dir}"]`);
          else await page.keyboard.press({ up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }[action.dir]);
        } else if (action.type === 'serve') {
          if (mobile) await page.tap('#cc-serve');
          else await page.click('#cc-serve');
        } else {
          if (mobile) await page.tap('#cc-tidy');
          else await page.keyboard.press('t');
        }
        if (turn === 2) await page.screenshot({ path: SHOT('play', tag) });

        // 3) apply the identical command to the mirror and sync-check the header
        const sync = await page.evaluate((cmd) => {
          const out = window.CCRules.applyCommand(window.__ccMirror, cmd);
          if (!out.ok) return { ok: false, reason: out.reason };
          window.__ccMirror = out.state;
          return {
            ok: true,
            tick: out.state.tick,
            fulfilled: out.state.fulfilled,
            terminal: out.state.terminal,
          };
        }, action);
        if (!sync.ok) throw new Error(`mirror rejected UI-mirrored command: ${sync.reason}`);
        const head = await header();
        if (!new RegExp(`Served\\s+${sync.fulfilled}/\\d+ · Turns\\s+${sync.tick}\\b`).test(head || '')) {
          throw new Error(`UI out of sync with mirror (tick ${sync.tick}): ${head}`);
        }
        if (sync.terminal) {
          console.log(`  terminal after ${sync.tick} turns: ${sync.terminal.reason} (won=${sync.terminal.won})`);
          break;
        }
      }
    });

    await step('results overlay shown', async () => {
      await page.waitForSelector('.cc-result', { timeout: 5000 });
      const title = await page.locator('.cc-result h2').textContent();
      console.log(`  result: ${title}`);
      await page.screenshot({ path: SHOT('result', tag) });
    });

    await step('play again restarts the day', async () => {
      if (mobile) await page.tap('#cc-again');
      else await page.click('#cc-again');
      await page.waitForSelector('.cc-game .cc-board');
      if (await page.locator('.cc-result').count()) throw new Error('result overlay still visible');
      const head = await header();
      if (!/Served\s+0\/3 · Turns\s+0\b/.test(head || '')) throw new Error('did not restart: ' + head);
      await page.screenshot({ path: SHOT('restart', tag) });
    });

    if (mobile) {
      await step('mobile touch targets are at least 44px', async () => {
        for (const sel of ['#cc-serve', '#cc-tidy', '#cc-hint']) {
          const box = await page.locator(sel).boundingBox();
          if (!box || box.height < 44) throw new Error(`${sel} too small: ${JSON.stringify(box)}`);
        }
      });
    }
  } finally {
    await context.close();
  }

  if (errors.length) throw new Error(`page errors in ${tag} pass:\n` + errors.join('\n'));
}

try {
  await runPass('desktop', { width: 1280, height: 800 }, false);
  await runPass('mobile', { width: 390, height: 844 }, true);
} catch (e) {
  failed = true;
  console.error('E2E FAIL:', e.message || e);
} finally {
  await browser.close();
  server.close();
}

if (failed || errors.length) {
  if (!failed && errors.length) console.error('E2E FAIL — page errors:\n' + errors.join('\n'));
  process.exit(1);
}
console.log('\nE2E PASS — companion-club playable end-to-end on desktop and mobile, no page errors');
