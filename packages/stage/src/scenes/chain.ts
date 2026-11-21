import type { Inputs, Outputs, SceneNode, SceneSpec } from "@tintelix/schema";
import { formatOutput } from "@tintelix/schema/format";
import type { Effects } from "../effects";
import { nodeHead } from "../render/dom";
import { chain, CHAIN_MAX } from "../routers/chain";
import type { SimEvent } from "../sim";
import type { SceneChart, SceneRuntime, StepContext, Tile, WireStyle } from "./types";

/** Outages on stage happen this many times as often as the model says, or they would never be seen. */
export const OUTAGE_SPEEDUP = 100;
const MAX_COPIES = 3;
/** Seconds one outage lasts on stage. */
const OUTAGE_SEC = 1.4;
/** Never show a copy down more than this share of the time, however unreliable. */
const MAX_DOWN = 0.3;
const R_VIS = 3;
const LEGEND: SceneRuntime["legend"] = [["cyan", "request"], ["green", "succeeded"], ["red", "failed"], ["amber", "copy down (shown 100× as often)"]];
const CHART: SceneChart = { label: "FAILED PER MILLION", output: "failedPerMillion", max: 10000, danger: 1000 };

/** Rate of new outages that keeps a copy down a share `s` of the time, when each lasts `d` seconds. */
export function outageRate(s: number, d: number): number {
  return s <= 0 ? 0 : s / (d * (1 - s));
}

export interface ChainState {
  /** Seconds left on each copy's outage, per service. */
  down: number[][];
  /** Seconds left on an outage every copy of a service shares. */
  shared: number[];
  /** The first copy of a service that is up, or −1. */
  pickCopy(tier: number): number;
  pings: Record<string, number>;
}

export type ChainScene = SceneRuntime & { state: ChainState };

export function createChainScene(o: { fx: Effects; rand: () => number; scene: SceneSpec }): ChainScene {
  const { fx, rand } = o;
  const users = o.scene.nodes.users ?? { x: 0, y: 0, w: 0, h: 0 };
  let ctxRef: StepContext | null = null;
  const liveInputs = (ctx: StepContext): Inputs => ({ ...ctx.inputs });
  const live = (): Outputs => (ctxRef ? ctxRef.model.run(liveInputs(ctxRef)) : {});
  const services = (out: Outputs) => Math.max(1, Math.min(CHAIN_MAX, Math.round(out.services ?? 5)));
  const copies = (out: Outputs) => Math.max(1, Math.min(MAX_COPIES, Math.round(out.copies ?? 1)));

  const state: ChainState = {
    down: Array.from({ length: CHAIN_MAX }, () => Array.from({ length: MAX_COPIES }, () => 0)),
    shared: Array.from({ length: CHAIN_MAX }, () => 0),
    pickCopy(tier) {
      if ((state.shared[tier] ?? 0) > 0) return -1;
      const n = copies(live());
      for (let j = 0; j < n; j++) if ((state.down[tier]?.[j] ?? 0) <= 0) return j;
      return -1;
    },
    pings: {},
  };

  const els: { nodes: Record<string, HTMLElement>; copies: HTMLElement[][]; sum: HTMLElement | null; down: HTMLElement | null; tier: HTMLElement | null } = {
    nodes: {},
    copies: [],
    sum: null,
    down: null,
    tier: null,
  };
  const text = (el: Element | null | undefined, t: string) => {
    if (el && el.textContent !== t) el.textContent = t;
  };

  return {
    router: chain({ services: () => services(live()), pick: (t) => state.pickCopy(t) }),
    fx,
    state,
    legend: LEGEND,
    sim: { ratePerSec: R_VIS },
    chart: CHART,
    lane: null,
    liveInputs,

    enterStep(ctx) {
      ctxRef = ctx;
      for (const row of state.down) row.fill(0);
      state.shared.fill(0);
    },

    update(dt, ctx) {
      ctxRef = ctx;
      const out = live();
      const n = services(out);
      const c = copies(out);
      const shareCopy = Math.min(MAX_DOWN, (1 - (out.perAvail ?? 99.9) / 100) * OUTAGE_SPEEDUP);
      const shareShared = c >= 2 && ctx.step.sim?.mode === "shared" ? Math.min(MAX_DOWN, ((out.sharedPct ?? 0) / 100) * OUTAGE_SPEEDUP) : 0;
      const pCopy = outageRate(shareCopy, OUTAGE_SEC) * dt;
      const pShared = outageRate(shareShared, OUTAGE_SEC) * dt;
      for (let i = 0; i < CHAIN_MAX; i++) {
        const row = state.down[i]!;
        for (let j = 0; j < MAX_COPIES; j++) {
          if (row[j]! > 0) row[j] = Math.max(0, row[j]! - dt);
          else if (i < n && j < c && rand() < pCopy) row[j] = OUTAGE_SEC;
        }
        if (state.shared[i]! > 0) state.shared[i] = Math.max(0, state.shared[i]! - dt);
        else if (i < n && rand() < pShared) {
          state.shared[i] = OUTAGE_SEC;
          const t = o.scene.nodes[`t${i}`];
          if (t) fx.float(t.x + t.w / 2, t.y - 6, "shared outage", "red");
        }
      }
      for (const k in state.pings) state.pings[k] = Math.max(0, state.pings[k]! - dt * 5);
    },

    onEvent(e: SimEvent, ctx) {
      ctxRef = ctx;
      if (e.kind === "pass") state.pings[e.node] = 1;
      if (e.kind === "miss") {
        state.pings[e.node] = 1;
        fx.ripple(e.at[0], e.at[1], "red", 26, 0.6);
      }
      if (e.kind === "reply") {
        fx.ripple(users.x + users.w, users.y + users.h / 2, e.hit ? "green" : "red", 22, 0.5);
        if (!e.hit) fx.float(users.x + users.w / 2, users.y + users.h + 16, "checkout failed", "red");
      }
    },

    wireStyles(): WireStyle[] {
      const n = services(live());
      const out: WireStyle[] = [];
      for (let i = 0; i < n; i++) {
        out.push({ wire: `w${i}`, color: "blue", alpha: 0.42, width: 2 });
        out.push({ wire: `w${i}`, color: "cyan", alpha: 0.45, width: 2, dash: [2, 14], flowDir: 1 });
      }
      return out;
    },

    tiles(d): Tile[] {
      return [
        { id: "each", label: "Each service", icon: "server", hue: "violet", value: formatOutput("perAvail", d.perAvail ?? 0), note: `down ${formatOutput("perDowntime", d.perDowntime ?? 0)} a month`, mood: "good" },
        { id: "path", label: "Checkout path", icon: "activity", hue: "cyan", value: formatOutput("pathAvail", d.pathAvail ?? 0), note: `${formatOutput("services", d.services ?? 0)} services in a row`, mood: (d.pathAvail ?? 0) < (d.perAvail ?? 0) ? "bad" : "good" },
        { id: "down", label: "Down a month", icon: "hourglass", hue: "amber", value: formatOutput("pathDowntime", d.pathDowntime ?? 0), note: "the whole checkout", mood: (d.pathDowntime ?? 0) > (d.perDowntime ?? 0) ? "bad" : "good" },
        { id: "failed", label: "Failed per million", icon: "alert", hue: "blue", value: formatOutput("failedPerMillion", d.failedPerMillion ?? 0), note: "checkouts", mood: "" },
        { id: "nines", label: "Nines", icon: "gauge", hue: "green", value: formatOutput("nines", d.nines ?? 0), note: "of the whole path", mood: "" },
      ];
    },

    nodeBody(id: string, n: SceneNode): string {
      if (id.startsWith("t")) return `${nodeHead(n)}<div class="tx-copies" data-copies="${id.slice(1)}">${"<b></b>".repeat(MAX_COPIES)}</div>`;
      if (id === "math") return `${nodeHead(n)}<div class="tx-math"><p class="tx-math-sum" data-math-sum></p><p class="tx-math-sub"><span data-math-tier></span><span data-math-down></span></p></div>`;
      return nodeHead(n);
    },

    mount(world: HTMLElement) {
      for (const el of world.querySelectorAll<HTMLElement>("[data-node]")) els.nodes[el.dataset.node!] = el;
      els.copies = Array.from({ length: CHAIN_MAX }, (_, i) => [...world.querySelectorAll<HTMLElement>(`[data-copies="${i}"] b`)]);
      els.sum = world.querySelector("[data-math-sum]");
      els.down = world.querySelector("[data-math-down]");
      els.tier = world.querySelector("[data-math-tier]");
    },

    paintWidgets(display: Outputs) {
      const n = services(display);
      const c = copies(display);
      for (let i = 0; i < CHAIN_MAX; i++) {
        els.nodes[`t${i}`]?.classList.toggle("tx-off", i >= n);
        els.copies[i]?.forEach((el, j) => {
          el.hidden = j >= c;
          el.className = (state.shared[i] ?? 0) > 0 || (state.down[i]?.[j] ?? 0) > 0 ? "down" : "";
        });
      }
      const each = c >= 2 ? formatOutput("tierAvail", display.tierAvail ?? 0) : formatOutput("perAvail", display.perAvail ?? 0);
      text(els.sum, `${each} × ${formatOutput("services", n)} ${n === 1 ? "service" : "services in a row"} = ${formatOutput("pathAvail", display.pathAvail ?? 0)}`);
      text(els.tier, c >= 2 ? `each service with ${formatOutput("copies", c)} copies: ${each} · ` : "");
      text(els.down, `${formatOutput("pathDowntime", display.pathDowntime ?? 0)} down a month`);
      for (const [id, el] of Object.entries(els.nodes)) el.style.setProperty("--ping", (state.pings[id] ?? 0).toFixed(2));
    },

    chartSample(out: Outputs): number {
      return Math.min(CHART.max, (out.failedPerMillion ?? 0) * (1 + (rand() * 0.04 - 0.02)));
    },
  };
}
