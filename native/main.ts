// Companion Club on the StarHermit engine: the entry module (starhermit.txt
// engine.entry), played natively by the StarHermit client and in browsers
// by the engine's web runtime. The rules, content and save model are the
// browser build's js/*.js, unchanged in what they decide; this module is
// what js/main.js did around them — the title and Play, the club day
// (choosing a friend, moving them, serving a wish, tidying a station, the
// hint), rule refusals and events as the message line and sounds, the
// sparkle bursts, the results card with the score breakdown, recording the
// day into the progress and unlocking achievements, and posting the day's
// total to the high-score board. The screens are drawn by screens.ts
// (starhermit:ui), the clubhouse floor by board.ts, the effects layer by
// fx.ts.
//
// Time is the runtime's fixed steps (60 a second): the elapsed time the
// rules record with each command and the play time in the stats count them,
// so a hidden window and slow frames never count and play scripts replay
// exactly.
import "./classic.ts";
import { clipboard, frame, onFixedUpdate, onQuit, onRender, onResume, onStart, onSuspend, onUpdate, setFixedRate } from "starhermit:engine";
import { onAction } from "starhermit:input";
import * as ui from "starhermit:ui";
import { requestSignIn } from "starhermit:platform";
import { Content as C, Rules as R, type Command, type Dir, type GameEvent, type State } from "./classic.ts";
import * as audio from "./audio.ts";
import * as board from "./board.ts";
import * as fx from "./fx.ts";
import { tr, N, pt } from "./i18n.ts";
import * as platform from "./platform.ts";
import { lookFor, type Look } from "./quality.ts";
import { drawScreens } from "./screens.ts";
import { initStyles, applyLook as styleLook } from "./style.ts";

export type ScreenName = "title" | "game";
export const app = {
  screen: "title" as ScreenName,
  /** Frame the screen opened on (the press that opened it must not also act on it). */
  openedFrame: 0,
  /** Widget to focus once the screen is built. */
  focusNext: null as string | null,
  toast: null as { text: () => string; until: number } | null,
  look: lookFor("balanced", 2) as Look,
};
export let state: State | null = null;
export let selected: string | null = null;
/** The message line, re-read in the current language each frame. */
export let message: () => string = () => "";
/** The results card's leaderboard line (null: hidden), re-read in the current language. */
export let lbLine: (() => string) | null = null;
let roundStreak = 0;
let roundRecorded = false;
let simMs = 0;
let startedAt = 0;

// ------------------------------------------------------------------ helpers
export function announce(text: string): void { if (text) ui.announce(text.slice(0, 500), { politeness: "polite" }); }
export function toast(text: () => string): void {
  app.toast = { text, until: frame().time + 4 };
  announce(text());
}
export function companion(id: string | null): State["companions"][number] | undefined {
  return state?.companions.find((c) => c.id === id);
}
export function companionName(id: string): string { return C.COMPANIONS[id]?.label ?? id; }
export function activityName(id: string | null | undefined): string {
  return id && C.ACTIVITIES[id] ? tr(C.ACTIVITIES[id]!.label) : id || tr("rest");
}
function setMessage(fn: () => string): void {
  message = fn;
  announce(fn());
}
function showScreen(name: ScreenName, focus: string | null): void {
  app.screen = name;
  app.openedFrame = frame().frame;
  app.focusNext = focus;
  ui.setFocus(null);
}

// Rule refusals and event types in the player's language.
const REASONS: Record<string, string> = {
  "game-ended": N("The club day is over."), "unknown-command": N("Unknown action."), "malformed-command": N("That action was not understood."),
  "unknown-companion": N("That friend is not in the club."), "bad-direction": N("That is not a direction."),
  "out-of-bounds": N("That would leave the clubhouse."), "blocked-cell": N("Furniture blocks the way."),
  "occupied-cell": N("Another friend is standing there."), "no-active-wish": N("This friend has no wish right now."),
  "wrong-station": N("This station does not match the wish."), "station-messy": N("Tidy this station first."),
  "not-on-station": N("Stand on a station to serve."), "station-not-messy": N("That station is already tidy."),
  "station-not-reachable": N("That station is out of reach."),
};
const EVENTS: Record<string, string> = {
  move: N("move"), serve: N("serve"), tidy: N("tidy"), messy: N("messy"), round: N("round"),
  win: N("win"), lose: N("lose"), "wish-expired": N("wish expired"), "wish-new": N("wish new"),
};
export const WHY: Record<string, string> = {
  "goal-complete": N("Every wish on the club list was fulfilled in time."),
  "harmony-lost": N("Too many wishes expired and the club’s harmony broke."),
  "day-ended": N("The day ended before the club goal was met."),
  "no-actions": N("No legal actions remained."),
  "resigned": N("The club day was given up early."),
};
export const SCORE_PARTS: [string, keyof State["score"]][] = [
  [N("Serving"), "serve"], [N("Patience bonus"), "patienceBonus"], [N("Together bonus"), "togetherBonus"],
  [N("Streak bonus"), "streakBonus"], [N("Tidying"), "tidy"], [N("Wave bonus"), "roundBonus"],
  [N("Day bonus"), "dayBonus"], [N("Mood bonus"), "moodBonus"],
];

// ------------------------------------------------------------------ the title and Play
export function titleScreen(): void {
  state = null;
  showScreen("title", "btn-play");
  announce(tr("Guide clubhouse friends, serve their wishes, and keep every station tidy."));
}
export function start(): void {
  audio.start();
  audio.play("ui");
  state = R.createGame(C.JOURNEY[0]!);
  selected = state.companions[0]?.id ?? null;
  startedAt = simMs;
  roundStreak = 0;
  roundRecorded = false;
  lbLine = null;
  board.reset();
  const intro = state.cfg.intro;
  setMessage(() => (intro ? tr(intro) : tr("Choose a friend and guide them toward the station matching their wish.")));
  showScreen("game", selected ? `friend-${selected}` : null);
}

// ------------------------------------------------------------------ commands
function command(cmd: Command): void {
  if (!state) return;
  cmd.atMs = simMs - startedAt;
  const out = R.applyCommand(state, cmd);
  if (!out.ok) {
    const reason = out.reason;
    setMessage(() => (reason && REASONS[reason] ? tr(REASONS[reason]!) : reason ? String(reason).replace(/-/g, " ") : tr("That action is unavailable.")));
    audio.play("invalid");
    return;
  }
  const before = state;
  state = out.state;
  const types = out.events.map((e) => e.type);
  setMessage(() => (types.length ? types.map((t) => (EVENTS[t] ? tr(EVENTS[t]!) : t.replace(/-/g, " "))).join(" · ") : tr("Turn complete")));
  for (const e of out.events) {
    audio.play(e.type);
    if (e.type === "serve" && (e.together ?? 0) > 0) audio.play("together");
    if (e.type === "serve" && (e.streak ?? 0) >= 3) audio.play("streak");
  }
  if (!state.terminal) {
    if (state.companions.some((c) => c.wish && c.wish.patience === 2)) audio.play("patience-low");
    if (state.cfg.dayLength && state.cfg.dayLength - state.tick === 5) audio.play("day-late");
  }
  for (const e of out.events) if (e.type === "serve" && (e.streak ?? 0) > roundStreak) roundStreak = e.streak!;
  board.playEvents(out.events, before);
  sparkle(out.events);
  if (state.terminal && !roundRecorded) {
    roundRecorded = true;
    recordRound();
    postToLeaderboard(state.score.total);
    app.focusNext = "btn-again";
    app.openedFrame = frame().frame;
  }
}
/** Effects-layer bursts at the cells where things happened. */
function sparkle(events: GameEvent[]): void {
  for (const e of events) {
    if (e.type === "serve") { const c = companion(e.companion ?? null); fx.burst(c ? board.cellRect(c.x, c.y) : null, "serve"); }
    else if (e.type === "tidy" && e.cell) fx.burst(board.cellRect(e.cell.x, e.cell.y), "tidy");
    else if (e.type === "win") fx.burst(null, "win");
  }
}

// Persist the finished round and unlock the achievements the game can
// compute from it (the rest unlock as their modes ship).
function recordRound(): void {
  const s = state!;
  const doc = platform.getDoc();
  const p = doc.progress, st = p.stats;
  st.rounds++;
  if (s.terminal!.won) st.wins++;
  st.serves += s.fulfilled || 0;
  if (roundStreak > st.bestStreak) st.bestStreak = roundStreak;
  st.playMs += Math.round(simMs - startedAt);
  p.sparkle += s.score.total || 0;
  p.sparkleEarned += s.score.total || 0;
  const unlocked: string[] = [];
  const grant = (key: string): void => {
    if (p.achievements[key]) return;
    p.achievements[key] = Date.now();
    const def = C.ACHIEVEMENTS.find((a) => a.key === key);
    if (def) unlocked.push(def.name);
  };
  if (st.serves > 0) grant("first-serve");
  if (st.wins > 0) grant("first-win");
  if (st.bestStreak >= 5) grant("streak-5");
  if (st.serves >= 100) grant("serves-100");
  if (p.sparkleEarned >= 5000) grant("sparkle-5000");
  platform.persist();
  if (unlocked.length) setMessage(() => tr("Achievement unlocked: {names}", { names: unlocked.map((n) => tr(n)).join(", ") }));
}
// Signed in only: post the finished day's total to the high-score board and
// show the player's rank on the results card (lbLine; null = hidden).
function postToLeaderboard(total: number): void {
  if (!platform.signedIn()) { lbLine = null; return; }
  const posting = (): string => pt("lbPosting");
  lbLine = posting;
  void platform.postLeaderboard(total).then((r) => {
    if (lbLine !== posting) return;
    lbLine = () => (!r.posted ? pt("lbFailed") : r.rank ? pt("lbRank", { rank: r.rank }) : pt("lbPosted"));
  });
}

export function choose(id: string): void {
  selected = id;
  setMessage(() => tr("{name} selected.", { name: companionName(id) }));
  audio.play("select");
}
export function move(dir: Dir): void { if (selected) command({ type: "move", companion: selected, dir }); }
export function serve(): void { if (selected) command({ type: "serve", companion: selected }); }
export function tidy(): void {
  const c = companion(selected);
  const station = c && state?.stations.find((s) => s.messy && Math.abs(s.x - c.x) + Math.abs(s.y - c.y) <= 1);
  if (!station || !c) { setMessage(() => tr("No messy station is within reach.")); return; }
  command({ type: "tidy", companion: c.id, x: station.x, y: station.y });
}
const DIRS: Record<string, string> = { up: N("up"), down: N("down"), left: N("left"), right: N("right") };
const ACTS: Record<string, string> = { move: N("move"), serve: N("serve"), tidy: N("tidy") };
export function hint(): void {
  if (!state) return;
  const h = R.hint(state);
  if (!h) { setMessage(() => tr("No legal action is available.")); return; }
  const a = h.action;
  setMessage(() => {
    const what = (ACTS[a.type] ? tr(ACTS[a.type]!) : a.type) + (a.dir ? " " + (DIRS[a.dir] ? tr(DIRS[a.dir]!) : a.dir) : "");
    return tr("Hint: {action} with {name}.", { action: what, name: companionName(a.companion!) });
  });
  selected = a.companion ?? selected;
  audio.play("hint");
}
/** Gamepads and the F key: the next friend in the list (the browser build chose them by click or Tab). */
function nextFriend(): void {
  if (!state || !state.companions.length) return;
  const i = state.companions.findIndex((c) => c.id === selected);
  choose(state.companions[(i + 1) % state.companions.length]!.id);
}

// ------------------------------------------------------------------ the platform
export function copyInvite(): void {
  const link = platform.inviteLink();
  if (!link) return;
  let ok = false;
  try { clipboard.writeText(link); ok = true; } catch { ok = false; }
  toast(() => (ok ? pt("copied") : pt("copyFail", { link })));
}
export function signIn(): void { void requestSignIn().catch(() => undefined); }

// ------------------------------------------------------------------ input
export function playLive(): boolean { return app.screen === "game" && !!state && !state.terminal; }
onAction((e) => {
  if (!e.pressed || !playLive()) return;
  switch (e.action) {
    case "up": case "down": case "left": case "right":
      // The arrows move the friend, not the UI's focus (the browser build's window keydown).
      ui.setFocus(null);
      move(e.action);
      break;
    case "serve": serve(); break;
    case "tidy": tidy(); break;
    case "hint": hint(); break;
    case "friend": nextFriend(); break;
    default: break;
  }
});

// ------------------------------------------------------------------ boot and lifecycle
let lookKey = "";
function applyLook(): void {
  const f = frame();
  const key = `${f.quality}:${f.levelIndex}`;
  if (key === lookKey) return;
  lookKey = key;
  app.look = lookFor(f.quality, f.levelIndex);
  styleLook(app.look);
  fx.setLook(app.look);
}

let suspended = false;
onStart(() => {
  setFixedRate(60);
  initStyles();
  platform.initPlatform();
  audio.loadSfx();
  board.loadIcons();
  applyLook();
  titleScreen();
});
onSuspend(() => { suspended = true; platform.flush(); });
onResume(() => { suspended = false; });
onQuit(() => { platform.flush(); });
onFixedUpdate(() => { if (!suspended) simMs += 1000 / 60; });
onUpdate(() => {
  applyLook();
  audio.update();
  if (app.toast && app.toast.until < frame().time) app.toast = null;
});
onRender(() => { drawScreens(); });
