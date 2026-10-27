// The browser build's pure game scripts, shared with the Node tests: the
// seeded random streams, the rules engine, the content (companions,
// activities, the Journey, achievements), the save model and the string
// tables (js/*.js, UMD), evaluated as classic scripts so their globals are
// this module's exports.
import { loadClassic } from "starhermit:script";

for (const f of ["js/rng.js", "js/rules.js", "js/content.js", "js/store.js", "js/strings.js", "js/i18n.js", "js/platform-strings.js"]) loadClassic(f);

// -- The shapes this client reads -------------------------------------------------
export type Dir = "up" | "down" | "left" | "right";
export interface Wish { activity: string; patience: number; maxPatience: number }
export interface Companion { id: string; x: number; y: number; wish: Wish | null; cooldown: number; mood: number }
export interface Station { x: number; y: number; activity: string; messy: boolean }
export interface Score {
  serve: number; patienceBonus: number; togetherBonus: number; streakBonus: number; tidy: number;
  roundBonus: number; dayBonus: number; moodBonus: number; serves: number; total: number;
}
export interface Cfg {
  id: string; name: string; seed: number; board: { cols: number; rows: number }; goal: number; dayLength: number;
  missLimit: number; intro?: string; [key: string]: unknown;
}
export interface State {
  v: number; cfg: Cfg; tick: number; grid: (0 | "#" | string)[][]; stations: Station[]; companions: Companion[];
  score: Score; streak: number; fulfilled: number; misses: number; terminal: { reason: string; won: boolean } | null;
}
export interface GameEvent { type: string; companion?: string; cell?: { x: number; y: number }; together?: number; streak?: number; [key: string]: unknown }
export interface Command { type: "move" | "serve" | "tidy" | "resign"; companion?: string; dir?: Dir; x?: number; y?: number; atMs?: number }
export interface Outcome { ok: boolean; reason?: string; state: State; events: GameEvent[] }

export interface Progress {
  achievements: Record<string, number>; sparkle: number; sparkleEarned: number;
  stats: { rounds: number; wins: number; serves: number; wishesMissed: number; bestStreak: number; playMs: number };
  [key: string]: unknown;
}
export interface Doc { v: number; progress: Progress }

interface RulesApi {
  createGame(cfg: Cfg): State;
  applyCommand(s: State, cmd: Command): Outcome;
  hint(s: State): { action: Command; why: string } | null;
}
interface ContentApi {
  COMPANIONS: Record<string, { label: string; color: number }>;
  COMPANION_ORDER: string[];
  ACTIVITIES: Record<string, { label: string; color: number }>;
  ACTIVITY_ORDER: string[];
  JOURNEY: Cfg[];
  ACHIEVEMENTS: { key: string; name: string; desc: string }[];
}
interface StoreApi {
  docFromSave(data: unknown): Doc | null;
  fromBrowserSave(text: string | null | undefined): Doc | null;
  mergeDocs(a: unknown, b: unknown): Doc | null;
  mergeProgress(a: Progress, b: Progress): Progress;
  defaultProgress(): Progress;
}
interface I18nApi {
  T(key: string, vars?: Record<string, string | number> | null): string;
  setLocale(tag: string): string;
  readonly lang: string;
  locales: string[];
}
interface PlatformStringsApi {
  platformStrings(lang: string): Record<string, string>;
  fmtPlatform(s: string, vars?: Record<string, string | number>): string;
}

const g = globalThis as unknown as {
  CCRules: RulesApi; CCContent: ContentApi; CCStore: StoreApi; CCI18N: I18nApi; CCPlatformStrings: PlatformStringsApi;
};
export const Rules = g.CCRules;
export const Content = g.CCContent;
export const Store = g.CCStore;
export const I18n = g.CCI18N;
export const PlatformStrings = g.CCPlatformStrings;
