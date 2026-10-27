// The look per graphics level: the browser build's four presets (js/gfx.js
// TABLE: the shadow, glow, colour-grade, particle, ambient-motion and
// surface-detail tiers of its effects layer) keyed by the runtime's quality
// tier (frame().quality), with the dust motes and sparkle bursts scaled
// within the tier by the level (frame().levelIndex) as the browser build
// scaled its budgets by the hardware level (js/gfx.js BUDGETS, MOTE_CAP,
// BURST_CAP). The runtime owns the rest of the old Graphics panel: Auto and
// the level choice, render scale and the pixel-ratio cap, adaptive
// resolution, the frame-rate limit and readout. The per-category overrides
// of the old panel are not offered (the runtime's Options choose a level).
import type { QualityTier } from "starhermit:engine";

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
/** The first level index of each tier. */
const TIER_FLOOR: Record<Preset, number> = { low: 0, balanced: 2, high: 4, ultra: 7 };

/** The look for a quality tier at a level index (0 … 9). */
export function lookFor(preset: Preset, levelIndex: number): Look {
  const row = TABLE[preset] ?? TABLE.balanced;
  const b = BUDGETS[preset] ?? BUDGETS.balanced;
  // Levels are about 1.64× apart in GPU throughput: budgets grow with the
  // level above the tier's first, at most four times the tier's own.
  const k = Math.min(4, Math.pow(1.64, Math.max(0, levelIndex - (TIER_FLOOR[preset] ?? 0))));
  return {
    preset, ...row,
    motes: Math.min(MOTE_CAP[row.particles], Math.round(b.motes * k)),
    burst: Math.min(BURST_CAP[row.particles], Math.round(b.burst * k * 100) / 100),
  };
}
