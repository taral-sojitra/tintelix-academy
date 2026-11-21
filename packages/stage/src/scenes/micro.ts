import type { Inputs, Outputs, SceneNode, SceneSpec } from "@tintelix/schema";
import { formatOutput } from "@tintelix/schema/format";
import type { Effects } from "../effects";
import { nodeHead } from "../render/dom";
import { micro } from "../routers/micro";
import type { SimEvent } from "../sim";
import type { SceneChart, SceneRuntime, StepContext, Tile, WireStyle } from "./types";

const LEGEND: SceneRuntime["legend"] = [["cyan", "request"], ["violet", "call to another service"], ["green", "reply"]];
const CHART: SceneChart = { label: "CHECKOUT CALL TIME", output: "callUs", max: 5000, danger: 2000 };
const CHECKOUT = ["users_svc", "catalog", "payments", "shipping"];
const MODULES = ["Orders", "Users", "Catalog", "Payments", "Shipping", "Search"];
/** Inside the monolith a checkout lights each module in turn, this long apiece. */
const FLASH = 0.12;

export function createMicroScene(o: { fx: Effects; rand: () => number; scene: SceneSpec }): SceneRuntime {
  const { fx, rand } = o;
  let ctxRef: StepContext | null = null;
  let flash = -1;
  const liveInputs = (ctx: StepContext): Inputs => ({ ...ctx.inputs });
  const f = (name: string, d: Outputs) => formatOutput(name, d[name] ?? 0);
  const split = () => !!ctxRef?.visible.has("orders");
  const sim = () => ctxRef?.step.sim?.mode ?? "deploy";
  const els: { chips: HTMLElement[]; chartbox: HTMLElement | null; notes: HTMLElement[] } = { chips: [], chartbox: null, notes: [] };

  return {
    router: micro({ split, checkoutCalls: CHECKOUT, searchShare: 0.2 }),
    fx,
    legend: LEGEND,
    sim: { ratePerSec: 2.2 },
    chart: CHART,
    lane: null,
    liveInputs,

    enterStep(ctx) {
      ctxRef = ctx;
      flash = -1;
    },

    update(dt, ctx) {
      ctxRef = ctx;
      if (flash >= 0) {
        flash += dt;
        if (flash > FLASH * (MODULES.length - 1)) flash = -1;
      }
    },

    onEvent(e: SimEvent, ctx) {
      ctxRef = ctx;
      if (e.kind === "pass" && e.node === "mono") flash = 0;
      if (e.kind === "pass" && CHECKOUT.includes(e.node) && rand() < 0.12) fx.float(e.at[0] + 60, e.at[1] - 40, "a network call", "violet");
    },

    wireStyles(): WireStyle[] {
      if (!split()) return [{ wire: "u_m", color: "blue", alpha: 0.42, width: 2 }];
      return ["u_o", "u_q", ...CHECKOUT.map((s) => `o_${s}`)].map((w): WireStyle => ({ wire: w, color: "blue", alpha: 0.38, width: 1.8 }));
    },

    tiles(d, ctx): Tile[] {
      ctxRef = ctx;
      const micro = (d.mode ?? 0) >= 0.5;
      if (sim() === "calls") {
        return [
          { id: "a", label: "Checkout's calls take", icon: "hourglass", hue: "amber", value: `${f("callUs", d)} µs`, note: `${f("calls", d)} calls, ${micro ? "over the network" : "in one process"}`, mood: micro ? "bad" : "good" },
          { id: "b", label: "Checkout is up", icon: "check", hue: "green", value: f("checkoutAvail", d), note: micro ? `needs ${f("calls", d)} more services up too` : "one process", mood: micro ? "bad" : "good" },
          { id: "c", label: "Down a month", icon: "activity", hue: "violet", value: f("checkoutDowntime", d), note: "from those failures alone", mood: "" },
        ];
      }
      if (sim() === "scale") {
        return [
          { id: "a", label: "Monolith scaled up", icon: "stack", hue: "amber", value: `${f("monoScaleGb", d)} GB`, note: `${f("hotCopies", d)} copies of everything`, mood: "bad" },
          { id: "b", label: "Services scaled up", icon: "server", hue: "green", value: `${f("microScaleGb", d)} GB`, note: `${f("hotCopies", d)} copies of search only`, mood: "good" },
          { id: "c", label: "Copies search needs", icon: "gauge", hue: "cyan", value: f("hotCopies", d), note: "for the sale", mood: "" },
        ];
      }
      return [
        { id: "a", label: "Deploys a day", icon: "activity", hue: "cyan", value: f("deploysPerDay", d), note: `${f("teams", d)} teams × ${f("deploysPerTeam", d)}`, mood: "" },
        { id: "b", label: "Deploy line busy", icon: "hourglass", hue: "amber", value: `${f("deployLineHours", d)} h`, note: micro ? "no shared line" : "a day, one deploy at a time", mood: micro ? "good" : "bad" },
        { id: "c", label: "One team's deploy", icon: "users", hue: "violet", value: `${f("teamDeployMin", d)} min`, note: micro ? "whenever it likes" : "after waiting its turn", mood: micro ? "good" : "" },
      ];
    },

    nodeBody(id: string, n: SceneNode): string {
      if (id === "mono") return `${nodeHead(n)}<div class="tx-modules">${MODULES.map((m) => `<span>${m}</span>`).join("")}</div><p class="tx-calc-s">calls between modules are function calls</p>`;
      if (n.sub === "service") return `${nodeHead(n)}<p class="tx-calc-s" data-svc>own code, own deploy</p>`;
      return nodeHead(n);
    },

    mount(world: HTMLElement) {
      els.chips = [...world.querySelectorAll<HTMLElement>(".tx-modules span")];
      els.chartbox = world.closest(".tx-stage")?.querySelector<HTMLElement>(".tx-chartbox") ?? null;
    },

    paintWidgets(_d: Outputs, ctx: StepContext) {
      ctxRef = ctx;
      if (els.chartbox) els.chartbox.hidden = true;
      const lit = flash >= 0 ? Math.min(MODULES.length - 2, Math.floor(flash / FLASH)) : -1;
      els.chips.forEach((el, i) => el.classList.toggle("on", i === lit));
    },

    chartSample(out: Outputs): number {
      return Math.min(CHART.max, out.callUs ?? 0);
    },
  };
}
