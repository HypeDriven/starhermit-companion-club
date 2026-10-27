// The look of the title, the club day's panels and the results card: the
// browser build's css/style.css and css/gfx.css, rewritten class-based in
// tools/ui-style.css and converted once with `starhermit css` into
// assets/ui-style.json (`npm run css`), registered at start. The graphics
// categories the old sheet keyed on html[data-gfx-*] follow the graphics
// level (applyLook): Surface detail folds the d-* classes (gradient panels
// and buttons, the golden Play) into the plain ones, Shadows gives the
// panels their drop shadows, Glow the title's and the numbers' glow and the
// selected friend's halo. High contrast, larger text and reduced motion are
// the runtime's (it forces the UI's colours, scales its text and stills its
// motion).
import { files } from "starhermit:engine";
import * as ui from "starhermit:ui";
import type { Look } from "./quality.ts";

export const COLORS = {
  bg: "#1a1210", panel: "#2b201d", soft: "#3a2b26", text: "#f3e6d8", muted: "#c5ad9d", accent: "#f6b85f", line: "#654c42", ink: "#28190d",
};
const PANEL_SHADOW: Record<Look["shadows"], ui.Shadow[]> = {
  off: [],
  low: [{ y: 4, blur: 14, color: "#00000066" }],
  medium: [{ y: 10, blur: 28, color: "#00000088" }, { y: 2, blur: 6, color: "#00000055" }],
  high: [{ y: 18, blur: 44, color: "#000000aa" }, { y: 4, blur: 10, color: "#00000066" }],
};

let css: ui.CssStyles | null = null;
let look: Look | null = null;

function shadows(...lists: (ui.Shadow | readonly ui.Shadow[] | undefined | string)[]): ui.Shadow[] {
  const out: ui.Shadow[] = [];
  for (const l of lists) {
    if (!l || typeof l === "string") continue;
    if (Array.isArray(l)) out.push(...(l as ui.Shadow[])); else out.push(l as ui.Shadow);
  }
  return out;
}

/** b over a, its text, hovered, pressed and selected blocks merged one level deep. */
function merge(a: ui.Style, b: ui.Style): ui.Style {
  const out: Record<string, unknown> = { ...a, ...b };
  for (const k of ["text", "hovered", "pressed", "selected", "active"] as const) {
    const x = (a as Record<string, unknown>)[k], y = (b as Record<string, unknown>)[k];
    if (x && y && typeof x === "object" && typeof y === "object") out[k] = { ...x, ...y };
  }
  return out as ui.Style;
}

function styles(): { [key: string]: ui.Style } {
  const s = { ...(css!.styles as { [key: string]: ui.Style }) };
  const L = look!;
  if (L.detailed) {
    for (const k of [".side", ".title-card", ".result-card", ".btn", ".btn-play", ".art"]) {
      const d = s[".d-" + k.slice(1)];
      if (d) s[k] = merge(s[k] ?? {}, d);
    }
  }
  const panel = PANEL_SHADOW[L.shadows];
  for (const k of [".side", ".board-wrap", ".title-card", ".result-card"]) {
    s[k] = { ...s[k], shadow: shadows(s[k]?.shadow, panel) };
  }
  if (L.bloom) {
    const glow = (k: string, blur: number, color: string): void => {
      const st = s[k] ?? {};
      s[k] = { ...st, text: { ...(st.text ?? {}), shadow: { blur, color } } };
    };
    glow(".title-name", 22, "#f6b85f59");
    glow(".game-name", 22, "#f6b85f59");
    glow(".stats-b", 10, "#f6b85f80");
    glow(".score-total", 10, "#f6b85f80");
    s[".btn-play"] = { ...s[".btn-play"], shadow: shadows(s[".btn-play"]?.shadow, { blur: 24, color: "#f6b85f66" }) };
    const fr = s[".friend"] ?? {};
    s[".friend"] = { ...fr, selected: { ...(fr.selected ?? {}), shadow: [{ spread: 2, color: "#f6b85f77" }, { blur: 16, spread: 2, color: "#f6b85f40" }] } };
  }
  return {
    ...s,
    label: { text: { color: "$text" } },
    paragraph: { text: { color: "$text" } },
    heading: { text: { color: "$text" } },
    widget: { focusRing: { color: "#ffffff", width: 3, offset: 2 } },
    dialog: { background: "transparent", padding: 0, parts: { backdrop: { background: "#130d0be8" } } },
    scrollArea: { parts: { bar: { background: "$muted", radius: 4 } } },
  };
}

export function initStyles(): void {
  css = files.readJson("assets/ui-style.json") as unknown as ui.CssStyles;
  ui.setTheme({
    fontSize: 16, smallSize: 13.6, headingSize: 24, padding: 8, spacing: 8, radius: 10,
    text: COLORS.text, muted: COLORS.muted, panel: COLORS.panel, control: COLORS.soft, hovered: "#47362f",
    pressed: "#2f231f", field: COLORS.soft, accent: COLORS.accent, focus: "#ffffff", outline: COLORS.line,
  });
  ui.setTokens(css.tokens);
  ui.setAnimations(css.animations);
  if (look) ui.setStyles(styles());
}

/** The graphics categories on the graphics level (quality.ts). */
export function applyLook(l: Look): void {
  look = l;
  if (css) ui.setStyles(styles());
}
