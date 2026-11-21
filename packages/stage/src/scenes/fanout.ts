import type { Inputs, Outputs, SceneNode, SceneSpec } from "@tintelix/schema";
import { formatOutput } from "@tintelix/schema/format";
import type { Effects } from "../effects";
import { nodeHead } from "../render/dom";
import { fanout, type FanoutMode } from "../routers/fanout";
import type { SimEvent } from "../sim";
import type { SceneChart, SceneRuntime, StepContext, Tile, WireStyle } from "./types";

export const FEED_CELLS = 48;
const LEGEND: SceneRuntime["legend"] = [["cyan", "normal post"], ["amber", "celebrity post"], ["violet", "feed open, fetching"], ["green", "fetched"]];
const CHART: SceneChart = { label: "LOOKUPS A SECOND", output: "lookups", max: 4_000_000, danger: 1_000_000 };
const MODES: FanoutMode[] = ["push", "celeb", "pull", "hybrid"];
const FEEDLINE: Record<FanoutMode, string> = {
  push: "ready-made: one read per open",
  celeb: "the celebrity's post arriving, feed by feed",
  pull: "built when someone opens the app",
  hybrid: "ready-made, plus celebrities fetched on open",
};

export function createFanoutScene(o: { fx: Effects; rand: () => number; scene: SceneSpec }): SceneRuntime {
  const { fx, rand } = o;
  let ctxRef: StepContext | null = null;
  let clock = 0;
  let key = "";
  const inputKey = (i: Inputs) => JSON.stringify(Object.entries(i).filter(([k]) => k !== "elapsedSec").sort());
  const liveInputs = (ctx: StepContext): Inputs => ({ ...ctx.inputs, elapsedSec: clock });
  const live = (): Outputs => (ctxRef ? ctxRef.model.run(liveInputs(ctxRef)) : {});
  const f = (name: string, d: Outputs) => formatOutput(name, d[name] ?? 0);
  const modeOf = (d: Outputs): FanoutMode => MODES[Math.round(d.mode ?? 0)] ?? "push";
  const els: { cells: HTMLElement[]; feedline: HTMLElement | null; meter: HTMLElement | null; writes: HTMLElement | null; chartbox: HTMLElement | null } = { cells: [], feedline: null, meter: null, writes: null, chartbox: null };
  const text = (el: Element | null | undefined, t: string) => {
    if (el && el.textContent !== t) el.textContent = t;
  };

  return {
    router: fanout({
      mode: () => modeOf(live()),
      celebShare: () => {
        const d = live();
        const mode = modeOf(d);
        if (mode === "celeb") return (d.deliveredPct ?? 100) < 100 && (d.elapsedSec ?? 0) >= 1 ? 0.6 : 0;
        return mode === "push" ? 0 : 0.4;
      },
    }),
    fx,
    legend: LEGEND,
    sim: { ratePerSec: 4 },
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
      if (e.kind === "hit" && e.node === "celeb" && rand() < 0.2) fx.float(e.at[0] - 90, e.at[1] + 62, "fetched at read time", "violet");
    },

    wireStyles(): WireStyle[] {
      return ["a_w", "c_w", "w_f"].map((w): WireStyle => ({ wire: w, color: "blue", alpha: 0.42, width: 2 }));
    },

    tiles(d, ctx): Tile[] {
      ctxRef = ctx;
      const mode = modeOf(d);
      if (mode === "celeb") {
        return [
          { id: "a", label: "Delivered", icon: "activity", hue: "amber", value: f("deliveredPct", d), note: `to ${f("celebFollowers", d)} followers`, mood: (d.deliveredPct ?? 100) < 100 ? "bad" : "good" },
          { id: "b", label: "Last follower waits", icon: "hourglass", hue: "violet", value: f("deliverSec", d), note: "for this one post", mood: "bad" },
          { id: "c", label: "Spare capacity", icon: "gauge", hue: "cyan", value: `${f("spare", d)}/s`, note: "after normal posts", mood: "" },
        ];
      }
      if (mode === "pull") {
        return [
          { id: "a", label: "Feed writes", icon: "db", hue: "green", value: `${f("feedWrites", d)}/s`, note: "nothing copied", mood: "good" },
          { id: "b", label: "Each open fetches", icon: "users", hue: "violet", value: f("perOpen", d), note: "accounts followed", mood: "bad" },
          { id: "c", label: "Lookups", icon: "gauge", hue: "amber", value: `${f("lookups", d)}/s`, note: `at ${f("opens", d)} opens a second`, mood: "bad" },
        ];
      }
      if (mode === "hybrid") {
        return [
          { id: "a", label: "Each open fetches", icon: "users", hue: "violet", value: f("perOpen", d), note: `its feed + ${f("celebsFollowed", d)} celebrities`, mood: "good" },
          { id: "b", label: "Lookups", icon: "gauge", hue: "amber", value: `${f("lookups", d)}/s`, note: `at ${f("opens", d)} opens a second`, mood: "" },
          { id: "c", label: "Celebrity post visible", icon: "check", hue: "green", value: "now", note: "fetched when feeds open", mood: "good" },
        ];
      }
      return [
        { id: "a", label: "Feed writes", icon: "db", hue: "cyan", value: `${f("feedWrites", d)}/s`, note: `${f("writeLoadPct", d)} of the workers`, mood: "" },
        { id: "b", label: "Opening a feed", icon: "users", hue: "green", value: `${f("perOpen", d)} read`, note: "it's ready-made", mood: "good" },
        { id: "c", label: "Lookups", icon: "gauge", hue: "violet", value: `${f("lookups", d)}/s`, note: `at ${f("opens", d)} opens a second`, mood: "" },
      ];
    },

    nodeBody(id: string, n: SceneNode): string {
      if (id === "feeds") return `${nodeHead(n)}<div class="tx-feeds">${"<i></i>".repeat(FEED_CELLS)}</div><p class="tx-calc-s" data-feedline></p>`;
      if (id === "workers") return `${nodeHead(n)}<div><div class="tx-meter"><i data-wmeter></i></div><p class="tx-calc-s" data-writes></p></div>`;
      return nodeHead(n);
    },

    mount(world: HTMLElement) {
      els.cells = [...world.querySelectorAll<HTMLElement>(".tx-feeds i")];
      els.feedline = world.querySelector("[data-feedline]");
      els.meter = world.querySelector("[data-wmeter]");
      els.writes = world.querySelector("[data-writes]");
      els.chartbox = world.closest(".tx-stage")?.querySelector<HTMLElement>(".tx-chartbox") ?? null;
    },

    paintWidgets(d: Outputs, ctx: StepContext) {
      ctxRef = ctx;
      if (els.chartbox) els.chartbox.hidden = true;
      const L = live();
      const mode = modeOf(L);
      const got = mode === "celeb" ? Math.round(((L.deliveredPct ?? 0) / 100) * FEED_CELLS) : 0;
      els.cells.forEach((el, i) => {
        el.classList.toggle("got", i < got);
        el.classList.toggle("built", mode === "pull");
        el.classList.toggle("pulled", mode === "hybrid");
      });
      text(els.feedline, FEEDLINE[mode]);
      if (els.meter) els.meter.style.width = `${Math.min(100, d.writeLoadPct ?? 0)}%`;
      text(els.writes, `${f("feedWrites", d)} feed writes a second`);
    },

    chartSample(out: Outputs): number {
      return Math.min(CHART.max, out.lookups ?? 0);
    },
  };
}
