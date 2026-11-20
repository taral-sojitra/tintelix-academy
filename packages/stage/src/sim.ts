import { posAt, type Point, type Wire } from "./geometry";

/** Colour names; the renderer turns them into the theme's CSS colours. */
export type Hue = "cyan" | "green" | "amber" | "violet" | "red";

export interface Leg {
  wire: string;
  dir: 1 | -1;
  color: Hue;
  /** Tells the router what the packet reached at the end of this leg. */
  end?: string;
}

export interface Packet {
  id: number;
  /** Which app server (round robin) the request went to. */
  lane: number;
  route: Leg[];
  leg: number;
  s: number;
  x: number;
  y: number;
  color: Hue;
  kind: "req" | "hit" | "miss" | "db" | "fill";
  small: boolean;
  hidden: boolean;
  dead: boolean;
  inNode: boolean;
  wait: number;
  trail: Point[];
}

export type SimEvent =
  | { kind: "spawn"; node: string; at: Point }
  | { kind: "pass"; node: string; at: Point }
  | { kind: "leg"; node: string; wire: string; at: Point }
  | { kind: "hit" | "miss" | "fill" | "dbIn" | "dbOut"; node: string; at: Point }
  | { kind: "reply"; node: string; at: Point; hit: boolean };

export interface Router {
  /** Give a new request its first legs. */
  spawn(p: Packet, sim: Sim): void;
  /** Called when a packet finishes a leg that has an `end`. */
  arrive(p: Packet, leg: Leg, sim: Sim): void;
  /** Called when a queue finishes serving a packet. */
  served?(p: Packet, queue: string, sim: Sim): void;
}

/** One server with a fixed service time of 1/mu seconds, first in first out. */
export class Queue {
  private items: Packet[] = [];
  serving: Packet | null = null;
  private remain = 0;
  constructor(public mu: number) {}
  push(p: Packet): void {
    this.items.push(p);
  }
  get waiting(): number {
    return this.items.length;
  }
  /** Advance by dt seconds and return every packet finished in that time, oldest first. */
  tick(dt: number): Packet[] {
    const done: Packet[] = [];
    let left = dt;
    for (;;) {
      if (!this.serving) {
        if (!this.items.length) return done;
        this.serving = this.items.shift()!;
        this.remain = 1 / this.mu;
      }
      if (this.remain > left + 1e-9) {
        this.remain -= left;
        return done;
      }
      // The leftover time goes to the next packet, so the rate does not depend on the tick size.
      left -= this.remain;
      done.push(this.serving);
      this.serving = null;
    }
  }
  clear(): void {
    this.items = [];
    this.serving = null;
  }
}

export interface SimOptions {
  wires: Record<string, Wire>;
  router: Router;
  rand: () => number;
  /** Visual requests per second. */
  ratePerSec: number;
  /** World units per second. */
  speed: number;
  /** Service rate per queue name. */
  queues?: Record<string, number>;
  trailLimit?: number;
}

const OFFSET = 3.5;

/** Requests moving along wires, with the router deciding where each goes next. */
export class Sim {
  packets: Packet[] = [];
  readonly queues: Record<string, Queue> = {};
  /** Everything that happened since the last `drain()`. */
  events: SimEvent[] = [];
  ratePerSec: number;
  readonly wires: Record<string, Wire>;
  readonly rand: () => number;
  private readonly router: Router;
  private readonly speed: number;
  private readonly trailLimit: number;
  private nextSpawn = 0.05;
  private ids = 0;

  constructor(o: SimOptions) {
    this.wires = o.wires;
    this.router = o.router;
    this.rand = o.rand;
    this.ratePerSec = o.ratePerSec;
    this.speed = o.speed;
    this.trailLimit = o.trailLimit ?? 13;
    for (const [name, mu] of Object.entries(o.queues ?? {})) this.queues[name] = new Queue(mu);
  }

  /** A packet with no legs yet; the router or caller adds them. */
  packet(lane: number, at: Point, init: Partial<Packet> = {}): Packet {
    return { id: ++this.ids, lane, route: [], leg: 0, s: 0, x: at[0], y: at[1], color: "cyan", kind: "req", small: false, hidden: false, dead: false, inNode: false, wait: 0, trail: [], ...init };
  }

  add(p: Packet): void {
    this.packets.push(p);
  }

  emit(e: SimEvent): void {
    this.events.push(e);
  }

  /** Returns and clears the events since the last call. */
  drain(): SimEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  reset(): void {
    this.packets = [];
    for (const q of Object.values(this.queues)) q.clear();
    this.nextSpawn = 0.05;
  }

  step(dt: number): void {
    if (dt <= 0) return;
    if (this.ratePerSec > 0) {
      this.nextSpawn -= dt;
      while (this.nextSpawn <= 0) {
        const p = this.packet(0, [0, 0]);
        this.router.spawn(p, this);
        const first = p.route[0];
        if (first) [p.x, p.y] = this.legPoint(first, 0);
        this.add(p);
        this.emit({ kind: "spawn", node: "users", at: [p.x, p.y] });
        this.nextSpawn += -Math.log(1 - this.rand()) / this.ratePerSec;
      }
    }
    for (const p of [...this.packets]) this.advance(p, dt);
    for (const [name, q] of Object.entries(this.queues)) {
      for (const done of q.tick(dt)) {
        done.hidden = false;
        this.router.served?.(done, name, this);
      }
    }
    this.packets = this.packets.filter((p) => !p.dead);
    for (const p of this.packets) {
      if (p.hidden || p.wait > 0) continue;
      p.trail.push([p.x, p.y]);
      while (p.trail.length > this.trailLimit) p.trail.shift();
    }
  }

  private legPoint(leg: Leg, s: number): Point {
    const w = this.wires[leg.wire]!;
    return posAt(w, leg.dir > 0 ? s : w.len - s, leg.dir > 0 ? -OFFSET : OFFSET);
  }

  private advance(p: Packet, dt: number): void {
    if (p.dead || p.hidden) return;
    if (p.wait > 0) {
      p.wait -= dt;
      if (p.wait <= 0) p.inNode = false;
      return;
    }
    let budget = this.speed * dt * (p.small ? 0.9 : 1);
    while (budget > 0 && !p.dead && !p.hidden) {
      const leg = p.route[p.leg];
      if (!leg) {
        p.dead = true;
        break;
      }
      const w = this.wires[leg.wire]!;
      if (p.s === 0) this.emit({ kind: "leg", node: "", wire: leg.wire, at: [p.x, p.y] });
      const left = w.len - p.s;
      if (budget < left) {
        p.s += budget;
        budget = 0;
        break;
      }
      budget -= left;
      [p.x, p.y] = this.legPoint(leg, w.len);
      p.leg++;
      p.s = 0;
      if (leg.end) this.router.arrive(p, leg, this);
      const next = p.route[p.leg];
      if (next && !p.hidden && !p.dead) {
        const [sx, sy] = this.legPoint(next, 0);
        // Passing through a box: drop the trail and pause briefly, so no line is drawn across the box.
        if (Math.hypot(sx - p.x, sy - p.y) > 20) {
          p.trail = [];
          p.x = sx;
          p.y = sy;
          p.inNode = true;
          p.wait = Math.max(p.wait, 0.06);
        }
      }
      if (p.wait > 0) break;
    }
    const leg = p.route[p.leg];
    if (leg && !p.dead && !p.hidden && p.wait <= 0) {
      [p.x, p.y] = this.legPoint(leg, p.s);
      p.color = leg.color;
    } else if (leg) p.color = leg.color;
  }
}
