import type { Inputs, Outputs, SceneNode, SceneSpec } from "@tintelix/schema";
import { formatOutput } from "@tintelix/schema/format";
import type { Effects } from "../effects";
import { gateway } from "../routers/gateway";
import { nodeHead } from "../render/dom";
import type { SimEvent } from "../sim";
import type { SceneChart, SceneRuntime, StepContext, Tile, WireStyle } from "./types";

const LEGEND: SceneRuntime["legend"] = [["cyan", "request"], ["violet", "inside one screen call"], ["green", "reply"]];
const CHART: SceneChart = { label: "HOME SCREEN", output: "screenMs", max: 300, danger: 200 };
/** The home screen needs the user first, then their orders. */
const SCREEN = [0, 1];

export function createGatewayScene(o: { fx: Effects; rand: () => number; scene: SceneSpec }): SceneRuntime {
  const { fx, rand } = o;
  const ids = Object.keys(o.scene.nodes).filter((n) => /^s\d+$/.test(n));
  let ctxRef: StepContext | null = null;
  const liveInputs = (ctx: StepContext): Inputs => ({ ...ctx.inputs });
  const live = (): Outputs => (ctxRef ? ctxRef.model.run(liveInputs(ctxRef)) : {});
  const f = (name: string, d: Outputs) => formatOutput(name, d[name] ?? 0);
  const fleet = () => ctxRef?.step.sim?.mode === "fleet";
  const els: { guard: Record<string, HTMLElement>; gw: HTMLElement | null; chartbox: HTMLElement | null } = { guard: {}, gw: null, chartbox: null };
  const text = (el: Element | null | undefined, t: string) => {
    if (el && el.textContent !== t) el.textContent = t;
  };

  return {
    router: gateway({ mode: () => Math.round(live().mode ?? 0), services: ids.length, screen: SCREEN }),
    fx,
    legend: LEGEND,
    sim: { ratePerSec: 3 },
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
      const mode = Math.round(live().mode ?? 0);
      if (mode === 0 && e.kind === "pass" && /^s\d+$/.test(e.node) && rand() < 0.15) fx.float(e.at[0] + 180, e.at[1] - 34, "checking sign-in again", "amber");
      if (mode >= 1 && e.kind === "pass" && e.node === "gateway" && rand() < 0.15) fx.float(e.at[0] + 100, e.at[1] - 88, "token checked once", "green");
    },

    wireStyles(): WireStyle[] {
      const mode = Math.round(live().mode ?? 0);
      if (mode === 0) return ids.map((s): WireStyle => ({ wire: `p_${s}`, color: "blue", alpha: 0.32, width: 1.6 }));
      return [{ wire: "p_g", color: "blue", alpha: 0.42, width: 2 }, ...ids.map((s): WireStyle => ({ wire: `g_${s}`, color: "blue", alpha: 0.32, width: 1.6 }))];
    },

    tiles(d, ctx): Tile[] {
      ctxRef = ctx;
      const mode = Math.round(d.mode ?? 0);
      if (fleet()) {
        return [
          { id: "a", label: "Gateway copies", icon: "server", hue: "violet", value: f("gatewayInstances", d), note: `for ${f("rps", d)} requests a second, one spare`, mood: "" },
          { id: "b", label: "Added per request", icon: "hourglass", hue: "amber", value: f("gatewayMs", d), note: "keep the gateway thin", mood: "" },
          { id: "c", label: "Home screen", icon: "users", hue: "cyan", value: f("screenMs", d), note: "with aggregation", mood: "good" },
        ];
      }
      if (mode === 2) {
        return [
          { id: "a", label: "Calls from the phone", icon: "users", hue: "green", value: f("phoneCalls", d), note: "for the whole screen", mood: "good" },
          { id: "b", label: "Home screen", icon: "hourglass", hue: "cyan", value: f("screenMs", d), note: "the rounds happen inside", mood: "good" },
          { id: "c", label: "Phone round trip", icon: "activity", hue: "amber", value: f("rttMs", d), note: "paid once", mood: "" },
        ];
      }
      if (mode === 1) {
        return [
          { id: "a", label: "Sign-in checks", icon: "check", hue: "green", value: f("authCopies", d), note: "in the gateway", mood: "good" },
          { id: "b", label: "Added per request", icon: "hourglass", hue: "amber", value: f("gatewayMs", d), note: "one more hop", mood: "" },
          { id: "c", label: "Home screen", icon: "users", hue: "cyan", value: f("screenMs", d), note: `${f("rounds", d)} rounds over the phone network`, mood: "" },
        ];
      }
      return [
        { id: "a", label: "Sign-in checks", icon: "target", hue: "amber", value: f("authCopies", d), note: "one copy per service", mood: "bad" },
        { id: "b", label: "Addresses the app knows", icon: "activity", hue: "violet", value: f("addresses", d), note: "one per service", mood: "bad" },
        { id: "c", label: "Home screen", icon: "users", hue: "cyan", value: f("screenMs", d), note: `${f("rounds", d)} rounds over the phone network`, mood: "" },
      ];
    },

    nodeBody(id: string, n: SceneNode): string {
      if (ids.includes(id)) return `<div class="tx-shardrow tx-svcrow"><b>${n.label}</b><span data-guard="${id}"></span></div>`;
      if (id === "gateway") return `${nodeHead(n)}<p class="tx-calc-s" data-gw></p>`;
      return nodeHead(n);
    },

    mount(world: HTMLElement) {
      for (const el of world.querySelectorAll<HTMLElement>("[data-guard]")) els.guard[el.dataset.guard!] = el;
      els.gw = world.querySelector("[data-gw]");
      els.chartbox = world.closest(".tx-stage")?.querySelector<HTMLElement>(".tx-chartbox") ?? null;
    },

    paintWidgets(d: Outputs, ctx: StepContext) {
      ctxRef = ctx;
      if (els.chartbox) els.chartbox.hidden = true;
      const mode = Math.round(live().mode ?? 0);
      for (const s of ids) text(els.guard[s], mode === 0 ? "checks sign-in itself" : "trusts the gateway");
      text(els.gw, fleet() ? `${f("gatewayInstances", d)} copies behind a load balancer` : "checks sign-in · limits · routes");
    },

    chartSample(out: Outputs): number {
      return Math.min(CHART.max, out.screenMs ?? 0);
    },
  };
}
