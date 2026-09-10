# Companion Club — Game Design Document (running spec)

**Status:** shipped; this document describes the game as it runs today (present tense). Design intent that the code does not yet do is collected in the final section only.
**Pitch:** A cozy one-more-turn puzzle: guide four clubhouse friends across a small floor, serve each one's wish at the matching station before its patience runs out, and keep the stations tidy so the club's harmony holds until the day's goal is met.
**Genre:** turn-based routing / errand puzzle with a caretaking fantasy.
**Players:** 1, local, offline after load.
**Session length:** one club day of Welcome Mat lasts 7–30 turns, about one to three minutes.
**Platforms:** desktop and mobile browsers (Chrome-class), portrait and landscape, no install.
**Rendering:** semantic HTML/CSS. The clubhouse floor is a CSS grid of `<button>` cells; there is no canvas or WebGL in the shipped page.

## 1. File map

| Path | Role |
|---|---|
| `index.html` | Entry point named in `starhermit.txt`. Loads the six classic scripts below with `defer`, in dependency order. |
| `css/style.css` | All layout, palette tokens, responsive rules (one breakpoint at 700 px). |
| `js/rng.js` | `CCRNG`: mulberry32 PRNG, FNV-1a string hash, three derived streams (rules / decor / av). |
| `js/rules.js` | `CCRules`: pure deterministic rules engine (board generation, legality, resolution, scoring, terminal states, hint, serialization, command validation). |
| `js/content.js` | `CCContent`: companions, activities, themes, decor catalog, 40 journey stages, 6 challenges, 3 practice presets, endless ruleset, daily generator, 5 tutorial lessons, 10 achievements. Data only. |
| `js/store.js` | `CCStore`: versioned, checksummed local save document and local leaderboard sort. Loaded by `index.html` but not called by `main.js` today. |
| `js/audio.js` | `CCAudio`: WebAudio buses, synthesized cues, authored Opus clips mapped from `sfx/manifest.json`, ambience loop, generative pad. |
| `js/main.js` | The application: title screen, one playable stage, board/HUD rendering, input, results overlay. |
| `js/render3d.js` | Three.js presentation module (procedural clubhouse, companions, stations, particles). Not referenced by `index.html`; not loaded. |
| `vendor/three.module.min.js` | Three.js (2023 build) for `render3d.js`; not loaded by the page. |
| `server.js` | Static file server for the distribution (`PORT` env, default 8000). Refuses `tests/`, `tools/`, `node_modules/` and dotfiles. |
| `tests/rules.test.mjs` | `npm test`: node:test unit tests for rules, content, RNG and store. |
| `tests/e2e.mjs` | `npm run test:e2e`: Playwright playthrough of the real UI on desktop and mobile viewports. |
| `sfx/*.opus`, `sfx/manifest.txt`, `sfx/manifest.json`, `sfx/manifest.md` | 22 authored clips; canonical manifest; generator manifest read by `audio.js`; generator output log. |
| `assets/key-art.webp`, `assets/results-art.webp`, `assets/floor-planks.webp` | Title backdrop, results illustration, board floor texture. |
| `coverart.png`, `icon.png`, `favicon.svg` | Platform cover (1200×675), 256 px icon, tab icon (three amber circles on `#1a1210`). |
| `starhermit.txt`, `LICENSE.md`, `package.json` | Platform manifest; PolyForm Noncommercial 1.0.0; scripts and the single dev dependency (`playwright-core`). |

## 2. Vision and design pillars

Companion Club is about the small satisfaction of running a room well: everyone gets what they wanted, nothing is left messy, and the friends ended the day happier than they started. The tension is gentle and entirely visible: patience counters tick down in plain numbers, the floor is a handful of cells, and every failure names its reason.

1. **Every wish is legible.** A companion's wish, its remaining patience and the station that satisfies it are always shown as text next to the companion, never only as an icon or color. Rules in: patience as a number, station names on cells, a status line that says why an action was refused. Rules out: hidden timers, fog, wishes that change without an event.
2. **One step, one decision.** Each turn is exactly one command for one companion (move one cell, serve, or tidy), and the whole club advances after it. Rules in: patience decays for everyone at the end of every turn, so idling has a cost. Rules out: real-time pressure, simultaneous moves, action queues.
3. **Serving makes a mess.** Every serve turns its station messy and unusable until someone tidies it, so a good day is a rhythm of serve-tidy-move rather than a race to stations. Rules in: tidying scores, tidying is reachable from an adjacent cell. Rules out: stations that reset on their own.
4. **Friends are better together.** Serving with another companion adjacent pays a Together bonus, so routing two friends to neighbouring cells is worth more than sending one on an errand. Rules in: bonuses stack with patience and streak. Rules out: companions that fight for a cell (they simply block each other).
5. **Fair, replayable days.** A stage is a seed plus a ruleset; the same inputs always produce the same day, the hint uses the same legality code as play, and the score is an integer sum the results screen itemizes. Rules out: random rewards, purchases, anything that changes rules invisibly.

## 3. Player experience

**Target player:** someone who likes short, calm puzzles (solitaire, tile-routing, cozy management) and wants a complete, readable game in a browser tab, on a phone as much as on a desktop.

**First 60 seconds.** The title screen shows the clubhouse key art, a one-sentence pitch ("Guide clubhouse friends, serve their wishes, and keep every station tidy.") and a single Play button. Play starts stage Welcome Mat immediately: a 4×4 floor with a Snack Counter and an Easel, two friends (Pip the fox, Momo the cat) each with a wish and a patience count of 10–13, and the stage's own intro line in the status area: "Guide a companion with arrow keys or taps. Stand on a station and serve the matching wish." Pip is pre-selected. The first arrow press or pad tap moves Pip one cell and the status line reads `move`; the header shows Turns and Served counting; pressing Serve away from a station answers `not on station` with a knock. The Hint button spells out a concrete action ("Hint: move down with Pip.") and selects that companion, so a stuck player always has a next step. The mechanics of messy stations and tidying appear naturally on the second turn after the first serve (`serve · messy`), with the Tidy button right beside Serve.

**Session shape.** Serve three wishes before turn 30 without five misses, read the results breakdown, press Play again. Because the layout and wishes are seeded, replaying the same stage is a route-optimization exercise: fewer turns means a larger Day bonus, serving early means a larger Patience bonus, serving consecutively grows the Streak bonus, and keeping everyone happy pays a Mood bonus.

**Emotional beat.** The moment a wish is served with one turn of patience to spare while a friend stands beside it: the tray clink, the bells, the streak chime and a jump in the score all land on one press.

## 4. Core loop and rules contract

All rules live in `js/rules.js`; the UI in `js/main.js` only translates buttons into commands. Every rule below cites its function.

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

`legalActions(state)` enumerates every legal command for every companion; `hint` and the e2e test consume it. `applyCommand` never mutates its input: it deep-clones, applies, and returns `{ok, state, events}` or `{ok: false, reason}`. Malformed commands return `malformed-command` / `unknown-command`. `validateCommandShape` additionally bounds payload size (512 bytes), id length and field types for any future network boundary.

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

- Win: `goal-complete`. Losses: `harmony-lost`, `day-ended`, `no-actions`, `resigned`. The results overlay maps each to a sentence (`resultHtml` in `main.js`).
- Tie-break order for score lists (`store.js` `sortEntries`): higher score, fewer invalid actions, lower elapsed time, then session id. No leaderboard UI uses it yet.
- RNG: mulberry32 seeded from `cfg.seed ^ 0x9e3779b9` (rules stream). Layout, companion placement and every wish come from this stream only; `rngState` is carried in the state so a serialized game resumes identically. `hashState` = FNV-1a of a key-sorted JSON of the state minus `events`.
- Hint (`hint`): (1) a legal serve, lowest patience first; (2) a companion standing on a messy station it wants → tidy it; (3) BFS the most impatient companion toward the nearest clean matching station, treating companions as walls; if none is reachable, the first legal tidy; (4) any legal action. Hints are always legal and cost nothing.
- Undo: `cfg.mechanics.undo` is data only; no undo exists in the UI.

## 5. Modes and progression

The UI exposes one mode: **Play**, which always starts `CCContent.JOURNEY[0]` (Welcome Mat, seed 101, 4×4, Snack + Paint, Pip + Momo, patience 10–13, cooldown 2, 30-turn day, goal 3, miss limit 5). Play again restarts the same stage. The header line "Clubhouse Day 1" is a fixed label.

`content.js` carries the full progression as data (versioned `CONTENT_VERSION = 1`, validated by `npm test` to generate connected boards with a legal opening): a 40-stage journey introducing one station or companion at a time with mastery stages at 10/20/30/40; six challenges (`c1`–`c6`) with tighter limits or no assists; three unranked practice presets; an endless Open Club ruleset (goal +2 and day +20 per wave); a daily ruleset derived purely from the UTC date string (`dailyConfig`, `utcDateString`); five scripted tutorial lessons; a decor catalog with a club level (`clubLevel = 1 + floor(owned / 2)`); five cosmetic themes; ten achievement keys. None of these is reachable from the UI today (see "Design intent not yet implemented").

## 6. Controls and interaction

| Input | Desktop | Mobile | Effect (`main.js`) |
|---|---|---|---|
| Select companion | click a Friends card or the companion's board cell; Tab + Enter/Space | tap the same | `choose(id)`: selection ring, status "Pip selected.", `select` cue |
| Move | Arrow keys, or click ↑ ← ↓ → pad | tap the pad | `move(dir)` for the selected companion; `step` cue, or `invalid` with the reason |
| Serve | S key or Serve wish button | tap Serve wish | `serve()`; `serve`/`messy` cues, `together` and `streak` layers when earned |
| Tidy | T key or Tidy button | tap Tidy | `tidy()`: first messy station within reach of the selected companion; status "No messy station is within reach." when none |
| Hint | H key or Hint button | tap Hint | `hint()`: status "Hint: <action> with <name>.", selects that companion, `hint` cue |
| Results | Enter/Space on the focused Play again | tap Play again | `start()` restarts the stage |

Input rules: keyboard shortcuts are ignored on the title screen and once the game is terminal (`keydown` handler checks `state.terminal`); arrow keys call `preventDefault` so the page never scrolls during play. There is no drag, no multi-touch, no long-press. Every command re-renders synchronously, so the acknowledgment is the next frame: the header numbers, the status line (`role="status"`), the selection ring, and a sound. Buttons are ≥ 44 px tall (`button{min-height:44px}`) and the e2e test asserts it for Serve/Tidy/Hint on the mobile viewport. Empty floor and station cells are rendered as disabled buttons (informational only; movement is by direction, not by tapping a target cell).

## 7. Screens and UI flow

State machine as implemented: `title → play ⇄ (results overlay) → play`. There is no pause, settings or help screen; hiding the tab suspends the audio context and restoring it resumes (`visibilitychange`).

- **Title (`title()`):** full-viewport grid, key art as an absolutely positioned `<img>` at 55 % opacity fading out toward the bottom, a centered card (max 650 px, `#2b201de6`) with the h1, pitch and Play. If the art fails to load the `<img>` removes itself and the flat `--bg` shows.
- **Play (`render()`):** max-width 1280 px. Header: title + "Clubhouse Day 1" left, `Served n/goal · Turns t · Score s` right. Two-column grid: left aside (`minmax(250px, .8fr)`) with Friends cards (name, "Wants Snack · 11 patience" or "Wants rest · — patience" during cooldown), status line, direction pad, Serve/Tidy/Hint; right panel (`minmax(0, 1.8fr)`) titled "Clubhouse floor" with the board grid over the plank texture. Cells are square (`aspect-ratio: 1`), show an emoji (companion, station, `▦` furniture, `·` floor) plus a small text label.
- **Results (`resultHtml()`):** fixed full-screen backdrop `#130d0be8`, centered card (max 520 px, scrolls inside if taller than the viewport) with the results illustration, headline ("Club day complete!" or "Club day ended"), reason sentence, a table of non-zero score components and Total, and Play again (auto-focused). Marked `role="dialog" aria-modal="true"`.
- **≤ 700 px (portrait phones):** header stacks; layout becomes one column with the board first and the control aside second; cell text labels are visually hidden (still in `aria-label`); the results art is capped at 28 dvh so the table and button fit a 390×844 screen. Landscape phones keep the two-column layout; the board panel shrinks with `minmax(0, …)` so nothing overflows. `viewport-fit=cover` is set; the page has no fixed bottom bar, so no control sits under browser chrome.

Must never be cut off: the header counters, all three action buttons, the direction pad, the status line, the Total row and Play again.

## 8. Art direction

**Palette** (`css/style.css` tokens): background `#1a1210`, panel `#2b201d`, control surface `#3a2b26`, text `#f3e6d8`, muted text `#c5ad9d`, accent amber `#f6b85f`, hairline `#654c42`, Play button text `#28190d`, results backdrop `#130d0be8`, selection glow `#f6b85f55`, focus ring white. The clubhouse theme "Hearth Club" in `content.js` (wall `#3a2a24`, floor `#4a352a`, wood `#8a5a34`, light `#ffc98a`) and the companion/activity colors (Pip `#e07b39`, Momo `#f0d9a8`, Bramble `#9a7248`, Lumi `#6fa8dc`; snack `#d9534f`, paint `#8e6fc0`, music `#e8a84b`, nap `#6f8fb8`, garden `#5d9c59`, read `#b8734f`) set the key-art brief: deep chocolate walls, honey planks, one warm amber light.

**Shape language:** rounded everything (10 px buttons, 18 px panels, 24 px title card), soft toy-like companions in the illustrations, square board cells with a thin hairline. Emoji glyphs are the in-game companion and station marks; the text label under each glyph, not the color, is the primary identifier.

**Typography:** system UI stack; h1 amber `clamp(2.2rem, 7vw, 4rem)` on the title and `clamp(1.7rem, 4vw, 2.6rem)` in play; body ~1rem, cell labels `clamp(8px, 1.1vw, 12px)`.

**Hero:** the board panel — the largest element on every layout, sitting on the plank texture with the panel color blended over it so cells stay high-contrast.

**Motion:** none is authored; state changes are instant re-renders, which also means reduced-motion preferences change nothing. Illustrations are static.

**Visual assets the design calls for:** title key art (clubhouse interior with all four friends and all six stations), a results-screen celebration illustration, a tileable plank texture for the board, a platform cover derived from the key art with the title set in type, plus the existing favicon/icon. All are shipped (section 15).

## 9. Audio direction

`js/audio.js` builds one master gain and four buses — music 0.6, effects 0.9, ambience 0.5, voice 0.8 (voice is unused) — on the first Play press (the user gesture that unlocks WebAudio). Every logical event has a synthesized cue (sine/triangle blips, filtered-noise knocks) so the game is never silent, and an authored clip that takes over once fetched and decoded. `sfx/manifest.json` is fetched after unlock; each clip loads lazily on its first trigger; a failed clip falls back to synthesis permanently. Ambience is a brown-noise room tone (low-pass 300 Hz) replaced by the authored 12 s clubhouse loop when it decodes. Music is a generative pad walking C – Am – F – G every 5.2 s under a 720 Hz low-pass. Mix philosophy: soft wooden transients, nothing above a bell; the win and lose cues are the only sounds longer than two seconds. Rules events are routed by name; `move` maps to `step` and `wish-expired` to `miss` (`EVENT_ALIAS`). Captions are implemented (`setCaptions`) but no UI enables them.

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

Shipped language: English only (`<html lang="en">`), spelled as US English. Strings live in three places: UI copy and result sentences in `js/main.js`, companion/station/stage names and intro lines in `js/content.js`, caption words in `js/audio.js`. There is no language selection, no string table and no expansion allowance beyond the layouts' flexible widths (Friends cards wrap; buttons use `flex:1` with wrapping). The nine required locales (en-US, en-GB, es-419, es-ES, de-DE, fr-FR, fr-CA, pt-BR, it-IT) are design intent, not shipped.

## 11. Accessibility

- **Keyboard-only path:** Tab reaches Play; in play, every companion card, pad button and action button is a real `<button>`; arrows/S/T/H work without focusing anything. After each re-render the previously focused control is re-focused by id, `data-friend` or `data-dir` (`render()`), so focus never drops to `<body>`. The results dialog auto-focuses Play again.
- **Focus visibility:** 3 px white outline with 2 px offset on `:focus-visible`; selection is a separate amber ring.
- **Screen readers:** each cell has `aria-label="Row r, column c: <Pip | Snack, messy | Wall | Open floor>"`; glyphs are `aria-hidden`; the status line is `role="status"` so rejections, hints and turn summaries are announced; results are a labelled modal dialog.
- **Contrast:** text `#f3e6d8` on `#1a1210` is 15.0:1; muted `#c5ad9d` on `#2b201d` 7.4:1 and on `#3a2b26` 6.3:1; amber on panel 9.0:1. Furniture cells are dimmed to 42 % but also labelled "Wall".
- **Color independence:** every companion and station has a glyph and a text name; messy state is a word in the label.
- **Reduced motion:** nothing animates, so `prefers-reduced-motion` needs no special handling.
- **Targets:** all buttons ≥ 44 px tall; the pad and action rows have 6–7 px gaps.
- **Captions for audio:** every cue has a caption string in `audio.js`; the toggle is not exposed (intent).

## 12. StarHermit integration

`starhermit.txt` declares `name=Companion Club`, `launch=index.html`, `owner=<id>`, `server=server.js`, `cover=coverart.png`, following the wiki's manifest conventions (https://wiki.starhermit.com/). `server.js` is a plain static file server for the distribution; it implements no game script endpoints. The game makes **no** platform API calls: no identity or profile read, no presence heartbeat, no leaderboards, no achievements, no sessions, no cloud save, no server time. It runs fully offline after load and stores nothing (the `CCStore` save document is loaded but never written by the UI). Achievement keys (`first-serve`, `first-win`, `streak-5`, `serves-100`, `journey-half`, `journey-done`, `daily-7`, `decor-6`, `club-5`, `sparkle-5000`), the daily seed scheme and the leaderboard tie-break exist as data and code ready for a future adapter.

## 13. Technical architecture

- **Module boundaries:** `rng` → `rules` → (`content`, `store`) → `audio` → `main`, each a UMD/IIFE global (`CCRNG`, `CCRules`, `CCContent`, `CCStore`, `CCAudio`). `rules.js` and `content.js` also load under Node (`module.exports`), which is how the unit tests and the e2e mirror use them. `main.js` holds four variables of UI state (`state`, `selected`, `startedAt`, `message`) and rebuilds `#cc-root` with `innerHTML` on every change; no virtual DOM, no framework.
- **Determinism and replay:** the state is a plain JSON object; `serialize`/`deserialize` round-trip it (version-checked). Same seed + same command list ⇒ same `hashState` (unit-tested). `elapsedMs` is quantized to 100 ms so timing never perturbs hashes. Cosmetic randomness in `audio.js` (`variant`, ±6 % pitch) uses `Math.random` unless `setAvRng` is given a seeded stream (not called by `main.js`).
- **Persistence:** none in the shipped UI. `store.js` defines `companionclub.save.v1` (FNV checksum, migration guard for future versions, memory fallback when `localStorage` throws).
- **Performance:** the page is 73 KB of unminified JS (six scripts), one 34 KB title image, a 41 KB results image, a 9 KB texture and 22 Opus clips (476 KB total, fetched lazily on first use). A re-render is a single `innerHTML` assignment of at most 49 cells plus listeners; there is no per-frame work except the audio pad timer.
- **Server:** `server.js` serves the root with a MIME table (html, js, css, json, svg, png, webp, ico, opus, txt/md), 403s any path outside the root or under `tests/`, `tools/`, `node_modules/` or a dot-segment, and 404s the rest.
- **How the e2e drives the real UI:** `tests/e2e.mjs` starts its own static server (ephemeral port, or `PORT`), launches headless Chrome via `playwright-core`, and for each viewport clicks the visible Play, Friends cards, pad/keys, Serve/Tidy/Hint and Play again. To choose which button to press it keeps a mirror `CCRules.createGame(JOURNEY[0])` in the page and asks `CCRules.hint` — the mirror never touches game state, and after each press the header text is compared with the mirror's `fulfilled`/`tick`, so any divergence between UI and rules fails the run.

## 14. Testing and acceptance criteria

`npm test` (`tests/rules.test.mjs`, node:test, no dependencies) verifies: RNG determinism and stream independence; every authored config (40 journey, 6 challenges, 3 practice, endless, 5 lessons, two daily dates) builds a connected board with a legal opening; identical hashes for identical seed + commands; the serve formula (worked example A), messy/cooldown/mood side effects; tidy scoring and every specific rejection reason; patience decay, expiry, mood and streak reset, harmony loss; win with day and mood bonuses, day-ended, resign and the post-terminal rejection; endless wave advance; hint legality across a 40-turn run and serve preference; daily config purity; serialization and command-shape validation; store checksum/migration/tie-break order.

`npm run test:e2e` (`tests/e2e.mjs`) verifies on desktop 1280×800 and mobile 390×844 (touch): title renders with Play; Play shows a 4×4 board, 2 friends and `Served 0/3`; H / Hint yields "Hint: …"; Serve off-station shows "not on station"; a full day is played through visible controls with the header in sync every turn until a terminal state; the results overlay appears; Play again resets to `Served 0/3 · Turns 0`; Serve/Tidy/Hint are ≥ 44 px on mobile; zero page errors and zero console errors (browser GPU/autoplay noise excluded). Screenshots are written to `/tmp/companion-club-e2e-<stage>-<viewport>.png`.

Product QA bar as checkable statements: (1) the first stage's intro line and the Hint button teach the controls without a separate tutorial; (2) every implemented feature — select, move, serve, tidy, hint, results, replay — is reachable with a mouse, keyboard or touch; (3) no console errors or warnings during a full day on either viewport; (4) header, status, pad, actions, board and results table are fully visible at 1280×800, 390×844 portrait and 844×390 landscape; (5) `node --check` passes on every JS/MJS file.

## 15. Asset inventory

| Path | Purpose | Source | Status |
|---|---|---|---|
| `assets/key-art.webp` (1280×720, 34 KB) | title backdrop | FLUX.2 klein, seed 6501, 1536×864, 28 steps; ffmpeg webp q82 | generated in this pass, wired (`title()` + `.cc-title-art`) |
| `assets/results-art.webp` (960×540, 41 KB) | results card illustration | FLUX.2 klein, seed 6502, 1024×576, 28 steps | generated in this pass, wired (`resultHtml()` + `.cc-result-art`) |
| `assets/floor-planks.webp` (512×512, 9 KB) | board panel texture | FLUX.2 klein, seed 6503, 768×768, 28 steps | generated in this pass, wired (`.cc-board-wrap` background) |
| `coverart.png` (1200×675, 253 KB) | platform cover | key art + ffmpeg drawtext title/tagline, 256-colour PNG | replaced in this pass (previous file was a generic geometric template) |
| `icon.png` (256×256), `favicon.svg` | platform icon, tab icon | hand-authored SVG | shipped |
| `sfx/ui-tick … star-twinkle.opus` (17 clips) | event cues, see §9 | MOSS-SoundEffect v2.0, 100 steps | shipped |
| `sfx/messy-clatter.opus`, `patience-tick.opus`, `streak-chime.opus`, `day-late-block.opus`, `ambience-clubhouse.opus` | new cues and room-tone loop | MOSS-SoundEffect v2.0, 100 steps, generated from `sfx/manifest.json` | generated in this pass, wired in `audio.js` / `main.js` |
| `sfx/manifest.txt` | canonical file → event → description → usage | authored | generated in this pass |
| `sfx/manifest.json`, `sfx/manifest.md` | generator input (22 entries, read by `audio.js`) and generator log | tool | shipped, updated |
| `js/render3d.js` + `vendor/three.module.min.js` | Three.js presentation | code | shipped, not wired |
| 3D model / character animation | — | TRELLIS / Kimodo | not needed: no three.js renderer is loaded and no humanoid exists |

## 16. Known limitations

- Only Welcome Mat is playable; the rest of the journey, challenges, practice, daily, endless, tutorial, decor hub, themes, achievements and the save document are data/code without UI.
- Tutorial lesson `t5` in `content.js` places Pip on the Easel (`SP.` row, x = 1) while giving him a snack wish, so its scripted serve is impossible; the lesson is not reachable from the UI.
- No pause, settings, volume, mute, captions toggle or undo in the UI; audio starts at fixed bus levels on Play.
- Floor and station cells are disabled buttons; moving is by direction only, so a player cannot tap a destination cell.
- The header label "Clubhouse Day 1" is static and the results screen has no par, star or best-score comparison.
- English only; no locale switch.
- The `patience-low` cue repeats on consecutive turns if different wishes pass through 2 patience; `day-late` fires once per day.
- `tests/e2e.mjs` covers the winning path only (Hint-guided play always wins Welcome Mat); loss overlays are covered by unit tests, not the browser test.

## Design intent not yet implemented

- Mode select exposing journey progression (stars, par turns), challenges, practice presets, daily seed, endless Open Club and the five tutorial lessons; persistence of progress through `CCStore`.
- Fix lesson `t5` (move Pip to the Snack Counter cell or give him a paint wish).
- Tap-to-move on floor cells with path preview, and undo where `cfg.mechanics.undo` allows.
- Settings sheet: per-bus volume, mute, captions on the status line, high-contrast palette (`colorHC` values exist in `content.js`), large text.
- Localization string table for the nine required locales with runtime selection from `navigator.languages`.
- StarHermit adapter: identity/presence, daily leaderboard with the existing tie-break, achievement unlocks for the ten declared keys, cloud save of the checksummed document.
- Optional Three.js presentation via `js/render3d.js` behind a capability check, with the DOM board kept as the always-available mirror.
