// The browser build's DOM screens (js/main.js title/render/resultHtml with
// css/style.css and css/gfx.css) as starhermit:ui, built every frame: the
// title card over the key art (account line, Sign in and Invite, Play and
// Settings), the club day (the header with the day's numbers, the Friends
// panel with the message line, the direction pad and Serve / Tidy / Hint,
// the clubhouse floor panel with the board), the results card with its art,
// the score breakdown and the leaderboard line, the toast, and the effects
// layer over everything. The CSS breakpoints are layouts picked by the
// window's logical size: wide (two columns), phone (≤ 760 px wide: the
// floor on top, the Friends panel under it, friends in two columns) and
// short landscape (≤ 500 px tall: compact two columns). Settings opens the
// runtime's Options (graphics, sound, language, controls, accessibility),
// which replaced the old Settings panel.
import { frame, openMenu } from "starhermit:engine";
import * as draw from "starhermit:draw";
import * as ui from "starhermit:ui";
import { createImageBitmap, type ImageBitmap } from "starhermit:canvas";
import { Content as C } from "./classic.ts";
import * as board from "./board.ts";
import * as fx from "./fx.ts";
import { tr, pt } from "./i18n.ts";
import * as platform from "./platform.ts";
import {
  SCORE_PARTS, WHY, activityName, app, choose, companionName, copyInvite, hint, lbLine, message, move, playLive, selected,
  serve, signIn, start, state, tidy,
} from "./main.ts";
import { COLORS } from "./style.ts";

// ------------------------------------------------------------------ layout
interface Layout { lw: number; lh: number; sc: number; ox: number; oy: number; phone: boolean; shortLand: boolean; narrow: boolean }
function layoutNow(): Layout {
  const f = frame();
  const sc = ui.preferences().scale;
  const sa = f.safeArea;
  const lw = Math.max(1, (f.width - sa.left - sa.right) / sc), lh = Math.max(1, (f.height - sa.top - sa.bottom) / sc);
  const shortLand = lw > lh && lh <= 500;
  const phone = !shortLand && lw <= 760;
  return { lw, lh, sc, ox: sa.left / sc, oy: sa.top / sc, phone, shortLand, narrow: lw <= 700 };
}
const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));
/** Heights of blocks as last laid out (logical pixels), for the layouts that fit the board into what is left. */
const lastH = new Map<string, number>();
function track(key: string, r: ui.Rect): void { lastH.set(key, r.height / ui.preferences().scale); }
const H = (key: string, def: number): number => lastH.get(key) ?? def;

function textWidth(text: string, style: readonly (string | ui.Style)[], kind?: "button" | "heading"): number {
  return ui.measureText(text, { ...(kind ? { kind } : {}), style: [...style] }).width / ui.preferences().scale;
}
/** Text up to `width` wide: one label when it fits, else a paragraph. */
function para(text: string, width: number, style: (string | ui.Style)[], id?: string): ui.Rect {
  let u = ui.style(...style);
  if (id) u = u.id(id);
  if (textWidth(text, style) <= width) return u.label(text);
  return u.paragraph(text, width);
}
/** A line with {placeholders} filled in another style (the header's bold numbers). */
function rich(id: string, template: string, vars: Record<string, string | number>, base: string, bold: string): void {
  const parts: { text: string; b: boolean }[] = [];
  let rest = template;
  const re = /\{(\w+)\}/;
  for (let m = re.exec(rest); m; m = re.exec(rest)) {
    if (m.index) parts.push({ text: rest.slice(0, m.index), b: false });
    parts.push({ text: String(vars[m[1]!] ?? m[0]), b: true });
    rest = rest.slice(m.index + m[0].length);
  }
  if (rest) parts.push({ text: rest, b: false });
  const space = textWidth("a a", [base]) - textWidth("aa", [base]);
  ui.row(id, () => {
    parts.forEach((p, i) => {
      const lead = p.text.startsWith(" ") ? space : 0, trail = p.text.endsWith(" ") ? space : 0;
      const t = p.text.trim();
      if (!t) { ui.widget("", { role: "none", size: { width: space, height: 1 } }); return; }
      ui.id(`${id}-${i}`).style(p.b ? bold : base, { margin: { start: lead, end: trail } }).label(t);
    });
  }, { spacing: 0, align: "center" });
}
interface Btn { id: string; text: string; style?: (string | ui.Style)[]; act: () => void; content?: () => void; disabled?: boolean; selected?: boolean }
/** A button `width` wide (null: its text's); a label too long for it wraps inside. */
function button(b: Btn, width: number | null = null): void {
  const style = b.style ?? ["btn"];
  const opts: ui.ButtonOptions = {};
  if (b.disabled) opts.disabled = true;
  if (b.selected !== undefined) opts.selected = b.selected;
  if (b.content) opts.content = b.content;
  else if (width != null && textWidth(b.text, style, "button") + 2 > width) {
    const inner = Math.max(20, width - 22);
    opts.content = () => { ui.style({ text: { align: "center" } }).paragraph(b.text, inner); };
  }
  if (ui.style(...style, width != null ? { width } : {}).id(b.id).button(b.text, opts)) b.act();
}

// ------------------------------------------------------------------ art
let keyArt: ImageBitmap | null = null;
let resultsArt: ImageBitmap | null = null;
let artAsked = false;
function loadArt(): void {
  if (artAsked) return;
  artAsked = true;
  // Decorative: a missing file just leaves the art out.
  createImageBitmap("assets/key-art.webp").then((b) => { keyArt = b; }, () => undefined);
  createImageBitmap("assets/results-art.webp").then((b) => { resultsArt = b; }, () => undefined);
}
/** An image cover-fitted into (x, y, w, h) window pixels, its focus at (fx, fy) (CSS object-position). */
function cover(img: ImageBitmap, x: number, y: number, w: number, h: number, fx0: number, fy0: number, alpha = 1, zoom = 1): void {
  const k = Math.max(w / img.width, h / img.height) * zoom;
  const sw = w / k, sh = h / k;
  const sx = (img.width - sw) * fx0, sy = (img.height - sh) * fy0;
  draw.image(img, x, y, w, h, { source: { x: sx, y: sy, width: sw, height: sh }, ...(alpha < 1 ? { tint: [1, 1, 1, alpha] as [number, number, number, number] } : {}) });
}

// ------------------------------------------------------------------ the frame
export function drawScreens(): void {
  loadArt();
  const L = layoutNow();
  const f = frame();
  backdrop(L);
  ui.column("page", () => {
    if (app.screen === "title") titleScreen(L);
    else if (state) gameScreen(L);
  }, { width: L.lw, height: L.lh });
  if (app.screen === "game" && state?.terminal) results(L);
  toasts();
  fx.layer();
  if (app.focusNext) {
    const age = f.frame - app.openedFrame;
    if (age >= 1) ui.setFocus(app.focusNext);
    if (age >= 3) app.focusNext = null;
  }
}

/** The page behind the UI: the background (with Surface detail's and Glow's soft light), and on the title the key art. */
function backdrop(L: Layout): void {
  const f = frame();
  const W = f.width, Hh = f.height;
  const look = app.look;
  draw.rect(0, 0, W, Hh, COLORS.bg);
  if (look.detailed) {
    draw.box(-W * 0.35, -Hh * 0.55, W * 1.0, Hh * 1.1, { background: { type: "radial", stops: [{ color: "#2c1d17", at: 0 }, { color: "#2c1d1700", at: 0.55 }] } });
    draw.box(W * 0.2, Hh * 0.55, W * 1.2, Hh * 1.1, { background: { type: "radial", stops: [{ color: "#24170f", at: 0 }, { color: "#24170f00", at: 0.6 }] } });
  }
  if (look.bloom) draw.box(W * 0.33, -Hh * 0.6, W * 1.1, Hh * 1.04, { background: { type: "radial", stops: [{ color: "#ffb86a26", at: 0 }, { color: "#ffb86a00", at: 0.55 }] } });
  if (app.screen !== "title" || !keyArt) return;
  // .cc-title-art: cover at 60 % 50 %, 55 % opaque, fading out toward the bottom; the slow drift with Ambient motion.
  const t = f.time;
  const drift = look.ambient && !ui.preferences().reducedMotion ? 0.5 - 0.5 * Math.cos((t / 28) * Math.PI) : 0;
  const zoom = 1.03 + 0.06 * drift;
  cover(keyArt, 0, 0, W, Hh, 0.6 + 0.014 * drift, 0.5 + 0.01 * drift, 0.55, look.ambient ? zoom : 1);
  draw.box(0, 0, W, Hh, { background: { type: "linear", stops: [{ color: "#1a121000", at: 0.4 }, { color: COLORS.bg, at: 1 }] } });
  if (look.grade) {
    draw.box(0, 0, W, Hh, { background: [
      { type: "radial", center: { x: 0.5, y: 0.42 }, stops: [{ color: "#0b070600", at: 0.42 }, { color: "#0b0706c4", at: 1 }] },
      { type: "linear", angle: 160, stops: ["#ff9f4a14", "#3a1f5a14"] },
    ] });
  }
  void L;
}

// ------------------------------------------------------------------ the title
function titleScreen(L: Layout): void {
  const cardW = Math.min(650, L.lw - 40);
  const pad = clamp(L.lw * 0.06, 24, 60);
  const inner = cardW - pad * 2;
  const titleSize = clamp(L.lw * 0.07, 35.2, 64);
  const top = Math.max(20, (L.lh - H("title-card", 420)) / 2);
  ui.column("title-page", () => {
    ui.widget("", { role: "none", size: { width: 1, height: top } });
    const r = ui.style("title-card", { width: cardW, padding: pad }).column("title", () => {
      ui.style("title-name", { text: { size: titleSize, align: "center" } }).paragraph("Companion Club", inner);
      ui.widget("", { role: "none", size: { width: 1, height: 4 } });
      ui.style("tagline", { text: { align: "center" } }).paragraph(tr("Guide clubhouse friends, serve their wishes, and keep every station tidy."), inner);
      ui.widget("", { role: "none", size: { width: 1, height: 8 } });
      para(accountLine(), inner, ["account", { text: { align: "center" } }], "account");
      const plat: Btn[] = [];
      if (!platform.signedIn()) plat.push({ id: "btn-signin", text: pt("signIn"), style: ["btn", "btn-secondary"], act: signIn });
      else if (platform.inviteLink()) plat.push({ id: "btn-invite", text: pt("invite"), style: ["btn", "btn-secondary"], act: copyInvite });
      if (plat.length) { ui.widget("", { role: "none", size: { width: 1, height: 4 } }); flow("plat", plat, inner); }
      ui.widget("", { role: "none", size: { width: 1, height: 12 } });
      flow("title-actions", [
        { id: "btn-play", text: tr("Play"), style: ["btn", "btn-play"], act: start },
        { id: "btn-settings", text: tr("Settings"), style: ["btn", "btn-secondary"], act: openMenu },
      ], inner);
    }, { align: "center", spacing: 8 });
    track("title-card", r);
  }, { align: "center", width: L.lw });
}
function accountLine(): string {
  if (!platform.signedIn()) return pt("offline");
  const s = platform.syncState();
  const sync = s === "synced" ? pt("synced") : s === "saving" ? pt("saving") : pt("nosync");
  return pt("playing", { name: platform.displayName() || "…" }) + " · " + sync;
}
/** Buttons at their own widths in rows that wrap at `width` (CSS flex-wrap), centred. */
function flow(label: string, list: Btn[], width: number, gap = 10): void {
  const rows: Btn[][] = [[]];
  let used = 0;
  for (const b of list) {
    const bw = Math.min(width, textWidth(b.text, b.style ?? ["btn"], "button") + 2);
    if (rows[rows.length - 1]!.length && used + gap + bw > width) { rows.push([]); used = 0; }
    used += (rows[rows.length - 1]!.length ? gap : 0) + bw;
    rows[rows.length - 1]!.push(b);
  }
  ui.column(label, () => {
    rows.forEach((row, ri) => ui.row(`${label}-r${ri}`, () => { for (const b of row) button(b, textWidth(b.text, b.style ?? ["btn"], "button") + 2 > width ? width : null); }, { spacing: gap, align: "center" }));
  }, { spacing: gap, align: "center" });
}

// ------------------------------------------------------------------ the club day
function gameScreen(L: Layout): void {
  const s = state!;
  const pagePad = clamp(L.lw * 0.015, 8, 20);
  const W = Math.min(1280, L.lw) - pagePad * 2;
  const x0 = Math.max(0, (L.lw - Math.min(1280, L.lw)) / 2);
  ui.row("game-page", () => {
    if (x0 > 0) ui.widget("", { role: "none", size: { width: x0, height: 1 } });
    ui.column("game", () => {
      header(L, W);
      const headH = H("header", 60);
      const gapH = L.shortLand ? 6 : L.phone ? 8 : 16;
      const bodyH = Math.max(120, L.lh - pagePad * 2 - headH - gapH);
      ui.widget("", { role: "none", size: { width: 1, height: gapH } });
      if (L.phone) phoneBody(L, W, bodyH);
      else wideBody(L, W, bodyH);
    }, { width: W, padding: { top: pagePad, bottom: pagePad }, spacing: 0 });
  }, { padding: { start: pagePad, end: pagePad } });
  void s;
}

function header(L: Layout, W: number): void {
  const s = state!;
  const nameSize = L.shortLand ? 19.2 : L.phone ? 22.4 : clamp(L.lw * 0.04, 27.2, 41.6);
  const stats = (): void => rich("stats", tr("Served {served} · Turns {turns} · Score {score}"), { served: `${s.fulfilled}/${s.cfg.goal}`, turns: s.tick, score: s.score.total }, "stats", "stats-b");
  const brand = (): void => {
    ui.column("brand", () => {
      ui.style("game-name", { text: { size: nameSize } }).label("Companion Club");
      ui.style("day").label(tr("Clubhouse Day {n}", { n: 1 }));
    }, { spacing: 0 });
  };
  const gear = (iconOnly: boolean): void => {
    if (iconOnly) button({ id: "btn-gear", text: tr("Settings"), style: ["btn", "btn-gear", { width: 44, padding: 0 }], act: openMenu, content: () => gearGlyph(20) });
    else button({ id: "btn-gear", text: tr("Settings"), style: ["btn", "btn-gear"], act: openMenu, content: () => ui.row("gear-face", () => { gearGlyph(16); ui.label(tr("Settings")); }, { spacing: 6, align: "center" }) });
  };
  const r = L.phone
    ? ui.column("header", () => {
      ui.row("header-top", () => { brand(); ui.spacer(); gear(L.narrow); }, { width: W, align: "start" });
      ui.widget("", { role: "none", size: { width: 1, height: 4 } });
      stats();
    }, { width: W, spacing: 0 })
    : ui.row("header", () => { brand(); ui.spacer(); stats(); ui.spacer(); gear(L.narrow); }, { width: W, align: "center" });
  track("header", r);
}
/** ⚙ (no symbol font): a cog drawn in the text colour. */
function gearGlyph(size: number): void {
  ui.widget("", {
    role: "none", size: { width: size, height: size },
    draw: (r) => {
      const cx = r.x + r.width / 2, cy = r.y + r.height / 2, R = Math.min(r.width, r.height) / 2;
      const pts: [number, number][] = [];
      for (let i = 0; i < 48; i++) {
        const a = (i / 48) * Math.PI * 2;
        const tooth = Math.floor((i + 1.5) / 3) % 2 === 0 ? 1 : 0.74;
        pts.push([cx + Math.cos(a) * R * tooth, cy + Math.sin(a) * R * tooth]);
      }
      draw.polygon(pts, COLORS.text);
      draw.circle(cx, cy, R * 0.32, COLORS.soft);
    },
  });
}

/** Two columns: the Friends panel and the clubhouse floor (CSS grid minmax(250px, .8fr) minmax(0, 1.8fr)). */
function wideBody(L: Layout, W: number, bodyH: number): void {
  const gap = L.shortLand ? 8 : 16;
  const sideW = L.shortLand ? Math.max(200, ((W - gap) * 0.7) / 2.3) : Math.max(250, ((W - gap) * 0.8) / 2.6);
  const boardW = W - gap - sideW;
  const pad = L.shortLand ? 8 : 16;
  ui.row("layout", () => {
    ui.style("side", { width: sideW, height: bodyH, padding: pad }).column("side", () => {
      const innerW = sideW - pad * 2;
      const innerH = bodyH - pad * 2;
      const content = (): void => friendsPanel(L, innerW, false);
      if (H("side-content", 0) > innerH + 1) ui.scrollArea("side-scroll", { width: innerW, height: innerH }, () => { track("side-content", ui.column("side-content", content)); });
      else track("side-content", ui.column("side-content", content));
    });
    ui.style("board-wrap", { width: boardW, height: bodyH, padding: pad }).column("floor", () => {
      const h2 = L.shortLand ? 16 : 24;
      const t = ui.style("h2", { text: { size: h2 } }).label(tr("Clubhouse floor"));
      track("floor-h2", t);
      const availW = boardW - pad * 2;
      const availH = bodyH - pad * 2 - H("floor-h2", h2 * 1.3) - (L.shortLand ? 6 : 16);
      ui.widget("", { role: "none", size: { width: 1, height: L.shortLand ? 6 : 16 } });
      const B = board.sizeBoard(availW, availH, L.lw);
      ui.column("board-fit", () => {
        ui.widget("", { role: "none", size: { width: 1, height: Math.max(0, (availH - B.height) / 2) } });
        board.buildBoard(B, !L.narrow, L.lw);
      }, { width: availW, align: "center", spacing: 0 });
    }, { spacing: 0 });
  }, { spacing: gap, align: "start" });
}

/** Phone: the floor on top (its heading hidden), the Friends panel under it. */
function phoneBody(L: Layout, W: number, bodyH: number): void {
  const sideH = H("side-phone", 330);
  const floorH = Math.max(180, bodyH - sideH - 16);
  const pad = 10;
  ui.style("board-wrap", { width: W, height: floorH, padding: pad }).column("floor", () => {
    const availW = W - pad * 2, availH = floorH - pad * 2;
    const B = board.sizeBoard(availW, availH, L.lw);
    ui.column("board-fit", () => {
      ui.widget("", { role: "none", size: { width: 1, height: Math.max(0, (availH - B.height) / 2) } });
      board.buildBoard(B, !L.narrow, L.lw);
    }, { width: availW, align: "center", spacing: 0 });
  }, { spacing: 0 });
  ui.widget("", { role: "none", size: { width: 1, height: 16 } });
  const r = ui.style("side", { width: W, padding: 16 }).column("side", () => friendsPanel(L, W - 32, true));
  track("side-phone", r);
}

/** The Friends panel: heading, the friends, the message line, the direction pad and the actions. */
function friendsPanel(L: Layout, w: number, phone: boolean): void {
  const s = state!;
  const compact = L.shortLand;
  const live = playLive();
  ui.column("friends-panel", () => {
    ui.style("h2", compact ? { text: { size: 16 } } : {}).label(tr("Friends"));
    ui.widget("", { role: "none", size: { width: 1, height: compact ? 6 : 12 } });
    const colsN = phone || compact ? Math.max(1, Math.min(s.companions.length, Math.floor((w + 8) / (compact ? 100 : 128)))) : 1;
    const fw = (w - 8 * (colsN - 1)) / colsN;
    ui.grid("friends", () => {
      for (const c of s.companions) {
        const tint = "#" + ((C.COMPANIONS[c.id]?.color ?? 0) >>> 0).toString(16).padStart(6, "0");
        const sub = tr("Wants {activity} · {n} patience", { activity: activityName(c.wish?.activity), n: c.wish?.patience ?? "—" });
        const tintBorder: ui.Style = app.look.detailed
          ? { border: { width: { start: 5, top: 1, end: 1, bottom: 1 }, color: { start: tint, top: COLORS.line, end: COLORS.line, bottom: COLORS.line } },
            selected: { border: { color: { start: tint, top: COLORS.accent, end: COLORS.accent, bottom: COLORS.accent } } } }
          : {};
        const padStyle: ui.Style = phone ? { padding: 6 } : compact ? { padding: 5 } : {};
        if (ui.style("friend", tintBorder, padStyle, { width: fw }).id(`friend-${c.id}`).button(companionName(c.id), {
          selected: c.id === selected,
          disabled: !live,
          content: () => {
            ui.style("friend-name").label(companionName(c.id));
            ui.style("friend-sub", compact ? { text: { size: 12 } } : {}).paragraph(sub, fw - 24);
          },
        })) choose(c.id);
      }
    }, { columns: Array.from({ length: colsN }, () => ({ fr: 1 })), gap: 8, width: w });
    const msgSize = compact ? 13.6 : phone ? 14.4 : 16;
    const minH = (compact ? 1.5 : phone ? 2 : 3) * msgSize * 1.25;
    ui.widget("", { role: "none", size: { width: 1, height: compact ? 6 : 14 } });
    ui.column("message-box", () => {
      ui.style("message", { text: { size: msgSize } }).id("message").paragraph(message(), w);
    }, { width: w, ...(minH ? { height: Math.max(minH, H("message-box", 0) > minH ? H("message-box", 0) : minH) } : {}) });
    ui.widget("", { role: "none", size: { width: 1, height: compact ? 6 : 14 } });
    const padW = (w - 6 * 3) / 4;
    ui.row("pad", () => {
      const dirs: [string, string, "up" | "left" | "down" | "right"][] = [["↑", tr("Move up"), "up"], ["←", tr("Move left"), "left"], ["↓", tr("Move down"), "down"], ["→", tr("Move right"), "right"]];
      for (const [glyph, name, dir] of dirs) {
        button({ id: `pad-${dir}`, text: name, act: () => move(dir), disabled: !live, content: () => ui.style({ text: { align: "center", size: 17 } }).label(glyph) }, padW);
      }
    }, { spacing: 6 });
    ui.widget("", { role: "none", size: { width: 1, height: 9 } });
    const aw = (w - 7 * 2) / 3;
    ui.row("actions", () => {
      button({ id: "btn-serve", text: tr("Serve wish"), act: serve, disabled: !live }, aw);
      button({ id: "btn-tidy", text: tr("Tidy"), act: tidy, disabled: !live }, aw);
      button({ id: "btn-hint", text: tr("Hint"), act: hint, disabled: !live }, aw);
    }, { spacing: 7 });
  }, { width: w, spacing: 0 });
}

// ------------------------------------------------------------------ results
function results(L: Layout): void {
  const s = state!;
  const t = s.terminal!;
  const w = Math.min(520, L.lw - 32);
  const pad = clamp(L.lw * 0.04, 18, 36);
  const inner = w - pad * 2;
  const why = WHY[t.reason];
  const availH = L.lh - 32;
  ui.dialog("results", "", true, () => {
    const body = (): void => {
      const r = ui.style("result-card", { width: w, padding: pad }).column("result-card", () => {
        if (resultsArt) {
          const artH = Math.min(inner * (540 / 960), L.lh * 0.28);
          const img = resultsArt;
          ui.style("art").widget("", {
            role: "image", size: { width: inner, height: artH },
            draw: (rr) => { cover(img, rr.x, rr.y, rr.width, rr.height, 0.5, 0.5); },
          });
          ui.widget("", { role: "none", size: { width: 1, height: 12 } });
        }
        ui.style("result-title", { text: { align: "center" } }).id("result-title").paragraph(t.won ? tr("Club day complete!") : tr("Club day ended"), inner);
        ui.widget("", { role: "none", size: { width: 1, height: 8 } });
        if (why) ui.style("result-reason", { text: { align: "center" } }).paragraph(tr(why), inner);
        ui.widget("", { role: "none", size: { width: 1, height: 12 } });
        const parts = SCORE_PARTS.filter(([, k]) => s.score[k]);
        ui.grid("score", () => {
          for (const [label, k] of parts) {
            ui.style("score-cell").label(tr(label));
            ui.style("score-cell").label(String(s.score[k]));
          }
          ui.cell({ span: 2 }).widget("", { role: "none", size: { width: 1, height: 1 }, style: "score-rule" });
          ui.style("score-total").label(tr("Total"));
          ui.style("score-total").id("score-total").label(String(s.score.total));
        }, { columns: [{ width: "auto" }, { width: "auto", align: "end" }], gap: { column: 28, row: 6 } });
        if (lbLine) {
          ui.widget("", { role: "none", size: { width: 1, height: 10 } });
          ui.style("result-reason", { text: { align: "center" } }).id("result-lb").paragraph(lbLine(), inner);
        }
        ui.widget("", { role: "none", size: { width: 1, height: 14 } });
        button({ id: "btn-again", text: tr("Play again"), style: ["btn", "btn-again"], act: start });
      }, { align: "center", spacing: 0 });
      track("result-card", r);
    };
    if (H("result-card", 0) > availH) ui.scrollArea("result-scroll", { width: w + 10, height: availH }, body, frame().frame - app.openedFrame < 3 ? { scrollTo: { top: 0 } } : undefined);
    else body();
  });
}

// ------------------------------------------------------------------ toast
function toasts(): void {
  const tt = app.toast;
  if (!tt) return;
  const L = layoutNow();
  const w = Math.min(560, L.lw - 32);
  ui.place("toast", { anchor: "bottom", y: 16 }, () => {
    ui.style("toast", { width: w }).column("toast-box", () => { para(tt.text(), w - 34, ["body"], "toast-text"); });
  });
}
