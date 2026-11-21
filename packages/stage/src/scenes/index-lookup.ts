import type { Inputs, Outputs, SceneNode, SceneSpec } from "@tintelix/schema";
import { formatOutput } from "@tintelix/schema/format";
import type { Effects } from "../effects";
import { nodeHead } from "../render/dom";
import { indexLookup } from "../routers/index-lookup";
import type { SimEvent } from "../sim";
import type { SceneChart, SceneRuntime, StepContext, Tile, WireStyle } from "./types";

type Mode = "scan" | "seek" | "range" | "write";
const LEGEND: SceneRuntime["legend"] = [["cyan", "query"], ["green", "answer"], ["violet", "page read"]];
const CHART: SceneChart = { label: "INSERTS A SECOND", output: "insertRate", max: 20000, danger: 5000 };
const CELLS = 100;
const LEAVES = 9;
/** Seconds for one full sweep of the scan, and for one lookup's descent. */
const SWEEP = 3;
const CYCLE = 2.4;
const RANGE_CELLS = 10;
const CHIPS = ["primary key", "customer_id", "created_at", "email", "status", "coupon", "region"];

export interface IndexState {
  mode(): Mode;
  viaTree(): boolean;
}
export type IndexScene = SceneRuntime & { state: IndexState };

export function createIndexScene(o: { fx: Effects; rand: () => number; scene: SceneSpec }): IndexScene {
  const { fx } = o;
  let ctxRef: StepContext | null = null;
  let clock = 0;
  let pulse = 0;
  const liveInputs = (ctx: StepContext): Inputs => ({ ...ctx.inputs });
  const f = (name: string, d: Outputs) => formatOutput(name, d[name] ?? 0);
  const state: IndexState = {
    mode: () => {
      const m = ctxRef?.step.sim?.mode;
      return m === "seek" || m === "range" || m === "write" ? m : "scan";
    },
    viaTree: () => !!ctxRef?.visible.has("tree"),
  };
  const els: { cells: HTMLElement[]; root: HTMLElement | null; inner: HTMLElement[]; leaves: HTMLElement[]; btree: HTMLElement | null; chips: HTMLElement[]; chipBox: HTMLElement | null; depth: HTMLElement | null; caption: HTMLElement | null; chartbox: HTMLElement | null } = { cells: [], root: null, inner: [], leaves: [], btree: null, chips: [], chipBox: null, depth: null, caption: null, chartbox: null };
  const text = (el: Element | null | undefined, t: string) => {
    if (el && el.textContent !== t) el.textContent = t;
  };

  return {
    router: indexLookup({ viaTree: () => state.viaTree() }),
    fx,
    state,
    legend: LEGEND,
    sim: { ratePerSec: 1.2 },
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
      pulse = Math.max(0, pulse - dt * 4);
    },

    onEvent(e: SimEvent, ctx) {
      ctxRef = ctx;
      if (e.kind === "pass" && e.node === "table" && state.mode() === "write") pulse = 1;
    },

    wireStyles(): WireStyle[] {
      const wires = state.viaTree() ? ["a_x", "x_t"] : ["a_t"];
      return wires.map((w): WireStyle => ({ wire: w, color: "blue", alpha: 0.42, width: 2 }));
    },

    tiles(d, ctx): Tile[] {
      ctxRef = ctx;
      switch (state.mode()) {
        case "scan":
          return [
            { id: "a", label: "Pages read", icon: "db", hue: "violet", value: f("scanPages", d), note: "every page, every query", mood: "bad" },
            { id: "b", label: "One lookup", icon: "hourglass", hue: "amber", value: f("scanSec", d), note: "testing every row", mood: "bad" },
            { id: "c", label: "Rows", icon: "stack", hue: "blue", value: f("rows", d), note: "and growing", mood: "" },
          ];
        case "seek":
          return [
            { id: "a", label: "Pages read", icon: "db", hue: "violet", value: f("indexPages", d), note: `${f("depth", d)} down the tree, 1 for the row`, mood: "good" },
            { id: "b", label: "One lookup", icon: "hourglass", hue: "green", value: f("indexMs", d), note: `the scan took ${f("scanSec", d)}`, mood: "good" },
            { id: "c", label: "Faster", icon: "gauge", hue: "cyan", value: `${f("speedup", d)}×`, note: "than the full scan", mood: "" },
          ];
        case "range":
          return [
            { id: "a", label: "Pages read", icon: "db", hue: "violet", value: f("rangePages", d), note: `${f("depth", d)} down, ${f("rangeLeaves", d)} leaves, ${f("matches", d)} rows`, mood: "" },
            { id: "b", label: "Range query", icon: "hourglass", hue: "amber", value: f("rangeMs", d), note: `covering index: ${f("coverMs", d)}`, mood: "" },
            { id: "c", label: "Orders found", icon: "target", hue: "green", value: f("matches", d), note: "in the last hour", mood: "" },
          ];
        default:
          return [
            { id: "a", label: "Indexes", icon: "stack", hue: "violet", value: `${f("trees", d)} trees`, note: "each insert updates all of them", mood: "" },
            { id: "b", label: "Inserts a second", icon: "gauge", hue: "amber", value: f("insertRate", d), note: `${f("baseRate", d)} with no extra index`, mood: (d.secondary ?? 0) >= 3 ? "bad" : "" },
            { id: "c", label: "Throughput lost", icon: "activity", hue: "blue", value: f("insertsDropPct", d), note: "to index upkeep", mood: "" },
          ];
      }
    },

    nodeBody(id: string, n: SceneNode): string {
      if (id === "tree") {
        const inner = [0, 1, 2].map((k) => `<b class="tx-bt-n" data-inner="${k}" style="top:76px;left:${14 + k * 92}px"></b>`).join("");
        const leaves = Array.from({ length: LEAVES }, (_, k) => `<b class="tx-bt-l" data-leaf="${k}" style="left:${12 + k * 30.5}px"></b>`).join("");
        const chips = CHIPS.map((c) => `<span>${c}</span>`).join("");
        const innerX = [0, 1, 2].map((k) => 14 + k * 92 + 37);
        const lines = [
          ...innerX.map((x) => `<line x1="143" y1="44" x2="${x}" y2="76"/>`),
          ...Array.from({ length: LEAVES }, (_, j) => `<line x1="${innerX[Math.floor(j / 3)]}" y1="104" x2="${12 + j * 30.5 + 12.5}" y2="142"/>`),
        ].join("");
        return `${nodeHead(n)}<div class="tx-btree"><svg class="tx-bt-lines" aria-hidden="true">${lines}</svg><b class="tx-bt-n" data-root style="top:16px;left:106px"></b>${inner}<div class="tx-bt-leaves">${leaves}</div><p class="tx-calc-s" data-depth></p></div><div class="tx-chips" data-chips>${chips}</div>`;
      }
      if (id === "table") return `${nodeHead(n)}<div class="tx-pages" data-pages>${"<i></i>".repeat(CELLS)}</div><p class="tx-calc-s" data-caption></p>`;
      return nodeHead(n);
    },

    mount(world: HTMLElement) {
      els.cells = [...world.querySelectorAll<HTMLElement>("[data-pages] i")];
      els.root = world.querySelector("[data-root]");
      els.inner = [...world.querySelectorAll<HTMLElement>("[data-inner]")];
      els.leaves = [...world.querySelectorAll<HTMLElement>("[data-leaf]")];
      els.btree = world.querySelector(".tx-btree");
      els.chipBox = world.querySelector("[data-chips]");
      els.chips = [...world.querySelectorAll<HTMLElement>("[data-chips] span")];
      els.depth = world.querySelector("[data-depth]");
      els.caption = world.querySelector("[data-caption]");
      els.chartbox = world.closest(".tx-stage")?.querySelector<HTMLElement>(".tx-chartbox") ?? null;
    },

    paintWidgets(d: Outputs, ctx: StepContext) {
      ctxRef = ctx;
      const mode = state.mode();
      if (els.chartbox) els.chartbox.hidden = mode !== "write";
      const write = mode === "write";
      if (els.btree) els.btree.hidden = write;
      if (els.chipBox) els.chipBox.hidden = !write;
      text(els.depth, `${f("depth", d)} levels for ${f("rows", d)} rows`);

      // Which cells and tree boxes are lit right now.
      let read = -1;
      let cur = -1;
      const hits = new Set<number>();
      let root = false;
      let inner = -1;
      const leaves = new Set<number>();
      if (mode === "scan") {
        const k = Math.floor(((clock % SWEEP) / SWEEP) * CELLS);
        read = k;
        cur = k;
      } else if (mode === "seek" || mode === "range") {
        const c = Math.floor(clock / CYCLE);
        const p = (clock % CYCLE) / CYCLE;
        const leaf = mode === "range" ? (c * 4 + 1) % (LEAVES - 2) : (c * 7 + 3) % LEAVES;
        if (p < 0.2) root = true;
        else if (p < 0.4) inner = Math.floor(leaf / 3);
        else if (p < 0.6 || mode === "range") {
          if (mode === "range" && p >= 0.4) for (let j = 0; j <= Math.min(2, Math.floor((p - 0.4) / 0.1)); j++) leaves.add(leaf + j);
          else leaves.add(leaf);
        }
        if (p >= 0.6) {
          const start = (c * 37 + 11) % (CELLS - RANGE_CELLS);
          if (mode === "range") for (let j = 0; j < RANGE_CELLS; j++) hits.add(start + j);
          else hits.add((c * 53 + 17) % CELLS);
        }
      } else if (write && pulse > 0.3) hits.add(CELLS - 1);
      els.cells.forEach((el, i) => {
        el.classList.toggle("read", i < read);
        el.classList.toggle("cur", i === cur);
        el.classList.toggle("hit", hits.has(i));
      });
      els.root?.classList.toggle("on", root);
      els.inner.forEach((el, i) => el.classList.toggle("on", i === inner));
      els.leaves.forEach((el, i) => el.classList.toggle("on", leaves.has(i)));
      const trees = Math.round(d.trees ?? 1);
      els.chips.forEach((el, i) => {
        el.classList.toggle("on", i < trees);
        el.classList.toggle("pulse", i < trees && pulse > 0.3);
      });

      const captions: Record<Mode, string> = {
        scan: `reads all ${f("scanPages", d)} pages`,
        seek: `${f("indexPages", d)} pages read`,
        range: `${f("rangePages", d)} pages read`,
        write: `${f("insertRate", d)} inserts a second`,
      };
      text(els.caption, captions[mode]);
    },

    chartSample(out: Outputs): number {
      return Math.min(CHART.max, out.insertRate ?? 0);
    },
  };
}
