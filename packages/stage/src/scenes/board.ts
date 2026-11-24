import { testCond, type Board, type BoardFlow, type Inputs, type Outputs, type SceneNode, type SceneSpec } from "@tintelix/schema";
import { fillOutputs } from "@tintelix/schema/format";
import { paintWidget, widgetHtml } from "../board/widgets";
import type { Effects } from "../effects";
import { ICONS, type IconName } from "../icons";
import type { PaletteKey } from "../palette";
import { nodeHead } from "../render/dom";
import { board as boardRouter } from "../routers/board";
import type { SimEvent } from "../sim";
import type { SceneChart, SceneRuntime, StepContext, Tile, WireStyle } from "./types";

const NO_CHART: SceneChart = { label: "", output: "mode", max: 1, danger: 0 };
const PING_DECAY = 5;

/**
 * A case study's design board, driven entirely by `scene.board`: the model's `mode` output picks which
 * flows run and which tiles show, widgets inside nodes follow the model, and requests skip any flow
 * whose boxes aren't on the board yet.
 */
export function createBoardScene(o: { fx: Effects; rand: () => number; scene: SceneSpec }): SceneRuntime {
  const { fx, rand } = o;
  const spec: Board | undefined = o.scene.board;
  if (!spec) throw new Error("a board scene needs scene.board");
  const b: Board = spec;
  let ctxRef: StepContext | null = null;
  let clock = 0;
  let key = "";
  const pings: Record<string, number> = {};
  const els: { nodes: Record<string, HTMLElement>; widgets: { node: string; i: number; root: HTMLElement }[]; chartbox: HTMLElement | null } = { nodes: {}, widgets: [], chartbox: null };

  const inputKey = (i: Inputs) => JSON.stringify(Object.entries(i).filter(([k]) => k !== "elapsedSec").sort());
  const liveInputs = (ctx: StepContext): Inputs => ({ ...ctx.inputs, elapsedSec: clock });
  const live = (): Outputs => (ctxRef ? ctxRef.model.run(liveInputs(ctxRef)) : {});
  const modeOf = (d: Outputs) => Math.min(b.modes.length - 1, Math.max(0, Math.round(Number.isFinite(d.mode) ? d.mode! : 0)));
  const text = (el: Element | null | undefined, t: string) => {
    if (el && el.textContent !== t) el.textContent = t;
  };
  const shown = (f: BoardFlow, visible: ReadonlySet<string>) => f.path.every((h) => visible.has(h.at)) && (!f.fail || visible.has(f.fail.at));
  const weightOf = (w: number | string, d: Outputs) => (typeof w === "number" ? w : (d[w] ?? 0));

  /** The flows running now: this mode's, minus any through a box that isn't showing. */
  const running = (): { id: string; flow: BoardFlow; weight: number }[] => {
    if (!ctxRef) return [];
    const d = live();
    const visible = ctxRef.visible;
    return b.modes[modeOf(d)]!.flows.flatMap(({ flow, weight }) => {
      const f = b.flows[flow];
      return f && shown(f, visible) ? [{ id: flow, flow: f, weight: weightOf(weight, d) }] : [];
    });
  };

  const restart = () => {
    clock = 0;
  };

  return {
    router: boardRouter({
      flows: running,
      failShare: (out) => Math.min(1, Math.max(0, (live()[out] ?? 0) / 100)),
      ordered: () => !!b.modes[modeOf(live())]?.sequence,
    }),
    fx,
    legend: b.legend as [PaletteKey, string][],
    sim: { ratePerSec: 3 },
    chart: b.chart ?? NO_CHART,
    lane: null,
    liveInputs,

    enterStep(ctx) {
      ctxRef = ctx;
      restart();
      key = inputKey(ctx.inputs);
    },

    update(dt, ctx, sim) {
      ctxRef = ctx;
      const k = inputKey(ctx.inputs);
      if (k !== key) {
        key = k;
        restart();
      }
      clock += dt;
      for (const id of Object.keys(pings)) pings[id] = Math.max(0, pings[id]! - PING_DECAY * dt);
      if (sim) {
        const flows = running();
        const any = flows.some((f) => Number.isFinite(f.weight) && f.weight > 0);
        sim.ratePerSec = ctx.step.sim?.mode === "none" || !any ? 0 : (b.modes[modeOf(live())]!.rate ?? 3);
      }
    },

    onEvent(e: SimEvent, ctx) {
      ctxRef = ctx;
      if (e.kind === "reply") pings[e.node] = 1;
      if (e.kind !== "pass" && e.kind !== "miss") return;
      pings[e.node] = 1;
      if (e.kind !== "pass") return;
      const flows = running().filter((f) => f.flow.path.some((h) => h.at === e.node) && f.weight > 0);
      const total = flows.reduce((a, f) => a + f.weight, 0);
      if (total <= 0) return;
      for (const f of flows) {
        const fl = f.flow.float;
        if (!fl || fl.at !== e.node) continue;
        if (rand() < fl.chance * (f.weight / total)) fx.float(e.at[0] + 12, e.at[1] - 34, fillOutputs(fl.text, live()), fl.color);
      }
    },

    wireStyles(): WireStyle[] {
      const visible = ctxRef?.visible ?? new Set<string>();
      const active = new Set(running().flatMap((f) => f.flow.path.map((h) => h.wire)));
      const known = new Set(
        Object.values(b.flows)
          .filter((f) => shown(f, visible))
          .flatMap((f) => f.path.map((h) => h.wire)),
      );
      return Object.keys(o.scene.wires).flatMap((wire): WireStyle[] => {
        if (active.has(wire)) return [{ wire, color: "blue", alpha: 0.42, width: 2 }];
        if (known.has(wire)) return [{ wire, color: "blue", alpha: 0.14, width: 2 }];
        return [];
      });
    },

    tiles(d, ctx): Tile[] {
      ctxRef = ctx;
      const mode = b.modes[modeOf(live())]!;
      return mode.tiles.map((t) => ({
        id: t.id,
        label: t.label,
        icon: (t.icon in ICONS ? t.icon : "activity") as IconName,
        hue: t.hue,
        value: fillOutputs(t.value, d),
        note: fillOutputs(t.note, d),
        mood: t.moodIf && testCond(t.moodIf, d) ? t.moodIf.mood : (t.mood ?? ""),
      }));
    },

    nodeBody(id: string, n: SceneNode): string {
      return `${nodeHead(n)}${(b.widgets?.[id] ?? []).map((w, i) => widgetHtml(w, `${id}.${i}`)).join("")}`;
    },

    mount(world: HTMLElement) {
      els.nodes = {};
      els.widgets = [];
      for (const id of Object.keys(o.scene.nodes)) {
        const el = world.querySelector<HTMLElement>(`[data-node="${id}"]`);
        if (el) els.nodes[id] = el;
      }
      for (const [node, ws] of Object.entries(b.widgets ?? {})) {
        ws.forEach((_, i) => {
          const root = world.querySelector<HTMLElement>(`[data-w="${node}.${i}"]`);
          if (root) els.widgets.push({ node, i, root });
        });
      }
      els.chartbox = world.closest(".tx-stage")?.querySelector<HTMLElement>(".tx-chartbox") ?? null;
    },

    paintWidgets(d: Outputs, ctx: StepContext) {
      ctxRef = ctx;
      const l = live();
      if (els.chartbox && !b.chart) els.chartbox.hidden = true;
      for (const [id, el] of Object.entries(els.nodes)) {
        el.style.setProperty("--ping", (pings[id] ?? 0).toFixed(2));
        const sub = b.subs?.[id];
        if (sub !== undefined) text(el.querySelector(".tx-sub"), fillOutputs(sub, d));
      }
      const on = new Map<string, boolean>();
      for (const s of b.states ?? []) {
        const k = `${s.node} ${s.cls}`;
        on.set(k, (on.get(k) ?? false) || testCond(s.when, l));
      }
      for (const [k, v] of on) {
        const [node, cls] = k.split(" ") as [string, string];
        els.nodes[node]?.classList.toggle(cls, v);
      }
      for (const w of els.widgets) paintWidget(w.root, b.widgets![w.node]![w.i]!, l, clock);
    },

    chartSample(out: Outputs): number {
      return b.chart ? Math.min(b.chart.max, Math.max(0, out[b.chart.output] ?? 0)) : 0;
    },
  };
}
