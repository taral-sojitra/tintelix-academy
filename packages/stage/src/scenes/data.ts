import type { Inputs, Outputs, SceneNode, SceneSpec } from "@tintelix/schema";
import { formatOutput } from "@tintelix/schema/format";
import type { Effects } from "../effects";
import { nodeHead } from "../render/dom";
import { data, type DataMode } from "../routers/data";
import type { SimEvent } from "../sim";
import type { SceneChart, SceneRuntime, StepContext, Tile, WireStyle } from "./types";

const LEGEND: SceneRuntime["legend"] = [["cyan", "query or write"], ["green", "done"], ["red", "rejected"], ["amber", "stored, but bad"]];
const CHART: SceneChart = { label: "LISTINGS LEFT TO REWRITE", output: "docsLeft", max: 20000, danger: 10000 };
const READ_WIRES = { sql: ["a_o", "o_i", "i_p"], doc: ["a_d"] };
const RENAME_WIRES = { sql: ["a_s"], doc: ["a_l"] };
const SCHEMA_WIRES = { sql: ["a_o"], doc: ["a_d"] };
const COLS: Record<string, string> = { orders: "id · customer · currency", items: "order · product · qty", products: "id · name · price" };

export interface DataState {
  mode(): DataMode;
  docSide(): boolean;
}
export type DataScene = SceneRuntime & { state: DataState };

export function createDataScene(o: { fx: Effects; rand: () => number; scene: SceneSpec }): DataScene {
  const { fx, rand } = o;
  let ctxRef: StepContext | null = null;
  let clock = 0;
  let key = "";
  const inputKey = (i: Inputs) => JSON.stringify(Object.entries(i).filter(([k]) => k !== "elapsedSec").sort());
  // Only the rename plays out over time; elsewhere the rewrite hasn't started.
  const liveInputs = (ctx: StepContext): Inputs => ({ ...ctx.inputs, elapsedSec: ctx.step.sim?.mode === "rename" ? clock : 0 });
  const live = (): Outputs => (ctxRef ? ctxRef.model.run(liveInputs(ctxRef)) : {});
  const f = (name: string, d: Outputs) => formatOutput(name, d[name] ?? 0);
  const state: DataState = {
    mode: () => {
      const m = ctxRef?.step.sim?.mode;
      return m === "rename" || m === "schema" ? m : "read";
    },
    docSide: () => !!ctxRef && (ctxRef.visible.has("docs") || ctxRef.visible.has("listings")),
  };
  const els: { cols: Record<string, HTMLElement>; docNote: HTMLElement | null; sellers: HTMLElement | null; rewrite: HTMLElement | null; meter: HTMLElement | null; chartbox: HTMLElement | null } = { cols: {}, docNote: null, sellers: null, rewrite: null, meter: null, chartbox: null };
  const text = (el: Element | null | undefined, t: string) => {
    if (el && el.textContent !== t) el.textContent = t;
  };

  return {
    router: data({ mode: () => state.mode(), docSide: () => state.docSide(), badShare: () => (live().badPct ?? 0) / 100 }),
    fx,
    state,
    legend: LEGEND,
    sim: { ratePerSec: 2.5 },
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
      if (e.kind === "miss" && e.node === "orders") fx.float(e.at[0] + 100, e.at[1] - 64, "rejected: no currency", "red");
      if (e.kind === "fill" && e.node === "docs") fx.float(e.at[0] + 220, e.at[1] - 80, "stored without a currency", "amber");
      if (e.kind === "pass" && e.node === "products" && rand() < 0.4) fx.float(e.at[0] + 105, e.at[1] - 64, "joined", "green");
    },

    wireStyles(): WireStyle[] {
      const mode = state.mode();
      const set = mode === "rename" ? RENAME_WIRES : mode === "schema" ? SCHEMA_WIRES : READ_WIRES;
      const wires = [...set.sql, ...(state.docSide() ? set.doc : [])];
      return wires.map((w): WireStyle => ({ wire: w, color: "blue", alpha: 0.4, width: 2 }));
    },

    tiles(d, ctx): Tile[] {
      ctxRef = ctx;
      const mode = state.mode();
      const doc = state.docSide();
      const tiles: Tile[] = [];
      if (mode === "read") {
        tiles.push({ id: "a", label: "Relational", icon: "db", hue: "violet", value: `${f("sqlRows", d)} rows`, note: `${f("sqlTables", d)} tables, ${f("joins", d)} joins`, mood: "" });
        if (doc) tiles.push({ id: "b", label: "Document", icon: "stack", hue: "cyan", value: `${f("docReads", d)} read`, note: "items embedded, no join", mood: "good" });
        tiles.push({ id: "c", label: "Items per order", icon: "users", hue: "blue", value: f("items", d), note: doc ? "copied into each document" : "one row each in order_items", mood: "" });
      } else if (mode === "rename") {
        tiles.push({ id: "a", label: "Relational", icon: "db", hue: "violet", value: `${f("sqlRenameRows", d)} row`, note: "in sellers; listings join it", mood: "good" });
        if (doc) tiles.push({ id: "b", label: "Document", icon: "stack", hue: "cyan", value: `${f("renameDocs", d)} writes`, note: "one per listing", mood: "bad" });
        tiles.push({ id: "c", label: "Rewrite takes", icon: "hourglass", hue: "amber", value: f("renameSec", d), note: `at ${f("writeRate", d)} writes a second`, mood: "" });
        tiles.push({ id: "d", label: "Rewritten", icon: "gauge", hue: "green", value: f("renameDonePct", d), note: `${f("docsLeft", d)} left`, mood: "" });
      } else {
        tiles.push({ id: "a", label: "Relational", icon: "db", hue: "violet", value: "0 stored", note: "bad writes rejected at once", mood: "good" });
        if (doc) tiles.push({ id: "b", label: "Document", icon: "stack", hue: "cyan", value: `${f("badPerDay", d)} a day`, note: "stored without a currency", mood: "bad" });
        tiles.push({ id: "c", label: "Bad writes", icon: "activity", hue: "amber", value: f("badPct", d), note: "from the new checkout path", mood: "" });
      }
      return tiles;
    },

    nodeBody(id: string, n: SceneNode): string {
      if (id === "sellers") return `${nodeHead(n)}<p class="tx-calc-s" data-sellers></p>`;
      if (id in COLS) return `${nodeHead(n)}<p class="tx-calc-s tx-cols" data-cols="${id}"></p>`;
      if (id === "docs") return `${nodeHead(n)}<div class="tx-docrow"><pre class="tx-json">{ customer: "Ravi",\n  items: [kurta, scarf, bag],\n  seller: "Asha Crafts" }</pre><p class="tx-calc-s" data-docnote></p></div>`;
      if (id === "listings") return `${nodeHead(n)}<div><div class="tx-meter"><i data-meter></i></div><p class="tx-calc-s" data-rewrite></p></div>`;
      return nodeHead(n);
    },

    mount(world: HTMLElement) {
      for (const el of world.querySelectorAll<HTMLElement>("[data-cols]")) els.cols[el.dataset.cols!] = el;
      els.docNote = world.querySelector("[data-docnote]");
      els.sellers = world.querySelector("[data-sellers]");
      els.rewrite = world.querySelector("[data-rewrite]");
      els.meter = world.querySelector("[data-meter]");
      els.chartbox = world.closest(".tx-stage")?.querySelector<HTMLElement>(".tx-chartbox") ?? null;
    },

    paintWidgets(d: Outputs, ctx: StepContext) {
      ctxRef = ctx;
      const mode = state.mode();
      if (els.chartbox) els.chartbox.hidden = mode !== "rename" || !state.docSide();
      for (const [id, el] of Object.entries(els.cols)) text(el, id === "orders" && mode === "schema" ? "currency NOT NULL" : COLS[id]!);
      text(els.docNote, mode === "schema" ? "no currency? stored anyway" : "the whole order in one read");
      text(els.sellers, clock > 0.3 ? `name changed in ${f("sqlRenameRows", d)} row` : "updating…");
      const done = d.renameDonePct ?? 0;
      text(els.rewrite, done >= 100 ? `all ${f("renameDocs", d)} rewritten` : `${formatOutput("rewritten", (d.renameDocs ?? 0) - (d.docsLeft ?? 0))} of ${f("renameDocs", d)} rewritten`);
      if (els.meter) els.meter.style.width = `${done.toFixed(1)}%`;
    },

    chartSample(out: Outputs): number {
      return Math.min(CHART.max, out.docsLeft ?? 0);
    },
  };
}
