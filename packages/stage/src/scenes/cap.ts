import type { Inputs, Outputs, SceneNode, SceneSpec } from "@tintelix/schema";
import { formatOutput } from "@tintelix/schema/format";
import type { Effects } from "../effects";
import { nodeHead } from "../render/dom";
import { cap, type CapMode } from "../routers/cap";
import type { SimEvent } from "../sim";
import type { SceneChart, SceneRuntime, StepContext, Tile, WireStyle } from "./types";

const LEGEND: SceneRuntime["legend"] = [["cyan", "request"], ["green", "answered"], ["red", "refused"], ["amber", "answered, maybe stale"]];
const CHART: SceneChart = { label: "REQUESTS REFUSED", output: "errorPct", max: 100, danger: 5 };
const MODES: CapMode[] = ["healthy", "cp", "ap"];

export function createCapScene(o: { fx: Effects; rand: () => number; scene: SceneSpec }): SceneRuntime {
  const { fx, rand } = o;
  let ctxRef: StepContext | null = null;
  const liveInputs = (ctx: StepContext): Inputs => ({ ...ctx.inputs });
  const live = (): Outputs => (ctxRef ? ctxRef.model.run(liveInputs(ctxRef)) : {});
  const f = (name: string, d: Outputs) => formatOutput(name, d[name] ?? 0);
  const modeOf = (d: Outputs): CapMode => MODES[Math.round(d.mode ?? 0)] ?? "healthy";
  const els: { link: HTMLElement | null; ruleA: HTMLElement | null; ruleB: HTMLElement | null; ruleNote: HTMLElement | null; n3: HTMLElement | null; chartbox: HTMLElement | null } = { link: null, ruleA: null, ruleB: null, ruleNote: null, n3: null, chartbox: null };
  const text = (el: Element | null | undefined, t: string) => {
    if (el && el.textContent !== t) el.textContent = t;
  };

  return {
    router: cap({ mode: () => modeOf(live()), sideBShare: () => (live().sideBPct ?? 0) / 100 }),
    fx,
    legend: LEGEND,
    sim: { ratePerSec: 5 },
    chart: CHART,
    lane: null,
    liveInputs,

    enterStep(ctx) {
      ctxRef = ctx;
    },

    update(_dt, ctx) {
      ctxRef = ctx;
    },

    onEvent(e: SimEvent, ctx) {
      ctxRef = ctx;
      if (e.kind === "miss" && rand() < 0.35) fx.float(e.at[0] + 120, e.at[1] - 56, "no majority: refused", "red");
      if (e.kind === "fill" && rand() < 0.25) fx.float(e.at[0] + 120, e.at[1] - 56, "may miss site A's writes", "amber");
    },

    wireStyles(): WireStyle[] {
      const split = modeOf(live()) !== "healthy";
      return [
        { wire: "ua_n1", color: "blue", alpha: 0.4, width: 2 },
        { wire: "ua_n2", color: "blue", alpha: 0.4, width: 2 },
        { wire: "ub_n3", color: "blue", alpha: 0.4, width: 2 },
        split ? { wire: "link", color: "red", alpha: 0.6, width: 2, dash: [4, 6] } : { wire: "link", color: "green", alpha: 0.55, width: 2, dash: [3, 10], flowDir: 1 },
      ];
    },

    tiles(d, ctx): Tile[] {
      ctxRef = ctx;
      const mode = modeOf(d);
      if (mode === "healthy") {
        return [
          { id: "a", label: "A write takes", icon: "hourglass", hue: "amber", value: f("commitMs", d), note: `waits for ${f("majority", d)} of ${f("replicas", d)} copies`, mood: "" },
          { id: "b", label: "Writes in flight", icon: "activity", hue: "violet", value: f("inFlight", d), note: `at ${f("writeRps", d)} writes a second`, mood: "" },
          { id: "c", label: "Copies", icon: "db", hue: "cyan", value: f("replicas", d), note: "all in step", mood: "good" },
        ];
      }
      return [
        { id: "a", label: "Refused", icon: "target", hue: "amber", value: f("errorPct", d), note: mode === "cp" ? `${f("errorRps", d)} requests a second` : "nobody", mood: mode === "cp" ? "bad" : "good" },
        { id: "b", label: "Maybe stale", icon: "activity", hue: "violet", value: f("stalePct", d), note: mode === "ap" ? `site B can't see site A's writes` : "every answer is current", mood: mode === "ap" ? "bad" : "good" },
        { id: "c", label: "Writes to reconcile", icon: "stack", hue: "cyan", value: f("reconcile", d), note: mode === "ap" ? `after a ${f("partitionSec", d)} split` : "none: site B took no writes", mood: "" },
      ];
    },

    nodeBody(id: string, n: SceneNode): string {
      if (id === "rule") return `${nodeHead(n)}<div class="tx-rules"><p data-rule-a></p><p data-rule-b></p><p class="tx-calc-s" data-rule-note></p></div>`;
      return nodeHead(n);
    },

    mount(world: HTMLElement) {
      els.link = world.querySelector('.tx-wlabel[data-wire="link"]');
      els.ruleA = world.querySelector("[data-rule-a]");
      els.ruleB = world.querySelector("[data-rule-b]");
      els.ruleNote = world.querySelector("[data-rule-note]");
      els.n3 = world.querySelector('[data-node="n3"]');
      els.chartbox = world.closest(".tx-stage")?.querySelector<HTMLElement>(".tx-chartbox") ?? null;
    },

    paintWidgets(d: Outputs, ctx: StepContext) {
      ctxRef = ctx;
      const mode = modeOf(live());
      if (els.chartbox) els.chartbox.hidden = mode === "healthy";
      text(els.link, mode === "healthy" ? "network link" : "✕ cut");
      els.n3?.classList.toggle("tx-down", mode === "cp");
      els.n3?.classList.toggle("tx-stale", mode === "ap");
      text(els.ruleA, mode === "healthy" ? "Site A: in step with the others" : `Site A: ${f("majority", d)} of ${f("replicas", d)} copies, a majority: keeps answering`);
      text(els.ruleB, mode === "healthy" ? "Site B: in step with the others" : mode === "cp" ? "Site B: alone, a minority: refuses" : "Site B: alone: answers from its own copy");
      text(els.ruleNote, mode === "healthy" ? `Each write waits for ${f("majority", d)} copies: ${f("commitMs", d)}.` : mode === "cp" ? "Consistent: nobody reads old data, but some users get errors." : "Available: everyone gets an answer, but some answers are old.");
    },

    chartSample(out: Outputs): number {
      return Math.min(CHART.max, out.errorPct ?? 0);
    },
  };
}
