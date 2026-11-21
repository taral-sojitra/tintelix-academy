import type { Inputs, Outputs, SceneNode, SceneSpec } from "@tintelix/schema";
import { formatOutput } from "@tintelix/schema/format";
import { keyAt, ownerOf, ringPoints } from "@tintelix/schema/ring";
import type { Effects } from "../effects";
import { nodeHead } from "../render/dom";
import { cacheRing } from "../routers/cachering";
import type { SimEvent } from "../sim";
import type { SceneChart, SceneRuntime, StepContext, Tile, WireStyle } from "./types";

export const KEY_COUNT = 48;
const LEGEND: SceneRuntime["legend"] = [["cyan", "read"], ["green", "cache hit"], ["amber", "key moved: fetched again"]];
const CHART: SceneChart = { label: "CACHE MISSES", output: "missPct", max: 100, danger: 20 };
const HUES = ["cyan", "amber", "violet", "blue", "green", "red", "node-ink"];
const R = 118;
const C = 150;

export function createRingScene(o: { fx: Effects; rand: () => number; scene: SceneSpec }): SceneRuntime {
  const { fx, rand } = o;
  let ctxRef: StepContext | null = null;
  let clock = 0;
  let key = "";
  let drawn = "";
  const inputKey = (i: Inputs) => JSON.stringify(Object.entries(i).filter(([k]) => k !== "elapsedSec").sort());
  const liveInputs = (ctx: StepContext): Inputs => ({ ...ctx.inputs, elapsedSec: clock });
  const live = (): Outputs => (ctxRef ? ctxRef.model.run(liveInputs(ctxRef)) : {});
  const f = (name: string, d: Outputs) => formatOutput(name, d[name] ?? 0);
  const hue = (s: number) => `var(--${HUES[s % HUES.length]})`;
  const els: { ring: HTMLElement | null; grid: HTMLElement | null; chips: HTMLElement | null; rule: HTMLElement | null } = { ring: null, grid: null, chips: null, rule: null };

  /** Who holds key k with n servers, under the scheme. */
  function owner(k: number, n: number, ring: boolean, vnodes: number): number {
    return ring ? ownerOf(keyAt(k), ringPoints(n, vnodes)) : Math.floor(keyAt(k) * 1e6) % n;
  }

  function draw(d: Outputs) {
    const ring = (d.scheme ?? 0) >= 0.5;
    const n0 = Math.round(d.servers ?? 4);
    const vnodes = Math.round(d.vnodes ?? 1);
    const joined = (d.joined ?? 0) >= 0.5;
    const n = joined ? n0 + 1 : n0;
    const stamp = `${ring}|${n0}|${vnodes}|${joined}`;
    if (stamp === drawn) return;
    drawn = stamp;
    const before = Array.from({ length: KEY_COUNT }, (_, k) => owner(k, n0, ring, vnodes));
    const now = Array.from({ length: KEY_COUNT }, (_, k) => owner(k, n, ring, vnodes));
    if (els.grid) {
      els.grid.hidden = ring;
      els.grid.innerHTML = now.map((s, k) => `<i class="${s !== before[k] ? "moved" : ""}" style="background:${hue(s)}"></i>`).join("");
    }
    if (els.ring) {
      els.ring.hidden = !ring;
      const pts = ringPoints(n, vnodes);
      const at = (pos: number, r: number) => {
        const a = pos * Math.PI * 2 - Math.PI / 2;
        return [C + r * Math.cos(a), C + r * Math.sin(a)].map((v) => v.toFixed(1));
      };
      const big = vnodes === 1 ? 7 : 2.6;
      const srv = pts.map((p) => {
        const [x, y] = at(p.pos, R);
        return `<circle class="srv" cx="${x}" cy="${y}" r="${big}" fill="${hue(p.server)}"/>`;
      });
      const keys = now.map((s, k) => {
        const [x, y] = at(keyAt(k), R - 22);
        return `<circle class="key${s !== before[k] ? " moved" : ""}" cx="${x}" cy="${y}" r="4" fill="${hue(s)}"/>`;
      });
      els.ring.innerHTML = `<svg viewBox="0 0 300 300" aria-hidden="true"><circle class="track" cx="${C}" cy="${C}" r="${R}"/>${keys.join("")}${srv.join("")}</svg>`;
    }
    if (els.chips) els.chips.innerHTML = Array.from({ length: n }, (_, s) => `<span><i style="background:${hue(s)}"></i>S${s + 1}${s === n0 ? " (new)" : ""}</span>`).join("");
    if (els.rule) els.rule.textContent = ring ? (vnodes > 1 ? `next point clockwise · ${vnodes} points per server` : "next server clockwise owns the key") : `server = hash(key) mod ${n}`;
  }

  return {
    router: cacheRing({ missShare: () => (live().missPct ?? 0) / 100 }),
    fx,
    legend: LEGEND,
    sim: { ratePerSec: 5 },
    chart: CHART,
    lane: null,
    liveInputs,

    enterStep(ctx) {
      ctxRef = ctx;
      clock = 0;
      key = inputKey(ctx.inputs);
    },

    update(dt, ctx) {
      ctxRef = ctx;
      const k = inputKey(ctx.inputs);
      if (k !== key) {
        key = k;
        clock = 0;
      }
      clock += dt;
    },

    onEvent(e: SimEvent, ctx) {
      ctxRef = ctx;
      // Above the database, so it never covers the keys.
      if (e.kind === "pass" && e.node === "db" && rand() < 0.35) fx.float(e.at[0] + 120, e.at[1] - 66, "key moved: refetched", "amber");
    },

    wireStyles(): WireStyle[] {
      return [
        { wire: "a_c", color: "blue", alpha: 0.42, width: 2 },
        { wire: "c_d", color: "blue", alpha: 0.32, width: 1.6 },
      ];
    },

    tiles(d, ctx): Tile[] {
      ctxRef = ctx;
      const ring = (d.scheme ?? 0) >= 0.5;
      const warming = (d.missPct ?? 0) > 0;
      return [
        { id: "a", label: "Keys that move", icon: "activity", hue: "amber", value: f("movedPct", d), note: `${f("movedKeys", d)} of ${f("keys", d)}`, mood: (d.movedPct ?? 0) > 50 ? "bad" : "good" },
        { id: "b", label: "Cache misses now", icon: "db", hue: "violet", value: f("missPct", d), note: warming ? "refetching from the database" : (d.joined ?? 0) >= 0.5 ? "warm again" : "new server joins shortly", mood: warming ? "bad" : "" },
        ring
          ? { id: "c", label: "Largest server", icon: "gauge", hue: "cyan", value: f("maxSharePct", d), note: `fair share ${f("fairPct", d)}`, mood: (d.maxSharePct ?? 0) > 1.3 * (d.fairPct ?? 0) ? "bad" : "good" }
          : { id: "c", label: "Servers", icon: "server", hue: "cyan", value: `${f("servers", d)} → ${f("newServers", d)}`, note: "one added", mood: "" },
      ];
    },

    nodeBody(id: string, n: SceneNode): string {
      if (id === "cache") return `${nodeHead(n)}<div class="tx-ringbox"><div class="tx-kgrid"></div><div class="tx-ring"></div></div><div class="tx-chipsrow"></div><p class="tx-calc-s" data-rule></p>`;
      return nodeHead(n);
    },

    mount(world: HTMLElement) {
      els.ring = world.querySelector(".tx-ring");
      els.grid = world.querySelector(".tx-kgrid");
      els.chips = world.querySelector(".tx-chipsrow");
      els.rule = world.querySelector("[data-rule]");
    },

    paintWidgets(_d: Outputs, ctx: StepContext) {
      ctxRef = ctx;
      // Who owns what is a discrete state: draw it from the model as it is now.
      draw(live());
    },

    chartSample(out: Outputs): number {
      return Math.min(CHART.max, out.missPct ?? 0);
    },
  };
}
