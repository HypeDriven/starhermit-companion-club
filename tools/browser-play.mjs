// Plays the web package in headless Chrome (the loader index.html that
// `npm run package` writes), past ~/games/tools/engine-web-smoke.mjs's start:
// at a desktop viewport, a phone and a phone held sideways, by keyboard
// (Enter on the focused Play, then the first club day to its results by
// the hint: H and the key it names), on the phone also a tap on the pad and
// F for the next friend, failing on console errors
// or warnings or the runtime's error screen.
//   node tools/browser-play.mjs [GAME_DIR] [--shots OUT_DIR]
// Serves GAME_DIR on loopback (never tests/, tools/ or dot-names), the engine
// itself from wiki.starhermit.com as the loader pins it. playwright-core is
// resolved from GAME_DIR's node_modules or any sibling game's.
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { existsSync, readFileSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';

const args = process.argv.slice(2);
const dir = resolve(args[0] ?? '.');
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const shots = opt('--shots', null);
const waitMs = Number(opt('--wait', '8000'));

function findPlaywright() {
  const roots = [dir, resolve(dir, '..'), ...readdirSync(resolve(dir, '..')).map((d) => resolve(dir, '..', d))];
  for (const r of roots) {
    const p = join(r, 'node_modules', 'playwright-core');
    if (existsSync(p)) return createRequire(join(r, 'package.json'))('playwright-core');
  }
  throw new Error('playwright-core not found');
}
const { chromium } = findPlaywright();

const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.ts': 'text/plain',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.ttf': 'font/ttf', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^\/+/, '') || 'index.html';
  const parts = path.split('/');
  if (parts.some((p) => p.startsWith('.') || p === '..') || ['tests', 'tools', 'node_modules'].includes(parts[0])) { res.writeHead(404).end(); return; }
  const file = join(dir, path);
  if (!existsSync(file) || !statSync(file).isFile()) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/`;

// Headed Chrome on the machine's GPU (~/games/tools/gpu-chrome.mjs; GPU_ADAPTER=software: headless SwiftShader).
const { launchChrome } = await import(join(dir, '..', 'tools', 'gpu-chrome.mjs'));
const { browser, gpu, close } = await launchChrome(chromium);
console.log(`# chrome on ${gpu}`);
// The GPU path draws black at device pixel ratio 3 (engine bug, reported): phones at 2 there.
const phoneDpr = gpu === 'software' ? 3 : 2;
let failed = false;
// The first club day by the hint, as tools/gen-play.mjs plays it: H, then the key the hint names.
const R = createRequire(join(dir, 'package.json'))('./js/rules.js');
const C = createRequire(join(dir, 'package.json'))('./js/content.js');
const day = [];
for (let st = R.createGame(C.JOURNEY[0]); !st.terminal;) {
  const a = R.hint(st).action;
  day.push(['key', 'KeyH'], ['key', a.type === 'serve' ? 'KeyS' : a.type === 'tidy' ? 'KeyT' : { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }[a.dir]]);
  if (day.length === 4) day.push(['shot', 'served']);
  st = R.applyCommand(st, a).state;
}
const play = [['click', 4, 4], ['shot', 'title'], ['key', 'Enter'], ['wait', 3000], ['shot', 'game'], ...day, ['wait', 2000], ['shot', 'results']];
const views = [
  { name: 'desktop', viewport: { width: 1366, height: 768 }, steps: play },
  { name: 'phone', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: phoneDpr, steps: play },
  { name: 'phone-taps', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: phoneDpr,
    steps: [['click', 4, 4], ['key', 'Enter'], ['wait', 3000], ['tap', 0.33, 0.885], ['shot', 'pad-left'], ['key', 'KeyF'], ['tap', 0.86, 0.94], ['shot', 'hint']] },
  { name: 'landscape', viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: phoneDpr, steps: play },
];
for (const v of views) {
  const ctx = await browser.newContext({ viewport: v.viewport, isMobile: v.isMobile, hasTouch: v.hasTouch, deviceScaleFactor: v.deviceScaleFactor });
  const page = await ctx.newPage();
  const problems = [];
  const environment = /^No available adapters\.$|GL Driver Message/;
  page.on('console', (m) => {
    // The platform's clock (serverTime(): GET /api/v1/time on the game's origin)
    // is not served by this loopback host: its 404 is the environment's.
    const platformRoute = /\/api\//.test(m.location()?.url ?? '');
    if ((m.type() === 'error' || m.type() === 'warning') && !environment.test(m.text()) && !platformRoute) problems.push(`${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('response', (r) => { if (r.status() >= 400 && !/\/api\//.test(r.url())) problems.push(`http ${r.status()}: ${r.url()}`); });
  await page.goto(url, { waitUntil: 'load' });
  // The first start compiles shaders: wait for the runtime to run (up to 90 s), not a fixed delay.
  const started = await page.waitForFunction(() => {
    const st = document.documentElement.dataset.starhermit;
    return st === 'running' || st === 'error';
  }, null, { timeout: 90000 }).then(() => true, () => false);
  await page.waitForTimeout(3000); // a key press during start-up can be lost
  for (const [op, a, b] of v.steps) {
    if (op === 'key') { await page.keyboard.down(a); await page.waitForTimeout(120); await page.keyboard.up(a); }
    if (op === 'tap') await page.touchscreen.tap(v.viewport.width * a, v.viewport.height * b);
    if (op === 'click') await page.mouse.click(a, b);
    if (op === 'wait') { await page.waitForTimeout(a); continue; }
    if (op === 'shot' && shots) { mkdirSync(shots, { recursive: true }); await page.screenshot({ path: join(shots, `${v.name}-${a}.png`) }); }
    await page.waitForTimeout(2500);
  }
  const state = await page.evaluate(() => document.documentElement.dataset.starhermit ?? '');
  const ok = started && state !== 'error' && problems.length === 0;
  failed ||= !ok;
  console.log(`${ok ? 'ok' : 'not ok'} - ${v.name} played: started=${started} state=${state || '-'}`);
  for (const p of problems) console.log(`  ${p}`);
  await ctx.close();
}
await close();
server.close();
process.exit(failed ? 1 : 0);
