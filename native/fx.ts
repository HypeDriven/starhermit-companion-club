// The browser build's effects layer (js/fx.js: a click-through canvas over
// the page, blended "screen"): the hearth lamp's warm light from the upper
// right flickering gently (Glow with Ambient motion), dust motes drifting
// up through it (Particles), and the sparkle bursts at the cells where
// things happened — gold stars for a served wish, pale bubbles for a tidied
// station, confetti over the whole window for a won day. Drawn each frame
// with starhermit:draw from a 0 × 0 placed widget built last, so it paints
// over the UI without taking the pointer. Counts follow the graphics level
// (quality.ts); reduced motion stills the motes and drops the bursts.
import { frame } from "starhermit:engine";
import * as draw from "starhermit:draw";
import * as ui from "starhermit:ui";
import type { Look } from "./quality.ts";

interface Mote { x: number; y: number; s: number; p: number; v: number }
interface Particle {
  x: number; y: number; vx: number; vy: number; g: number; life: number; max: number; size: number;
  color: string; shape: "star" | "bubble" | "confetti"; rot: number; spin: number;
}
let look: Look | null = null;
const motes: Mote[] = [];
let bursts: Particle[] = [];
let lastT = -1;

export function setLook(l: Look): void {
  look = l;
  while (motes.length < l.motes) motes.push({ x: Math.random(), y: Math.random(), s: 0.6 + Math.random() * 1.6, p: Math.random() * 6.28, v: 0.004 + Math.random() * 0.01 });
  motes.length = l.motes;
  if (l.particles === "off") bursts = [];
}
const reduced = (): boolean => ui.preferences().reducedMotion;

/** Sparkles at a rectangle (window pixels): serve | tidy | win (the whole window). */
export function burst(rect: ui.Rect | null, kind: "serve" | "tidy" | "win"): void {
  if (!look || look.particles === "off" || reduced() || (!rect && kind !== "win")) return;
  const f = frame();
  const k = ui.preferences().scale;
  const W = f.width, H = f.height;
  const cx = rect ? rect.x + rect.width / 2 : W / 2, cy = rect ? rect.y + rect.height / 2 : H / 2;
  const n = Math.round((kind === "win" ? 110 : 26) * look.burst);
  const colors = kind === "serve" ? ["#ffd27a", "#f6b85f", "#fff1c9"]
    : kind === "tidy" ? ["#dff2ff", "#bfe3ff", "#ffffff"]
      : ["#e07b39", "#f0d9a8", "#6fa8dc", "#5d9c59", "#8e6fc0", "#f6b85f", "#d9534f"];
  for (let i = 0; i < n; i++) {
    const ang = Math.random() * Math.PI * 2, sp = (kind === "win" ? 160 : 70) + Math.random() * (kind === "win" ? 260 : 110);
    const life = kind === "win" ? 1.8 + Math.random() * 0.8 : 0.7 + Math.random() * 0.5;
    const p: Particle = {
      x: kind === "win" ? W * (0.2 + Math.random() * 0.6) : cx + (Math.random() - 0.5) * (rect ? rect.width : 0) * 0.4,
      y: kind === "win" ? H * 0.35 : cy,
      vx: Math.cos(ang) * sp * k, vy: (kind === "tidy" ? -40 - Math.random() * 60 : Math.sin(ang) * sp - (kind === "win" ? 200 : 60)) * k,
      g: (kind === "tidy" ? -20 : kind === "win" ? 420 : 160) * k,
      life, max: life,
      size: (kind === "tidy" ? 2.5 + Math.random() * 4 : kind === "win" ? 3 + Math.random() * 2.5 : 2.5 + Math.random() * 3) * k,
      color: colors[i % colors.length]!, shape: kind === "serve" ? "star" : kind === "tidy" ? "bubble" : "confetti",
      rot: Math.random() * 6.28, spin: (Math.random() - 0.5) * 8,
    };
    if (kind === "tidy") p.vx *= 0.35;
    bursts.push(p);
  }
}

function hex(c: string, a: number): string {
  return c + Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, "0");
}
function starPts(x: number, y: number, s: number, rot: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < 8; i++) { const r = i % 2 ? s * 0.38 : s; const a = rot + (i * Math.PI) / 4; pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); }
  return pts;
}
function rectPts(x: number, y: number, w: number, h: number, rot: number): [number, number][] {
  const c = Math.cos(rot), s = Math.sin(rot);
  return ([[-w, -h], [w, -h], [w, h], [-w, h]] as const).map(([px, py]) => [x + px * c - py * s, y + px * s + py * c] as [number, number]);
}

function paint(): void {
  if (!look) return;
  const f = frame();
  const W = f.width, H = f.height, t = f.time;
  const dt = lastT < 0 ? 0 : Math.min(0.05, Math.max(0, t - lastT));
  lastT = t;
  const still = reduced();
  const k = ui.preferences().scale;
  // The hearth lamp from the upper right, flickering gently.
  if (look.bloom && look.ambient) {
    const fl = still ? 0 : Math.sin(t * 2.1) * 0.35 + Math.sin(t * 5.3 + 1.3) * 0.25 + Math.sin(t * 11) * 0.12;
    const a = (1 + fl * 0.27) / 1.2;
    const R = Math.max(W, H) * 0.75;
    const cx = W * 0.86, cy = -H * 0.05;
    draw.box(cx - R, cy - R, R * 2, R * 2, {
      background: { type: "radial", shape: "circle", radius: "closest-side", stops: [
        { color: hex("#ffbe6e", 0.132 * a), at: 0 }, { color: hex("#ffa050", 0.048 * a), at: 0.5 }, { color: "#ff964600", at: 1 },
      ] },
    });
  }
  // Dust motes drifting up through the light.
  for (const m of motes) {
    if (!still && dt) {
      m.y -= m.v * dt * 1.2; m.x += Math.sin(t * 0.4 + m.p) * 0.00012;
      if (m.y < -0.02) { m.y = 1.02; m.x = Math.random(); }
    }
    const a = still ? 0.25 : 0.18 + 0.22 * (0.5 + 0.5 * Math.sin(t * 1.2 + m.p * 3));
    draw.circle(m.x * W, m.y * H, m.s * k, hex("#ffddaa", a), { blend: "screen" });
  }
  // Bursts.
  for (let j = bursts.length - 1; j >= 0; j--) {
    const b = bursts[j]!;
    b.life -= dt;
    if (b.life <= 0) { bursts.splice(j, 1); continue; }
    b.vy += b.g * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.rot += b.spin * dt;
    const al = Math.min(1, (b.life / b.max) * 1.6);
    if (b.shape === "star") draw.polygon(starPts(b.x, b.y, b.size, b.rot), hex(b.color, al));
    else if (b.shape === "bubble") {
      draw.strokeCircle(b.x, b.y, b.size, hex(b.color, al), 1.2 * k, { blend: "screen" });
      draw.circle(b.x, b.y, b.size, hex(b.color, al * 0.25), { blend: "screen" });
    } else draw.polygon(rectPts(b.x, b.y, b.size, b.size * 0.5, b.rot), hex(b.color, al));
  }
}

/** Builds the layer (last in the frame, so it draws over the UI). */
export function layer(): void {
  ui.place("fx", "top-start", () => {
    ui.widget("", { role: "none", size: { width: 0, height: 0 }, draw: paint });
  });
}
