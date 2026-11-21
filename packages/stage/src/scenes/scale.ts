import type { Inputs, Model, Outputs, SceneNode, SceneSpec } from "@tintelix/schema";
import { formatOutput } from "@tintelix/schema/format";
import type { Effects } from "../effects";
import { nodeHead } from "../render/dom";
import { scale } from "../routers/scale";
import type { SimEvent } from "../sim";
import type { SceneChart, SceneRuntime, StepContext, Tile, WireStyle } from "./types";

export const MAX_CORE_CELLS = 64;
export const MAX_SERVER_CELLS = 100;
const MAX_NODES = 100;
const LEGEND: SceneRuntime["legend"] = [["cyan", "request"], ["green", "served"], ["red", "dropped"]];
const CHART: SceneChart = { label: "CAPACITY · REQUESTS/S", output: "capacity", max: 30000, danger: 20000 };
const PAD = { left: 50, right: 12, top: 34, bottom: 24 };
const Y_MAX = 32000;

/** The model's throughput for 1 to 100 servers, for the given inputs. */
export function throughputCurve(model: Model, inputs: Inputs): [number, number][] {
  const pts: [number, number][] = [];
  for (let n = 1; n <= MAX_NODES; n++) pts.push([n, model.run({ ...inputs, horizontal: 1, nodes: n }).horizontalCapacity ?? 0]);
  return pts;
}

export interface ScaleState {
  served(): number;
  pings: Record<string, number>;
}

export type ScaleScene = SceneRuntime & { state: ScaleState };

export function createScaleScene(o: { fx: Effects; rand: () => number; scene: SceneSpec }): ScaleScene {
  const { fx, rand } = o;
  const users = o.scene.nodes.users ?? { x: 0, y: 0, w: 0, h: 0 };
  const panel = o.scene.nodes.curve ?? { x: 0, y: 0, w: 1, h: 1 };
  const svgW = Math.max(1, panel.w - 24);
  const svgH = Math.max(1, panel.h - 64);
  const plotW = svgW - PAD.left - PAD.right;
  const plotH = svgH - PAD.top - PAD.bottom;
  const xOf = (n: number) => PAD.left + ((Math.max(1, Math.min(MAX_NODES, n)) - 1) / (MAX_NODES - 1)) * plotW;
  const yOf = (rps: number) => PAD.top + plotH - (Math.max(0, Math.min(Y_MAX, rps)) / Y_MAX) * plotH;

  let ctxRef: StepContext | null = null;
  const liveInputs = (ctx: StepContext): Inputs => ({ ...ctx.inputs });
  const live = (): Outputs => (ctxRef ? ctxRef.model.run(liveInputs(ctxRef)) : {});
  const state: ScaleState = { served: () => (live().servedPct ?? 100) / 100, pings: {} };
  const els: {
    nodes: Record<string, HTMLElement>;
    cores: HTMLElement[];
    servers: HTMLElement[];
    bigNote: HTMLElement | null;
    fleetNote: HTMLElement | null;
    curve: SVGElement | null;
    linear: SVGElement | null;
    traffic: SVGElement | null;
    dot: SVGElement | null;
    label: SVGElement | null;
  } = { nodes: {}, cores: [], servers: [], bigNote: null, fleetNote: null, curve: null, linear: null, traffic: null, dot: null, label: null };
  let curveKey = "";
  const text = (el: Element | null | undefined, t: string) => {
    if (el && el.textContent !== t) el.textContent = t;
  };
  const rps = (name: string, d: Outputs) => `${formatOutput(name, d[name] ?? 0)}/s`;
  const horizontal = (d: Outputs) => (d.horizontal ?? 0) >= 0.5;

  return {
    router: scale({ horizontal: () => horizontal(live()), served: () => state.served() }),
    fx,
    state,
    legend: LEGEND,
    sim: { ratePerSec: 3 },
    chart: CHART,
    lane: null,
    liveInputs,

    enterStep(ctx) {
      ctxRef = ctx;
      curveKey = "";
    },

    update(dt, ctx, sim) {
      ctxRef = ctx;
      if (sim) sim.ratePerSec = Math.min(10, Math.max(1, (live().traffic ?? 0) / 2000));
      for (const k in state.pings) state.pings[k] = Math.max(0, state.pings[k]! - dt * 5);
    },

    onEvent(e: SimEvent, ctx) {
      ctxRef = ctx;
      if (e.kind === "pass") state.pings[e.node] = 1;
      if (e.kind === "miss") {
        state.pings[e.node] = 1;
        if (rand() < 0.4) fx.float(e.at[0], e.at[1] - 24, "dropped", "red");
      }
      if (e.kind === "reply") fx.ripple(users.x + users.w, users.y + users.h / 2, e.hit ? "green" : "red", 20, 0.5);
    },

    wireStyles(): WireStyle[] {
      const wires = horizontal(live()) ? ["u_lb", "lb_fleet"] : ["u_big"];
      return wires.flatMap((w): WireStyle[] => [
        { wire: w, color: "blue", alpha: 0.42, width: 2 },
        { wire: w, color: "cyan", alpha: 0.45, width: 2, dash: [2, 14], flowDir: 1 },
      ]);
    },

    tiles(d): Tile[] {
      const h = horizontal(d);
      const served = d.servedPct ?? 100;
      return [
        { id: "traffic", label: "Traffic", icon: "activity", hue: "blue", value: rps("traffic", d), note: "at the busiest hour", mood: "" },
        { id: "capacity", label: "Capacity", icon: "gauge", hue: "cyan", value: rps("capacity", d), note: h ? `${formatOutput("linearCapacity", d.linearCapacity ?? 0)}/s if perfectly linear` : `biggest box: ${rps("maxVerticalCapacity", d)}`, mood: (d.capacity ?? 0) >= (d.traffic ?? 0) ? "good" : "bad" },
        { id: "served", label: "Served", icon: "check", hue: "green", value: formatOutput("servedPct", served), note: served < 100 ? "the rest are dropped" : "every request", mood: served < 100 ? "bad" : "good" },
        { id: "size", label: h ? "Servers" : "Cores", icon: "server", hue: "violet", value: h ? `${formatOutput("nodes", d.nodes ?? 0)} servers` : `${formatOutput("cores", d.cores ?? 0)} cores`, note: h ? `${formatOutput("nodeCores", d.nodeCores ?? 0)} cores each` : `up to ${formatOutput("maxCores", d.maxCores ?? 0)}`, mood: "" },
        { id: "speedup", label: "Speedup", icon: "bolt", hue: "amber", value: h ? `${formatOutput("speedup", d.speedup ?? 0)}×` : "—", note: h ? `${formatOutput("efficiencyPct", d.efficiencyPct ?? 0)} efficient` : "one machine", mood: "" },
      ];
    },

    nodeBody(id: string, n: SceneNode): string {
      if (id === "big") return `${nodeHead(n)}<div class="tx-grid8" data-cores>${"<i></i>".repeat(MAX_CORE_CELLS)}</div><p class="tx-calc-s" data-big-note></p>`;
      if (id === "fleet") return `${nodeHead(n)}<div class="tx-grid10" data-servers>${"<i></i>".repeat(MAX_SERVER_CELLS)}</div><p class="tx-calc-s" data-fleet-note></p>`;
      if (id === "curve") {
        const yt = [0, 10000, 20000, 30000]
          .map((v) => `<line class="tx-c-grid" x1="${PAD.left}" x2="${PAD.left + plotW}" y1="${yOf(v).toFixed(1)}" y2="${yOf(v).toFixed(1)}"/><text class="tx-c-axis" x="${PAD.left - 6}" y="${(yOf(v) + 4).toFixed(1)}" text-anchor="end">${v === 0 ? "0" : `${v / 1000}k/s`}</text>`)
          .join("");
        const xt = [1, 50, 100].map((v) => `<text class="tx-c-axis" x="${xOf(v).toFixed(1)}" y="${svgH - 6}" text-anchor="middle">${v}</text>`).join("");
        return `${nodeHead(n)}<svg class="tx-curve" viewBox="0 0 ${svgW} ${svgH}" width="${svgW}" height="${svgH}" aria-hidden="true">${yt}${xt}<line class="tx-c-traffic" data-traffic x1="${PAD.left}" x2="${PAD.left + plotW}"/><path class="tx-c-linear" data-linear d=""/><path class="tx-c-line" data-curve d=""/><circle class="tx-c-dot" data-curve-dot r="6" cx="0" cy="0"/><text class="tx-c-label" data-curve-label x="${(PAD.left + plotW / 2).toFixed(1)}" y="16" text-anchor="middle"></text></svg>`;
      }
      return nodeHead(n);
    },

    mount(world: HTMLElement) {
      for (const el of world.querySelectorAll<HTMLElement>("[data-node]")) els.nodes[el.dataset.node!] = el;
      els.cores = [...world.querySelectorAll<HTMLElement>("[data-cores] i")];
      els.servers = [...world.querySelectorAll<HTMLElement>("[data-servers] i")];
      els.bigNote = world.querySelector("[data-big-note]");
      els.fleetNote = world.querySelector("[data-fleet-note]");
      els.curve = world.querySelector("[data-curve]");
      els.linear = world.querySelector("[data-linear]");
      els.traffic = world.querySelector("[data-traffic]");
      els.dot = world.querySelector("[data-curve-dot]");
      els.label = world.querySelector("[data-curve-label]");
    },

    paintWidgets(d: Outputs, ctx: StepContext) {
      ctxRef = ctx;
      const cores = Math.round(d.cores ?? 0);
      const nodes = Math.round(d.nodes ?? 0);
      els.cores.forEach((el, i) => el.classList.toggle("on", i < cores));
      els.servers.forEach((el, i) => el.classList.toggle("on", i < nodes));
      text(els.bigNote, `${formatOutput("cores", cores)} cores · ${rps("verticalCapacity", d)}${cores >= (d.maxCores ?? 64) ? " · the biggest machine" : ""}`);
      text(els.fleetNote, `${formatOutput("nodes", nodes)} servers · ${formatOutput("speedup", d.speedup ?? 0)}× of ${formatOutput("nodes", nodes)}`);
      const key = `${d.sigmaPct}|${d.kappaPct}|${d.nodeCores}|${d.perCore}`;
      if (key !== curveKey && els.curve) {
        curveKey = key;
        const pts = throughputCurve(ctx.model, ctx.inputs);
        els.curve.setAttribute("d", pts.map(([n, v], i) => `${i ? "L" : "M"}${xOf(n).toFixed(1)},${yOf(v).toFixed(1)}`).join(""));
        const per = d.perNode ?? 0;
        els.linear?.setAttribute("d", `M${xOf(1).toFixed(1)},${yOf(per).toFixed(1)}L${xOf(MAX_NODES).toFixed(1)},${yOf(per * MAX_NODES).toFixed(1)}`);
      }
      if (els.traffic) {
        const y = yOf(d.traffic ?? 0).toFixed(1);
        els.traffic.setAttribute("y1", y);
        els.traffic.setAttribute("y2", y);
      }
      els.dot?.setAttribute("cx", xOf(nodes).toFixed(1));
      els.dot?.setAttribute("cy", yOf(d.horizontalCapacity ?? 0).toFixed(1));
      text(els.label, `${formatOutput("nodes", nodes)} servers → ${rps("horizontalCapacity", d)}`);
      for (const [id, el] of Object.entries(els.nodes)) el.style.setProperty("--ping", (state.pings[id] ?? 0).toFixed(2));
    },

    chartSample(out: Outputs): number {
      return Math.min(CHART.max, out.capacity ?? 0);
    },
  };
}
