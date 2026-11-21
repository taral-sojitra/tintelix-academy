import type { Inputs, Outputs, SceneNode, SceneSpec } from "@tintelix/schema";
import { formatOutput } from "@tintelix/schema/format";
import type { Effects } from "../effects";
import { nodeHead } from "../render/dom";
import { shard } from "../routers/shard";
import type { SimEvent } from "../sim";
import type { SceneChart, SceneRuntime, StepContext, Tile, WireStyle } from "./types";

const LEGEND: SceneRuntime["legend"] = [["cyan", "write"], ["green", "stored"], ["red", "shard overloaded"]];
const CHART: SceneChart = { label: "HOTTEST SHARD", output: "hottestPct", max: 400, danger: 100 };
/** The range scheme gives each shard this many million order ids. */
const RANGE_M = 2;

export function createShardScene(o: { fx: Effects; rand: () => number; scene: SceneSpec }): SceneRuntime {
  const { fx, rand } = o;
  const ids = Object.keys(o.scene.nodes).filter((n) => /^s\d+$/.test(n));
  let ctxRef: StepContext | null = null;
  const liveInputs = (ctx: StepContext): Inputs => ({ ...ctx.inputs });
  const live = (): Outputs => (ctxRef ? ctxRef.model.run(liveInputs(ctxRef)) : {});
  const f = (name: string, d: Outputs) => formatOutput(name, d[name] ?? 0);
  const els: { nodes: Record<string, HTMLElement>; keys: Record<string, HTMLElement>; load: Record<string, HTMLElement>; meter: Record<string, HTMLElement> } = { nodes: {}, keys: {}, load: {}, meter: {} };
  const text = (el: Element | null | undefined, t: string) => {
    if (el && el.textContent !== t) el.textContent = t;
  };
  const keysFor = (k: number, d: Outputs) => {
    const scheme = Math.round(d.scheme ?? 0);
    const n = Math.round(d.shards ?? 1);
    if (scheme === 0) return "every order";
    const m = (x: number) => (x === 0 ? "0" : `${x}M`);
    if (scheme === 1) return k === n - 1 ? `ids ${m(k * RANGE_M)}+` : `ids ${m(k * RANGE_M)} to ${m((k + 1) * RANGE_M)}`;
    return `hash % ${n} = ${k}`;
  };

  return {
    router: shard({
      weights: () => {
        const d = live();
        const n = Math.round(d.shards ?? 1);
        return ids.slice(0, n).map((_, k) => d[`load${k}`] ?? 0);
      },
      failShare: (k) => {
        const d = live();
        const load = d[`load${k}`] ?? 0;
        return load > 0 ? Math.max(0, 1 - (d.nodeCap ?? 1) / load) : 0;
      },
    }),
    fx,
    legend: LEGEND,
    sim: { ratePerSec: 6 },
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
      if (e.kind === "miss" && rand() < 0.25) fx.float(e.at[0] + 200, e.at[1] - 18, "overloaded", "red");
    },

    wireStyles(): WireStyle[] {
      const d = live();
      const n = Math.round(d.shards ?? 1);
      return [
        { wire: "a_r", color: "blue", alpha: 0.42, width: 2 },
        ...ids.slice(0, n).map((s, k): WireStyle => ({ wire: `r_${s}`, color: "blue", alpha: (d[`load${k}`] ?? 0) > 0 ? 0.36 : 0.1, width: 1.6 })),
      ];
    },

    tiles(d, ctx): Tile[] {
      ctxRef = ctx;
      const scheme = Math.round(d.scheme ?? 0);
      return [
        { id: "a", label: "Hottest shard", icon: "gauge", hue: "amber", value: f("hottestPct", d), note: `${f("hottestLoad", d)} writes a second`, mood: (d.hottestPct ?? 0) > 100 ? "bad" : "good" },
        { id: "b", label: "Writes stored", icon: "check", hue: "green", value: f("servedPct", d), note: `of ${f("writes", d)} a second`, mood: (d.servedPct ?? 100) < 99.5 ? "bad" : "good" },
        { id: "c", label: "Databases", icon: "db", hue: "violet", value: f("shards", d), note: scheme === 0 ? "one primary" : scheme === 1 ? "split by order id range" : "split by hash of the key", mood: "" },
        { id: "d", label: "A range query asks", icon: "target", hue: "cyan", value: f("queryShards", d), note: (d.queryShards ?? 1) === 1 ? "shard" : "shards, then merges", mood: "" },
      ];
    },

    nodeBody(id: string, n: SceneNode): string {
      if (ids.includes(id)) return `<div class="tx-shardrow"><b>${n.label}</b><span data-keys="${id}"></span><div class="tx-meter"><i data-meter="${id}"></i></div><em data-load="${id}"></em></div>`;
      return nodeHead(n);
    },

    mount(world: HTMLElement) {
      for (const el of world.querySelectorAll<HTMLElement>("[data-node]")) els.nodes[el.dataset.node!] = el;
      for (const el of world.querySelectorAll<HTMLElement>("[data-keys]")) els.keys[el.dataset.keys!] = el;
      for (const el of world.querySelectorAll<HTMLElement>("[data-load]")) els.load[el.dataset.load!] = el;
      for (const el of world.querySelectorAll<HTMLElement>("[data-meter]")) els.meter[el.dataset.meter!] = el;
    },

    paintWidgets(d: Outputs, ctx: StepContext) {
      ctxRef = ctx;
      const n = Math.round(d.shards ?? 1);
      const cap = d.nodeCap ?? 1;
      ids.forEach((s, k) => {
        const load = d[`load${k}`] ?? 0;
        els.nodes[s]?.classList.toggle("tx-off", k >= n);
        els.nodes[s]?.classList.toggle("tx-hot", k < n && load > cap * 1.001);
        text(els.keys[s], keysFor(k, d));
        text(els.load[s], load < 0.5 ? "idle" : `${formatOutput("load", load)}/s`);
        if (els.meter[s]) els.meter[s]!.style.width = `${Math.min(100, (100 * load) / cap)}%`;
      });
    },

    chartSample(out: Outputs): number {
      return Math.min(CHART.max, out.hottestPct ?? 0);
    },
  };
}
