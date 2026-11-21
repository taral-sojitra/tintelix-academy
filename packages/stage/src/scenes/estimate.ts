import type { Inputs, Outputs, SceneNode, SceneSpec } from "@tintelix/schema";
import { formatOutput } from "@tintelix/schema/format";
import type { Effects } from "../effects";
import { nodeHead } from "../render/dom";
import { pipeline } from "../routers/pipeline";
import type { SimEvent } from "../sim";
import type { SceneChart, SceneRuntime, StepContext, Tile, WireStyle } from "./types";

const LEGEND: SceneRuntime["legend"] = [["cyan", "requests"], ["violet", "data written"]];
const CHART: SceneChart = { label: "BUSIEST HOUR · REQUESTS/S", output: "peakRps", max: 10000, danger: 5000 };
/** Each arrow and the boxes at its two ends. */
const ENDS: Record<string, [string, string]> = {
  m0: ["mau", "dau"],
  m1: ["dau", "avg"],
  m2: ["avg", "peak"],
  m3: ["peak", "cores"],
  s0: ["dau", "writes"],
  s1: ["writes", "year"],
  s2: ["year", "stored"],
  g0: ["cores", "growth"],
};

const f = (name: string, d: Outputs) => formatOutput(name, d[name] ?? 0);

/** The big value and the line under it for each box. */
function boxText(id: string, d: Outputs): [string, string] {
  switch (id) {
    case "mau":
      return [f("mau", d), "use it monthly"];
    case "dau":
      return [f("dau", d), "on a given day"];
    case "avg":
      return [`${f("avgRps", d)}/s`, `${f("perDay", d)} a day`];
    case "peak":
      return [`${f("peakRps", d)}/s`, `${f("peakRatio", d)}× the average`];
    case "cores":
      return [f("cores", d), `${f("coresNaive", d)} if flat out`];
    case "writes":
      return [`${f("storagePerDayGb", d)} GB`, `${f("writesPerUser", d)} × ${f("recordKb", d)} KB a user`];
    case "year":
      return [`${f("storageYearTb", d)} TB`, "of new data"];
    case "stored":
      return [`${f("storageTotalTb", d)} TB`, `with ${f("replicas", d)} copies`];
    case "growth":
      return [f("futureCores", d), `cores · ${f("futurePeakRps", d)}/s`];
    default:
      return ["", ""];
  }
}

/** The factor written on each arrow. */
function wireText(id: string, d: Outputs): string {
  switch (id) {
    case "m0":
      return `× ${f("dauPct", d)}`;
    case "m1":
      return `× ${f("reqPerUser", d)}`;
    case "m2":
      return `× ${f("peakRatio", d)}`;
    case "m3":
      return `÷ ${f("perCoreAtTarget", d)}`;
    case "s0":
      return `× ${f("writesPerUser", d)} × ${f("recordKb", d)} KB`;
    case "s1":
      return "× 365";
    case "s2":
      return `× ${f("replicas", d)}`;
    case "g0":
      return `× ${f("growthFactor", d)}`;
    default:
      return "";
  }
}

export interface EstimateState {
  visibleWire(wire: string): boolean;
  pings: Record<string, number>;
}

export type EstimateScene = SceneRuntime & { state: EstimateState };

export function createEstimateScene(o: { fx: Effects; rand: () => number; scene: SceneSpec }): EstimateScene {
  const { fx, rand } = o;
  let ctxRef: StepContext | null = null;
  const shown = (id: string) => ctxRef?.visible.has(id) ?? false;
  const state: EstimateState = {
    visibleWire: (w) => {
      const ends = ENDS[w];
      return !!ends && shown(ends[0]) && shown(ends[1]);
    },
    pings: {},
  };
  const els: { nodes: Record<string, HTMLElement>; value: Record<string, HTMLElement>; sub: Record<string, HTMLElement>; labels: Record<string, HTMLElement> } = { nodes: {}, value: {}, sub: {}, labels: {} };
  const text = (el: Element | null | undefined, t: string) => {
    if (el && el.textContent !== t) el.textContent = t;
  };

  return {
    router: pipeline({ visible: (w) => state.visibleWire(w) }),
    fx,
    state,
    legend: LEGEND,
    sim: { ratePerSec: 4 },
    chart: CHART,
    lane: null,
    liveInputs: (ctx: StepContext): Inputs => ({ ...ctx.inputs }),

    enterStep(ctx) {
      ctxRef = ctx;
    },

    update(dt, ctx) {
      ctxRef = ctx;
      for (const k in state.pings) state.pings[k] = Math.max(0, state.pings[k]! - dt * 4);
    },

    onEvent(e: SimEvent, ctx) {
      ctxRef = ctx;
      if (e.kind === "pass") state.pings[e.node] = 1;
    },

    wireStyles(): WireStyle[] {
      const out: WireStyle[] = [];
      for (const w of Object.keys(ENDS)) {
        if (!state.visibleWire(w)) continue;
        const storage = w.startsWith("s");
        out.push({ wire: w, color: "blue", alpha: 0.42, width: 2 });
        out.push({ wire: w, color: storage ? "violet" : "cyan", alpha: 0.45, width: 2, dash: [2, 14], flowDir: 1 });
      }
      return out;
    },

    tiles(d, ctx): Tile[] {
      ctxRef = ctx;
      const or = (id: string, v: string) => (shown(id) ? v : "—");
      return [
        { id: "dau", label: "Daily users", icon: "users", hue: "violet", value: or("dau", f("dau", d)), note: `${f("dauPct", d)} of monthly`, mood: "" },
        { id: "peak", label: "Busiest hour", icon: "activity", hue: "cyan", value: or("peak", `${f("peakRps", d)}/s`), note: `average ${f("avgRps", d)}/s`, mood: "" },
        { id: "cores", label: "Cores", icon: "server", hue: "amber", value: or("cores", f("cores", d)), note: `at ${f("targetUtilPct", d)} busy`, mood: "" },
        { id: "storage", label: "Stored a year", icon: "db", hue: "blue", value: or("stored", `${f("storageTotalTb", d)} TB`), note: `with ${f("replicas", d)} copies`, mood: "" },
        { id: "growth", label: "Cores next year", icon: "gauge", hue: "green", value: or("growth", f("futureCores", d)), note: `${f("growthPct", d)} growth a month`, mood: "" },
      ];
    },

    nodeBody(id: string, n: SceneNode): string {
      return `${nodeHead(n)}<p class="tx-calc-v" data-value="${id}"></p><p class="tx-calc-s" data-sub="${id}"></p>`;
    },

    mount(world: HTMLElement) {
      for (const el of world.querySelectorAll<HTMLElement>("[data-node]")) {
        els.nodes[el.dataset.node!] = el;
        // Calculator cells: no icon, so names like "Monthly users" fit the narrow boxes.
        el.classList.add("tx-noicon");
      }
      for (const el of world.querySelectorAll<HTMLElement>("[data-value]")) els.value[el.dataset.value!] = el;
      for (const el of world.querySelectorAll<HTMLElement>("[data-sub]")) els.sub[el.dataset.sub!] = el;
      for (const el of world.querySelectorAll<HTMLElement>(".tx-wlabel")) els.labels[el.dataset.wire!] = el;
    },

    paintWidgets(d: Outputs, ctx: StepContext) {
      ctxRef = ctx;
      for (const id of Object.keys(els.value)) {
        const [v, s] = boxText(id, d);
        text(els.value[id], v);
        text(els.sub[id], s);
      }
      for (const [w, el] of Object.entries(els.labels)) {
        text(el, wireText(w, d));
        el.hidden = !state.visibleWire(w);
      }
      for (const [id, el] of Object.entries(els.nodes)) el.style.setProperty("--ping", (state.pings[id] ?? 0).toFixed(2));
    },

    chartSample(out: Outputs): number {
      return Math.min(CHART.max, (out.peakRps ?? 0) * (1 + (rand() * 0.04 - 0.02)));
    },
  };
}
