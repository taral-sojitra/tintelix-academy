import type { View } from "../camera";
import type { Particle, Float, Ripple } from "../effects";
import type { Wire } from "../geometry";
import { withAlpha, type Palette } from "../palette";
import type { Packet } from "../sim";
import type { WireStyle } from "../scenes/types";

export interface Surface {
  ctx: CanvasRenderingContext2D;
  dpr: number;
  w: number;
  h: number;
}

/** Left edge for a label of width w that starts at x, on a stage w wide. */
export function fitLabelX(x: number, w: number, stageW: number): number {
  const margin = 6;
  return Math.max(margin, Math.min(x, stageW - w - margin));
}

function clear(s: Surface, view?: View) {
  s.ctx.setTransform(1, 0, 0, 1, 0, 0);
  s.ctx.clearRect(0, 0, s.w * s.dpr, s.h * s.dpr);
  if (view) s.ctx.setTransform(s.dpr * view.s, 0, 0, s.dpr * view.s, s.dpr * view.ox, s.dpr * view.oy);
}

function drawWire(ctx: CanvasRenderingContext2D, w: Wire, st: WireStyle, color: string, flowClock: number) {
  const prog = st.progress ?? 1;
  if (prog <= 0) return;
  const n = Math.max(1, Math.round((w.pts.length - 1) * prog));
  ctx.beginPath();
  ctx.moveTo(w.pts[0]![0], w.pts[0]![1]);
  for (let i = 1; i <= n; i++) ctx.lineTo(w.pts[i]![0], w.pts[i]![1]);
  ctx.strokeStyle = withAlpha(color, st.alpha);
  ctx.lineWidth = st.width;
  ctx.setLineDash(st.dash ?? []);
  ctx.lineDashOffset = st.dash ? -flowClock * 26 * (st.flowDir ?? 1) : 0;
  ctx.stroke();
}

/** Wires and landing rings, behind the boxes. */
export function drawBack(s: Surface, view: View, wires: Record<string, Wire>, styles: WireStyle[], ripples: Ripple[], pal: Palette, flowClock: number) {
  clear(s, view);
  const { ctx } = s;
  ctx.lineCap = "round";
  for (const st of styles) {
    const w = wires[st.wire];
    if (w) drawWire(ctx, w, st, pal.colors[st.color], flowClock);
  }
  ctx.setLineDash([]);
  for (const r of ripples) {
    const a = r.life / r.max;
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
    ctx.strokeStyle = withAlpha(pal.colors[r.color], a * 0.9);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = withAlpha(pal.colors[r.color], a * 0.12);
    ctx.fill();
  }
}

export interface QueueView {
  at: [number, number];
  waiting: number;
  serving: boolean;
  simTime: number;
}

/** The database queue, moving requests, bursts and floating labels, in front of the boxes. */
export function drawFront(s: Surface, view: View, packets: Packet[], queue: QueueView | null, particles: Particle[], floats: Float[], pal: Palette) {
  clear(s, view);
  const { ctx } = s;
  const c = pal.colors;
  if (queue) {
    const [lx, ly] = queue.at;
    if (queue.serving) {
      const pulse = 0.6 + 0.4 * Math.sin(queue.simTime * 18);
      const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, 12);
      g.addColorStop(0, withAlpha(c.amber, 0.7 * pulse));
      g.addColorStop(1, withAlpha(c.amber, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(lx, ly, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = c.amber;
      ctx.beginPath();
      ctx.arc(lx, ly, 4.4, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < Math.min(queue.waiting, 11); i++) {
      ctx.fillStyle = withAlpha(queue.waiting > 6 ? c.red : c.amber, 0.9 - i * 0.04);
      ctx.beginPath();
      ctx.arc(lx + 15 + i * 13.5, ly, 3.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalCompositeOperation = pal.dark ? "lighter" : "source-over";
  for (const p of packets) {
    if (p.hidden || p.inNode) continue;
    const col = c[p.color];
    const t = p.trail;
    for (let i = 1; i < t.length; i++) {
      const f = i / t.length;
      ctx.strokeStyle = withAlpha(col, f * (p.small ? 0.4 : 0.55));
      ctx.lineWidth = (p.small ? 1.6 : 3) * f + 0.4;
      ctx.beginPath();
      ctx.moveTo(t[i - 1]![0], t[i - 1]![1]);
      ctx.lineTo(t[i]![0], t[i]![1]);
      ctx.stroke();
    }
    const R = p.small ? 8 : 12;
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, R);
    g.addColorStop(0, withAlpha(col, pal.dark ? 0.55 : 0.3));
    g.addColorStop(1, withAlpha(col, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, R, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const q of particles) {
    ctx.fillStyle = withAlpha(c[q.color], Math.max(0, q.life / q.max));
    ctx.fillRect(q.x - q.size / 2, q.y - q.size / 2, q.size, q.size);
  }
  ctx.globalCompositeOperation = "source-over";
  for (const p of packets) {
    if (p.hidden || p.inNode) continue;
    ctx.fillStyle = c[p.color];
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.small ? 2.7 : 4.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pal.dark ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.75)";
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.small ? 1 : 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  // Labels are drawn in screen space so they stay readable at any scale.
  ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
  for (const f of floats) {
    const a = Math.min(1, (f.life / f.max) * 2.2);
    const x = f.x * view.s + view.ox;
    const y = f.y * view.s + view.oy;
    ctx.font = `${f.big ? 700 : 600} ${f.big ? 13 : 11}px "IBM Plex Mono", ui-monospace, monospace`;
    const w = ctx.measureText(f.text).width + (f.big ? 20 : 14);
    const h = f.big ? 24 : 19;
    const lx = fitLabelX(x, w, s.w);
    ctx.globalAlpha = a;
    ctx.fillStyle = pal.dark ? "rgba(6,16,34,0.9)" : "rgba(255,252,246,0.95)";
    ctx.strokeStyle = withAlpha(c[f.color], 0.75);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(lx, y - h / 2, w, h, h / 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = c[f.color];
    ctx.textBaseline = "middle";
    ctx.fillText(f.text, lx + (f.big ? 10 : 7), y + 0.5);
    ctx.globalAlpha = 1;
  }
}

/** A scene's chart metric over the last 30 seconds, on a 0..max scale with a dashed danger line. */
export function drawChart(s: Surface, hist: number[], pal: Palette, scale: { max: number; danger: number }) {
  const { ctx, w, h } = s;
  clear(s);
  ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
  const y = (v: number) => h - 3 - (Math.min(v, scale.max) / scale.max) * (h - 6);
  const c = pal.colors;
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  ctx.strokeStyle = withAlpha(c.blue, 0.18);
  for (const v of [0.25, 0.5, 0.75].map((f) => f * scale.max)) {
    ctx.beginPath();
    ctx.moveTo(0, y(v));
    ctx.lineTo(w, y(v));
    ctx.stroke();
  }
  ctx.strokeStyle = withAlpha(c.red, 0.6);
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(0, y(scale.danger));
  ctx.lineTo(w, y(scale.danger));
  ctx.stroke();
  ctx.setLineDash([]);
  const n = hist.length;
  const dx = w / (n - 1);
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, withAlpha(c.red, 0.45));
  grad.addColorStop(0.45, withAlpha(c.amber, 0.25));
  grad.addColorStop(1, withAlpha(c.cyan, 0.05));
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let i = 0; i < n; i++) ctx.lineTo(i * dx, y(hist[i]!));
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, y(hist[0]!));
  for (let i = 1; i < n; i++) ctx.lineTo(i * dx, y(hist[i]!));
  ctx.strokeStyle = pal.dark ? "#9cc0ff" : withAlpha(c.blue, 0.9);
  ctx.lineWidth = 1.5;
  ctx.stroke();
  const last = hist[n - 1]!;
  ctx.fillStyle = last > 85 ? c.red : last > 50 ? c.amber : c.green;
  ctx.beginPath();
  ctx.arc(w - 3, y(last), 3, 0, Math.PI * 2);
  ctx.fill();
}
