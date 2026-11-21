import type { Inputs, Outputs, SceneNode, SceneSpec } from "@tintelix/schema";
import { formatOutput } from "@tintelix/schema/format";
import type { Effects } from "../effects";
import { nodeHead } from "../render/dom";
import { proxy } from "../routers/proxy";
import type { SimEvent } from "../sim";
import type { SceneChart, SceneRuntime, StepContext, Tile, WireStyle } from "./types";

export const MAX_WORKER_CELLS = 100;
const LEGEND: SceneRuntime["legend"] = [["cyan", "request"], ["green", "answered"], ["amber", "fetched / slow reply"]];
const CHART: SceneChart = { label: "BUSY WORKERS", output: "busyWorkers", max: 160, danger: 100 };
const FORWARD_WIRES = ["o_fp", "fp_net"];
const REVERSE_WIRES = ["f_rp", "p_rp", "rp_be"];

export interface ProxyState {
  mode(): "forward" | "reverse";
  pings: Record<string, number>;
}

export type ProxyScene = SceneRuntime & { state: ProxyState };

export function createProxyScene(o: { fx: Effects; rand: () => number; scene: SceneSpec }): ProxyScene {
  const { fx, rand } = o;
  // Floats go just above the forward proxy so they never cover its heading.
  const fp = o.scene.nodes.fproxy;
  const floatAt: [number, number] = fp ? [fp.x + fp.w / 2, fp.y - 14] : [400, 140];
  let ctxRef: StepContext | null = null;
  const liveInputs = (ctx: StepContext): Inputs => ({ ...ctx.inputs });
  const live = (): Outputs => (ctxRef ? ctxRef.model.run(liveInputs(ctxRef)) : {});
  const state: ProxyState = {
    mode: () => (ctxRef?.step.sim?.mode === "forward" ? "forward" : "reverse"),
    pings: {},
  };
  const els: { nodes: Record<string, HTMLElement>; workers: HTMLElement[]; note: HTMLElement | null; buffering: HTMLElement | null; chartbox: HTMLElement | null; labels: HTMLElement[] } = { nodes: {}, workers: [], note: null, buffering: null, chartbox: null, labels: [] };
  const text = (el: Element | null | undefined, t: string) => {
    if (el && el.textContent !== t) el.textContent = t;
  };
  const f = (name: string, d: Outputs) => formatOutput(name, d[name] ?? 0);

  return {
    router: proxy({ mode: () => state.mode(), hitShare: () => (live().savedPct ?? 0) / 100, slowShare: () => (live().slowPct ?? 0) / 100 }),
    fx,
    state,
    legend: LEGEND,
    sim: { ratePerSec: 4 },
    chart: CHART,
    lane: null,
    liveInputs,

    enterStep(ctx) {
      ctxRef = ctx;
    },

    update(dt, ctx) {
      ctxRef = ctx;
      for (const k in state.pings) state.pings[k] = Math.max(0, state.pings[k]! - dt * 5);
    },

    onEvent(e: SimEvent, ctx) {
      ctxRef = ctx;
      if (e.kind === "pass" || e.kind === "hit" || e.kind === "miss" || e.kind === "fill") state.pings[e.node] = 1;
      if (e.kind === "hit" && rand() < 0.3) fx.float(floatAt[0], floatAt[1], "from the proxy's copy", "green");
      if (e.kind === "miss") fx.float(floatAt[0], floatAt[1], "fetched once", "amber");
    },

    wireStyles(): WireStyle[] {
      const wires = state.mode() === "forward" ? FORWARD_WIRES : REVERSE_WIRES;
      return wires.flatMap((w): WireStyle[] => [
        { wire: w, color: "blue", alpha: 0.42, width: 2 },
        { wire: w, color: w === "p_rp" ? "amber" : "cyan", alpha: 0.45, width: 2, dash: [2, 14], flowDir: 1 },
      ]);
    },

    tiles(d, ctx): Tile[] {
      ctxRef = ctx;
      if (state.mode() === "forward") {
        return [
          { id: "a", label: "Without a proxy", icon: "activity", hue: "amber", value: `${f("officeGb", d)} GB`, note: "over the office link", mood: "bad" },
          { id: "b", label: "With the proxy", icon: "check", hue: "green", value: `${f("proxyGb", d)} GB`, note: "fetched once", mood: "good" },
          { id: "c", label: "Saved", icon: "gauge", hue: "cyan", value: f("savedPct", d), note: "of the office's traffic", mood: "good" },
          { id: "d", label: "Staff", icon: "users", hue: "violet", value: f("employees", d), note: `each wants ${f("updateMb", d)} MB`, mood: "" },
          { id: "e", label: "The site sees", icon: "target", hue: "blue", value: "1 address", note: "the proxy's, not each laptop's", mood: "" },
        ];
      }
      const served = d.servedPct ?? 100;
      return [
        { id: "a", label: "Worker held", icon: "hourglass", hue: "amber", value: f("holdMs", d), note: (d.buffering ?? 0) >= 0.5 ? "work + a fast hand-off" : "work + the client's download", mood: (d.holdMs ?? 0) > 100 ? "bad" : "good" },
        { id: "b", label: "Busy workers", icon: "server", hue: "violet", value: f("busyWorkers", d), note: `of ${f("workers", d)}`, mood: (d.busyWorkers ?? 0) > (d.workers ?? 0) ? "bad" : "good" },
        { id: "c", label: "Served", icon: "check", hue: "green", value: f("servedPct", d), note: served < 100 ? "the rest wait or fail" : "every request", mood: served < 100 ? "bad" : "good" },
        { id: "d", label: "Most it can take", icon: "gauge", hue: "cyan", value: `${f("maxRps", d)}/s`, note: `now ${f("rps", d)}/s`, mood: "" },
        { id: "e", label: "Slow clients", icon: "users", hue: "blue", value: f("slowPct", d), note: `${f("slowMs", d)} to download`, mood: "" },
      ];
    },

    nodeBody(id: string, n: SceneNode): string {
      if (id === "backend") return `${nodeHead(n)}<div class="tx-grid10" data-workers>${"<i></i>".repeat(MAX_WORKER_CELLS)}</div><p class="tx-calc-s" data-workers-note></p>`;
      if (id === "rproxy") return `${nodeHead(n)}<p class="tx-calc-s" data-buffering></p>`;
      if (id === "fproxy") return `${nodeHead(n)}<p class="tx-calc-s" data-cache>keeps a copy of each download</p>`;
      return nodeHead(n);
    },

    mount(world: HTMLElement) {
      for (const el of world.querySelectorAll<HTMLElement>("[data-node]")) els.nodes[el.dataset.node!] = el;
      els.workers = [...world.querySelectorAll<HTMLElement>("[data-workers] i")];
      els.note = world.querySelector("[data-workers-note]");
      els.buffering = world.querySelector("[data-buffering]");
      els.labels = [...world.querySelectorAll<HTMLElement>(".tx-wlabel")];
      els.chartbox = world.closest(".tx-stage")?.querySelector<HTMLElement>(".tx-chartbox") ?? null;
    },

    paintWidgets(d: Outputs, ctx: StepContext) {
      ctxRef = ctx;
      // The workers chart and the slow-network label belong to the reverse-proxy picture only.
      const forward = state.mode() === "forward";
      if (els.chartbox) els.chartbox.hidden = forward;
      for (const el of els.labels) el.hidden = forward !== FORWARD_WIRES.includes(el.dataset.wire ?? "");
      const busy = d.busyWorkers ?? 0;
      const lit = Math.min(MAX_WORKER_CELLS, Math.round(busy));
      els.workers.forEach((el, i) => {
        el.classList.toggle("on", i < lit);
        el.classList.toggle("over", busy > (d.workers ?? 100) && i < lit);
      });
      text(els.note, busy > (d.workers ?? 100) ? `${f("busyWorkers", d)} needed, ${f("workers", d)} exist` : `${f("busyWorkers", d)} busy of ${f("workers", d)}`);
      text(els.buffering, (d.buffering ?? 0) >= 0.5 ? "buffering on" : "buffering off");
      for (const [id, el] of Object.entries(els.nodes)) el.style.setProperty("--ping", (state.pings[id] ?? 0).toFixed(2));
    },

    chartSample(out: Outputs): number {
      return Math.min(CHART.max, out.busyWorkers ?? 0);
    },
  };
}
