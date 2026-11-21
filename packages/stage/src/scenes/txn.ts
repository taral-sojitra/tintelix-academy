import type { Inputs, Outputs, SceneNode, SceneSpec } from "@tintelix/schema";
import { formatOutput } from "@tintelix/schema/format";
import type { Effects } from "../effects";
import { nodeHead } from "../render/dom";
import { PARTICIPANTS, txn, type TxnMode } from "../routers/txn";
import type { SimEvent } from "../sim";
import type { SceneChart, SceneRuntime, StepContext, Tile, WireStyle } from "./types";

const LEGEND: SceneRuntime["legend"] = [["cyan", "step"], ["violet", "prepare and vote"], ["green", "committed"], ["amber", "undo"], ["red", "failed"]];
const CHART: SceneChart = { label: "BROKEN ORDERS", output: "brokenRate", max: 10, danger: 1 };
const MODES: TxnMode[] = ["none", "2pc", "down", "saga"];
/** Failures happen 1 order in 50; the picture shows 1 in 4 so you can see them, and says so. */
const VISIBLE_FAIL = 0.25;
const ROLE: Record<TxnMode, string> = { none: "calls each service in turn", "2pc": "prepare all, then commit", down: "down", saga: "each step commits; undo on failure" };

export function createTxnScene(o: { fx: Effects; rand: () => number; scene: SceneSpec }): SceneRuntime {
  const { fx, rand } = o;
  let ctxRef: StepContext | null = null;
  const locked = new Set<string>();
  const liveInputs = (ctx: StepContext): Inputs => ({ ...ctx.inputs });
  const live = (): Outputs => (ctxRef ? ctxRef.model.run(liveInputs(ctxRef)) : {});
  const f = (name: string, d: Outputs) => formatOutput(name, d[name] ?? 0);
  const modeOf = (d: Outputs): TxnMode => MODES[Math.round(d.mode ?? 0)] ?? "none";
  const els: { nodes: Record<string, HTMLElement>; lock: Record<string, HTMLElement>; role: HTMLElement | null; chartbox: HTMLElement | null } = { nodes: {}, lock: {}, role: null, chartbox: null };
  const text = (el: Element | null | undefined, t: string) => {
    if (el && el.textContent !== t) el.textContent = t;
  };

  return {
    router: txn({
      mode: () => modeOf(live()),
      failShare: () => {
        const m = modeOf(live());
        return m === "none" || m === "saga" ? VISIBLE_FAIL : 0;
      },
    }),
    fx,
    legend: LEGEND,
    sim: { ratePerSec: 2 },
    chart: CHART,
    lane: null,
    liveInputs,

    enterStep(ctx) {
      ctxRef = ctx;
      locked.clear();
    },

    update(_dt, ctx) {
      ctxRef = ctx;
    },

    onEvent(e: SimEvent, ctx) {
      ctxRef = ctx;
      const mode = modeOf(live());
      if (mode === "2pc" && PARTICIPANTS.includes(e.node)) {
        if (e.kind === "fill") locked.add(e.node);
        if (e.kind === "pass") locked.delete(e.node);
      }
      if (e.kind === "miss" && e.node === "s2" && mode === "none") fx.float(e.at[0] + 150, e.at[1] - 58, "out of stock, card already charged", "red");
      if (e.kind === "miss" && e.node === "s2" && mode === "saga") fx.float(e.at[0] + 150, e.at[1] - 58, "out of stock: undo", "amber");
      if (e.kind === "fill" && mode === "saga" && rand() < 0.8) fx.float(e.at[0] + 150, e.at[1] - 58, e.node === "s1" ? "refund the card" : "cancel the order", "amber");
      if (e.kind === "miss" && e.node === "coord" && rand() < 0.3) fx.float(e.at[0] + 90, e.at[1] - 64, "checkout is down", "red");
    },

    wireStyles(): WireStyle[] {
      const down = modeOf(live()) === "down";
      return ["u_c", ...PARTICIPANTS.map((s) => `c_${s}`)].map((w): WireStyle => ({ wire: w, color: "blue", alpha: down && w !== "u_c" ? 0.12 : 0.4, width: 2 }));
    },

    tiles(d, ctx): Tile[] {
      ctxRef = ctx;
      const mode = modeOf(d);
      if (mode === "2pc") {
        return [
          { id: "a", label: "Broken orders", icon: "check", hue: "green", value: f("brokenRate", d), note: "all or nothing", mood: "good" },
          { id: "b", label: "Locks held", icon: "hourglass", hue: "amber", value: f("lockMs", d), note: `${f("workMs", d)} without 2PC`, mood: "bad" },
          { id: "c", label: "Hot item can take", icon: "gauge", hue: "violet", value: f("hotMax", d), note: `orders a second; ${f("hotDemand", d)} want it`, mood: (d.hotTurnedAwayPct ?? 0) > 0 ? "bad" : "" },
        ];
      }
      if (mode === "down") {
        return [
          { id: "a", label: "Orders blocked", icon: "target", hue: "amber", value: f("blockedOrders", d), note: "on the locked hot item", mood: "bad" },
          { id: "b", label: "Checkout", icon: "server", hue: "violet", value: "down", note: "after prepare, before commit", mood: "bad" },
          { id: "c", label: "Locks held for", icon: "hourglass", hue: "blue", value: f("recoverSec", d), note: "until checkout recovers", mood: "bad" },
        ];
      }
      if (mode === "saga") {
        return [
          { id: "a", label: "Broken orders", icon: "check", hue: "green", value: f("brokenRate", d), note: "undone instead", mood: "good" },
          { id: "b", label: "Compensations", icon: "activity", hue: "amber", value: f("compRate", d), note: "a second: refund, then cancel", mood: "" },
          { id: "c", label: "Hot item can take", icon: "gauge", hue: "violet", value: f("hotMax", d), note: "orders a second: no cross-service locks", mood: "good" },
        ];
      }
      return [
        { id: "a", label: "Broken orders", icon: "activity", hue: "amber", value: f("brokenRate", d), note: "a second: charged, nothing reserved", mood: "bad" },
        { id: "b", label: "Inventory fails", icon: "target", hue: "violet", value: f("failPct", d), note: `of ${f("orders", d)} orders a second`, mood: "" },
        { id: "c", label: "Locks held", icon: "hourglass", hue: "blue", value: f("lockMs", d), note: "each service, on its own", mood: "" },
      ];
    },

    nodeBody(id: string, n: SceneNode): string {
      if (PARTICIPANTS.includes(id)) return `${nodeHead(n)}<p class="tx-calc-s" data-lock="${id}"></p>`;
      if (id === "coord") return `${nodeHead(n)}<p class="tx-calc-s" data-role></p>`;
      return nodeHead(n);
    },

    mount(world: HTMLElement) {
      for (const el of world.querySelectorAll<HTMLElement>("[data-node]")) els.nodes[el.dataset.node!] = el;
      for (const el of world.querySelectorAll<HTMLElement>("[data-lock]")) els.lock[el.dataset.lock!] = el;
      els.role = world.querySelector("[data-role]");
      els.chartbox = world.closest(".tx-stage")?.querySelector<HTMLElement>(".tx-chartbox") ?? null;
    },

    paintWidgets(_d: Outputs, ctx: StepContext) {
      ctxRef = ctx;
      if (els.chartbox) els.chartbox.hidden = true;
      const mode = modeOf(live());
      text(els.role, ROLE[mode]);
      els.nodes.coord?.classList.toggle("tx-down", mode === "down");
      for (const s of PARTICIPANTS) {
        const isLocked = mode === "down" || (mode === "2pc" && locked.has(s));
        els.nodes[s]?.classList.toggle("tx-locked", isLocked);
        text(els.lock[s], mode === "down" ? "locked, waiting for checkout" : mode === "2pc" ? (isLocked ? "prepared: rows locked" : "free") : "commits on its own");
      }
    },

    chartSample(out: Outputs): number {
      return Math.min(CHART.max, out.brokenRate ?? 0);
    },
  };
}
