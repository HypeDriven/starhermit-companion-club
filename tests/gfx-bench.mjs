// Graphics benchmark hook for tools/gfx-bench.mjs (dev-only): picks a preset in the real Settings
// panel, starts Journey stage 1 and keeps playing hinted actions through the visible friends list,
// direction keys/pad and Serve/Tidy buttons (sparkle bursts, motes, hearth flicker and the CSS effects
// all run), restarting the day from the results overlay. A rules mirror plans the moves, as in e2e.
export const presets = ['low', 'balanced', 'high', 'ultra'];
export const levels = { low: 0, balanced: 4, high: 10, ultra: 17 };

export async function setPreset(page, preset) {
  await page.waitForSelector('.cc-title #cc-play', { timeout: 20000 });
  await page.click('#cc-settings-open');
  await page.waitForSelector('#gfx-preset', { state: 'visible' });
  await page.selectOption('#gfx-preset', preset);
  await page.waitForFunction((p) => document.documentElement.dataset.gfxPreset === p, preset);
  await page.click('#cc-settings-close');
  await page.waitForSelector('.cc-settings', { state: 'hidden' });
}

const resetMirror = (page) => page.evaluate(() => { window.__ccMirror = window.CCRules.createGame(window.CCContent.JOURNEY[0]); });

async function step(page, mobile) {
  const press = (sel) => (mobile ? page.tap(sel, { timeout: 5000 }) : page.click(sel, { timeout: 5000 }));
  if (await page.locator('#cc-again:visible').count()) { await press('#cc-again'); await resetMirror(page); return; }
  const action = await page.evaluate(() => {
    const s = window.__ccMirror;
    if (!s || s.terminal) return null;
    const h = window.CCRules.hint(s);
    if (!h) return null;
    const a = h.action;
    if (a.type === 'tidy') {
      const c = s.companions.find((p) => p.id === a.companion);
      const st = s.stations.find((p) => p.messy && Math.abs(p.x - c.x) + Math.abs(p.y - c.y) <= 1);
      if (st) { a.x = st.x; a.y = st.y; }
    }
    return a;
  });
  if (!action) return;
  await press(`.cc-friend[data-friend="${action.companion}"]`);
  if (action.type === 'move') {
    if (mobile) await page.tap(`.cc-pad button[data-dir="${action.dir}"]`, { timeout: 5000 });
    else await page.keyboard.press({ up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }[action.dir]);
  } else if (action.type === 'serve') await press('#cc-serve');
  else if (mobile) await page.tap('#cc-tidy', { timeout: 5000 });
  else await page.keyboard.press('t');
  await page.evaluate((cmd) => {
    const out = window.CCRules.applyCommand(window.__ccMirror, cmd);
    if (out.ok) window.__ccMirror = out.state;
  }, action);
}

export async function start(page, { mobile } = {}) {
  await page.click('#cc-play');
  await page.waitForSelector('.cc-game .cc-board');
  await resetMirror(page);
  let open = true;
  page.once('close', () => { open = false; });
  (async () => {
    while (open) {
      try { await step(page, mobile); await page.waitForTimeout(350); } catch (e) { if (!open) return; if (process.env.BENCH_DEBUG) console.error(e.message); }
    }
  })();
  await page.waitForTimeout(1000);
}
