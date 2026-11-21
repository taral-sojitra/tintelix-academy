import type { Inputs, Outputs, SceneNode, SceneSpec } from "@tintelix/schema";
import { formatOutput } from "@tintelix/schema/format";
import type { Effects } from "../effects";
import { nodeHead } from "../render/dom";
import { health } from "../routers/health";
import type { SimEvent } from "../sim";
import type { SceneChart, SceneRuntime, StepContext, Tile, WireStyle } from "./types";

const LEGEND: SceneRuntime["legend"] = [["cyan", "request"], ["green", "answered"], ["red", "failed"]];
const CHART: SceneChart = { label: "REQUESTS FAILING", output: "failedPct", max: 100, danger: 10 };
/** The server that dies or stalls in every step. */
export const FAULTY = "s2";
const ROW_TOP = 54;
const ROW_H = 30;

type RowState = "ok" | "bad" | "slow" | "out";

export function createHealthScene(o: { fx: Effects; rand: () => number; scene: SceneSpec }): SceneRuntime {
  const { fx } = o;
  const ids = Object.keys(o.scene.wires).filter((w) => w.startsWith("lb_")).map((w) => w.slice(3));
  let ctxRef: StepContext | null = null;
  let clock = 0;
  let key = "";
  const inputKey = (i: Inputs) => JSON.stringify(Object.entries(i).filter(([k]) => k !== "elapsedSec").sort());
  const liveInputs = (ctx: StepContext): Inputs => ({ ...ctx.inputs, elapsedSec: clock });
  const live = (): Outputs => (ctxRef ? ctxRef.model.run(liveInputs(ctxRef)) : {});
  const f = (name: string, d: Outputs) => formatOutput(name, d[name] ?? 0);
  const name = (s: string) => `S${ids.indexOf(s) + 1}`;

  /** Who is out of rotation: the faulty server first, then the others in order. */
  function ejectedSet(d: Outputs): Set<string> {
    const n = Math.round(d.ejected ?? 0);
    const order = [FAULTY, ...ids.filter((s) => s !== FAULTY)];
    return new Set(order.slice(0, n));
  }
  function rotation(d: Outputs): string[] {
    const out = ejectedSet(d);
    return ids.filter((s) => !out.has(s));
  }
  const overloaded = (d: Outputs) => (d.inRotation ?? 0) > 0 && (d.loadEach ?? 0) > (d.capRps ?? Infinity);
  /** Checks missed in a row since trouble began at `since`, capped at the threshold. */
  const missed = (d: Outputs, since: number) => Math.max(0, Math.min(d.threshold ?? 2, Math.floor((clock - since + 1e-9) / (d.intervalSec ?? 5))));

  const els: { rows: Record<string, { el: HTMLElement; state: HTMLElement; load: HTMLElement }>; log: HTMLElement | null } = { rows: {}, log: null };
  const text = (el: Element | null | undefined, t: string) => {
    if (el && el.textContent !== t) el.textContent = t;
  };

  return {
    router: health({
      rotation: () => rotation(live()),
      faulty: () => FAULTY,
      overloadFail: () => {
        const d = live();
        return overloaded(d) ? 1 - (d.capRps ?? 0) / (d.loadEach ?? 1) : 0;
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
      if (e.kind === "miss" && e.node === "lb") fx.float(e.at[0], e.at[1] - 60, "no server to send to", "red");
    },

    wireStyles(): WireStyle[] {
      const out = ejectedSet(live());
      return [
        { wire: "u_lb", color: "blue", alpha: 0.42, width: 2 },
        ...ids.map((s): WireStyle => ({ wire: `lb_${s}`, color: "blue", alpha: out.has(s) ? 0.08 : 0.32, width: 1.5 })),
      ];
    },

    tiles(d, ctx): Tile[] {
      ctxRef = ctx;
      const checks = (d.checks ?? 1) >= 0.5;
      const failing = d.failedPct ?? 0;
      const over = overloaded(d);
      return [
        { id: "a", label: "Since the fault", icon: "hourglass", hue: "blue", value: f("clockSec", d), note: clock >= (d.clockSec ?? 0) + 0.5 ? "settled" : "playing out", mood: "" },
        { id: "b", label: "In rotation", icon: "server", hue: "violet", value: `${f("inRotation", d)} of ${f("servers", d)}`, note: `${f("ejected", d)} ejected`, mood: (d.inRotation ?? 0) < (d.survivors ?? 0) ? "bad" : "" },
        { id: "c", label: "Failing", icon: "activity", hue: "amber", value: f("failedPct", d), note: `${f("failedPerSec", d)} requests a second`, mood: failing > 0.5 ? "bad" : "good" },
        { id: "d", label: "Each server", icon: "gauge", hue: "cyan", value: (d.inRotation ?? 0) > 0 ? `${f("loadEach", d)}/s` : "none left", note: `limit ${f("capRps", d)}/s`, mood: over || (d.inRotation ?? 0) === 0 ? "bad" : "good" },
        { id: "e", label: "Found in", icon: "target", hue: "green", value: checks ? f("detectSec", d) : "never", note: checks ? `${f("threshold", d)} missed checks, every ${f("intervalSec", d)}` : "no health checks", mood: checks ? "good" : "bad" },
      ];
    },

    nodeBody(id: string, n: SceneNode): string {
      if (id === "fleet") {
        const rows = ids.map((s, k) => `<div class="tx-frow" data-row="${s}" style="top:${ROW_TOP + k * ROW_H}px"><i class="tx-beat"></i><b>${name(s)}</b><span data-state></span><em data-load></em></div>`).join("");
        return `${nodeHead(n)}${rows}`;
      }
      if (id === "log") return `${nodeHead(n)}<ol class="tx-log" data-log></ol>`;
      return nodeHead(n);
    },

    mount(world: HTMLElement) {
      for (const s of ids) {
        const el = world.querySelector<HTMLElement>(`[data-row="${s}"]`);
        if (el) els.rows[s] = { el, state: el.querySelector("[data-state]")!, load: el.querySelector("[data-load]")! };
      }
      els.log = world.querySelector("[data-log]");
    },

    paintWidgets(d: Outputs, ctx: StepContext) {
      ctxRef = ctx;
      const checks = (d.checks ?? 1) >= 0.5;
      const stalled = (d.fault ?? 0) >= 0.5;
      const out = ejectedSet(d);
      const over = overloaded(d);
      const thr = f("threshold", d);
      const interval = d.intervalSec ?? 5;
      const beat = checks && clock % interval < 0.35;
      for (const s of ids) {
        const r = els.rows[s];
        if (!r) continue;
        let state: RowState = "ok";
        let label = "check ok";
        if (out.has(s)) {
          state = "out";
          label = "out of rotation";
        } else if (s === FAULTY) {
          state = "bad";
          const what = stalled ? "stalled" : "dead";
          label = checks ? `${what} · missed ${missed(d, 0)} of ${thr}` : `${what} · no checks`;
        } else if (over) {
          state = "slow";
          const capped = (d.ejected ?? 0) >= (d.maxEjected ?? Infinity);
          label = capped && clock >= (d.cascadeSec ?? Infinity) ? "slow · cap reached, kept" : `slow · missed ${missed(d, d.detectSec ?? 0)} of ${thr}`;
        }
        r.el.className = `tx-frow ${state}${beat && state !== "out" ? " beat" : ""}`;
        text(r.state, label);
        text(r.load, state === "out" ? "" : `${f("loadEach", d)}/s`);
      }
      // The log: one line per thing that has happened by now.
      const lines: string[] = [`T+0 s · ${name(FAULTY)} ${stalled ? "stalls" : "dies"}`];
      if (!checks) lines.push("no checks: it keeps its share");
      else {
        if (clock >= (d.detectSec ?? Infinity) && (d.ejected ?? 0) >= 1) {
          lines.push(`T+${f("detectSec", d)} · ${name(FAULTY)} ejected`);
          if ((d.afterOneLoad ?? 0) > (d.capRps ?? Infinity)) lines.push(`the rest now take ${f("afterOneLoad", d)}/s, over ${f("capRps", d)}`);
        }
        if (clock >= (d.cascadeSec ?? Infinity) && (d.afterOneLoad ?? 0) > (d.capRps ?? Infinity) && (d.ejected ?? 0) >= 1) {
          const more = (d.ejected ?? 0) - 1;
          if (more > 0) lines.push(`T+${f("cascadeSec", d)} · ${more} more ejected`);
          lines.push((d.inRotation ?? 0) === 0 ? "no servers left" : `cap reached: ${f("inRotation", d)} kept in`);
        }
      }
      const html = lines.map((l) => `<li>${l}</li>`).join("");
      if (els.log && els.log.innerHTML !== html) els.log.innerHTML = html;
    },

    chartSample(out: Outputs): number {
      return Math.min(CHART.max, out.failedPct ?? 0);
    },
  };
}
