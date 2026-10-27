// The clubhouse floor as the browser build's DOM board drew it (js/main.js
// renderBoard, css/style.css .cc-board and css/gfx.css): a square grid of
// cells, each a ui.widget with the old button's accessible name ("Row 3,
// column 2: Pip"). A friend's cell is a button (a click or Enter chooses
// them, as before); floor, station and wall cells are disabled, as the DOM
// buttons were. Per cell: the floor or station tile (the station tinted on
// Detailed), the friend or station icon (the emoji the browser showed,
// pre-rendered once from Noto Color Emoji into assets/icons.png, since the
// engine draws no colour emoji), the name under it (hidden on phones, as
// the CSS hid it below 700 px), the station badge when a friend stands on
// a station ("!" when messy), the selection ring, the messy ring, the
// wall's hatching; on the graphics level: drop shadows, the friend tokens,
// glows, the idle bob and the selection pulse. All drawn with
// starhermit:draw in window pixels (logical sizes times the UI's scale).
import { frame } from "starhermit:engine";
import * as draw from "starhermit:draw";
import * as ui from "starhermit:ui";
import { createImageBitmap, type ImageBitmap } from "starhermit:canvas";
import { Content as C, type GameEvent, type State } from "./classic.ts";
import { tr } from "./i18n.ts";
import { activityName, app, choose, companionName, playLive, selected, state } from "./main.ts";
import { COLORS } from "./style.ts";

// --- icons ---------------------------------------------------------------------------------
/** assets/icons.png: 128 px cells in this order. */
const ICON_ORDER = ["pip", "momo", "bramble", "lumi", "snack", "paint", "music", "nap", "garden", "read"];
let atlas: ImageBitmap | null = null;
export function loadIcons(): void {
  createImageBitmap("assets/icons.png").then((b) => { atlas = b; }, (e: unknown) => console.warn(`icons: ${String(e)}`));
}
/** An icon (a companion's or an activity's) in a size × size square at (x, y); tint for shadows. */
function icon(id: string, x: number, y: number, size: number, tint?: string): void {
  const i = ICON_ORDER.indexOf(id);
  if (i < 0 || !atlas) return;
  draw.image(atlas, x, y, size, size, { source: { x: i * 128, y: 0, width: 128, height: 128 }, ...(tint ? { tint } : {}) });
}

// --- colours ---------------------------------------------------------------------------------
function hex(n: number): string { return "#" + (n >>> 0).toString(16).padStart(6, "0"); }
function rgb(c: string): [number, number, number] { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
/** CSS color-mix(in srgb, a p, b): b "transparent" keeps a's colour at alpha p. */
function mix(a: string, p: number, b: string | null): string {
  const A = rgb(a);
  if (!b) return a + Math.round(p * 255).toString(16).padStart(2, "0");
  const B = rgb(b);
  return "#" + A.map((v, i) => Math.round(v * p + B[i]! * (1 - p)).toString(16).padStart(2, "0")).join("");
}

// --- per-round state ------------------------------------------------------------------------
const rects = new Map<number, ui.Rect>();
let cols = 1;
/** A new club day. */
export function reset(): void { rects.clear(); }
/** Events of a command (the DOM build animated nothing but its CSS loops). */
export function playEvents(_events: GameEvent[], _before: State): void { /* the board redraws from the state */ }
/** The window rectangle of a cell, as last drawn (for the sparkles). */
export function cellRect(x: number, y: number): ui.Rect | null { return rects.get(y * cols + x) ?? null; }

// --- layout ---------------------------------------------------------------------------------
export interface BoardSize { cell: number; gap: number; width: number; height: number }
/** The board in availW × availH logical pixels: square cells, the CSS gap clamp(4px, 1vw, 9px). */
export function sizeBoard(availW: number, availH: number, vw: number): BoardSize {
  const s = state!;
  const c = s.cfg.board.cols, r = s.cfg.board.rows;
  const gap = Math.max(4, Math.min(9, vw * 0.01));
  const width = Math.max(40, Math.min(availW, ((availH - 8) * c) / r));
  const cell = Math.max(16, (width - gap * (c - 1)) / c);
  return { cell, gap, width: cell * c + gap * (c - 1), height: cell * r + gap * (r - 1) };
}

/** Builds the board grid at the current place in the UI. */
export function buildBoard(B: BoardSize, showNames: boolean, vw: number): void {
  const s = state;
  if (!s) return;
  cols = s.cfg.board.cols;
  ui.grid("board", () => {
    for (let y = 0; y < s.cfg.board.rows; y++) for (let x = 0; x < s.cfg.board.cols; x++) cellWidget(s, x, y, B.cell, showNames, vw);
  }, { columns: Array.from({ length: cols }, () => B.cell), gap: B.gap });
}

function cellWidget(s: State, x: number, y: number, size: number, showNames: boolean, vw: number): void {
  const c = s.companions.find((p) => p.x === x && p.y === y);
  const st = s.stations.find((p) => p.x === x && p.y === y);
  const blocked = s.grid[y]![x] === "#";
  const stationLabel = st ? (st.messy ? tr("{activity}, messy", { activity: activityName(st.activity) }) : activityName(st.activity)) : "";
  const label = c ? (st ? tr("{name} at {station}", { name: companionName(c.id), station: stationLabel }) : companionName(c.id))
    : st ? stationLabel : blocked ? tr("Wall") : tr("Open floor");
  const name = tr("Row {row}, column {col}: {label}", { row: y + 1, col: x + 1, label });
  const isSel = !!c && c.id === selected;
  const idx = y * s.cfg.board.cols + x;
  const L = app.look;
  const live = playLive();
  const res = ui.id(`cell-${x}-${y}`).widget(name, {
    role: "button", size: { width: size, height: size }, disabled: !c || !live,
    draw: (r, ws) => {
      rects.set(idx, r);
      const k = ws.scale;
      const hc = ws.highContrast;
      const t = frame().time;
      const anim = L.ambient && !ws.reducedMotion;
      const stationTint = st ? hex(C.ACTIVITIES[st.activity]?.color ?? 0xf6b85f) : COLORS.accent;
      // --- the tile
      const detailed = L.detailed && !hc;
      let bg: ui.Fill | ui.Fill[] = st ? "#4a352c" : COLORS.soft;
      if (detailed) {
        if (st) bg = [{ type: "radial", center: { x: 0.5, y: 0.42 }, radius: "closest-side", shape: "circle", stops: [{ color: mix(stationTint, 0.42, null), at: 0 }, { color: mix(stationTint, 0, null), at: 1 }] },
          { type: "linear", angle: 172, stops: ["#57413a", "#3f2e28"] }];
        else if (blocked) bg = [{ type: "linear", angle: 45, repeating: true, stops: [{ color: "#4b382e", at: [0, 7] }, { color: "#3a2b24", at: [7, 14] }] }];
        else bg = [{ type: "linear", angle: 90, repeating: true, stops: [{ color: "#ffffff06", at: [0, 1] }, { color: "#00000000", at: [1, size / 4] }] },
          { type: "linear", angle: 172, stops: ["#402f29", "#30231e"] }];
      }
      const sh: ui.Shadow[] = [];
      if (st?.messy) { sh.push({ spread: 2, inset: true, color: "#e0705a" }); if (L.bloom) sh.push({ blur: 14, color: "#e0705a70" }); }
      if (isSel) sh.push(L.bloom ? { spread: 2, color: "#f6b85faa" } : { spread: 2, color: "#f6b85f55" });
      if (isSel && L.bloom) sh.push({ blur: 18, spread: 3, color: "#f6b85f59" });
      if (detailed && !blocked) sh.push({ y: 1, inset: true, color: "#ffffff17" }, { y: -3, inset: true, color: "#0000003d" });
      if (detailed && blocked) sh.push({ spread: 2, inset: true, color: "#0000004d" });
      if (L.shadows === "low") sh.push({ y: 2, blur: 4, color: "#00000055" });
      else if (L.shadows === "medium") sh.push({ y: 4, blur: 8, color: "#00000077" }, { y: 1, blur: 2, color: "#00000066" });
      else if (L.shadows === "high") sh.push({ y: 7, blur: 14, color: "#00000088" }, { y: 2, blur: 3, color: "#00000077" });
      const borderColor = isSel || (ws.hovered && !!c && live) ? COLORS.accent : COLORS.line;
      draw.box(r.x, r.y, r.width, r.height, {
        background: bg, radius: showNames ? 10 : 7, shadow: sh.slice(0, 6), // a box takes at most 6
        border: detailed && st ? { width: 1, color: { top: mix(stationTint, 0.75, "#ffffff"), start: borderColor, end: borderColor, bottom: borderColor } } : { width: 1, color: borderColor },
        opacity: blocked ? (detailed ? 0.62 : 0.42) : 1,
      });
      // the selection pulse (Ambient motion)
      if (isSel && anim) {
        const a = 0.35 + 0.65 * (0.5 - 0.5 * Math.cos((t / 2.4) * Math.PI * 2));
        draw.box(r.x, r.y, r.width, r.height, { radius: showNames ? 10 : 7, shadow: { blur: 14, inset: true, color: mix("#f6b85f", 0.35 * a, null) } });
      }
      // --- content: icon (b) over the name (span)
      const nameSize = Math.max(8, Math.min(12, vw * 0.011)) * k;
      const nameOpts = { size: nameSize, maxWidth: r.width - 8 * k };
      const nameH = showNames ? Math.min(r.height * 0.42, draw.measureText(label, nameOpts).height + 2 * k) : 0;
      // the icon at clamp(18px, 4vw, 38px), never more than the tile has room for (a token is 1.25 icons across)
      const iconSize = Math.min(Math.max(18, Math.min(38, vw * 0.04)) * k * 1.15, (r.height - nameH - 6 * k) / (detailed && c ? 1.3 : 1.05));
      const cx = r.x + r.width / 2;
      const top = r.y + Math.max(2 * k, (r.height - iconSize - nameH) / 2);
      const iconY = top;
      if (c) {
        const bob = anim ? Math.sin(((t + (idx % 2 ? 1.3 : 0)) / 2.6) * Math.PI * 2) * -1.5 * k - 1.5 * k : 0;
        const tint = hex(C.COMPANIONS[c.id]?.color ?? 0x888888);
        if (detailed) {
          // the friend token: a tinted disc 1.6 em across with a highlight
          const D = iconSize * 1.25, tx = cx - D / 2, ty = iconY + iconSize / 2 - D / 2 + bob;
          draw.box(tx, ty, D, D, {
            radius: D / k,
            background: [
              { type: "radial", center: { x: 0.34, y: 0.27 }, radius: { x: 0.24, y: 0.24 }, stops: [{ color: "#ffffff99", at: 0.2 }, { color: "#ffffff00", at: 1 }] },
              { type: "radial", center: { x: 0.5, y: 0.62 }, radius: "closest-side", stops: [{ color: mix(tint, 0.88, "#000000"), at: 0 }, { color: mix(tint, 0.42, "#1a1210"), at: 1 }] },
            ],
            shadow: [{ y: -4, blur: 7, inset: true, color: "#00000066" }, { y: 2, blur: 3, inset: true, color: "#ffffff4d" }, { spread: isSel ? 3 : 2, color: isSel ? COLORS.accent : "#1a1210aa" }],
          });
        }
        const isz = detailed ? iconSize * 0.82 : iconSize;
        const ix = cx - isz / 2, iy = iconY + (iconSize - isz) / 2 + bob;
        if (L.shadows !== "off") icon(c.id, ix, iy + (L.shadows === "high" ? 4 : 2) * k, isz, "#00000088");
        icon(c.id, ix, iy, isz);
      } else if (st) {
        if (L.bloom && !st.messy && !hc) draw.circle(cx, iconY + iconSize / 2, iconSize * 0.62, mix(stationTint, 0.3, null), { blend: "add" });
        if (L.shadows !== "off") icon(st.activity, cx - iconSize / 2, iconY + (L.shadows === "high" ? 4 : 2) * k, iconSize, "#00000088");
        icon(st.activity, cx - iconSize / 2, iconY, iconSize);
      } else if (blocked) {
        if (!detailed) {
          // ▦ (no symbol font): a hatched square
          const q = iconSize * 0.7, qx = cx - q / 2, qy = iconY + (iconSize - q) / 2;
          draw.strokeRect(qx, qy, q, q, COLORS.text, Math.max(1, 1.5 * k));
          for (let i = 1; i < 4; i++) {
            draw.line(qx + (q * i) / 4, qy, qx + (q * i) / 4, qy + q, COLORS.text, Math.max(1, k));
            draw.line(qx, qy + (q * i) / 4, qx + q, qy + (q * i) / 4, COLORS.text, Math.max(1, k));
          }
        }
      } else {
        draw.text("·", cx, iconY + iconSize * 0.15, { size: iconSize * 0.7, color: COLORS.text, align: "center", weight: "bold" });
      }
      if (showNames) {
        draw.text(label, cx, iconY + iconSize + 2 * k, { ...nameOpts, color: COLORS.text, align: "center", clip: { x: r.x, y: r.y, width: r.width, height: r.height } });
      }
      // --- the station badge (a friend standing on a station keeps its identity)
      if (st && c) {
        const bs = Math.max(10, Math.min(16, vw * 0.014)) * k;
        const txt = st.messy ? "!" : "";
        const tw = txt ? draw.measureText(txt, { size: bs, weight: "bold" }).width : 0;
        const bw = bs + tw + (detailed ? 8 * k : 0), bh = bs * 1.25;
        const bx = r.x + r.width - 4 * k - bw, by = r.y + 2 * k;
        if (detailed) draw.box(bx, by, bw, bh, { background: "#1a1210cc", radius: 8 });
        icon(st.activity, bx + (detailed ? 4 * k : 0), by + (bh - bs) / 2, bs);
        if (txt) draw.text(txt, bx + (detailed ? 4 * k : 0) + bs, by + (bh - bs) / 2 - bs * 0.1, { size: bs, weight: "bold", color: st.messy ? "#ff9a86" : COLORS.accent });
      }
    },
  });
  if (res.activated && c && live) choose(c.id);
}
