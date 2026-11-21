import type { Inputs, Outputs, SceneNode, SceneSpec } from "@tintelix/schema";
import { formatOutput } from "@tintelix/schema/format";
import type { Effects } from "../effects";
import { nodeHead } from "../render/dom";
import { mq, type MqMode } from "../routers/mq";
import type { Sim, SimEvent } from "../sim";
import type { SceneChart, SceneRuntime, StepContext, Tile, WireStyle } from "./types";

const LEGEND: SceneRuntime["legend"] = [["cyan", "job"], ["green", "done"], ["red", "failed"], ["violet", "poison job"]];
const CHART: SceneChart = { label: "WAITING IN THE QUEUE", output: "backlog", max: 50000, danger: 20000 };
const MODES: MqMode[] = ["direct", "queue", "retry", "dlq"];
const MAX_WORKERS = 8;
/** Poison jobs are 1 in 100; the picture shows more so they can be followed, and says so. */
const VISIBLE_POISON = 0.12;

export function createMqScene(o: { fx: Effects; rand: () => number; scene: SceneSpec }): SceneRuntime {
  const { fx, rand } = o;
  let ctxRef: StepContext | null = null;
  let clock = 0;
  let key = "";
  const inputKey = (i: Inputs) => JSON.stringify(Object.entries(i).filter(([k]) => k !== "elapsedSec").sort());
  const liveInputs = (ctx: StepContext): Inputs => ({ ...ctx.inputs, elapsedSec: clock });
  const live = (): Outputs => (ctxRef ? ctxRef.model.run(liveInputs(ctxRef)) : {});
  const f = (name: string, d: Outputs) => formatOutput(name, d[name] ?? 0);
  const modeOf = (d: Outputs): MqMode => MODES[Math.round(d.mode ?? 0)] ?? "direct";
  const els: { workers: HTMLElement[]; backlog: HTMLElement | null; meter: HTMLElement | null; dlq: HTMLElement | null; chartbox: HTMLElement | null } = { workers: [], backlog: null, meter: null, dlq: null, chartbox: null };
  const text = (el: Element | null | undefined, t: string) => {
    if (el && el.textContent !== t) el.textContent = t;
  };

  return {
    router: mq({
      mode: () => modeOf(live()),
      failShare: () => (live().failingPct ?? 0) / 100,
      passShare: () => {
        const d = live();
        return Math.min(1, (d.capacity ?? 1) / Math.max(1, d.arrival ?? 1));
      },
      poisonShare: () => VISIBLE_POISON,
      attempts: 3,
    }),
    fx,
    legend: LEGEND,
    sim: { ratePerSec: 2 },
    chart: CHART,
    lane: null,
    liveInputs,

    enterStep(ctx) {
      ctxRef = ctx;
      clock = 0;
      key = inputKey(ctx.inputs);
    },

    update(dt, ctx, sim?: Sim) {
      ctxRef = ctx;
      const k = inputKey(ctx.inputs);
      if (k !== key) {
        key = k;
        clock = 0;
      }
      clock += dt;
      // More jobs on stage during the spike, in proportion to the real arrival rate.
      if (sim) sim.ratePerSec = 1 + (live().arrival ?? 200) / 150;
    },

    onEvent(e: SimEvent, ctx) {
      ctxRef = ctx;
      if (e.kind === "miss" && e.node === "workers" && modeOf(live()) === "direct" && rand() < 0.08) fx.float(e.at[0] + 110, e.at[1] - 130, "workers full: dropped", "red");
    },

    wireStyles(): WireStyle[] {
      const mode = modeOf(live());
      if (mode === "direct") return [{ wire: "p_w", color: "blue", alpha: 0.42, width: 2 }];
      return [
        { wire: "p_q", color: "blue", alpha: 0.42, width: 2 },
        { wire: "q_w", color: "blue", alpha: 0.42, width: 2 },
        ...(mode === "dlq" ? [{ wire: "w_d", color: "violet" as const, alpha: 0.5, width: 2 }] : []),
      ];
    },

    tiles(d, ctx): Tile[] {
      ctxRef = ctx;
      const mode = modeOf(d);
      if (mode === "direct") {
        return [
          { id: "a", label: "Failing now", icon: "activity", hue: "amber", value: f("failingPct", d), note: (d.inSpike ?? 0) ? `${f("arrival", d)} a second arriving` : "normal traffic", mood: (d.failingPct ?? 0) > 0 ? "bad" : "good" },
          { id: "b", label: "Lost in the spike", icon: "target", hue: "violet", value: f("failedTotal", d), note: `over ${f("spikeSec", d)}`, mood: "bad" },
          { id: "c", label: "Workers handle", icon: "server", hue: "cyan", value: `${f("capacity", d)}/s`, note: `${f("workers", d)} workers`, mood: "" },
        ];
      }
      if (mode === "queue") {
        return [
          { id: "a", label: "Waiting in the queue", icon: "stack", hue: "amber", value: f("backlog", d), note: `peak ${f("peakBacklog", d)}`, mood: "" },
          { id: "b", label: "Longest wait", icon: "hourglass", hue: "violet", value: f("maxWaitSec", d), note: "for the last job of the spike", mood: "" },
          { id: "c", label: "Lost", icon: "check", hue: "green", value: f("failedTotal", d), note: "every job accepted", mood: "good" },
          { id: "d", label: "Drained after", icon: "gauge", hue: "cyan", value: f("drainSec", d), note: `${f("workers", d)} workers, ${f("capacity", d)} a second`, mood: "" },
        ];
      }
      return [
        { id: "a", label: "Workers spent on retries", icon: "gauge", hue: "amber", value: f("wastedPct", d), note: `${f("poisonRps", d)} poison jobs a second`, mood: (d.wastedPct ?? 0) > 10 ? "bad" : "good" },
        { id: "b", label: "Poison jobs circulating", icon: "activity", hue: "violet", value: f("circulating", d), note: mode === "dlq" ? `each tried ${f("attempts", d)} times` : "tried again and again", mood: mode === "dlq" ? "" : "bad" },
        { id: "c", label: "Dead letters", icon: "db", hue: "cyan", value: f("dlq", d), note: mode === "dlq" ? "waiting for a person" : "none: no dead-letter queue", mood: "" },
      ];
    },

    nodeBody(id: string, n: SceneNode): string {
      if (id === "workers") return `${nodeHead(n)}<div class="tx-fleet tx-fleet4" data-workers>${"<i></i>".repeat(MAX_WORKERS)}</div>`;
      if (id === "queue") return `${nodeHead(n)}<div><div class="tx-meter"><i data-qmeter></i></div><p class="tx-calc-s" data-backlog></p></div>`;
      if (id === "dlq") return `${nodeHead(n)}<p class="tx-calc-s" data-dlq></p>`;
      return nodeHead(n);
    },

    mount(world: HTMLElement) {
      els.workers = [...world.querySelectorAll<HTMLElement>("[data-workers] i")];
      els.backlog = world.querySelector("[data-backlog]");
      els.meter = world.querySelector("[data-qmeter]");
      els.dlq = world.querySelector("[data-dlq]");
      els.chartbox = world.closest(".tx-stage")?.querySelector<HTMLElement>(".tx-chartbox") ?? null;
    },

    paintWidgets(d: Outputs, ctx: StepContext) {
      ctxRef = ctx;
      const mode = modeOf(live());
      if (els.chartbox) els.chartbox.hidden = mode !== "queue";
      const n = Math.round(d.workers ?? 4);
      els.workers.forEach((el, i) => el.classList.toggle("on", i < n));
      text(els.backlog, `${f("backlog", d)} waiting · ${f("waitSec", d)} wait`);
      if (els.meter) els.meter.style.width = `${Math.min(100, (100 * (d.backlog ?? 0)) / CHART.max)}%`;
      text(els.dlq, `${f("dlq", d)} parked`);
    },

    chartSample(out: Outputs): number {
      return Math.min(CHART.max, out.backlog ?? 0);
    },
  };
}
