import type { Inputs, Outputs, SceneNode, SceneSpec } from "@tintelix/schema";
import { formatOutput } from "@tintelix/schema/format";
import type { Effects } from "../effects";
import { nodeHead } from "../render/dom";
import type { Router } from "../sim";
import type { SceneChart, SceneRuntime, StepContext, Tile, WireStyle } from "./types";

/** The playhead crosses the timeline in this many seconds, then rests at the end for HOLD. */
export const SWEEP = 5;
const HOLD = 1.5;
const SPAN_MS = 400;
const LEFT = 170;
const WIDTH = 760;
const LANES = { lead: 92, r1: 192, r2: 292 } as const;
type Lane = keyof typeof LANES;
const LEGEND: SceneRuntime["legend"] = [["cyan", "Asha's post"], ["violet", "Chen's reply"], ["green", "read sees it"], ["red", "read misses it"]];
const CHART: SceneChart = { label: "READ TAKES", output: "readMs", max: 100, danger: 50 };
const NO_TRAFFIC: Router = { spawn: (p) => void (p.dead = true), arrive: () => {} };

export function createTimelineScene(o: { fx: Effects; rand: () => number; scene: SceneSpec }): SceneRuntime {
  const { fx } = o;
  let ctxRef: StepContext | null = null;
  let clock = 0;
  let key = "";
  let drawn = "";
  const inputKey = (i: Inputs) => JSON.stringify(Object.entries(i).sort());
  const liveInputs = (ctx: StepContext): Inputs => ({ ...ctx.inputs });
  const live = (): Outputs => (ctxRef ? ctxRef.model.run(liveInputs(ctxRef)) : {});
  const f = (name: string, d: Outputs) => formatOutput(name, d[name] ?? 0);
  const x = (t: number) => LEFT + (Math.min(SPAN_MS, t) / SPAN_MS) * WIDTH;
  const els: { box: HTMLElement | null; playhead: HTMLElement | null; events: HTMLElement[]; chartbox: HTMLElement | null } = { box: null, playhead: null, events: [], chartbox: null };

  const benSays = (d: Outputs) => ((d.benPost ?? 0) && (d.benReply ?? 0) ? "post and reply" : (d.benReply ?? 0) ? "a reply to nothing" : (d.benPost ?? 0) ? "the post, no reply yet" : "neither yet");

  function draw(d: Outputs) {
    const mode = Math.round(d.mode ?? 0);
    const stamp = JSON.stringify(d);
    if (stamp === drawn || !els.box) return;
    drawn = stamp;
    const lag1 = d.lag1Ms ?? 100;
    const lag2 = d.lag2Ms ?? 300;
    const replyAt = d.replyAt ?? 150;
    const ashaLane: Lane = mode >= 1 ? "lead" : "r1";
    const benLane: Lane = mode === 3 ? "lead" : "r2";
    const dot = (id: string, t: number, lane: Lane, cls: string, label: string) => `<div class="tx-tev ${cls}" data-ev="${id}" data-t="${t}" data-lane="${lane}" style="left:${x(t)}px;top:${LANES[lane]}px"><i></i><span>${label}</span></div>`;
    const line = (t1: number, l1: Lane, t2: number, l2: Lane, cls: string) => `<line class="${cls}" x1="${x(t1)}" y1="${LANES[l1]}" x2="${x(t2)}" y2="${LANES[l2]}"/>`;
    const ashaOk = (d.ashaSees ?? 0) >= 1;
    const benOk = benSays(d) === "post and reply" || benSays(d) === "neither yet";
    const ticks = [0, 100, 200, 300, 400].map((t) => `<span class="tx-tick" style="left:${x(t)}px">${t} ms</span>`).join("");
    const lanes = (Object.keys(LANES) as Lane[]).map((l) => `<div class="tx-lane" style="top:${LANES[l]}px"><em>${{ lead: "Leaders", r1: "Replica 1 · near Asha", r2: "Replica 2 · near Ben" }[l]}</em></div>`).join("");
    const held = mode === 2 && (d.replyArrives2 ?? 0) < (d.replyVisible2 ?? 0);
    const svg = `<svg class="tx-tlines" aria-hidden="true">${line(0, "lead", lag1, "r1", "post")}${line(0, "lead", lag2, "r2", "post")}${line(replyAt, "lead", replyAt + lag1, "r1", "reply")}${line(replyAt, "lead", d.replyArrives2 ?? 170, "r2", "reply")}${held ? `<line class="reply held" x1="${x(d.replyArrives2 ?? 170)}" y1="${LANES.r2}" x2="${x(d.replyVisible2 ?? 300)}" y2="${LANES.r2}"/>` : ""}</svg>`;
    els.box.innerHTML = [
      ticks,
      lanes,
      svg,
      dot("post", 0, "lead", "post", "Asha posts"),
      dot("post1", lag1, "r1", "post", "post arrives"),
      dot("post2", lag2, "r2", "post", "post arrives"),
      dot("reply", replyAt, "lead", "reply", "Chen replies"),
      dot("reply1", replyAt + lag1, "r1", "reply", "reply arrives"),
      held ? dot("held", d.replyArrives2 ?? 170, "r2", "reply hold", "held: waits for the post") : "",
      // When the reply shows up at the same moment as the post, put its label underneath.
      dot("reply2", d.replyVisible2 ?? 170, "r2", (d.replyVisible2 ?? 0) === lag2 ? "reply below" : "reply", "reply shown"),
      dot("asha", d.ashaReadAt ?? 50, ashaLane, `read ${ashaOk ? "ok" : "bad"}`, ashaOk ? "Asha reads: sees her post" : "Asha reads: her post is missing"),
      dot("ben", d.benReadAt ?? 200, benLane, `read ${benOk ? "ok" : "bad"}`, `Ben reads: ${benSays(d)}`),
      `<div class="tx-playhead"></div>`,
    ].join("");
    els.events = [...els.box.querySelectorAll<HTMLElement>("[data-ev]")];
    els.playhead = els.box.querySelector(".tx-playhead");
  }

  return {
    router: NO_TRAFFIC,
    fx,
    legend: LEGEND,
    sim: { ratePerSec: 0 },
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

    onEvent(_e, ctx) {
      ctxRef = ctx;
    },

    wireStyles(): WireStyle[] {
      return [];
    },

    tiles(d, ctx): Tile[] {
      ctxRef = ctx;
      const b = benSays(d);
      return [
        { id: "a", label: "Asha sees her post", icon: "users", hue: "cyan", value: (d.ashaSees ?? 0) >= 1 ? "yes" : "no", note: `she reloads at ${f("ashaReadAt", d)}`, mood: (d.ashaSees ?? 0) >= 1 ? "good" : "bad" },
        { id: "b", label: "Ben sees", icon: "target", hue: "violet", value: b, note: `he reads at ${f("benReadAt", d)}`, mood: b === "a reply to nothing" ? "bad" : "good" },
        { id: "c", label: "A read takes", icon: "hourglass", hue: "amber", value: f("readMs", d), note: (d.mode ?? 0) >= 3 ? "Ben's read crosses the ocean" : "from a nearby copy", mood: "" },
        { id: "d", label: "All copies agree after", icon: "gauge", hue: "green", value: f("convergeMs", d), note: "once writes stop", mood: "" },
      ];
    },

    nodeBody(_id: string, n: SceneNode): string {
      return `${nodeHead(n)}<div class="tx-timeline"></div>`;
    },

    mount(world: HTMLElement) {
      els.box = world.querySelector(".tx-timeline");
      els.chartbox = world.closest(".tx-stage")?.querySelector<HTMLElement>(".tx-chartbox") ?? null;
    },

    paintWidgets(_d: Outputs, ctx: StepContext) {
      ctxRef = ctx;
      if (els.chartbox) els.chartbox.hidden = true;
      draw(live());
      const loop = clock % (SWEEP + HOLD);
      const ms = Math.min(SPAN_MS, (loop / SWEEP) * SPAN_MS);
      if (els.playhead) els.playhead.style.left = `${x(ms)}px`;
      for (const el of els.events) el.classList.toggle("past", Number(el.dataset.t) <= ms + 1e-6);
    },

    chartSample(out: Outputs): number {
      return Math.min(CHART.max, out.readMs ?? 0);
    },
  };
}
