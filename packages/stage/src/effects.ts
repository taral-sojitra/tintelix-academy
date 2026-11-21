import type { Hue } from "./sim";

export interface Ripple { x: number; y: number; color: Hue; r: number; maxR: number; life: number; max: number }
export interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; color: Hue | "white"; size: number }
export interface Float {
  x: number;
  y: number;
  text: string;
  color: Hue;
  big: boolean;
  life: number;
  max: number;
  /** Set by the renderer: the screen offset that keeps the label clear of boxes and other labels. */
  dx?: number;
  dy?: number;
  /** The view scale the offset was worked out for; a resize places the label again. */
  placedAt?: number;
  /** No clear spot nearby: the label isn't drawn. */
  dropped?: boolean;
}

/** How fast a label drifts up, in world units a second. */
export const floatRise = (f: { big: boolean }) => (f.big ? 10 : 22);

/** Short-lived decorations: rings where requests land, bursts, and floating labels. */
export class Effects {
  ripples: Ripple[] = [];
  particles: Particle[] = [];
  floats: Float[] = [];
  /** Seconds of dash flow along wires; stays at 0 when motion is reduced. */
  flow = 0;
  readonly trailLimit: number;
  private readonly reducedMotion: boolean;
  private readonly rand: () => number;

  constructor(o: { reducedMotion: boolean; rand: () => number }) {
    this.reducedMotion = o.reducedMotion;
    this.rand = o.rand;
    this.trailLimit = o.reducedMotion ? 3 : 13;
  }

  ripple(x: number, y: number, color: Hue, maxR = 26, life = 0.7): void {
    if (this.reducedMotion) return;
    this.ripples.push({ x, y, color, r: 4, maxR, life, max: life });
  }

  burst(x: number, y: number, n: number, colors: (Hue | "white")[], spd: [number, number] = [60, 220]): void {
    if (this.reducedMotion) return;
    for (let i = 0; i < n; i++) {
      const a = this.rand() * Math.PI * 2;
      const v = spd[0] + this.rand() * (spd[1] - spd[0]);
      const life = 0.6 + this.rand() * 0.7;
      this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, life, max: 1.3, color: colors[i % colors.length]!, size: 1.5 + this.rand() * 2 });
    }
  }

  float(x: number, y: number, text: string, color: Hue, big = false): void {
    if (!big && this.floats.some((f) => Math.abs(f.x - x) < 80 && Math.abs(f.y - y) < 20)) return;
    const life = big ? 1.8 : 1.15;
    this.floats.push({ x, y, text, color, big, life, max: life });
  }

  step(dt: number): void {
    if (!this.reducedMotion) this.flow += dt;
    for (const r of this.ripples) {
      r.life -= dt;
      r.r += (r.maxR - r.r) * Math.min(1, dt * 6);
    }
    this.ripples = this.ripples.filter((r) => r.life > 0);
    for (const q of this.particles) {
      q.life -= dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.vx *= 1 - dt * 1.8;
      q.vy = q.vy * (1 - dt * 1.8) + 120 * dt;
    }
    this.particles = this.particles.filter((q) => q.life > 0);
    for (const f of this.floats) {
      f.life -= dt;
      if (!this.reducedMotion) f.y -= dt * floatRise(f);
    }
    this.floats = this.floats.filter((f) => f.life > 0);
  }

  clear(): void {
    this.ripples = [];
    this.floats = [];
  }
}
