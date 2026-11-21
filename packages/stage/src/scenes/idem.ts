import type { Inputs, Outputs, SceneNode, SceneSpec } from "@tintelix/schema";
import { formatOutput } from "@tintelix/schema/format";
import type { Effects } from "../effects";
import { nodeHead } from "../render/dom";
import { idem } from "../routers/idem";
import type { SimEvent } from "../sim";
import type { SceneChart, SceneRuntime, StepContext, Tile, WireStyle } from "./types";

const LEGEND: SceneRuntime["legend"] = [["cyan", "payment"], ["amber", "retry or duplicate"], ["green", "charged once"], ["red", "lost reply or charged twice"]];
const CHART: SceneChart = { label: "CHARGED TWICE A SECOND", output: "doubles", max: 10, danger: 0.5 };
const POLICY = ["no key: every call charges", "looks up the key, then saves it", "claims the key first, atomically"];
/** Lost replies and double taps are drawn far more often than they happen, and the live tag says so. */
const SHARES: Record<string, { lost: number; dup: number }> = { retries: { lost: 0.3, dup: 0.05 }, races: { lost: 0.05, dup: 0.25 } };

export function createIdemScene(o: { fx: Effects; rand: () => number; scene: SceneSpec }): SceneRuntime {
  const { fx } = o;
  let ctxRef: StepContext | null = null;
  const liveInputs = (ctx: StepContext): Inputs => ({ ...ctx.inputs });
  const live = (): Outputs => (ctxRef ? ctxRef.model.run(liveInputs(ctxRef)) : {});
  const f = (name: string, d: Outputs) => formatOutput(name, d[name] ?? 0);
  const shares = () => SHARES[ctxRef?.step.sim?.mode ?? "retries"] ?? SHARES.retries!;
  const els: { policy: HTMLElement | null; keys: HTMLElement | null; chartbox: HTMLElement | null } = { policy: null, keys: null, chartbox: null };
  const text = (el: Element | null | undefined, t: string) => {
    if (el && el.textContent !== t) el.textContent = t;
  };

  return {
    router: idem({ mode: () => Math.round(live().mode ?? 0), lostShare: () => shares().lost, dupShare: () => shares().dup }),
    fx,
    legend: LEGEND,
    sim: { ratePerSec: 1.6 },
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
      if (e.kind === "miss" && e.node === "bank") fx.float(e.at[0] + 150, e.at[1] - 70, "charged twice!", "red");
      if (e.kind === "fill" && e.node === "client") fx.float(e.at[0] - 20, e.at[1] - 70, "no reply: retry", "amber");
      if (e.kind === "hit" && e.node === "keys") fx.float(e.at[0] + 150, e.at[1] - 70, "seen this key: saved result", "green");
      if (e.kind === "fill" && e.node === "keys") fx.float(e.at[0] + 150, e.at[1] - 70, "key taken: already in progress", "amber");
    },

    wireStyles(): WireStyle[] {
      const keys = !!ctxRef?.visible.has("keys");
      return [
        { wire: "c_a", color: "blue", alpha: 0.42, width: 2 },
        { wire: "a_b", color: "blue", alpha: 0.42, width: 2 },
        ...(keys ? [{ wire: "a_k", color: "blue" as const, alpha: 0.42, width: 2 }] : []),
      ];
    },

    tiles(d, ctx): Tile[] {
      ctxRef = ctx;
      const mode = Math.round(d.mode ?? 0);
      if (mode === 0) {
        return [
          { id: "a", label: "Charged twice", icon: "activity", hue: "amber", value: f("doubles", d), note: `a second: ${f("doublesPerDay", d)} a day`, mood: "bad" },
          { id: "b", label: "Retries", icon: "hourglass", hue: "violet", value: f("retries", d), note: `a second; ${f("completedPct", d)} were already charged`, mood: "" },
          { id: "c", label: "Double taps", icon: "users", hue: "blue", value: f("raceDoubles", d), note: "a second, charged twice too", mood: "bad" },
        ];
      }
      return [
        { id: "a", label: "Charged twice", icon: "activity", hue: "amber", value: f("doubles", d), note: "a second", mood: (d.doubles ?? 0) > 0 ? "bad" : "good" },
        { id: "b", label: "From retries", icon: "check", hue: "green", value: f("retryDoubles", d), note: "the key returns the saved result", mood: "good" },
        { id: "c", label: "From races", icon: "users", hue: "violet", value: f("raceDoubles", d), note: mode === 2 ? "the second claim is refused" : "both look before either saves", mood: (d.raceDoubles ?? 0) > 0 ? "bad" : "good" },
        { id: "d", label: "Keys kept", icon: "db", hue: "cyan", value: f("keysStored", d), note: `${f("keyGb", d)} GB for ${f("keyTtlHours", d)} hours`, mood: "" },
      ];
    },

    nodeBody(id: string, n: SceneNode): string {
      if (id === "api") return `${nodeHead(n)}<p class="tx-calc-s" data-policy></p>`;
      if (id === "keys") return `${nodeHead(n)}<p class="tx-calc-s" data-keys></p>`;
      return nodeHead(n);
    },

    mount(world: HTMLElement) {
      els.policy = world.querySelector("[data-policy]");
      els.keys = world.querySelector("[data-keys]");
      els.chartbox = world.closest(".tx-stage")?.querySelector<HTMLElement>(".tx-chartbox") ?? null;
    },

    paintWidgets(d: Outputs, ctx: StepContext) {
      ctxRef = ctx;
      if (els.chartbox) els.chartbox.hidden = true;
      text(els.policy, POLICY[Math.round(live().mode ?? 0)] ?? POLICY[0]!);
      text(els.keys, `${f("keysStored", d)} keys, ${f("keyGb", d)} GB`);
    },

    chartSample(out: Outputs): number {
      return Math.min(CHART.max, out.doubles ?? 0);
    },
  };
}
