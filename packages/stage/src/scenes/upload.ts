import type { Inputs, Outputs, SceneNode, SceneSpec } from "@tintelix/schema";
import { formatOutput } from "@tintelix/schema/format";
import type { Effects } from "../effects";
import { nodeHead } from "../render/dom";
import { upload } from "../routers/upload";
import type { SimEvent } from "../sim";
import type { SceneChart, SceneRuntime, StepContext, Tile, WireStyle } from "./types";

export const SERVER_CELLS = 20;
const PART_CELLS = 20;
/** One full attempt of the big upload takes this long on stage; a dropped connection shows this long. */
const ATTEMPT = 10;
const DROP = 0.6;
const LEGEND: SceneRuntime["legend"] = [["amber", "photo bytes"], ["cyan", "asks for a URL"], ["violet", "signed URL"], ["green", "stored"]];
const CHART: SceneChart = { label: "APP SERVERS NEEDED", output: "serversNeeded", max: 20, danger: 4 };

export function createUploadScene(o: { fx: Effects; rand: () => number; scene: SceneSpec }): SceneRuntime {
  const { fx, rand } = o;
  let ctxRef: StepContext | null = null;
  let clock = 0;
  let key = "";
  const inputKey = (i: Inputs) => JSON.stringify(Object.entries(i).sort());
  const liveInputs = (ctx: StepContext): Inputs => ({ ...ctx.inputs });
  const live = (): Outputs => (ctxRef ? ctxRef.model.run(liveInputs(ctxRef)) : {});
  const f = (name: string, d: Outputs) => formatOutput(name, d[name] ?? 0);
  const big = () => ctxRef?.step.sim?.mode === "big";
  const els: { cells: HTMLElement[]; parts: HTMLElement[]; status: HTMLElement | null; arriving: HTMLElement | null; partBox: HTMLElement | null; chartbox: HTMLElement | null } = { cells: [], parts: [], status: null, arriving: null, partBox: null, chartbox: null };
  const text = (el: Element | null | undefined, t: string) => {
    if (el && el.textContent !== t) el.textContent = t;
  };

  /** Which parts of the big file are stored, which one just failed, and what to say, at this moment. */
  function bigState(d: Outputs): { done: number[]; failed: number; status: string } {
    const failAt = (d.failAtPct ?? 90) / 100;
    const multi = (d.multipart ?? 0) >= 0.5;
    const failIdx = Math.min(PART_CELLS - 1, Math.floor(failAt * PART_CELLS));
    const range = (n: number) => Array.from({ length: Math.max(0, Math.min(PART_CELLS, Math.floor(n + 1e-6))) }, (_, k) => k);
    const dropAt = failAt * ATTEMPT;
    if (clock < dropAt) return { done: range((clock / ATTEMPT) * PART_CELLS), failed: -1, status: "uploading…" };
    if (!multi) {
      if (clock < dropAt + DROP) return { done: range(failIdx), failed: -1, status: `connection dropped at ${f("failAtPct", d)}: starting over` };
      const t = clock - dropAt - DROP;
      if (t >= ATTEMPT) return { done: range(PART_CELLS), failed: -1, status: "stored, at the second attempt" };
      return { done: range((t / ATTEMPT) * PART_CELLS), failed: -1, status: "starting over from zero…" };
    }
    // Multipart: the other parts carry on; only the failed one is sent again.
    const partSec = ATTEMPT / PART_CELLS;
    const others = range((clock / ATTEMPT) * PART_CELLS).filter((k) => k !== failIdx);
    if (clock < dropAt + DROP) return { done: others, failed: failIdx, status: `part ${failIdx + 1} failed: sending just that part again` };
    const redone = clock >= Math.max(ATTEMPT, dropAt + DROP + partSec);
    const done = redone ? range(PART_CELLS) : others;
    return { done, failed: -1, status: done.length === PART_CELLS ? "stored: one part was sent twice" : `resending part ${failIdx + 1}…` };
  }

  return {
    router: upload({ direct: () => (live().direct ?? 0) >= 0.5 }),
    fx,
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
      if (e.kind === "pass" && e.node === "app" && (live().direct ?? 0) >= 0.5 && rand() < 0.25) fx.float(e.at[0] + 150, e.at[1] - 100, "signed URL for one photo", "violet");
    },

    wireStyles(): WireStyle[] {
      const direct = (live().direct ?? 0) >= 0.5;
      return [
        { wire: "p_a", color: "blue", alpha: 0.42, width: 2 },
        { wire: "a_s", color: "blue", alpha: direct ? 0.08 : 0.42, width: 2 },
        { wire: "p_s", color: "blue", alpha: direct ? 0.42 : 0.08, width: 2 },
      ];
    },

    tiles(d, ctx): Tile[] {
      ctxRef = ctx;
      const direct = (d.direct ?? 0) >= 0.5;
      if (big()) {
        const multi = (d.multipart ?? 0) >= 0.5;
        return [
          { id: "a", label: "Video", icon: "stack", hue: "blue", value: `${f("bigFileMb", d)} MB`, note: `${f("bigSec", d)} on a phone link`, mood: "" },
          { id: "b", label: "Sent again after a drop", icon: "activity", hue: "amber", value: `${f("redoMb", d)} MB`, note: `${f("redoSec", d)} more`, mood: multi ? "good" : "bad" },
          { id: "c", label: multi ? "Parts" : "Requests", icon: "target", hue: "violet", value: multi ? f("parts", d) : "1", note: multi ? `${f("partMb", d)} MB each, retried alone` : "all or nothing", mood: "" },
        ];
      }
      return [
        { id: "a", label: "Busy workers", icon: "hourglass", hue: "amber", value: f("busyWorkers", d), note: direct ? "signing URLs" : "holding uploads open", mood: direct ? "good" : "bad" },
        { id: "b", label: "App servers needed", icon: "server", hue: "violet", value: f("serversNeeded", d), note: `${f("workersPerServer", d)} workers each`, mood: direct ? "good" : "bad" },
        { id: "c", label: "Through the app", icon: "activity", hue: "cyan", value: `${f("appGbps", d)} Gbit/s`, note: direct ? "bytes go straight to storage" : "every byte, in and out", mood: "" },
        { id: "d", label: "One upload takes", icon: "users", hue: "blue", value: f("uploadSec", d), note: `${f("fileMb", d)} MB at ${f("clientMbps", d)} Mbit/s`, mood: "" },
      ];
    },

    nodeBody(id: string, n: SceneNode): string {
      if (id === "app") return `${nodeHead(n)}<div class="tx-fleet">${"<i></i>".repeat(SERVER_CELLS)}</div>`;
      if (id === "store") return `${nodeHead(n)}<p class="tx-calc-s" data-arriving></p><div data-partbox><div class="tx-parts">${"<i></i>".repeat(PART_CELLS)}</div><p class="tx-calc-s" data-status></p></div>`;
      return nodeHead(n);
    },

    mount(world: HTMLElement) {
      els.cells = [...world.querySelectorAll<HTMLElement>(".tx-fleet i")];
      els.parts = [...world.querySelectorAll<HTMLElement>(".tx-parts i")];
      els.status = world.querySelector("[data-status]");
      els.arriving = world.querySelector("[data-arriving]");
      els.partBox = world.querySelector("[data-partbox]");
      els.chartbox = world.closest(".tx-stage")?.querySelector<HTMLElement>(".tx-chartbox") ?? null;
    },

    paintWidgets(d: Outputs, ctx: StepContext) {
      ctxRef = ctx;
      const isBig = big();
      if (els.chartbox) els.chartbox.hidden = isBig;
      const lit = Math.min(SERVER_CELLS, Math.round(live().serversNeeded ?? 1));
      els.cells.forEach((el, i) => el.classList.toggle("on", i < lit));
      text(els.arriving, isBig ? "" : `${f("storeGbps", d)} Gbit/s of photos arriving`);
      if (els.partBox) els.partBox.hidden = !isBig;
      if (isBig) {
        const s = bigState(live());
        els.parts.forEach((el, i) => {
          el.classList.toggle("done", s.done.includes(i));
          el.classList.toggle("failed", i === s.failed);
        });
        text(els.status, s.status);
      }
    },

    chartSample(out: Outputs): number {
      return Math.min(CHART.max, out.serversNeeded ?? 0);
    },
  };
}
