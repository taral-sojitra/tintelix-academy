import type { Inputs, SceneSpec } from "@tintelix/schema";
import { formatOutput } from "@tintelix/schema";
import type { Effects } from "../effects";
import { cacheAside } from "../routers/cache-aside";
import type { SimEvent } from "../sim";
import type { SceneRuntime, StepContext, Tile, WireStyle } from "./types";

export const KEY_COUNT = 24;
/** Storm cycle, in seconds of simulated time: keys live 5 s, the cache is empty 2.5 s, then refills. */
const STORM = { cycle: 14, expire: 5, empty: 7.5 };

export interface CacheKey { on: boolean; flash: "" | "flash" | "fill" | "exp"; t: number }

export interface CacheAsideState {
  keys: CacheKey[];
  /** 0..1 while the cache node and its wires grow in. */
  reveal: number;
  ttl: { show: boolean; text: string; progress: number; tone: "ok" | "urgent" | "empty" | "refill" };
  pings: Record<string, number>;
  flashes: Record<string, number>;
  hasCache: boolean;
}

export type CacheAsideScene = SceneRuntime & { state: CacheAsideState; lane: [number, number]; hitRate(ctx: StepContext): number; cacheReady(): boolean };

export function createCacheAsideScene(o: { fx: Effects; rand: () => number; scene: SceneSpec }): CacheAsideScene {
  const { fx, rand } = o;
  const node = (id: string) => o.scene.nodes[id] ?? { x: 0, y: 0, w: 0, h: 0 };
  const centre = (id: string): [number, number] => [node(id).x + node(id).w / 2, node(id).y + node(id).h / 2];
  const [cx, cy] = centre("cache");
  const db = node("db");
  const lane: [number, number] = [db.x + 21, db.y + db.h - 19];
  const users = node("users");
  const usersEdge: [number, number] = [users.x + users.w, users.y + users.h / 2];
  const state: CacheAsideState = {
    keys: Array.from({ length: KEY_COUNT }, () => ({ on: false, flash: "", t: 0 })),
    reveal: 0,
    ttl: { show: false, text: "", progress: 0, tone: "ok" },
    pings: {},
    flashes: {},
    hasCache: false,
  };
  let ctxRef: StepContext | null = null;
  let revealTarget = 0;
  let prevCycle = 0;
  let keyClock = 0;
  let jitterClock = 0;

  const cacheReady = () => state.hasCache && state.reveal >= 0.999;
  const target = (ctx: StepContext) => ctx.inputs.hitRate ?? 0;

  function hitRate(ctx: StepContext): number {
    if (!cacheReady()) return 0;
    const h = target(ctx);
    if (ctx.overridden) return h;
    const t = ctx.stepTime;
    switch (ctx.step.sim?.mode) {
      case "warm":
        return h * (1 - Math.exp(-Math.max(0, t - 0.4) / 2.8));
      case "storm": {
        const c = t % STORM.cycle;
        return c < STORM.expire ? h : c < STORM.empty ? 0 : h * (1 - Math.exp(-(c - STORM.empty) / 2.4));
      }
      case "jitter":
        return Math.min(1, Math.max(0, h - 0.005 + 0.01 * Math.sin(ctx.simTime * 1.9) + 0.005 * Math.sin(ctx.simTime * 5.3)));
      default:
        return h;
    }
  }

  const keysOn = () => state.keys.filter((k) => k.on).length;
  const setKey = (k: CacheKey, on: boolean, flash: CacheKey["flash"] = "") => {
    k.on = on;
    k.flash = flash;
    k.t = flash ? 0.28 : 0;
  };
  const randKey = (on: boolean) => {
    const c = state.keys.filter((k) => k.on === on);
    return c.length ? c[Math.floor(rand() * c.length)]! : null;
  };
  const keyTarget = (ctx: StepContext) => {
    const t = target(ctx);
    return cacheReady() && t > 0 ? Math.round(KEY_COUNT * Math.min(1, hitRate(ctx) / t)) : 0;
  };

  const router = cacheAside({ hitRate: () => (ctxRef ? hitRate(ctxRef) : 0), cacheReady });

  return {
    lane,
    router,
    fx,
    state,
    hitRate,
    cacheReady,

    liveInputs(ctx): Inputs {
      return { ...ctx.inputs, hitRate: hitRate(ctx) };
    },

    enterStep(ctx) {
      ctxRef = ctx;
      const had = state.hasCache;
      state.hasCache = ctx.visible.has("cache");
      revealTarget = state.hasCache ? 1 : 0;
      prevCycle = 0;
      if (state.hasCache && !had) {
        state.reveal = 0;
        fx.burst(cx, cy, 34, ["green", "cyan", "white"]);
      }
      const warm = ctx.step.sim?.mode === "warm";
      for (const k of state.keys) setKey(k, state.hasCache && !warm);
      state.ttl.show = ctx.step.sim?.mode === "storm" || ctx.step.sim?.mode === "jitter";
    },

    update(dt, ctx) {
      ctxRef = ctx;
      if (state.reveal < revealTarget) state.reveal = Math.min(revealTarget, state.reveal + dt / 0.9);
      else if (state.reveal > revealTarget) state.reveal = Math.max(revealTarget, state.reveal - dt / 0.5);
      const mode = ctx.step.sim?.mode;
      if (mode === "storm" && cacheReady()) {
        const c = ctx.stepTime % STORM.cycle;
        if (prevCycle < STORM.expire && c >= STORM.expire) {
          for (const k of state.keys) setKey(k, false, "exp");
          fx.burst(cx, cy, 60, ["red", "amber", "green", "white"], [80, 260]);
          fx.float(node("cache").x + 8, node("cache").y - 16, "ALL KEYS EXPIRED", "red", true);
          fx.ripple(cx, cy, "red", 140, 1.0);
        }
        prevCycle = c;
        const rem = Math.max(0, STORM.expire - c);
        state.ttl.text = c < STORM.expire ? `${Math.ceil(rem)}s` : c < STORM.empty ? "empty" : "refill";
        state.ttl.progress = c < STORM.expire ? rem / STORM.expire : c < STORM.empty ? 0 : (c - STORM.empty) / (STORM.cycle - STORM.empty);
        state.ttl.tone = c < STORM.expire ? (rem < 2 ? "urgent" : "ok") : c < STORM.empty ? "empty" : "refill";
      } else if (mode === "jitter") {
        state.ttl.text = "±10%";
        state.ttl.progress = 1;
        state.ttl.tone = "ok";
        jitterClock -= dt;
        if (jitterClock <= 0 && cacheReady()) {
          const k = randKey(true);
          if (k) setKey(k, false, "exp");
          jitterClock = 0.25 + rand() * 0.35;
        }
      }
      keyClock -= dt;
      if (keyClock <= 0 && cacheReady()) {
        const want = keyTarget(ctx);
        const on = keysOn();
        const refilling = mode === "storm" && ctx.stepTime % STORM.cycle > STORM.empty;
        if (on < want && (mode !== "storm" || refilling)) {
          const k = randKey(false);
          if (k) setKey(k, true, refilling ? "fill" : "");
        } else if (on > want + 1) {
          const k = randKey(true);
          if (k) setKey(k, false);
        }
        keyClock = mode === "warm" ? 0.1 : 0.15;
      }
      for (const k of state.keys) if (k.t > 0 && (k.t -= dt) <= 0) k.flash = "";
      for (const n in state.pings) state.pings[n] = Math.max(0, state.pings[n]! - dt * 5);
      for (const w in state.flashes) state.flashes[w] = Math.max(0, state.flashes[w]! - dt * 3);
    },

    onEvent(e: SimEvent, ctx) {
      const slow = (ctx.step.sim?.speed ?? 1) < 1;
      const [x, y] = e.at;
      switch (e.kind) {
        case "pass":
          state.pings[e.node] = 1;
          break;
        case "leg":
          if (e.wire.startsWith("lb_a")) {
            state.flashes[e.wire] = 1;
            state.pings.lb = 1;
          }
          break;
        case "hit": {
          state.pings.cache = 1;
          const k = randKey(true);
          if (k) setKey(k, true, "flash");
          fx.ripple(x, y, "green", 22, 0.55);
          if (slow || rand() < 0.12) fx.float(x - 84, y - 12, "✓ HIT · 0.5 ms", "green");
          break;
        }
        case "miss":
          state.pings.cache = 1;
          fx.ripple(x, y, "amber", 22, 0.55);
          if (slow || rand() < 0.15) fx.float(x - 56, y - 12, "✕ MISS", "amber");
          break;
        case "fill": {
          state.pings.cache = 1;
          const k = keysOn() < keyTarget(ctx) + 1 ? randKey(false) ?? randKey(true) : randKey(true);
          if (k) setKey(k, true, "fill");
          fx.ripple(x, y, "violet", 16, 0.5);
          if (slow) fx.float(x - 78, y + 12, "+ stored", "violet");
          break;
        }
        case "dbIn":
          state.pings.db = 1;
          break;
        case "dbOut":
          fx.ripple(lane[0], lane[1], "amber", 14, 0.4);
          break;
        case "reply": {
          state.pings.users = 1;
          fx.ripple(usersEdge[0], usersEdge[1], e.hit ? "green" : "amber", 20, 0.5);
          if (slow || rand() < 0.28) {
            const live = ctx.model.run(this.liveInputs(ctx));
            const u = Math.min(live.dbBusy ?? 0, 0.95);
            const ms = e.hit ? 21 + rand() * 6 : 24 + (12 / (1 - u)) * (0.35 + rand() * 1.05);
            fx.float(users.x + 36 + rand() * 70, users.y - 16, formatOutput("p95", Math.round(ms)), e.hit ? "green" : ms > 120 ? "red" : "amber");
          }
          break;
        }
      }
    },

    wireStyles(): WireStyle[] {
      const out: WireStyle[] = [];
      for (const w of ["u_lb", "lb_a0", "lb_a1", "lb_a2"]) {
        out.push({ wire: w, color: "blue", alpha: 0.42, width: 2 });
        out.push({ wire: w, color: "cyan", alpha: 0.45, width: 2, dash: [2, 14], flowDir: 1 });
        const f = state.flashes[w] ?? 0;
        if (f > 0) out.push({ wire: w, color: "cyan", alpha: f * 0.7, width: 3.2 });
      }
      for (let a = 0; a < 3; a++) {
        if (state.reveal > 0) out.push({ wire: `a${a}_d`, color: "amber", alpha: 0.4, width: 1.8, dash: [5, 7], flowDir: 1 });
        else {
          out.push({ wire: `a${a}_d`, color: "blue", alpha: 0.5, width: 2 });
          out.push({ wire: `a${a}_d`, color: "cyan", alpha: 0.45, width: 2, dash: [2, 14], flowDir: 1 });
        }
        if (state.reveal > 0) {
          out.push({ wire: `a${a}_c`, color: "green", alpha: 0.55, width: 2, progress: state.reveal });
          out.push({ wire: `a${a}_c`, color: "green", alpha: 0.5, width: 2, dash: [2, 14], flowDir: -1, progress: state.reveal });
        }
      }
      return out;
    },

    tiles(d, ctx): Tile[] {
      const base = ctx.model.run({ ...ctx.inputs, hitRate: 0 });
      const has = state.hasCache;
      const hit = d.hitRatePct ?? 0;
      const p95 = d.p95 ?? 0;
      const reads = d.dbReads ?? 0;
      const load = d.dbBusyPct ?? 0;
      return [
        { id: "req", label: "Requests/s", icon: "activity", hue: "cyan", value: formatOutput("traffic", d.traffic ?? 0), note: "steady", mood: "" },
        { id: "hit", label: "Hit rate", icon: "bolt", hue: "green", value: has ? formatOutput("hitRatePct", hit) : "—", note: has ? (hit > 1 ? "▲ from 0%" : "cold cache") : "no cache", mood: has && hit > 50 ? "good" : has && hit < 20 ? "bad" : "" },
        { id: "p95", label: "p95 latency", icon: "timer", hue: "violet", value: formatOutput("p95", p95), note: p95 < (base.p95 ?? 0) - 10 ? `▼ from ${formatOutput("p95", base.p95 ?? 0)}` : "slowest 5%", mood: p95 > 120 ? "bad" : p95 < 60 ? "good" : "" },
        { id: "dbr", label: "DB reads/s", icon: "db", hue: "blue", value: formatOutput("dbReads", Math.round(reads / 10) * 10), note: reads < (base.dbReads ?? 0) * 0.97 ? `▼ from ${formatOutput("dbReads", base.dbReads ?? 0)}` : "every request", mood: reads < (base.dbReads ?? 0) / 2 ? "good" : reads > (base.dbReads ?? 0) * 0.83 ? "bad" : "" },
        { id: "load", label: "DB load", icon: "gauge", hue: "amber", value: formatOutput("dbBusyPct", load), note: load > 85 ? "saturated" : load < 60 ? `▼ from ${formatOutput("dbBusyPct", base.dbBusyPct ?? 0)}` : "busy", mood: load > 85 ? "bad" : load < 40 ? "good" : "" },
      ];
    },
  };
}
