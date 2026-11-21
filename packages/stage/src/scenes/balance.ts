import type { Inputs, Outputs, SceneNode, SceneSpec } from "@tintelix/schema";
import { formatOutput } from "@tintelix/schema/format";
import type { Effects } from "../effects";
import { nodeHead } from "../render/dom";
import { balance } from "../routers/balance";
import type { Sim, SimEvent } from "../sim";
import type { SceneChart, SceneRuntime, StepContext, Tile, WireStyle } from "./types";

/** The stage runs ten times slower than real time: 10 ms of work takes 0.1 s on stage. */
const VIS = 10;
const SERVERS = ["s0", "s1", "s2"];
const LINE_DOTS = 12;
const OVERLOADED_MS = 9999;
const NAMES = ["One server", "Round robin", "Least connections", "Layer 7 by path"];
const SHORT = ["one server", "round robin", "least connections", "layer 7 by path"];
const LEGEND: SceneRuntime["legend"] = [["cyan", "lookup"], ["amber", "report"], ["green", "lookup done"], ["red", "turned away"]];
const CHART: SceneChart = { label: "LOOKUPS TAKE · MS", output: "lookupMs", max: 300, danger: 100 };

export interface BalanceState {
  pick(sim: Sim, heavy: boolean): string;
  pings: Record<string, number>;
}

export type BalanceScene = SceneRuntime & { state: BalanceState };

export function createBalanceScene(o: { fx: Effects; rand: () => number; scene: SceneSpec }): BalanceScene {
  const { fx, rand } = o;
  const users = o.scene.nodes.users ?? { x: 0, y: 0, w: 0, h: 0 };
  let ctxRef: StepContext | null = null;
  let turn = 0;
  const liveInputs = (ctx: StepContext): Inputs => ({ ...ctx.inputs });
  const live = (): Outputs => (ctxRef ? ctxRef.model.run(liveInputs(ctxRef)) : {});
  const policy = (d: Outputs) => Math.round(d.policy ?? 1);
  const load = (sim: Sim, s: string) => (sim.queues[s]?.waiting ?? 0) + (sim.queues[s]?.serving ? 1 : 0);
  const fewest = (sim: Sim, among: string[]) => among.reduce((best, s) => (load(sim, s) < load(sim, best) ? s : best));

  const state: BalanceState = {
    pick(sim, heavy) {
      switch (policy(live())) {
        case 0:
          return "s0";
        case 2:
          return fewest(sim, SERVERS);
        case 3:
          return heavy ? "s2" : fewest(sim, ["s0", "s1"]);
        default:
          return SERVERS[turn++ % SERVERS.length]!;
      }
    },
    pings: {},
  };

  const els: { nodes: Record<string, HTMLElement>; lines: Record<string, HTMLElement[]>; tags: Record<string, HTMLElement>; policy: HTMLElement | null; rows: HTMLElement[] } = { nodes: {}, lines: {}, tags: {}, policy: null, rows: [] };
  const text = (el: Element | null | undefined, t: string) => {
    if (el && el.textContent !== t) el.textContent = t;
  };
  const ms = (name: string, d: Outputs) => ((d[name] ?? 0) >= OVERLOADED_MS ? "overloaded" : formatOutput(name, d[name] ?? 0));

  return {
    router: balance({
      pick: (sim, heavy) => state.pick(sim, heavy),
      heavyShare: () => (live().heavyPct ?? 0) / 100,
      workSec: (heavy) => ((heavy ? live().heavyMs : live().lightMs) ?? 10) / 1000 * VIS,
      now: () => ctxRef?.simTime ?? 0,
      ms: (sec) => (sec * 1000) / VIS,
    }),
    fx,
    state,
    legend: LEGEND,
    sim: { ratePerSec: 15, queues: Object.fromEntries(SERVERS.map((s) => [s, 10])) },
    chart: CHART,
    lane: null,
    liveInputs,

    enterStep(ctx) {
      ctxRef = ctx;
      turn = 0;
    },

    update(dt, ctx, sim) {
      ctxRef = ctx;
      if (sim) sim.ratePerSec = (live().traffic ?? 0) / VIS;
      for (const k in state.pings) state.pings[k] = Math.max(0, state.pings[k]! - dt * 5);
    },

    onEvent(e: SimEvent, ctx) {
      ctxRef = ctx;
      if (e.kind === "pass" || e.kind === "work") state.pings[e.node] = 1;
      if (e.kind === "miss") {
        state.pings[e.node] = 1;
        if (rand() < 0.3) fx.float(e.at[0] + 40, e.at[1] - 18, "line full", "red");
      }
      if (e.kind === "reply") fx.ripple(users.x + users.w, users.y + users.h / 2, e.hit ? "green" : "red", 18, 0.45);
    },

    wireStyles(): WireStyle[] {
      const p = policy(live());
      const used = p === 0 ? ["s0"] : SERVERS;
      return ["u_lb", ...used.map((s) => `lb_${s}`)].flatMap((w): WireStyle[] => [
        { wire: w, color: "blue", alpha: 0.42, width: 2 },
        { wire: w, color: "cyan", alpha: 0.45, width: 2, dash: [2, 14], flowDir: 1 },
      ]);
    },

    tiles(d): Tile[] {
      const p = policy(d);
      const served = d.servedPct ?? 100;
      return [
        { id: "lookups", label: "Lookups take", icon: "timer", hue: "cyan", value: ms("lookupMs", d), note: `${formatOutput("lightMs", d.lightMs ?? 0)} of work`, mood: (d.lookupMs ?? 0) <= 2 * (d.lightMs ?? 10) ? "good" : (d.lookupMs ?? 0) >= 50 ? "bad" : "" },
        { id: "reports", label: "Reports take", icon: "hourglass", hue: "amber", value: ms("reportMs", d), note: `${formatOutput("heavyMs", d.heavyMs ?? 0)} of work`, mood: "" },
        { id: "served", label: "Served", icon: "check", hue: "green", value: formatOutput("servedPct", served), note: served < 100 ? "the rest are turned away" : "every request", mood: served < 100 ? "bad" : "good" },
        { id: "load", label: "Server load", icon: "gauge", hue: "violet", value: formatOutput("serverLoadPct", d.serverLoadPct ?? 0), note: p === 0 ? "on server A" : "busiest server", mood: (d.serverLoadPct ?? 0) >= 100 ? "bad" : "" },
        { id: "policy", label: "Policy", icon: "shuffle", hue: "blue", value: NAMES[p] ?? "", note: p === 3 ? "reports go to C" : "how the next server is chosen", mood: "" },
      ];
    },

    nodeBody(id: string, n: SceneNode): string {
      if (id === "lb") return `${nodeHead(n)}<p class="tx-calc-s" data-policy-name></p>`;
      if (id.startsWith("s")) return `${nodeHead(n)}<div class="tx-row tx-spread tx-qrow"><span data-pool="${id}"></span><div class="tx-sline" data-sline="${id}">${"<i></i>".repeat(LINE_DOTS)}</div></div>`;
      if (id === "compare") return `${nodeHead(n)}<ul class="tx-compare">${NAMES.map((name, i) => `<li data-compare-row="${i}"><span>${name}</span><b data-compare-v="${i}"></b></li>`).join("")}</ul>`;
      return nodeHead(n);
    },

    mount(world: HTMLElement) {
      for (const el of world.querySelectorAll<HTMLElement>("[data-node]")) els.nodes[el.dataset.node!] = el;
      for (const s of SERVERS) {
        els.lines[s] = [...world.querySelectorAll<HTMLElement>(`[data-sline="${s}"] i`)];
        const tag = world.querySelector<HTMLElement>(`[data-pool="${s}"]`);
        if (tag) els.tags[s] = tag;
      }
      els.policy = world.querySelector("[data-policy-name]");
      els.rows = [...world.querySelectorAll<HTMLElement>("[data-compare-row]")];
    },

    paintWidgets(d: Outputs, ctx: StepContext, _rdt: number, sim: Sim) {
      ctxRef = ctx;
      const p = policy(d);
      text(els.policy, SHORT[p] ?? "");
      for (const s of SERVERS) {
        const q = sim?.queues[s];
        const queued = q?.queued ?? [];
        els.lines[s]?.forEach((el, i) => {
          const pkt = queued[i];
          const cls = pkt ? (pkt.small ? "on" : "on heavy") : "";
          if (el.className !== cls) el.className = cls;
        });
        const idle = p === 0 && s !== "s0";
        els.nodes[s]?.classList.toggle("tx-off", idle);
        text(els.tags[s], p === 3 ? (s === "s2" ? "reports" : "lookups") : idle ? "idle" : "line");
      }
      const values = [
        `${formatOutput("singleServedPct", d.singleServedPct ?? 0)} served`,
        ms("rrLookupMs", d),
        ms("lcLookupMs", d),
        ms("pathLookupMs", d),
      ];
      els.rows.forEach((row, i) => {
        row.classList.toggle("on", i === p);
        text(row.querySelector("b"), values[i] ?? "");
      });
      for (const [id, el] of Object.entries(els.nodes)) el.style.setProperty("--ping", (state.pings[id] ?? 0).toFixed(2));
    },

    chartSample(out: Outputs): number {
      return Math.min(CHART.max, out.lookupMs ?? 0);
    },
  };
}
