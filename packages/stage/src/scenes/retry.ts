import type { Inputs, Outputs, SceneNode, SceneSpec } from "@tintelix/schema";
import { formatOutput } from "@tintelix/schema/format";
import type { Effects } from "../effects";
import { nodeHead } from "../render/dom";
import { retry } from "../routers/retry";
import type { SimEvent } from "../sim";
import type { SceneChart, SceneRuntime, StepContext, Tile, WireStyle } from "./types";

const LEGEND: SceneRuntime["legend"] = [["cyan", "call"], ["amber", "retry"], ["green", "answered"], ["red", "timed out or refused"]];
const CHART: SceneChart = { label: "CALLS OFFERED TO PRICING", output: "offered", max: 1500, danger: 125 };
const WAVE_SLICES = 4;

export function createRetryScene(o: { fx: Effects; rand: () => number; scene: SceneSpec }): SceneRuntime {
  const { fx, rand } = o;
  let ctxRef: StepContext | null = null;
  let clock = 0;
  let key = "";
  const inputKey = (i: Inputs) => JSON.stringify(Object.entries(i).filter(([k]) => k !== "elapsedSec").sort());
  const liveInputs = (ctx: StepContext): Inputs => ({ ...ctx.inputs, elapsedSec: clock });
  const live = (): Outputs => (ctxRef ? ctxRef.model.run(liveInputs(ctxRef)) : {});
  const f = (name: string, d: Outputs) => formatOutput(name, d[name] ?? 0);
  const els: { bars: Record<string, HTMLElement>; margin: HTMLElement | null; pool: HTMLElement | null; meter: HTMLElement | null; waves: HTMLElement[]; waveBox: HTMLElement | null; waveCap: HTMLElement | null; brk: HTMLElement | null; brkNode: HTMLElement | null; chartbox: HTMLElement | null } = { bars: {}, margin: null, pool: null, meter: null, waves: [], waveBox: null, waveCap: null, brk: null, brkNode: null, chartbox: null };
  const text = (el: Element | null | undefined, t: string) => {
    if (el && el.textContent !== t) el.textContent = t;
  };
  const breakerName = (b: number) => (b === 1 ? "open" : b === 2 ? "closed again" : "closed");

  return {
    router: retry({
      healthy: () => {
        const d = live();
        return (d.mode ?? 0) === 0 || (d.breaker ?? 0) === 2;
      },
      hasBreaker: () => (live().mode ?? 0) === 3,
      open: () => (live().breaker ?? 0) === 1,
      attempts: 3,
    }),
    fx,
    legend: LEGEND,
    sim: { ratePerSec: 2.4 },
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
      if (e.kind === "fill" && e.node === "order" && rand() < 0.2) fx.float(e.at[0], e.at[1] - 70, "timed out: try again", "amber");
      if (e.kind === "fill" && e.node === "breaker" && rand() < 0.25) fx.float(e.at[0] + 60, e.at[1] + 64, "open: fail fast", "red");
    },

    wireStyles(): WireStyle[] {
      const brk = (live().mode ?? 0) === 3;
      return (brk ? ["u_b", "b_k", "k_c"] : ["u_b", "b_c"]).map((w): WireStyle => ({ wire: w, color: "blue", alpha: 0.42, width: 2 }));
    },

    tiles(d, ctx): Tile[] {
      ctxRef = ctx;
      const mode = Math.round(d.mode ?? 0);
      if (mode === 0) {
        return [
          { id: "a", label: "Order service uses", icon: "hourglass", hue: "amber", value: f("orderUsedMs", d), note: `of the gateway's ${f("gatewayTimeoutMs", d)}`, mood: "" },
          { id: "b", label: "Spare", icon: "check", hue: "green", value: f("marginMs", d), note: (d.marginMs ?? 0) > 0 ? "room for its own reply" : "timeouts fire on calls about to succeed", mood: (d.marginMs ?? 0) > 0 ? "good" : "bad" },
          { id: "c", label: "Shopper waits at most", icon: "users", hue: "cyan", value: f("budgetMs", d), note: "the whole budget", mood: "" },
        ];
      }
      if (mode === 3) {
        const b = Math.round(live().breaker ?? 0);
        return [
          { id: "a", label: "Breaker", icon: "target", hue: "violet", value: breakerName(b), note: b === 1 ? `for ${f("openSec", d)}` : b === 2 ? "pricing recovered" : "failures piling up", mood: b === 1 ? "bad" : b === 2 ? "good" : "" },
          { id: "b", label: "Calls succeed", icon: "check", hue: "green", value: f("successPct", d), note: b === 1 ? "failing fast instead" : "", mood: (d.successPct ?? 0) > 50 ? "good" : "bad" },
          { id: "c", label: "Shopper waits", icon: "hourglass", hue: "amber", value: f("userWaitMs", d), note: b === 1 ? "an instant no, not a long wait" : "", mood: "" },
        ];
      }
      if (mode === 2) {
        return [
          { id: "a", label: "Retry wave peak", icon: "activity", hue: "amber", value: f("wavePeak", d), note: "in the busiest 100 ms", mood: "good" },
          { id: "b", label: "Longest backoff", icon: "hourglass", hue: "violet", value: f("backoffMs", d), note: "waits double between tries", mood: "" },
          { id: "c", label: "Calls succeed", icon: "check", hue: "green", value: f("successPct", d), note: "pricing is still overloaded", mood: "bad" },
        ];
      }
      return [
        { id: "a", label: "Calls succeed", icon: "check", hue: "green", value: f("successPct", d), note: `pricing answers in ${f("slowMs", d)}, callers give up at ${f("timeoutMs", d)}`, mood: "bad" },
        { id: "b", label: "Offered to pricing", icon: "activity", hue: "amber", value: `${f("offered", d)}/s`, note: `it can finish ${f("slowCapacity", d)} a second`, mood: "bad" },
        { id: "c", label: "Shopper waits", icon: "hourglass", hue: "violet", value: f("userWaitMs", d), note: `${f("attempts", d)} tries × ${f("timeoutMs", d)}, then an error`, mood: "bad" },
      ];
    },

    nodeBody(id: string, n: SceneNode): string {
      if (id === "budget") {
        const row = (label: string, inner: string) => `<div class="tx-brow"><em>${label}</em><div class="tx-btrack">${inner}</div></div>`;
        return `${nodeHead(n)}<div class="tx-budget">${row("shopper", `<i class="b-client" data-bar="client"></i>`)}${row("gateway", `<i class="b-gw" data-bar="gateway"></i>`)}${row("order", `<i class="b-work" data-bar="work"></i><i class="b-pricing" data-bar="pricing"></i><i class="b-tax" data-bar="tax"></i>`)}</div><p class="tx-calc-s" data-margin></p>`;
      }
      if (id === "pricing") return `${nodeHead(n)}<div><div class="tx-meter"><i data-poolmeter></i></div><p class="tx-calc-s" data-pool></p><div class="tx-wavebox" data-wavebox><div class="tx-wave" data-wave>${"<i></i>".repeat(WAVE_SLICES)}</div><p class="tx-calc-s" data-wavecap></p></div></div>`;
      if (id === "breaker") return `${nodeHead(n)}<p class="tx-calc-s" data-brk></p>`;
      return nodeHead(n);
    },

    mount(world: HTMLElement) {
      for (const el of world.querySelectorAll<HTMLElement>("[data-bar]")) els.bars[el.dataset.bar!] = el;
      els.margin = world.querySelector("[data-margin]");
      els.pool = world.querySelector("[data-pool]");
      els.meter = world.querySelector("[data-poolmeter]");
      els.waves = [...world.querySelectorAll<HTMLElement>("[data-wave] i")];
      els.waveBox = world.querySelector("[data-wavebox]");
      els.waveCap = world.querySelector("[data-wavecap]");
      els.brk = world.querySelector("[data-brk]");
      els.brkNode = world.querySelector('[data-node="breaker"]');
      els.chartbox = world.closest(".tx-stage")?.querySelector<HTMLElement>(".tx-chartbox") ?? null;
    },

    paintWidgets(_d: Outputs, ctx: StepContext) {
      ctxRef = ctx;
      const d = live();
      const mode = Math.round(d.mode ?? 0);
      const b = Math.round(d.breaker ?? 0);
      if (els.chartbox) els.chartbox.hidden = mode === 0 || mode === 2;
      const pct = (ms: number) => `${Math.max(0, Math.min(100, (100 * ms) / (d.budgetMs ?? 1000))).toFixed(0)}%`;
      const set = (k: string, ms: number) => els.bars[k] && (els.bars[k]!.style.width = pct(ms));
      set("client", d.budgetMs ?? 0);
      set("gateway", d.gatewayTimeoutMs ?? 0);
      set("work", d.orderWorkMs ?? 0);
      set("pricing", d.pricingTimeoutMs ?? 0);
      set("tax", d.taxTimeoutMs ?? 0);
      text(els.margin, (d.marginMs ?? 0) >= 0 ? `order service: ${f("orderWorkMs", d)} work + ${f("pricingTimeoutMs", d)} pricing + ${f("taxTimeoutMs", d)} tax, ${f("marginMs", d)} spare` : `order service needs ${f("orderUsedMs", d)}: over the gateway's ${f("gatewayTimeoutMs", d)}`);
      const healthy = mode === 0 || b === 2;
      const busy = b === 1 ? 0 : healthy ? ((d.rps ?? 0) * (d.normalMs ?? 0)) / 1000 : (d.inFlightNeeded ?? 0);
      text(els.pool, b === 1 ? "no calls: catching up" : healthy ? `answers in ${f("normalMs", d)} · ${formatOutput("n", busy)} of ${f("pool", d)} connections busy` : `answers in ${f("slowMs", d)} · needs ${f("inFlightNeeded", d)} of ${f("pool", d)} connections`);
      if (els.meter) els.meter.style.width = `${Math.min(100, (100 * busy) / (d.pool ?? 50))}%`;
      if (els.waveBox) els.waveBox.hidden = !(mode === 1 || mode === 2);
      const share = (d.wavePeak ?? 0) / Math.max(1, d.rps ?? 1);
      text(els.waveCap, mode === 2 ? `${f("wavePeak", d)} per 100 ms, spread over ${f("backoffMs", d)}` : `${f("rps", d)} retries land in the same 100 ms`);
      els.waves.forEach((el, i) => (el.style.height = mode === 2 ? `${(100 * share).toFixed(0)}%` : i === 0 ? "100%" : "0%"));
      els.brkNode?.classList.toggle("tx-down", b === 1);
      const left = Math.ceil((d.tripSec ?? 0) + (d.openSec ?? 0) - clock - 1e-9);
      text(els.brk, b === 1 ? `OPEN · ${left} s left` : b === 2 ? "CLOSED: test calls passed" : "CLOSED: counting failures");
    },

    chartSample(out: Outputs): number {
      return Math.min(CHART.max, out.offered ?? 0);
    },
  };
}
