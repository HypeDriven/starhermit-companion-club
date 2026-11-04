// The look per graphics level: the browser build's four presets (js/gfx.js
// TABLE: the shadow, glow, colour-grade, particle, ambient-motion and
// surface-detail tiers of its effects layer) keyed by the runtime's quality
// tier (frame().quality). This is a 2D game drawn with starhermit:draw: its
// drop shadows, glow and grade are its own art, not the engine renderer's,
// so they stay keyed by the tier. The dust motes and sparkle bursts scale
// with the level's particle budget (levelSettings().particles) against the
// tier's anchor level (quantum, molecular, terrestrial, galactic), at most
// four times the tier's own and within the browser build's caps (MOTE_CAP,
// BURST_CAP). The runtime owns the rest of the old Graphics panel: Auto and
// the level choice, render scale and the pixel-ratio cap, adaptive
// resolution, the frame-rate limit and readout. The per-category overrides
// of the old panel are not offered (the runtime's Options choose a level).
import { levelSettings, type GraphicsLevel, type LevelSettings, type QualityTier } from "starhermit:engine";

export type Preset = QualityTier;
export interface Look {
  preset: Preset;
  /** Drop shadows under panels, tiles and friend tokens. */
  shadows: "off" | "low" | "medium" | "high";
  /** Glow on highlights, the title and the hearth lamp. */
  bloom: boolean;
  /** Warm colour grade and vignette on the key art; the board's lamp pool. */
  grade: boolean;
  /** Dust motes and serve / tidy / win sparkles. */
  particles: "off" | "low" | "high";
  /** Idle bob, the selection pulse, the lamp flicker and the key art's slow drift. */
  ambient: boolean;
  /** Bevelled tiles, tinted stations, friend tokens, gradient panels and buttons. */
  detailed: boolean;
  /** Dust motes drawn. */
  motes: number;
  /** Sparkle count multiplier (a win: 110 × burst). */
  burst: number;
}

const TABLE: Record<Preset, Omit<Look, "preset" | "motes" | "burst">> = {
  low: { shadows: "off", bloom: false, grade: false, particles: "off", ambient: false, detailed: false },
  balanced: { shadows: "low", bloom: true, grade: true, particles: "low", ambient: false, detailed: true },
  high: { shadows: "medium", bloom: true, grade: true, particles: "high", ambient: true, detailed: true },
  ultra: { shadows: "high", bloom: true, grade: true, particles: "high", ambient: true, detailed: true },
};
const BUDGETS: Record<Preset, { motes: number; burst: number }> = {
  low: { motes: 12, burst: 0.4 },
  balanced: { motes: 22, burst: 0.5 },
  high: { motes: 56, burst: 1 },
  ultra: { motes: 90, burst: 1.5 },
};
const MOTE_CAP = { off: 0, low: 40, high: 240 };
const BURST_CAP = { off: 0, low: 0.5, high: 4 };
/** Each tier's anchor level: its budgets are tuned for it. */
const ANCHOR: Record<Preset, GraphicsLevel> = { low: "quantum", balanced: "molecular", high: "terrestrial", ultra: "galactic" };

/** The look for a graphics level (default: this frame's). */
export function lookFor(s: LevelSettings = levelSettings()): Look {
  const preset = s.quality;
  const row = TABLE[preset] ?? TABLE.balanced;
  const b = BUDGETS[preset] ?? BUDGETS.balanced;
  // The level's particle budget doubles a level: budgets grow with it above
  // the tier's anchor, at most four times the tier's own.
  const k = Math.min(4, Math.max(1, s.particles / levelSettings(ANCHOR[preset] ?? "molecular").particles));
  return {
    preset, ...row,
    motes: Math.min(MOTE_CAP[row.particles], Math.round(b.motes * k)),
    burst: Math.min(BURST_CAP[row.particles], Math.round(b.burst * k * 100) / 100),
  };
}
