# Companion Club — Game Design Document (running spec)

**Status:** shipped; this document describes the game as it runs today (present tense). Design intent that the code does not yet do is collected in the final section only.
**Pitch:** A cozy one-more-turn puzzle: guide four clubhouse friends across a small floor, serve each one's wish at the matching station before its patience runs out, and keep the stations tidy so the club's harmony holds until the day's goal is met.
**Genre:** turn-based routing / errand puzzle with a caretaking fantasy.
**Players:** 1, local, offline after load.
**Session length:** one club day of Welcome Mat lasts 7–30 turns, about one to three minutes.
**Platforms:** a StarHermit engine script game (engine 1.18.0, host API 1.20): played natively by the StarHermit client and in desktop and mobile browsers by the engine's web runtime, portrait and landscape.
**Rendering:** `starhermit:ui` (immediate-mode UI, styles converted from the old CSS) and `starhermit:draw`. The clubhouse floor is a grid of game-drawn `ui.widget` cells; the effects layer (lamp light, dust motes, sparkles) is drawn last from a 0 × 0 placed widget (section 8, Graphics). There is no 3D scene.

## 1. File map

| Path | Role |
|---|---|
| `starhermit.txt` | Manifest: `launch=index.html`, `engine.api=1`, `engine.entry=native/main.ts`, `engine.version=1.18.0`, `engine.minor=18`, capabilities `platform,storage,clipboard`, the eight actions with keys and gamepad defaults, `server=score-script.js`. |
| `index.html`, `starhermit-files.json` | The engine's web loader and file index, written by `npm run package` (`starhermit package --web .`); never edited by hand. |
| `native/main.ts` | Entry module: app state, Play, commands (move / serve / tidy / hint / next friend), messages, sounds, sparkles, recording the day and achievements, leaderboard post, input actions, lifecycle, fixed-step clock. |
| `native/screens.ts` | Title, club day (header, Friends panel, floor panel), results dialog, toast; layouts per window size. |
| `native/board.ts` | The board cells (`ui.widget`), their drawing per graphics level, the emoji icon atlas. |
| `native/fx.ts` | Effects layer: hearth lamp, dust motes, serve / tidy / win bursts. |
| `native/style.ts` | Registers `assets/ui-style.json`, folds the graphics categories into the styles. |
| `native/quality.ts` | Graphics level (`frame().quality`, `levelIndex`) → the old presets' categories and budgets. |
| `native/audio.ts` | Authored clips from `sfx/manifest.json`, room-tone loop, the rendered pad. |
| `native/platform.ts` | Save (`starhermit:storage` saves, foreign-save migration, conflict merge), legacy settings removal, player, invite link, leaderboard post through `score-script.js`. |
| `native/i18n.ts`, `native/classic.ts` | Locale from the runtime's interface language; loads `js/*.js` as classic scripts with typed exports. |
| `js/rng.js`, `js/rules.js`, `js/content.js` | `CCRNG`, `CCRules`, `CCContent`: the pure rules engine and content, unchanged from the browser build (also run by the Node tests). |
| `js/store.js` | `CCStore`: the pure save model — `docFromSave`, `fromBrowserSave` (old `{ sum, payload }` save.json), `mergeProgress` / `mergeDocs`; the old localStorage format kept for tests. |
| `js/i18n.js`, `js/strings.js`, `js/platform-strings.js` | `CCI18N` (`T`, `setLocale`), the nine-locale tables, and the account / leaderboard lines. |
| `assets/ui-style.json` | Styles converted with `npm run css` from `tools/ui-style.css` (the old CSS rewritten class-based). |
| `assets/icons.png` | The ten companion and station emoji (Noto Color Emoji) pre-rendered in 128 px cells (the engine draws no colour emoji). |
| `assets/key-art.webp`, `assets/results-art.webp`, `assets/floor-planks.webp` | Title backdrop, results illustration, floor texture. |
| `score-script.js` | StarHermit platform script (`server=`): range-checks a finished day's total and posts it to the `high-score` leaderboard. |
| `server.js` | Local dev static server for the packaged folder (`npm start`, `PORT`, default 8000); not packaged. |
| `tests/` | `rules.test.mjs`, `save.test.mjs`, `i18n.test.mjs` (node --test), `native.mjs` (tsc, `starhermit check`, the `.play` scripts, web index), `native/*.play`. |
| `tools/` | `package-web.mjs`, `css.mjs`, `gen-play.mjs` (writes `tests/native/club-day.play` from the rules), `browser-play.mjs` (the packaged loader in Chrome on the GPU), `ui-style.css`. |
| `sfx/*.opus`, `sfx/manifest.*` | 22 authored clips; `manifest.json` is read by `native/audio.ts`. |
| `cover.jpg`, `coverart.png`, `icon.png`, `LICENSE.md` | Platform cover, cover source (not packaged), icon; PolyForm Noncommercial 1.0.0. |
| `.starhermitignore` | Leaves `tests/`, `tools/`, `server.js`, `spec.md`, `coverart.png` and the sfx manifest notes out of the package. |

## 2. Vision and design pillars

Companion Club is about the small satisfaction of running a room well: everyone gets what they wanted, nothing is left messy, and the friends ended the day happier than they started. The tension is gentle and entirely visible: patience counters tick down in plain numbers, the floor is a handful of cells, and every failure names its reason.

1. **Every wish is legible.** A companion's wish, its remaining patience and the station that satisfies it are always shown as text next to the companion, never only as an icon or color. Rules in: patience as a number, station names on cells, a status line that says why an action was refused. Rules out: hidden timers, fog, wishes that change without an event.
2. **One step, one decision.** Each turn is exactly one command for one companion (move one cell, serve, or tidy), and the whole club advances after it. Rules in: patience decays for everyone at the end of every turn, so idling has a cost. Rules out: real-time pressure, simultaneous moves, action queues.
3. **Serving makes a mess.** Every serve turns its station messy and unusable until someone tidies it, so a good day is a rhythm of serve-tidy-move rather than a race to stations. Rules in: tidying scores, tidying is reachable from an adjacent cell. Rules out: stations that reset on their own.
4. **Friends are better together.** Serving with another companion adjacent pays a Together bonus, so routing two friends to neighbouring cells is worth more than sending one on an errand. Rules in: bonuses stack with patience and streak. Rules out: companions that fight for a cell (they simply block each other).
5. **Fair, replayable days.** A stage is a seed plus a ruleset; the same inputs always produce the same day, the hint uses the same legality code as play, and the score is an integer sum the results screen itemizes. Rules out: random rewards, purchases, anything that changes rules invisibly.

## 3. Player experience

**Target player:** someone who likes short, calm puzzles (solitaire, tile-routing, cozy management) and wants a complete, readable game in a browser tab, on a phone as much as on a desktop.

**First 60 seconds.** The title screen shows the clubhouse key art, a one-sentence pitch ("Guide clubhouse friends, serve their wishes, and keep every station tidy.") and a single Play button. Play starts stage Welcome Mat immediately: a 4×4 floor with a Snack Counter and an Easel, two friends (Pip the fox, Momo the cat) each with a wish and a patience count of 10–13, and the stage's own intro line in the status area: "Guide a companion with arrow keys or taps. Stand on a station and serve the matching wish." Pip is pre-selected. The first arrow press or pad tap moves Pip one cell and the status line reads `move`; the header shows Turns and Served counting; pressing Serve away from a station answers "Stand on a station to serve." with a knock. The Hint button spells out a concrete action ("Hint: move down with Pip.") and selects that companion, so a stuck player always has a next step. The mechanics of messy stations and tidying appear naturally on the second turn after the first serve (`serve · messy`), with the Tidy button right beside Serve.

**Session shape.** Serve three wishes before turn 30 without five misses, read the results breakdown, press Play again. Because the layout and wishes are seeded, replaying the same stage is a route-optimization exercise: fewer turns means a larger Day bonus, serving early means a larger Patience bonus, serving consecutively grows the Streak bonus, and keeping everyone happy pays a Mood bonus.

**Emotional beat.** The moment a wish is served with one turn of patience to spare while a friend stands beside it: the tray clink, the bells, the streak chime and a jump in the score all land on one press.

## 4. Core loop and rules contract

All rules live in `js/rules.js`; the UI in `native/main.ts` only translates buttons into commands. Every rule below cites its function.

### 4.1 Entities and state (`createGame`)

- **Board:** `cfg.board.cols × rows` cells. Each cell is open floor (`0`), furniture (`'#'`, impassable) or a station carrying an activity id. Generated layouts (`generateGrid`) shuffle all cells with the rules RNG stream, place `cfg.blocked` furniture cells and one station per entry of `cfg.activities`, and retry up to 64 times until every walkable cell is reachable (`connected`, flood fill). Fixed layouts (`buildFixedGrid`, tutorial lessons) read rows of `.`, `#`, `S P M N G R`.
- **Stations:** `{x, y, activity, messy}` for every non-floor, non-furniture cell. `cfg.fixedMessy` pre-dirties listed cells.
- **Companions:** `{id, x, y, wish, cooldown, mood}`; placed on shuffled free cells (or `cfg.fixedCompanions`), mood starts at 70 (`MOOD_START`). Each starts with a wish unless scripted otherwise.
- **Wish (`drawWish`):** `{activity, patience, maxPatience}`; activity is picked from the activities actually on the board, patience from `cfg.patience = [lo, hi]` inclusive.
- **Counters:** `tick` (turns taken), `fulfilled`, `misses`, `streak`, `streakBest`, `round`, `elapsedMs`, `score` components, `terminal` (`null` or `{reason, won}`), `events` (this turn only), `rngState` (rules stream after the last draw), `seed`, `v` (state version 1).

Activities and their stations (`content.js` `ACTIVITIES`): snack → Snack Counter, paint → Easel, music → Drum Kit, nap → Beanbag, garden → Planter, read → Bookcase. Companions (`COMPANIONS`): Pip (fox, orange), Momo (cat, cream), Bramble (hedgehog, brown), Lumi (bird, blue).

### 4.2 Commands and legality

| Command | Legal when (`checkMove` / `checkServe` / `checkTidy`) | Rejection reasons (`INVALID`) |
|---|---|---|
| `move {companion, dir}` | dir ∈ up/down/left/right; target cell in bounds, not furniture, not occupied by another companion. Stations are walkable. | `game-ended`, `unknown-companion`, `bad-direction`, `out-of-bounds`, `blocked-cell`, `occupied-cell` |
| `serve {companion}` | companion has a wish, stands on a station, station activity equals the wish, station is not messy. | `no-active-wish`, `not-on-station`, `wrong-station`, `station-messy` |
| `tidy {companion, x, y}` | (x, y) is a station within Manhattan distance 1 of the companion (standing on it counts), and it is messy. | `out-of-bounds`, `not-on-station`, `station-not-reachable`, `station-not-messy` |
| `resign` | game not over. | `game-ended` |

`legalActions(state)` enumerates every legal command for every companion; `hint` and the tests consume it. `applyCommand` never mutates its input: it deep-clones, applies, and returns `{ok, state, events}` or `{ok: false, reason}`. Malformed commands return `malformed-command` / `unknown-command`. `validateCommandShape` additionally bounds payload size (512 bytes), id length and field types for any future network boundary.

### 4.3 Resolution order (`applyCommand`)

1. Validate; on failure return the unchanged state.
2. Clone, clear `events`, `tick += 1`, store `elapsedMs = floor(cmd.atMs / 100) × 100` when the UI supplied a timestamp (quantized so replays hash identically).
3. Apply the action:
   - **move:** update position; event `move {from, to, dir}`.
   - **serve:** count adjacent companions; award points (see 4.4); `streak += 1`; companion mood `+20` (cap 100); wish cleared; `cooldown = cfg.cooldown`; station becomes messy; events `serve {points, together, patience, streak}` then `messy {cell, activity}`.
   - **tidy:** station cleaned; `+15` tidy points; event `tidy {cell, points}`.
4. End of turn for every companion, in list order: a wish loses 1 patience; at 0 it expires — mood `−15` (floor 0), `misses += 1`, `streak = 0`, a replacement wish is drawn at once, events `wish-expired` then `wish-new`. A companion without a wish and with cooldown > 0 decrements it; at 0 a new wish is drawn (`wish-new`). Because the decrement runs on the serve turn itself, `cooldown: 2` means the new wish appears at the end of the following turn.
5. Terminal checks in this order, first match wins: goal reached (`fulfilled >= cfg.goal`) → **win** (or, for `cfg.endless`, a new wave: `round += 1`, `+150` round bonus, `goal += goalStep`, `dayLength += dayBonusTurns`, event `round`); then `misses >= cfg.missLimit` → **harmony-lost**; then `tick >= cfg.dayLength` → **day-ended**; then no legal action → **no-actions** (safety net). Events `win` / `lose {reason}`.
6. Save the RNG state and recompute `score.total` (`finalizeScore`) so the HUD total is live every turn.

### 4.4 Scoring (`applyCommand`, constants at the top of `rules.js`)

| Component | Formula |
|---|---|
| Serving | 100 per serve, +10 when the server's mood is ≥ 80 at serve time (Joyful) |
| Patience bonus | 5 × patience remaining at serve time |
| Together bonus | 40 × companions orthogonally adjacent at serve time |
| Streak bonus | 10 × (current streak − 1) |
| Tidying | 15 per tidy |
| Wave bonus | 150 per wave completed (endless ruleset only) |
| Day bonus | on a win only: 10 × (dayLength − tick) |
| Mood bonus | on a win only: sum of every companion's mood (0–100 each) |

Total = sum of the eight components; all integers. **Worked example A** (unit test "serve scoring"): Pip stands on the Snack Counter with a snack wish at 30 patience, Momo adjacent, mood 70, first serve of the day: 100 + 5×30 + 40×1 + 0 + 0 = **290**. **Worked example B** (Welcome Mat played by following Hint, deterministic): win on turn 7 with Serving 310 (three serves, one Joyful), Patience 155, Streak 30 (0 + 10 + 20), Tidying 30, Day bonus 230 (10 × (30 − 7)), Mood 190 → **945**, exactly what the results table shows.

### 4.5 Terminal states, tie-breaks, RNG, assists

- Win: `goal-complete`. Losses: `harmony-lost`, `day-ended`, `no-actions`, `resigned`. The results overlay maps each to a sentence (`WHY` in `native/main.ts`).
- Tie-break order for score lists (`store.js` `sortEntries`): higher score, fewer invalid actions, lower elapsed time, then session id. No leaderboard UI uses it yet.
- RNG: mulberry32 seeded from `cfg.seed ^ 0x9e3779b9` (rules stream). Layout, companion placement and every wish come from this stream only; `rngState` is carried in the state so a serialized game resumes identically. `hashState` = FNV-1a of a key-sorted JSON of the state minus `events`.
- Hint (`hint`): (1) a legal serve, lowest patience first; (2) a companion standing on a messy station it wants → tidy it; (3) BFS the most impatient companion toward the nearest clean matching station, treating companions as walls; if none is reachable, the first legal tidy; (4) any legal action. Hints are always legal and cost nothing.
- Undo: `cfg.mechanics.undo` is data only; no undo exists in the UI.

## 5. Modes and progression

The UI exposes one mode: **Play**, which always starts `CCContent.JOURNEY[0]` (Welcome Mat, seed 101, 4×4, Snack + Paint, Pip + Momo, patience 10–13, cooldown 2, 30-turn day, goal 3, miss limit 5). Play again restarts the same stage. The header line "Clubhouse Day 1" is a fixed label.

`content.js` carries the full progression as data (versioned `CONTENT_VERSION = 1`, validated by `npm test` to generate connected boards with a legal opening): a 40-stage journey introducing one station or companion at a time with mastery stages at 10/20/30/40; six challenges (`c1`–`c6`) with tighter limits or no assists; three unranked practice presets; an endless Open Club ruleset (goal +2 and day +20 per wave); a daily ruleset derived purely from the UTC date string (`dailyConfig`, `utcDateString`); five scripted tutorial lessons; a decor catalog with a club level (`clubLevel = 1 + floor(owned / 2)`); five cosmetic themes; ten achievement keys. None of these is reachable from the UI today (see "Design intent not yet implemented").

## 6. Controls and interaction

Actions (`starhermit.txt`; players rebind keys and pads in the runtime's Options › Controls):

| Action | Keyboard | Gamepad | Pointer / touch | Effect (`native/main.ts`) |
|---|---|---|---|---|
| Select companion | — (Tab + Enter on a Friends card or the friend's cell) | D-pad focus + South on a card | click / tap a Friends card or the friend's board cell | `choose(id)`: selection ring, "Pip selected.", `select` cue |
| `friend` Next friend | F | RightShoulder / LeftShoulder | — | selects the next friend in the list (new: gamepads had no way to choose) |
| `up` `down` `left` `right` Move | arrow keys | D-pad, left stick | the ↑ ← ↓ → pad | `move(dir)` for the selected friend; `step` cue, or `invalid` with the reason |
| `serve` | S | West | Serve wish | `serve()`; `serve` / `messy`, plus `together` and `streak` when earned |
| `tidy` | T | North | Tidy | the first messy station within reach of the selected friend; "No messy station is within reach." when none |
| `hint` | H | Select | Hint | "Hint: <action> with <name>.", selects that friend, `hint` cue |
| Play / Play again | Enter on the focused button | South | click / tap | `start()` |

Game actions work only during a live day (not on the title or results). The arrows move the friend, not the UI's focus (the handler clears focus, as the old page's window keydown did). F1 (or Settings) opens the runtime's Options.

## 7. Screens and UI flow

`title → club day ⇄ results dialog → club day`. The runtime's Options (Settings button, F1) open over any screen; a hidden window stops the game clock.

- **Title:** the key art fills the window (cover, focus 60 % / 50 %, 55 % opaque, fading to the background toward the bottom; with Colour grade a vignette and warm/cool wash; with Ambient motion a 28 s drift), and a centred card (max 650 px) with the title, the pitch, the account line ("Offline — progress is stored on this device." or "Playing as <name> · progress synced / saving… / cloud sync unavailable"), **Sign in with StarHermit** (signed out) or **Invite a friend** (signed in), **Play** (focused) and **Settings**.
- **Club day, wide (> 760 px wide, > 500 px tall):** max 1280 px. Header: title + "Clubhouse Day 1", `Served n/goal · Turns t · Score s` (numbers bold), Settings (cog + label; cog only ≤ 700 px). Two columns: the Friends panel (max(250, 0.8 fr): heading, the friend cards with "Wants Snack · 11 patience", the message line, the pad and Serve / Tidy / Hint; it scrolls if taller than the window) and the Clubhouse floor panel (the board centred and fitted to the panel).
- **Phone (≤ 760 px wide):** the header stacks (stats under the title, the cog at the top end), the floor panel first (its heading hidden) taking what the Friends panel leaves, friends in two columns, cell names hidden ≤ 700 px (they stay the cells' accessible names).
- **Short landscape (≤ 500 px tall):** compact header, two columns (min 200 px side panel), 8 px paddings, smaller headings and text.
- **Results:** a modal dialog over the dimmed day (`#130d0be8`): a card (max 520 px; it scrolls when taller than the window) with the results art (≤ 28 % of the window height), "Club day complete!" / "Club day ended", the reason, the non-zero score parts and Total, the leaderboard line when signed in, and **Play again** (focused). Escape does not dismiss it.
- **Toast:** the invite-copy confirmation, bottom centre, 4 s.

Must never be cut off: the header counters, all three action buttons, the pad, the message line, Total and Play again.

## 8. Art direction

**Palette** (`tools/ui-style.css` tokens): background `#1a1210`, panel `#2b201d`, control surface `#3a2b26`, text `#f3e6d8`, muted text `#c5ad9d`, accent amber `#f6b85f`, hairline `#654c42`, Play button text `#28190d`, results backdrop `#130d0be8`, selection glow `#f6b85f55`, focus ring white. The clubhouse theme "Hearth Club" in `content.js` (wall `#3a2a24`, floor `#4a352a`, wood `#8a5a34`, light `#ffc98a`) and the companion/activity colors (Pip `#e07b39`, Momo `#f0d9a8`, Bramble `#9a7248`, Lumi `#6fa8dc`; snack `#d9534f`, paint `#8e6fc0`, music `#e8a84b`, nap `#6f8fb8`, garden `#5d9c59`, read `#b8734f`) set the key-art brief: deep chocolate walls, honey planks, one warm amber light.

**Shape language:** rounded everything (10 px buttons, 18 px panels, 24 px title card), soft toy-like companions in the illustrations, square board cells with a thin hairline. The companion and station marks are the emoji the browser build showed (🦊 🐱 🦔 🐦, 🍎 🎨 🥁 💤 🌱 📖), pre-rendered from Noto Color Emoji into `assets/icons.png`; the text label under each glyph, not the color, is the primary identifier.

**Typography:** system UI stack; h1 amber `clamp(2.2rem, 7vw, 4rem)` on the title and `clamp(1.7rem, 4vw, 2.6rem)` in play; body ~1rem, cell labels `clamp(8px, 1.1vw, 12px)`.

**Hero:** the board panel — the largest element on every layout, sitting on the plank texture with the panel color blended over it so cells stay high-contrast.

**Motion:** state changes are instant redraws. Ambient motion adds a 2.6 s idle bob on friend tokens, a 2.4 s pulse inside the selected cell, a 28 s drift on the title art and the lamp flicker; Particles add the serve / tidy / win bursts. The runtime's reduced-motion setting stills all of it (motes hold still, no bursts).

**Graphics.** The runtime's Options › Graphics choose the level; `native/quality.ts` maps its tier (`frame().quality`) to the browser build's presets, and the level within the tier (`frame().levelIndex`, about 1.64× apart) scales the particle budgets up to 4×, as the old hardware level did. Categories:
- **Shadows** (off/low/medium/high): drop shadows under the panels and cards, the board cells and the icons.
- **Glow** (off/on): warm backdrop light, glowing selection rings on cells and Friends cards, a red glow on messy stations, an additive halo behind clean station icons, glowing title, header numbers, Play and Total.
- **Colour grade** (off/on): vignette and warm/cool wash over the title art (the old saturation/sepia filter on the art is not available).
- **Particles** (off/low/high): dust motes drifting up through the light (blend `screen`) and the bursts — gold stars at the serving friend's cell, bubbles at a tidied station, full-window confetti on a win (26 / 110 × the burst factor).
- **Ambient motion** (static/animated): as under Motion; with Glow, the hearth lamp's light from the upper right flickers.
- **Surface detail** (plain/detailed): gradient panels and buttons with a press offset, the golden Play, plank-grain cells with bevels, stations tinted by their activity with a coloured top edge, striped furniture, friends as glossy discs in their colour, Friends cards with a colour edge.

| Tier → preset | Shadows | Glow | Grade | Particles | Ambient | Detail | Motes / burst at the tier's floor |
|---|---|---|---|---|---|---|---|
| low | off | off | off | off | static | plain | 0 / 0 |
| balanced | low | on | on | low (≤ 40 motes, ≤ 0.5) | static | detailed | 22 / 0.5 |
| high | medium | on | on | high | animated | detailed | 56 / 1 |
| ultra | high | on | on | high | animated | detailed | 90 / 1.5 |

The runtime owns what the old Graphics panel also did: Auto and the level, render scale and pixel-ratio cap, adaptive resolution, the frame-rate limit and readout. The old per-category overrides are not offered.

**Visual assets the design calls for:** title key art (clubhouse interior with all four friends and all six stations), a results-screen celebration illustration, a tileable plank texture for the board, a platform cover derived from the key art with the title set in type, plus the existing favicon/icon. All are shipped (section 15).

## 9. Audio direction

`native/audio.ts` plays the authored clips (`sfx/manifest.json`: one clip per logical event; the rules' `move` and `wish-expired` play `step` and `miss`) on the runtime's buses — effects (gain 0.9), the Play tick on interface — and, from the first Play, the authored 12 s clubhouse room tone as a quiet loop (0.25) and the generative pad (C, Am, F, G an octave down, a chord every 5.2 s, rendered once into clips; music bus, 0.6). Options › Audio owns the volumes, mute and voice limit. Clips load one at a time once the mixer runs (in a browser after the first press). The browser build's synthesized stand-ins (played while a clip loaded) and its noise bed under the room tone are not ported.

**SFX event table** (source of `sfx/manifest.txt`; clips are MOSS-SoundEffect v2.0, 48 kHz mono Opus 96 kbps, −20 LUFS):

| Event id | File | Sound | Usage |
|---|---|---|---|
| `ui` | `ui-tick.opus` | dry fingertip tap on a wooden button | Play pressed on the title screen |
| `select` | `select-chime.opus` | two-note wooden xylophone | companion selected |
| `deselect` | `deselect-thunk.opus` | low wooden thunk | reserved; no UI path deselects |
| `step` | `step-knock.opus` | light knock on a tabletop | every accepted move |
| `serve` | `serve-tray.opus` | cup set on a tray, soft clink | wish served |
| `together` | `together-bells.opus` | two hand bells | layered on serve with ≥ 1 adjacent friend |
| `tidy` | `tidy-swipe.opus` | cloth swish and tap | station tidied |
| `wish-new` | `wish-new-plink.opus` | delicate glass plink | new wish drawn |
| `miss` | `miss-sigh.opus` | descending slide whistle | wish expired |
| `invalid` | `invalid-knocks.opus` | two muted thumps | any rejected command |
| `round` | `round-bell.opus` | brass service bell | endless wave (no UI path today) |
| `win` | `win-fanfare.opus` | hand-bell jingle and chime cascade | goal met |
| `lose` | `lose-fade.opus` | music box winding down | day ended / harmony lost / resigned |
| `undo` | `undo-rewind.opus` | reverse paper swish | reserved; no undo in UI |
| `hint` | `hint-sparkle.opus` | two glass sparkles | hint produced |
| `purchase` | `purchase-coin.opus` | coin into a cashbox | reserved; decor hub not in UI |
| `star` | `star-twinkle.opus` | tiny silver bell | reserved; stars not in UI |
| `messy` | `messy-clatter.opus` | plate and spoon clatter | station becomes messy after a serve |
| `patience-low` | `patience-tick.opus` | two nervous clock ticks | end of a turn where a wish sits at exactly 2 patience |
| `streak` | `streak-chime.opus` | three ascending xylophone notes | layered on serve when streak ≥ 3 |
| `day-late` | `day-late-block.opus` | low temple block | the turn that leaves exactly 5 turns |
| `ambience` | `ambience-clubhouse.opus` | fireplace, clock, floorboards, 12 s loop | ambience bus from Play until the tab hides |

## 10. Localization

Nine locales: **en-US, en-GB, es-419, es-ES, de-DE, fr-FR, fr-CA, pt-BR, it-IT**. English source strings are the keys; `js/strings.js` holds the tables (es-ES and fr-CA list only their differences, e.g. fr-CA *pointage*); `js/platform-strings.js` the account and leaderboard lines. The locale is the runtime's interface language (Options › Language, else the account's preferred language, else the device's), mapped to the nearest shipped locale by `native/i18n.ts`; every string is looked up each frame, so a change shows at once without touching the day. Companion names and "Companion Club" stay untranslated. Long labels wrap (buttons fall back to a wrapped paragraph when their text is wider than the button).

## 11. Accessibility

- Every friend card, pad and action button is a UI button; board cells are widgets with the old accessible names ("Row 3, column 2: Pip at Paint, messy"); friend cells are buttons, the rest disabled. Tab / arrows / Enter and the gamepad navigate them; Play and Play again take focus when shown.
- Messages (selection, hints, refusals, turn summaries) are announced to screen readers (`ui.announce`), as the old `role="status"` line was.
- The runtime's interface size, text size, high contrast and reduced motion apply over the game's styles; cell drawing honours high contrast (no gradients) and reduced motion.
- Colour independence: every companion and station has an icon and a name; messy is a word in the label and a "!" badge.
- Targets are at least 44 px tall.

## 12. StarHermit integration

- **Save:** progress (stats, sparkle, achievements) is the engine save `{ v: 1, progress }` (`starhermit:storage` saves: device at once, the cloud slot debounced). A conflict merges both devices' progress (`mergeProgress`: the better of both); a newer save from another device is merged in when it arrives. The browser build's cloud save (the JS SDK's zipped save.json in `game:<slug>`) shows as foreign: its `{ sum, payload }` document is converted (`fromBrowserSave`), merged and saved over it once (`replaceForeign`).
- **Settings:** the game has no options of its own. The browser build's per-player settings keys (`graphics`, `graphics.gpu.*`, `audio.options`, `ui.language`) are now the runtime's Options and are removed (`settings.removeLegacy`).
- **Player:** signed out, the title shows the offline line and Sign in (`requestSignIn`); signed in, "Playing as <name> · <sync state>" and **Invite a friend** (copies `inviteLink()` with the clipboard capability; a toast confirms or shows the link).
- **Leaderboard:** signed in, every finished day (won or lost) posts its total through `score-script.js` (a practice session whose game socket carries `{ type: 'result', scores: { 'high-score': total } }`; integer 0–20,000, higher is better) and the results card shows "Leaderboard rank: #N", "Score posted…" or "Score not posted…". Guests post nothing and see no line.
- **Controls:** the manifest's actions; the runtime keeps the player's bindings with their account.

## 13. Technical architecture

- `native/classic.ts` loads `js/rng.js`, `rules.js`, `content.js`, `store.js`, `strings.js`, `i18n.js`, `platform-strings.js` with `loadClassic`, so the shipped rules are the code the Node tests run. `native/main.ts` keeps the UI state (`state`, `selected`, `message`, the leaderboard line); `native/screens.ts` rebuilds the UI from it each frame.
- **Time:** a clock advanced by the runtime's fixed steps (60 a second) gives each command its `atMs` (quantized by the rules) and the day's play time, so play scripts replay exactly and a hidden window never counts.
- **Determinism:** unchanged rules — same seed and commands ⇒ same `hashState`.
- **Package:** about 1.1 MB (52 files), mostly the Opus clips and art.

## 14. Testing and acceptance criteria

`npm test` runs:
- `tests/rules.test.mjs` — rules, content, RNG and the old store format (unchanged);
- `tests/save.test.mjs` — browser save → engine save, corrupt / newer saves ignored, defaults, the conflict merge;
- `tests/i18n.test.mjs` — every key the native client and content show exists in all nine locales with intact placeholders, no unused keys, the account lines in every locale, live locale switching;
- `tests/native.mjs` — the web index matches the files, `tsc` (no `skipLibCheck`), `starhermit check .` with no warnings, and each `tests/native/*.play` as a signed-out `--render-check`: `club-day.play` (generated by `npm run plays` from the rules: the first day won by the hint in 7 turns, 945 points, then Play again) and `screens.play` (Settings opens Options, friends chosen by card, cell and F, the pad, Serve / Tidy / Hint refusals).

`npm run test:browser` (`tools/browser-play.mjs`) serves the packaged folder on loopback and plays it in Chrome on the machine's GPU (headless SwiftShader with `GPU_ADAPTER=software`) at 1366×768, a 390×844 phone (twice: the full day, and pad taps), and 844×390 landscape, failing on console errors or warnings or the runtime's error screen.

## 15. Asset inventory

| Path | Purpose | Source | Status |
|---|---|---|---|
| `assets/key-art.webp` (1280×720, 34 KB) | title backdrop | FLUX.2 klein, seed 6501, 1536×864, 28 steps; ffmpeg webp q82 | generated in this pass, wired (`title()` + `.cc-title-art`) |
| `assets/results-art.webp` (960×540, 41 KB) | results card illustration | FLUX.2 klein, seed 6502, 1024×576, 28 steps | generated in this pass, wired (`resultHtml()` + `.cc-result-art`) |
| `assets/floor-planks.webp` (512×512, 9 KB) | board panel texture | FLUX.2 klein, seed 6503, 768×768, 28 steps | generated in this pass, wired (`.cc-board-wrap` background) |
| `coverart.png` (1200×675, 253 KB) | platform cover | key art + ffmpeg drawtext title/tagline, 256-colour PNG | replaced in this pass (previous file was a generic geometric template) |
| `icon.png` (256×256) | platform icon | hand-authored SVG | shipped |
| `assets/icons.png` (1280×128) | companion and station marks | Noto Color Emoji (SIL OFL 1.1) rendered in Chrome, 104 px in 128 px cells | wired (`native/board.ts`) |
| `sfx/ui-tick … star-twinkle.opus` (17 clips) | event cues, see §9 | MOSS-SoundEffect v2.0, 100 steps | shipped |
| `sfx/messy-clatter.opus`, `patience-tick.opus`, `streak-chime.opus`, `day-late-block.opus`, `ambience-clubhouse.opus` | new cues and room-tone loop | MOSS-SoundEffect v2.0, 100 steps, generated from `sfx/manifest.json` | generated in this pass, wired in `native/audio.ts` / `native/main.ts` |
| `sfx/manifest.txt` | canonical file → event → description → usage | authored | generated in this pass |
| `sfx/manifest.json`, `sfx/manifest.md` | generator input (22 entries, read by `native/audio.ts`) and generator log | tool | shipped, updated |

## 16. Known limitations

- Only Welcome Mat is playable; the rest of the journey, challenges, practice, daily, endless, tutorial, decor hub and themes are data without UI. Achievements are recorded in the save only (no platform achievements).
- Tutorial lesson `t5` in `content.js` places Pip on the Easel while giving him a snack wish, so its scripted serve is impossible; it is not reachable from the UI.
- No undo; floor and station cells are disabled, so moving is by direction only.
- "Clubhouse Day 1" is static and the results have no par, star or best-score comparison.
- `patience-low` repeats on consecutive turns if different wishes pass through 2 patience.
- The old Colour grade's saturation / contrast / sepia filter on the art, and the panels' SVG noise texture, have no engine equivalent and are left out.
- On the web runtime's GPU path, the phone-sized results screen has been seen drawing black in Chrome on an AMD iGPU (Mesa D3D12) at device pixel ratio 2, while software rendering draws it correctly; reported as an engine issue.

## Design intent not yet implemented

- Mode select exposing journey progression (stars, par turns), challenges, practice presets, daily seed, endless Open Club and the five tutorial lessons.
- Fix lesson `t5` (move Pip to the Snack Counter cell or give him a paint wish).
- Tap-to-move on floor cells with path preview, and undo where `cfg.mechanics.undo` allows.
- Captions on the message line, a high-contrast companion palette (`colorHC` values exist in `content.js`).
- Platform achievements for the ten declared keys, a daily leaderboard with the existing tie-break.
