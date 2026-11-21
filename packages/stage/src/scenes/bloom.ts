import type { Inputs, Outputs, SceneNode, SceneSpec } from "@tintelix/schema";
import { formatOutput } from "@tintelix/schema/format";
import { unit } from "@tintelix/schema/ring";
import type { Effects } from "../effects";
import { nodeHead } from "../render/dom";
import { bloom } from "../routers/bloom";
import type { SimEvent } from "../sim";
import type { SceneChart, SceneRuntime, StepContext, Tile, WireStyle } from "./types";

/** The picture uses a toy filter (64 bits, 3 hashes) so each bit can be seen; the numbers use the real one. */
export const TOY_BITS = 64;
const TOY_K = 3;
const TOY_KEYS = 12;
const PROBE_SEC = 0.8;
const LEGEND: SceneRuntime["legend"] = [["cyan", "lookup"], ["red", "turned away: not here"], ["green", "found"], ["amber", "disk read, nothing there"]];
const CHART: SceneChart = { label: "DISK READS A SECOND", output: "diskReads", max: 10000, danger: 5000 };

const bitsOf = (key: number) => Array.from({ length: TOY_K }, (_, j) => Math.floor(unit(key * 31 + j * 97 + 5) * TOY_BITS));

export function createBloomScene(o: { fx: Effects; rand: () => number; scene: SceneSpec }): SceneRuntime {
  const { fx, rand } = o;
  let ctxRef: StepContext | null = null;
  let probe: { bits: number[]; zero: number[]; left: number } | null = null;
  let next = 1000;
  const liveInputs = (ctx: StepContext): Inputs => ({ ...ctx.inputs });
  const live = (): Outputs => (ctxRef ? ctxRef.model.run(liveInputs(ctxRef)) : {});
  const f = (name: string, d: Outputs) => formatOutput(name, d[name] ?? 0);
  const filterOn = () => !!ctxRef?.visible.has("filter");
  const els: { bits: HTMLElement[]; verdict: HTMLElement | null; reads: HTMLElement | null; toy: HTMLElement | null } = { bits: [], verdict: null, reads: null, toy: null };
  const text = (el: Element | null | undefined, t: string) => {
    if (el && el.textContent !== t) el.textContent = t;
  };

  /** The toy filter's set bits, holding more keys as the real filter fills past its design. */
  function setBits(d: Outputs): Set<number> {
    const n = Math.round(TOY_KEYS * ((d.keys ?? 1) / (d.designKeys ?? 1)));
    const s = new Set<number>();
    for (let k = 0; k < n; k++) for (const b of bitsOf(k)) s.add(b);
    return s;
  }

  return {
    router: bloom({ filterOn, absentShare: () => (live().absentPct ?? 0) / 100, fpShare: () => (live().fpPct ?? 0) / 100 }),
    fx,
    legend: LEGEND,
    sim: { ratePerSec: 3 },
    chart: CHART,
    lane: null,
    liveInputs,

    enterStep(ctx) {
      ctxRef = ctx;
      probe = null;
    },

    update(dt, ctx) {
      ctxRef = ctx;
      if (probe && (probe.left -= dt) <= 0) probe = null;
    },

    onEvent(e: SimEvent, ctx) {
      ctxRef = ctx;
      if (e.node !== "filter" || (e.kind !== "miss" && e.kind !== "pass")) return;
      const set = setBits(live());
      // Find a toy key that matches what happened: one with a zero bit for "no", all ones for "maybe".
      const want = e.kind === "miss";
      for (let tries = 0; tries < 400; tries++) {
        const key = next++;
        const bits = bitsOf(key);
        const zero = bits.filter((b) => !set.has(b));
        if (want === zero.length > 0) {
          probe = { bits, zero, left: PROBE_SEC };
          break;
        }
      }
      if (e.kind === "miss" && rand() < 0.3) fx.float(e.at[0] - 60, e.at[1] + 72, "definitely not here", "red");
    },

    wireStyles(): WireStyle[] {
      const wires = filterOn() ? ["a_f", "f_d"] : ["a_d"];
      return wires.map((w): WireStyle => ({ wire: w, color: "blue", alpha: 0.42, width: 2 }));
    },

    tiles(d, ctx): Tile[] {
      ctxRef = ctx;
      if (!filterOn()) {
        return [
          { id: "a", label: "Disk reads", icon: "db", hue: "amber", value: f("diskReads", d), note: "a second: every lookup", mood: "bad" },
          { id: "b", label: "For missing keys", icon: "activity", hue: "violet", value: f("absentRps", d), note: "reads that find nothing", mood: "bad" },
          { id: "c", label: "Keys stored", icon: "stack", hue: "blue", value: f("keys", d), note: "on disk", mood: "" },
        ];
      }
      return [
        { id: "a", label: "Disk reads", icon: "db", hue: "amber", value: f("diskReads", d), note: `a second, ${f("savedPct", d)} fewer`, mood: "good" },
        { id: "b", label: "False positives", icon: "activity", hue: "violet", value: f("fpPct", d), note: `${f("falsePosRps", d)} a second read the disk for nothing`, mood: (d.fpPct ?? 0) > 5 ? "bad" : "" },
        { id: "c", label: "Filter size", icon: "stack", hue: "blue", value: `${f("filterMb", d)} MB`, note: `${f("hashes", d)} hashes · ${f("actualBits", d)} bits a key`, mood: "" },
        { id: "d", label: "Turned away", icon: "target", hue: "green", value: f("rejectedRps", d), note: "a second: definitely not here", mood: "good" },
      ];
    },

    nodeBody(id: string, n: SceneNode): string {
      if (id === "filter") return `${nodeHead(n)}<div class="tx-bits">${"<i></i>".repeat(TOY_BITS)}</div><p class="tx-calc-s" data-verdict></p><p class="tx-calc-s" data-toy></p>`;
      if (id === "db") return `${nodeHead(n)}<p class="tx-calc-s" data-reads></p>`;
      return nodeHead(n);
    },

    mount(world: HTMLElement) {
      els.bits = [...world.querySelectorAll<HTMLElement>(".tx-bits i")];
      els.verdict = world.querySelector("[data-verdict]");
      els.reads = world.querySelector("[data-reads]");
      els.toy = world.querySelector("[data-toy]");
    },

    paintWidgets(d: Outputs, ctx: StepContext) {
      ctxRef = ctx;
      const set = setBits(live());
      els.bits.forEach((el, i) => {
        el.classList.toggle("on", set.has(i));
        el.classList.toggle("probe", !!probe?.bits.includes(i));
        el.classList.toggle("zero", !!probe?.zero.includes(i));
      });
      text(els.verdict, probe ? (probe.zero.length ? "a bit is 0: definitely not here" : "all bits are 1: maybe, so check the disk") : "each lookup checks its bits");
      text(els.toy, `drawn small: ${TOY_BITS} bits, ${TOY_K} hashes (real: ${f("filterMb", d)} MB, ${f("hashes", d)})`);
      text(els.reads, `${f("diskReads", d)} reads a second`);
    },

    chartSample(out: Outputs): number {
      return Math.min(CHART.max, out.diskReads ?? 0);
    },
  };
}
