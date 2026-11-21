import type { Inputs, Model, Outputs, SceneNode, SceneSpec } from "@tintelix/schema";
import { formatOutput } from "@tintelix/schema/format";
import type { Effects } from "../effects";
import { nodeHead } from "../render/dom";
import { queueRouter } from "../routers/queue";
import type { Hue, Sim, SimEvent } from "../sim";
import type { SceneChart, SceneRuntime, StepContext, Tile, WireStyle } from "./types";

/** The stage runs at a tenth of the real rates, so 1 s on stage is 100 ms of real time. */
export const VIS = 10;
const MS_PER_SIM_SEC = 1000 / VIS;
export const MAX_WORKERS = 4;
/** Waiting requests drawn in the line; more show as "+N". */
export const LINE_DOTS = 14;
const WORKERS = Array.from({ length: MAX_WORKERS }, (_, i) => `w${i}`);
const LEGEND: SceneRuntime["legend"] = [["cyan", "request"], ["green", "quick reply"], ["amber", "waited"], ["red", "waited long"]];
const CHART: SceneChart = { label: "RESPONSE · LAST 30 S", output: "responseMs", max: 250, danger: 100 };

/** Curve plot layout inside its SVG, in px; the y axis runs 0–250 ms. */
const PAD = { left: 46, right: 12, top: 34, bottom: 24 };
const Y_MAX = 250;

/** The model's response time at every whole percent of busyness from 1% to 99%, for the given inputs. */
export function curvePoints(model: Model, inputs: Inputs): [number, number][] {
  const capacity = model.run(inputs).capacity ?? 0;
  const pts: [number, number][] = [];
  for (let u = 1; u <= 99; u++) {
    const out = model.run({ ...inputs, traffic: (u / 100) * capacity });
    pts.push([out.utilPct ?? 0, out.responseMs ?? 0]);
  }
  return pts;
}

export interface QueueState {
  pings: Record<string, number>;
}

export type QueueScene = SceneRuntime & { state: QueueState };

export function createQueueScene(o: { fx: Effects; rand: () => number; scene: SceneSpec }): QueueScene {
  const { fx, rand } = o;
  const node = (id: string) => o.scene.nodes[id] ?? { x: 0, y: 0, w: 0, h: 0 };
  const users = node("users");
  const curve = node("curve");
  const svgW = Math.max(1, curve.w - 24);
  const svgH = Math.max(1, curve.h - 64);
  const plotW = Math.max(1, svgW - PAD.left - PAD.right);
  const plotH = Math.max(1, svgH - PAD.top - PAD.bottom);
  const xOf = (utilPct: number) => PAD.left + (Math.max(0, Math.min(100, utilPct)) / 100) * plotW;
  const yOf = (ms: number) => PAD.top + plotH - (Math.max(0, Math.min(Y_MAX, ms)) / Y_MAX) * plotH;

  const state: QueueState = { pings: {} };
  const els: {
    nodes: Record<string, HTMLElement>;
    line: HTMLElement[];
    more: HTMLElement | null;
    workers: HTMLElement[];
    path: SVGElement | null;
    dot: SVGElement | null;
    label: SVGElement | null;
  } = { nodes: {}, line: [], more: null, workers: [], path: null, dot: null, label: null };
  let ctxRef: StepContext | null = null;
  let curveKey = "";

  const liveInputs = (ctx: StepContext): Inputs => ({ ...ctx.inputs });
  const live = (): Outputs => (ctxRef ? ctxRef.model.run(liveInputs(ctxRef)) : {});
  const workers = (out: Outputs) => Math.max(1, Math.min(MAX_WORKERS, Math.round(out.workers ?? 1)));
  const load = (sim: Sim, name: string) => (sim.queues[name]?.waiting ?? 0) + (sim.queues[name]?.serving ? 1 : 0);
  const hue = (ms: number): Hue => {
    const s = live().serviceMs ?? 10;
    return ms <= 2 * s ? "green" : ms <= 100 ? "amber" : "red";
  };

  const router = queueRouter({
    pick: (sim) => WORKERS.slice(0, workers(live())).reduce((best, n) => (load(sim, n) < load(sim, best) ? n : best)),
    now: () => ctxRef?.simTime ?? 0,
    ms: (sec) => sec * MS_PER_SIM_SEC,
    hue,
  });

  const text = (el: Element | null | undefined, t: string) => {
    if (el && el.textContent !== t) el.textContent = t;
  };

  return {
    router,
    fx,
    state,
    legend: LEGEND,
    sim: { ratePerSec: 5, queues: Object.fromEntries(WORKERS.map((w) => [w, 1000 / 10 / VIS])), exponential: true },
    chart: CHART,
    lane: null,

    liveInputs,

    enterStep(ctx) {
      ctxRef = ctx;
      curveKey = "";
    },

    update(dt, ctx, sim) {
      ctxRef = ctx;
      if (sim) {
        const out = live();
        sim.ratePerSec = (out.traffic ?? 0) / VIS;
        const mu = 1000 / (out.serviceMs ?? 10) / VIS;
        for (const w of WORKERS) if (sim.queues[w]) sim.queues[w]!.mu = mu;
      }
      for (const n in state.pings) state.pings[n] = Math.max(0, state.pings[n]! - dt * 5);
    },

    onEvent(e: SimEvent, ctx) {
      ctxRef = ctx;
      switch (e.kind) {
        case "pass":
        case "work":
          state.pings.app = 1;
          break;
        case "done": {
          state.pings.users = 1;
          const h = hue(e.ms);
          fx.ripple(users.x + users.w, users.y + users.h / 2, h, 20, 0.5);
          if (h !== "green" || rand() < 0.35) fx.float(users.x + 30 + rand() * 80, users.y + users.h + 16, formatOutput("responseMs", e.ms), h);
          break;
        }
      }
    },

    wireStyles(): WireStyle[] {
      return [
        { wire: "users_app", color: "blue", alpha: 0.42, width: 2 },
        { wire: "users_app", color: "cyan", alpha: 0.45, width: 2, dash: [2, 14], flowDir: 1 },
      ];
    },

    tiles(d): Tile[] {
      const c = workers(d);
      const util = d.utilPct ?? 0;
      const response = d.responseMs ?? 0;
      return [
        {
          id: "busy",
          label: "Busy",
          icon: "gauge",
          hue: "amber",
          value: formatOutput("utilPct", util),
          note: c === 1 ? "one worker" : `each of ${formatOutput("workers", c)} workers`,
          mood: util >= 80 ? "bad" : util <= 60 ? "good" : "",
        },
        {
          id: "wait",
          label: "Wait in line",
          icon: "hourglass",
          hue: "violet",
          value: formatOutput("waitMs", d.waitMs ?? 0),
          note: `${formatOutput("waitChancePct", d.waitChancePct ?? 0)} have to wait`,
          mood: "",
        },
        {
          id: "response",
          label: "Response",
          icon: "timer",
          hue: "cyan",
          value: formatOutput("responseMs", response),
          note: `${formatOutput("slowdown", d.slowdown ?? 0)}× its own work`,
          mood: response >= 50 ? "bad" : response <= 2 * (d.serviceMs ?? 10) ? "good" : "",
        },
        {
          id: "inside",
          label: "Inside at once",
          icon: "users",
          hue: "green",
          value: formatOutput("inSystem", d.inSystem ?? 0),
          note: "arrivals × time inside",
          mood: "",
        },
        {
          id: "traffic",
          label: "Traffic",
          icon: "activity",
          hue: "blue",
          value: `${formatOutput("traffic", d.traffic ?? 0)}/s`,
          note: `capacity ${formatOutput("capacity", d.capacity ?? 0)}/s`,
          mood: "",
        },
      ];
    },

    nodeBody(id: string, n: SceneNode): string {
      if (n.kind === "curve") {
        const xt = [0, 50, 100]
          .map((u) => `<text class="tx-c-axis" x="${xOf(u).toFixed(1)}" y="${svgH - 6}" text-anchor="middle">${u}%</text>`)
          .join("");
        const yt = [0, 100, 200]
          .map((ms) => `<line class="tx-c-grid" x1="${PAD.left}" x2="${PAD.left + plotW}" y1="${yOf(ms).toFixed(1)}" y2="${yOf(ms).toFixed(1)}"/><text class="tx-c-axis" x="${PAD.left - 6}" y="${(yOf(ms) + 4).toFixed(1)}" text-anchor="end">${ms === 0 ? "0" : `${ms} ms`}</text>`)
          .join("");
        return `${nodeHead(n)}<svg class="tx-curve" viewBox="0 0 ${svgW} ${svgH}" width="${svgW}" height="${svgH}" aria-hidden="true">${yt}${xt}<path class="tx-c-line" data-curve d=""/><circle class="tx-c-dot" data-curve-dot r="6" cx="0" cy="0"/><text class="tx-c-label" data-curve-label x="${(PAD.left + plotW / 2).toFixed(1)}" y="16" text-anchor="middle"></text></svg>`;
      }
      if (id === "app") {
        return `${nodeHead(n)}<div class="tx-row tx-spread tx-qrow"><span>line</span><div class="tx-line" data-line>${"<i></i>".repeat(LINE_DOTS)}</div><b data-line-more></b></div><div class="tx-row tx-spread tx-qrow"><span>workers</span><div class="tx-workers" data-workers>${"<b></b>".repeat(MAX_WORKERS)}</div></div>`;
      }
      return nodeHead(n);
    },

    mount(world: HTMLElement) {
      for (const el of world.querySelectorAll<HTMLElement>("[data-node]")) els.nodes[el.dataset.node!] = el;
      els.line = [...world.querySelectorAll<HTMLElement>("[data-line] i")];
      els.more = world.querySelector<HTMLElement>("[data-line-more]");
      els.workers = [...world.querySelectorAll<HTMLElement>("[data-workers] b")];
      els.path = world.querySelector<SVGElement>("[data-curve]");
      els.dot = world.querySelector<SVGElement>("[data-curve-dot]");
      els.label = world.querySelector<SVGElement>("[data-curve-label]");
    },

    paintWidgets(display: Outputs, ctx: StepContext, _rdt: number, sim: Sim) {
      ctxRef = ctx;
      const c = workers(display);
      // The line in front of the workers, straight from the sim.
      const waiting = sim ? WORKERS.reduce((sum, w) => sum + (sim.queues[w]?.waiting ?? 0), 0) : 0;
      els.line.forEach((el, i) => {
        const cls = i < waiting ? (waiting > 8 ? "on long" : "on") : "";
        if (el.className !== cls) el.className = cls;
      });
      text(els.more, waiting > LINE_DOTS ? `+${waiting - LINE_DOTS}` : "");
      els.workers.forEach((el, i) => {
        el.hidden = i >= c;
        el.classList.toggle("on", !!sim?.queues[WORKERS[i]!]?.serving);
      });

      // The model's curve for these workers and work time, redrawn only when they change.
      const key = `${c}|${display.serviceMs ?? 10}`;
      if (key !== curveKey && els.path) {
        curveKey = key;
        const pts = curvePoints(ctx.model, { ...ctx.inputs, workers: c });
        const d = pts.map(([u, ms], i) => `${i ? "L" : "M"}${xOf(u).toFixed(1)},${yOf(ms).toFixed(1)}`).join("");
        els.path.setAttribute("d", d);
      }
      if (els.dot) {
        els.dot.setAttribute("cx", xOf(display.utilPct ?? 0).toFixed(1));
        els.dot.setAttribute("cy", yOf(display.responseMs ?? 0).toFixed(1));
      }
      text(els.label, `${formatOutput("utilPct", display.utilPct ?? 0)} busy → ${formatOutput("responseMs", display.responseMs ?? 0)}`);
      for (const [id, el] of Object.entries(els.nodes)) el.style.setProperty("--ping", (state.pings[id] ?? 0).toFixed(2));
    },

    chartSample(out: Outputs): number {
      return Math.min(CHART.max, (out.responseMs ?? 0) * (1 + (rand() * 0.04 - 0.02)));
    },
  };
}
