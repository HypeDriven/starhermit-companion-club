// Sound, as the browser build's js/audio.js: the authored one-shots
// (sfx/<name>.opus, mapped to the game's logical events by
// sfx/manifest.json; the rules' "move" and "wish-expired" play "step" and
// "miss"), the authored clubhouse room tone (ambience-clubhouse.opus) as a
// quiet loop, and the slow generative pad (C, Am, F, G an octave down: a
// triangle root and two sines a chord, rising over 1.8 s and gone by 6.4 s,
// a chord every 5.2 s). As in the browser build, the ambience and the pad
// start with the first club day (Play).
//
// The browser build's four buses become the runtime's (Options › Audio owns
// the volumes, the mute and the voice limit): music → "music", effects and
// ambience → "effects", the menu tick → "interface"; the old default bus
// levels (music 60 %, effects 90 %, ambience 50 %) are folded into each
// sound's gain. The pad, which the browser build played with oscillators, is
// rendered once into clips (createClip); the synthesized stand-ins it played
// while a sample loaded (and its noise bed under the room tone) are not
// ported (the engine's web runtime drops clip loads while a synthesis graph
// changes). Clips load once the mixer runs (natively at once, in a browser
// after the first press), one at a time.
import { files } from "starhermit:engine";
import { context, createClip, loadClip, play as playClip, type AudioClip, type Bus, type Sound } from "starhermit:audio";

const LEVEL = { music: 0.6, effects: 0.9, ambience: 0.5 };
/** Rules events whose names differ from the authored sound events. */
const ALIAS: Record<string, string> = { move: "step", "wish-expired": "miss" };
// The first sounds of a club day load first.
const FIRST = ["ui", "select", "step", "serve", "tidy", "messy", "wish-new", "invalid", "hint"];

const eventFile = new Map<string, string>();
const clips = new Map<string, AudioClip>();
const queue: string[] = [];
let loading = false;
let wantClips = false;
function load(name: string): void { if (!queue.includes(name) && !clips.has(name)) queue.push(name); }
function pump(): void {
  if (loading || !queue.length) return;
  const name = queue.shift()!;
  loading = true;
  loadClip(`sfx/${name}.opus`).then((c) => { clips.set(name, c); loading = false; }, (e: unknown) => { console.warn(`sfx ${name}: ${String(e)}`); loading = false; });
}
/** Reads the manifest and asks for the clips; they load once the mixer runs (see update). */
export function loadSfx(): void {
  try {
    const list = files.readJson("sfx/manifest.json") as unknown as { name?: string; event?: string }[];
    for (const e of Array.isArray(list) ? list : []) {
      if (e && typeof e.name === "string" && typeof e.event === "string" && !eventFile.has(e.event)) eventFile.set(e.event, e.name);
    }
  } catch (e) { console.warn(`sfx manifest: ${String(e)}`); }
  wantClips = true;
}

let started = false;
/** The first club day began (Play): the room tone and the pad start (js/audio.js start). */
export function start(): void { started = true; }

/** Plays a logical event's sample (js/audio.js play); unknown or still-loading samples are silent. */
export function play(event: string): void {
  if (!started) return;
  const name = ALIAS[event] ?? event;
  if (name === "ambience") return; // the loop, never a one-shot
  const file = eventFile.get(name);
  const clip = file ? clips.get(file) : undefined;
  if (!clip) return;
  const bus: Bus = name === "ui" ? "interface" : "effects";
  try { playClip(clip, { bus, gain: LEVEL.effects }); }
  catch { clips.delete(file!); load(file!); } // a clip the mixer lost: load it again
}

// -- the pad ----------------------------------------------------------------------------------
const RATE = 11025;
/** One pad chord an octave down: a triangle root and two sines, up to 0.05 over 1.8 s, gone by 6.4 s (lowpassed at 720 Hz: the voices are below it). */
function chordClip(freqs: readonly number[]): AudioClip {
  const n = Math.round(6.6 * RATE);
  const out = new Float32Array(n);
  freqs.forEach((f0, vi) => {
    const f = f0 * 0.5;
    for (let i = 0; i < n; i++) {
      const t = i / RATE;
      const e = t < 1.8 ? 0.05 * (t / 1.8) : t < 6.4 ? 0.05 * (1 - (t - 1.8) / 4.6) : 0;
      const ph = (f * t) % 1;
      const w = vi === 0 ? 1 - 4 * Math.abs(ph - 0.5) : Math.sin(2 * Math.PI * ph);
      out[i]! += w * e;
    }
  });
  return createClip([out], RATE);
}
const CHORDS = [[261.63, 329.63, 392.0], [220.0, 261.63, 329.63], [174.61, 220.0, 261.63], [196.0, 246.94, 293.66]] as const;
const chords: AudioClip[] = [];

// -- the room tone and the pad ------------------------------------------------------------
let room: Sound | null = null;
let roomStarted = false;
let nextChord = 0;
let step = 0;

/** Each frame: the samples once the mixer runs (one at a time), one rendered chord a frame,
 * then (once Play was pressed) the room tone loop and the pad's chords by mixer time. */
export function update(): void {
  if (context.state !== "running") return;
  if (wantClips) {
    wantClips = false;
    const firstFiles = FIRST.map((e) => eventFile.get(e)).filter((f): f is string => !!f);
    for (const name of firstFiles) load(name);
    for (const name of eventFile.values()) load(name);
  }
  pump();
  if (loading || queue.length) return;
  if (chords.length < CHORDS.length) {
    try { chords.push(chordClip(CHORDS[chords.length]!)); } catch (e) { console.warn(`audio: ${String(e)}`); }
    return;
  }
  if (!started) return;
  const roomFile = eventFile.get("ambience");
  const roomClip = roomFile ? clips.get(roomFile) : undefined;
  if (!roomStarted && roomClip) {
    roomStarted = true;
    try { room = playClip(roomClip, { bus: "effects", gain: 0.0001, loop: true }); room.fade(0.5 * LEVEL.ambience, 1.5); }
    catch { room = null; }
    return; // the pad starts on a frame of its own
  }
  const now = context.currentTime;
  if (now >= nextChord) {
    if (nextChord === 0 || now - nextChord > 1) nextChord = now;
    const clip = chords[step % chords.length];
    if (clip) { try { playClip(clip, { bus: "music", gain: LEVEL.music }); } catch { /* the mixer is full */ } }
    step++;
    nextChord += 5.2;
  }
}
