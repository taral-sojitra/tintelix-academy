import type { Inputs, Outputs, SceneNode, SceneSpec } from "@tintelix/schema";
import { formatOutput } from "@tintelix/schema/format";
import type { Effects } from "../effects";
import { nodeHead } from "../render/dom";
import { repl } from "../routers/repl";
import type { SimEvent } from "../sim";
import type { SceneChart, SceneRuntime, StepContext, Tile, WireStyle } from "./types";

type Mode = "copies" | "lag" | "failover";
const LEGEND: SceneRuntime["legend"] = [["amber", "write"], ["cyan", "read"], ["violet", "reading back your write"], ["red", "old value or failed"]];
const CHART: SceneChart = { label: "STALE READ-BACKS", output: "staleBackPct", max: 100, danger: 1 };
const REPLICAS = ["r0", "r1", "r2"];

export interface ReplState {
  mode(): Mode;
  writeTarget(): "primary" | "r0" | null;
  readers(): string[];
}
export type ReplScene = SceneRuntime & { state: ReplState };

export function createReplScene(o: { fx: Effects; rand: () => number; scene: SceneSpec }): ReplScene {
  const { fx, rand } = o;
  let ctxRef: StepContext | null = null;
  let clock = 0;
  let key = "";
  const inputKey = (i: Inputs) => JSON.stringify(Object.entries(i).filter(([k]) => k !== "elapsedSec").sort());
  const liveInputs = (ctx: StepContext): Inputs => ({ ...ctx.inputs, elapsedSec: clock });
  const live = (): Outputs => (ctxRef ? ctxRef.model.run(liveInputs(ctxRef)) : {});
  const f = (name: string, d: Outputs) => formatOutput(name, d[name] ?? 0);
  const modeOf = (): Mode => {
    const m = ctxRef?.step.sim?.mode;
    return m === "lag" || m === "failover" ? m : "copies";
  };
  const promoted = (d: Outputs) => (d.crash ?? 0) >= 0.5 && (d.writesDownPct ?? 0) === 0;
  const state: ReplState = {
    mode: modeOf,
    writeTarget: () => {
      const d = live();
      if ((d.crash ?? 0) < 0.5) return "primary";
      return promoted(d) ? "r0" : null;
    },
    readers: () => {
      const d = live();
      const n = Math.round(d.replicas ?? 2);
      return REPLICAS.slice(0, n).filter((r) => !(r === "r0" && promoted(d)));
    },
  };
  const els: { nodes: Record<string, HTMLElement>; role: Record<string, HTMLElement>; reads: Record<string, HTMLElement>; meter: Record<string, HTMLElement>; label: HTMLElement | null; labels: HTMLElement[]; chartbox: HTMLElement | null } = { nodes: {}, role: {}, reads: {}, meter: {}, label: null, labels: [], chartbox: null };
  const text = (el: Element | null | undefined, t: string) => {
    if (el && el.textContent !== t) el.textContent = t;
  };

  return {
    router: repl({
      writeTarget: () => state.writeTarget(),
      readers: () => state.readers(),
      readBackPrimary: () => (live().readBack ?? 0) >= 0.5,
      staleShare: () => (live().staleBackPct ?? 0) / 100,
      writeShare: 0.14,
      readBackShare: 0.14,
    }),
    fx,
    state,
    legend: LEGEND,
    sim: { ratePerSec: 5 },
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
      if (e.kind === "miss" && rand() < 0.5) fx.float(e.at[0] + 120, e.at[1] - 24, e.node === "primary" ? "write failed" : "old value", "red");
    },

    wireStyles(): WireStyle[] {
      const d = live();
      const n = Math.round(d.replicas ?? 2);
      const crashed = (d.crash ?? 0) >= 0.5;
      const reps = REPLICAS.slice(0, n);
      return [
        { wire: "a_p", color: "blue", alpha: crashed ? 0.12 : 0.4, width: 2 },
        ...reps.map((r): WireStyle => ({ wire: `a_${r}`, color: "blue", alpha: 0.34, width: 1.6 })),
        ...(crashed ? [] : reps.map((r): WireStyle => ({ wire: `p_${r}`, color: "amber", alpha: 0.5, width: 1.6, dash: [3, 10], flowDir: 1 }))),
      ];
    },

    tiles(d, ctx): Tile[] {
      ctxRef = ctx;
      const mode = modeOf();
      if (mode === "lag") {
        const back = (d.readBack ?? 0) >= 0.5;
        return [
          { id: "a", label: "Replica lag", icon: "hourglass", hue: "amber", value: f("lagMs", d), note: "behind the primary", mood: "" },
          { id: "b", label: "Stale read-backs", icon: "activity", hue: "violet", value: f("staleBackPct", d), note: `${f("staleBackRps", d)} a second`, mood: (d.staleBackPct ?? 0) > 0 ? "bad" : "good" },
          { id: "c", label: "Primary busy", icon: "gauge", hue: "cyan", value: f("primaryBusyPct", d), note: back ? "also serves read-backs" : "writes only", mood: "" },
        ];
      }
      if (mode === "failover") {
        return [
          { id: "a", label: "Lost writes", icon: "activity", hue: "amber", value: f("lostWrites", d), note: "acknowledged, then gone", mood: (d.lostWrites ?? 0) > 0 ? "bad" : "good" },
          { id: "b", label: "Writes failing", icon: "target", hue: "violet", value: f("writesDownPct", d), note: promoted(live()) ? "Replica 1 promoted" : `for ${f("failoverSec", d)}, while promoting`, mood: (d.writesDownPct ?? 0) > 0 ? "bad" : "good" },
          { id: "c", label: "Sync replication", icon: "hourglass", hue: "cyan", value: f("syncWriteMs", d), note: `per write, against ${f("commitMs", d)}`, mood: "" },
        ];
      }
      return [
        { id: "a", label: "Reads per replica", icon: "db", hue: "cyan", value: f("perReplicaReads", d), note: `${f("replicaBusyPct", d)} busy`, mood: (d.replicaBusyPct ?? 0) > 85 ? "bad" : "" },
        { id: "b", label: "Writes", icon: "activity", hue: "amber", value: f("writeRps", d), note: `all on the primary, ${f("primaryBusyPct", d)} busy`, mood: "" },
        { id: "c", label: "Read capacity", icon: "gauge", hue: "green", value: f("maxReadRps", d), note: `${f("replicas", d)} replicas × ${f("nodeCap", d)} a second`, mood: "" },
      ];
    },

    nodeBody(id: string, n: SceneNode): string {
      if (id === "primary") return `${nodeHead(n)}<div><div class="tx-meter"><i data-meter="primary"></i></div><p class="tx-calc-s" data-role="primary"></p></div>`;
      if (REPLICAS.includes(id)) return `${nodeHead(n)}<div><div class="tx-meter"><i data-meter="${id}"></i></div><p class="tx-calc-s" data-reads="${id}"></p><p class="tx-calc-s tx-role" data-role="${id}"></p></div>`;
      return nodeHead(n);
    },

    mount(world: HTMLElement) {
      for (const el of world.querySelectorAll<HTMLElement>("[data-node]")) els.nodes[el.dataset.node!] = el;
      for (const el of world.querySelectorAll<HTMLElement>("[data-role]")) els.role[el.dataset.role!] = el;
      for (const el of world.querySelectorAll<HTMLElement>("[data-reads]")) els.reads[el.dataset.reads!] = el;
      for (const el of world.querySelectorAll<HTMLElement>("[data-meter]")) els.meter[el.dataset.meter!] = el;
      els.label = world.querySelector('.tx-wlabel[data-wire="p_r0"]');
      els.chartbox = world.closest(".tx-stage")?.querySelector<HTMLElement>(".tx-chartbox") ?? null;
    },

    paintWidgets(d: Outputs, ctx: StepContext) {
      ctxRef = ctx;
      const mode = modeOf();
      if (els.chartbox) els.chartbox.hidden = mode !== "lag";
      const n = Math.round(d.replicas ?? 2);
      const crashed = (d.crash ?? 0) >= 0.5;
      // Discrete states come from the model as it is now, not from the smoothed numbers on screen.
      const up = promoted(live());
      REPLICAS.forEach((r, k) => els.nodes[r]?.classList.toggle("tx-off", k >= n));
      els.nodes.primary?.classList.toggle("tx-down", crashed);
      text(els.role.primary, crashed ? "down" : `${f("writeRps", d)} writes/s · ${f("primaryBusyPct", d)} busy`);
      if (els.meter.primary) els.meter.primary.style.width = `${crashed ? 0 : Math.min(100, d.primaryBusyPct ?? 0)}%`;
      for (const r of REPLICAS) {
        const isNew = crashed && r === "r0";
        text(els.reads[r], isNew ? "" : `${f("perReplicaReads", d)} reads/s · ${f("replicaBusyPct", d)} busy`);
        text(els.role[r], isNew ? (up ? "new primary: takes writes" : "being promoted…") : "");
        if (els.meter[r]) els.meter[r]!.style.width = `${isNew ? 0 : Math.min(100, d.replicaBusyPct ?? 0)}%`;
      }
      if (els.label) {
        els.label.hidden = crashed;
        text(els.label, mode === "copies" ? "streams changes" : `lag ${f("lagMs", d)}`);
      }
    },

    chartSample(out: Outputs): number {
      return Math.min(CHART.max, out.staleBackPct ?? 0);
    },
  };
}
