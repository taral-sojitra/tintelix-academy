import type { Inputs, Outputs, SceneNode, SceneSpec } from "@tintelix/schema";
import { formatOutput } from "@tintelix/schema/format";
import type { Effects } from "../effects";
import { nodeHead } from "../render/dom";
import { GROUP_HUES, session, type SessionMode } from "../routers/session";
import type { SimEvent } from "../sim";
import type { SceneChart, SceneRuntime, StepContext, Tile, WireStyle } from "./types";

const LEGEND: SceneRuntime["legend"] = [["amber", "requests, by user group"], ["green", "logged in"], ["red", "sent to log in"]];
const CHART: SceneChart = { label: "SENT TO LOG IN", output: "bouncedPct", max: 100, danger: 10 };
/** The server a deploy replaces. */
export const DEPLOYED = "s1";
const GROUP_NAMES = ["A", "B", "C"];
const MODES: SessionMode[] = ["memory", "sticky", "shared"];

export interface SessionState {
  mode(): SessionMode;
  bounced(g: number): boolean;
}
export type SessionScene = SceneRuntime & { state: SessionState };

export function createSessionScene(o: { fx: Effects; rand: () => number; scene: SceneSpec }): SessionScene {
  const { fx, rand } = o;
  const servers = Object.keys(o.scene.wires).filter((w) => w.startsWith("lb_")).map((w) => w.slice(3));
  const deployedGroup = servers.indexOf(DEPLOYED);
  let ctxRef: StepContext | null = null;
  let clock = 0;
  let key = "";
  const inputKey = (i: Inputs) => JSON.stringify(Object.entries(i).filter(([k]) => k !== "elapsedSec").sort());
  const liveInputs = (ctx: StepContext): Inputs => ({ ...ctx.inputs, elapsedSec: clock });
  const live = (): Outputs => (ctxRef ? ctxRef.model.run(liveInputs(ctxRef)) : {});
  const f = (name: string, d: Outputs) => formatOutput(name, d[name] ?? 0);
  const modeOf = (d: Outputs): SessionMode => MODES[Math.round(d.mode ?? 0)] ?? "memory";
  const state: SessionState = {
    mode: () => modeOf(live()),
    bounced: (g) => {
      const d = live();
      return modeOf(d) === "sticky" && g === deployedGroup && (d.bouncedPct ?? 0) > 0;
    },
  };
  const els: { holds: Record<string, HTMLElement>; policy: HTMLElement | null; store: HTMLElement | null; reads: HTMLElement | null } = { holds: {}, policy: null, store: null, reads: null };
  const text = (el: Element | null | undefined, t: string) => {
    if (el && el.textContent !== t) el.textContent = t;
  };

  return {
    router: session({ mode: () => state.mode(), home: (g) => servers[g] ?? "s0", bounced: (g) => state.bounced(g), groups: servers.length }),
    fx,
    state,
    legend: LEGEND,
    sim: { ratePerSec: 5 },
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
      if (e.kind === "miss" && rand() < 0.35) fx.float(e.at[0] + 195, e.at[1] - 28, "no session: log in", "red");
    },

    wireStyles(): WireStyle[] {
      const shared = state.mode() === "shared";
      return [
        { wire: "u_lb", color: "blue", alpha: 0.42, width: 2 },
        ...servers.map((s): WireStyle => ({ wire: `lb_${s}`, color: "blue", alpha: 0.34, width: 1.6 })),
        ...(shared ? servers.map((s): WireStyle => ({ wire: `${s}_st`, color: "green", alpha: 0.4, width: 1.6, dash: [2, 12], flowDir: 1 })) : []),
      ];
    },

    tiles(d, ctx): Tile[] {
      ctxRef = ctx;
      const mode = modeOf(d);
      const shared = mode === "shared";
      const deploy = (d.deploy ?? 0) >= 0.5;
      return [
        { id: "a", label: shared ? "Sessions in the store" : "Sessions per server", icon: "users", hue: "violet", value: shared ? f("sessions", d) : f("perServer", d), note: shared ? "any server can read them" : "in that server's memory only", mood: "" },
        { id: "b", label: "Lose their login", icon: "activity", hue: "amber", value: f("lostPct", d), note: mode === "memory" ? "land on the wrong server" : "of requests, normally", mood: (d.lostPct ?? 0) > 0 ? "bad" : "good" },
        { id: "c", label: "Logged out by a deploy", icon: "target", hue: "blue", value: deploy ? f("loggedOut", d) : "no deploy yet", note: deploy && (d.loggedOut ?? 0) > 0 ? `${f("loginSpike", d)} logins a second` : deploy ? "the store still has them" : "", mood: deploy ? ((d.loggedOut ?? 0) > 0 ? "bad" : "good") : "" },
        { id: "d", label: "Request time", icon: "hourglass", hue: "cyan", value: f("requestMs", d), note: shared ? `+${f("lookupMs", d)} to read the session` : "session already in memory", mood: "" },
        { id: "e", label: "Store load", icon: "gauge", hue: "green", value: shared ? `${f("storeOps", d)}/s` : "none", note: shared ? "reads and expiry refreshes" : "no shared store", mood: "" },
      ];
    },

    nodeBody(id: string, n: SceneNode): string {
      const g = servers.indexOf(id);
      if (g >= 0) return `${nodeHead(n)}<p class="tx-calc-s tx-holds"><i style="background:var(--${GROUP_HUES[g]})"></i><span data-holds="${id}"></span></p>`;
      if (id === "lb") return `${nodeHead(n)}<p class="tx-calc-s" data-policy></p>`;
      if (id === "store") return `${nodeHead(n)}<div><p class="tx-calc-s" data-store></p><p class="tx-calc-s" data-reads></p></div>`;
      return nodeHead(n);
    },

    mount(world: HTMLElement) {
      for (const s of servers) {
        const el = world.querySelector<HTMLElement>(`[data-holds="${s}"]`);
        if (el) els.holds[s] = el;
      }
      els.policy = world.querySelector("[data-policy]");
      els.store = world.querySelector("[data-store]");
      els.reads = world.querySelector("[data-reads]");
    },

    paintWidgets(d: Outputs, ctx: StepContext) {
      ctxRef = ctx;
      const mode = modeOf(d);
      const deploy = (d.deploy ?? 0) >= 0.5;
      text(els.policy, mode === "sticky" ? "sticky cookie" : "round robin");
      servers.forEach((s, g) => {
        let t = `users ${GROUP_NAMES[g] ?? "?"} · ${f("perServer", d)} sessions`;
        if (mode === "shared") t = "keeps no sessions";
        else if (deploy && s === DEPLOYED) t = state.bounced(g) ? "new instance · sessions gone" : `users ${GROUP_NAMES[g] ?? "?"} · logged in again`;
        text(els.holds[s], t);
      });
      text(els.store, `${f("sessions", d)} sessions`);
      text(els.reads, `${f("storeOps", d)} reads a second`);
    },

    chartSample(out: Outputs): number {
      return Math.min(CHART.max, out.bouncedPct ?? 0);
    },
  };
}
