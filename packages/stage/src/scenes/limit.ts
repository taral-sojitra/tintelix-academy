import type { Inputs, Outputs, SceneNode, SceneSpec } from "@tintelix/schema";
import { formatOutput } from "@tintelix/schema/format";
import type { Effects } from "../effects";
import { nodeHead } from "../render/dom";
import { limit } from "../routers/limit";
import type { SimEvent } from "../sim";
import type { SceneChart, SceneRuntime, StepContext, Tile, WireStyle } from "./types";

const LEGEND: SceneRuntime["legend"] = [["cyan", "normal user"], ["violet", "flooding client"], ["amber", "429: slow down"], ["red", "dropped by the API"]];
const CHART: SceneChart = { label: "NORMAL USERS SERVED", output: "successPct", max: 100, danger: 90 };
/** In the burst step, a page load fires its burst every CYCLE seconds, BURST_AT into the cycle. */
const CYCLE = 6;
const BURST_AT = 0.5;
const VISIBLE_FLOOD = 0.6;

export function createLimitScene(o: { fx: Effects; rand: () => number; scene: SceneSpec }): SceneRuntime {
  const { fx, rand } = o;
  let ctxRef: StepContext | null = null;
  let clock = 0;
  const liveInputs = (ctx: StepContext): Inputs => ({ ...ctx.inputs });
  const live = (): Outputs => (ctxRef ? ctxRef.model.run(liveInputs(ctxRef)) : {});
  const f = (name: string, d: Outputs) => formatOutput(name, d[name] ?? 0);
  const burstStep = () => ctxRef?.step.sim?.mode === "burst";
  const els: { fill: HTMLElement | null; tokens: HTMLElement | null; served: HTMLElement | null; meter: HTMLElement | null; chartbox: HTMLElement | null } = { fill: null, tokens: null, served: null, meter: null, chartbox: null };
  const text = (el: Element | null | undefined, t: string) => {
    if (el && el.textContent !== t) el.textContent = t;
  };

  /** Tokens left in the page's bucket at this point of the burst cycle. */
  function pageTokens(d: Outputs): number {
    const bucket = d.bucket ?? 50;
    const c = clock % CYCLE;
    if (c < BURST_AT) return bucket;
    return Math.min(bucket, bucket - (d.burstAllowed ?? 0) + (d.limit ?? 10) * (c - BURST_AT));
  }

  return {
    router: limit({
      flooderShare: () => (burstStep() ? 0.15 : VISIBLE_FLOOD),
      refuseShare: () => {
        const d = live();
        return (d.flooderRate ?? 1) > 0 ? (d.refusedRps ?? 0) / (d.flooderRate ?? 1) : 0;
      },
      overloadShare: () => 1 - (live().successPct ?? 100) / 100,
    }),
    fx,
    legend: LEGEND,
    sim: { ratePerSec: 4 },
    chart: CHART,
    lane: null,
    liveInputs,

    enterStep(ctx) {
      ctxRef = ctx;
      clock = 0;
    },

    update(dt, ctx) {
      ctxRef = ctx;
      clock += dt;
    },

    onEvent(e: SimEvent, ctx) {
      ctxRef = ctx;
      if (e.kind === "fill" && e.node === "limiter" && rand() < 0.12) fx.float(e.at[0] + 20, e.at[1] + 70, "429: slow down", "amber");
      if (e.kind === "miss" && e.node === "api" && rand() < 0.1) fx.float(e.at[0] + 140, e.at[1] - 80, "API overloaded", "red");
    },

    wireStyles(): WireStyle[] {
      return ["n_l", "f_l", "l_a"].map((w): WireStyle => ({ wire: w, color: "blue", alpha: 0.42, width: 2 }));
    },

    tiles(d, ctx): Tile[] {
      ctxRef = ctx;
      const mode = Math.round(d.mode ?? 0);
      if (burstStep()) {
        return [
          { id: "a", label: "Burst let through", icon: "check", hue: "green", value: `${f("burstAllowed", d)} of ${f("burst", d)}`, note: `bucket holds ${f("bucket", d)}`, mood: "good" },
          { id: "b", label: "A strict per-second limit", icon: "target", hue: "amber", value: f("windowAllowed", d), note: "would let only this many through", mood: "bad" },
          { id: "c", label: "Bucket refills in", icon: "hourglass", hue: "cyan", value: f("refillSec", d), note: `${f("limit", d)} tokens a second`, mood: "" },
        ];
      }
      if (mode === 2) {
        return [
          { id: "a", label: "Flooder gets", icon: "activity", hue: "violet", value: `${f("flooderAllowed", d)}/s`, note: `${f("servers", d)} servers × ${f("limit", d)}`, mood: "bad" },
          { id: "b", label: "With one shared count", icon: "check", hue: "green", value: `${f("sharedAllowed", d)}/s`, note: "the limit you meant", mood: "good" },
          { id: "c", label: "Normal users served", icon: "users", hue: "cyan", value: f("successPct", d), note: "for now", mood: "" },
        ];
      }
      if (mode === 1) {
        return [
          { id: "a", label: "Normal users served", icon: "users", hue: "cyan", value: f("successPct", d), note: `${f("normalRps", d)} requests a second`, mood: "good" },
          { id: "b", label: "Refused with 429", icon: "target", hue: "amber", value: `${f("refusedRps", d)}/s`, note: "all from the flooding client", mood: "" },
          { id: "c", label: "Flooder gets", icon: "activity", hue: "violet", value: `${f("flooderAllowed", d)}/s`, note: `its limit: ${f("limit", d)} a second`, mood: "" },
        ];
      }
      return [
        { id: "a", label: "Normal users served", icon: "users", hue: "cyan", value: f("successPct", d), note: "of their requests", mood: "bad" },
        { id: "b", label: "API load", icon: "gauge", hue: "amber", value: f("loadPct", d), note: `${f("offered", d)} a second for ${f("capacity", d)}`, mood: "bad" },
        { id: "c", label: "Flooding client sends", icon: "activity", hue: "violet", value: `${f("flooderRate", d)}/s`, note: "one buggy script", mood: "bad" },
      ];
    },

    nodeBody(id: string, n: SceneNode): string {
      if (id === "limiter") return `${nodeHead(n)}<div><div class="tx-meter tx-bucket"><i data-fill></i></div><p class="tx-calc-s" data-tokens></p></div>`;
      if (id === "api") return `${nodeHead(n)}<div><div class="tx-meter"><i data-load></i></div><p class="tx-calc-s" data-served></p></div>`;
      return nodeHead(n);
    },

    mount(world: HTMLElement) {
      els.fill = world.querySelector("[data-fill]");
      els.tokens = world.querySelector("[data-tokens]");
      els.served = world.querySelector("[data-served]");
      els.meter = world.querySelector("[data-load]");
      els.chartbox = world.closest(".tx-stage")?.querySelector<HTMLElement>(".tx-chartbox") ?? null;
    },

    paintWidgets(d: Outputs, ctx: StepContext) {
      ctxRef = ctx;
      const L = live();
      const mode = Math.round(L.mode ?? 0);
      if (els.chartbox) els.chartbox.hidden = burstStep() || mode === 2;
      const bucket = L.bucket ?? 50;
      let tokens = 0;
      let label = "no limit";
      if (burstStep()) {
        tokens = Math.round(pageTokens(L));
        label = tokens >= bucket ? `page's bucket: ${formatOutput("t", bucket)} of ${formatOutput("t", bucket)}` : `page's bucket: ${formatOutput("t", tokens)} of ${formatOutput("t", bucket)} after a burst of ${f("burstAllowed", L)}`;
      } else if (mode >= 1) label = `flooder's bucket: 0 of ${f("bucket", L)}, refills ${f("limit", L)} a second`;
      text(els.tokens, label);
      if (els.fill) els.fill.style.width = `${mode === 0 ? 0 : (100 * tokens) / bucket}%`;
      text(els.served, `${f("loadPct", d)} of capacity asked for`);
      if (els.meter) els.meter.style.width = `${Math.min(100, d.loadPct ?? 0)}%`;
    },

    chartSample(out: Outputs): number {
      return Math.min(CHART.max, out.successPct ?? 0);
    },
  };
}
