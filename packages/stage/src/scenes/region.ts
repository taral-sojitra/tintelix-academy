import type { Inputs, Outputs, SceneNode, SceneSpec } from "@tintelix/schema";
import { formatOutput } from "@tintelix/schema/format";
import type { Effects } from "../effects";
import { nodeHead } from "../render/dom";
import { region } from "../routers/region";
import type { SimEvent } from "../sim";
import type { SceneChart, SceneRuntime, StepContext, Tile, WireStyle } from "./types";

const LEGEND: SceneRuntime["legend"] = [["cyan", "request"], ["green", "answered"], ["red", "failed"], ["violet", "copy to the other region"]];
/** The chart stays hidden: the timeline panel sits where it would be. */
const CHART: SceneChart = { label: "WRITES ACCEPTED A SECOND", output: "acceptedRate", max: 2000, danger: 0 };

export function createRegionScene(o: { fx: Effects; rand: () => number; scene: SceneSpec }): SceneRuntime {
  const { fx, rand } = o;
  let ctxRef: StepContext | null = null;
  let clock = 0;
  let key = "";
  let floated = { wrote: false, stale: false, copied: false };
  const inputKey = (i: Inputs) => JSON.stringify(Object.entries(i).filter(([k]) => k !== "elapsedSec").sort());
  const liveInputs = (ctx: StepContext): Inputs => ({ ...ctx.inputs, elapsedSec: clock });
  const live = (): Outputs => (ctxRef ? ctxRef.model.run(liveInputs(ctxRef)) : {});
  const f = (name: string, d: Outputs) => formatOutput(name, d[name] ?? 0);
  const num = (d: Outputs, k: string) => Math.round(d[k] ?? 0);
  const restart = () => {
    clock = 0;
    floated = { wrote: false, stale: false, copied: false };
  };
  const els: { nodes: Record<string, HTMLElement>; lines: Record<string, HTMLElement>; segs: Record<string, HTMLElement>; bar: HTMLElement | null; head: HTMLElement | null; fotext: HTMLElement | null; panelTitle: HTMLElement | null; chartbox: HTMLElement | null } = { nodes: {}, lines: {}, segs: {}, bar: null, head: null, fotext: null, panelTitle: null, chartbox: null };
  const text = (el: Element | null | undefined, t: string) => {
    if (el && el.textContent !== t) el.textContent = t;
  };
  const center = (id: string): [number, number] => {
    const n = o.scene.nodes[id]!;
    return [n.x + n.w / 2, n.y];
  };

  /** Share of a user group's requests failing right now, in percent. */
  const failing = (g: 0 | 1, d: Outputs): number => {
    const mode = num(d, "mode");
    if (num(d, "mumbaiUp") === 1) return 0;
    if (mode === 1 || (mode === 3 && g === 0)) return 100 - (d.movedPct ?? 0);
    return 0;
  };
  const moved = (d: Outputs) => rand() * 100 < (d.movedPct ?? 0);

  const subOf = (id: string, d: Outputs): string | null => {
    const mode = num(d, "mode");
    const phase = num(d, "phase");
    const up = num(d, "mumbaiUp") === 1;
    if (id === "appA") return up ? "serving" : "dark";
    if (id === "appB") return mode >= 2 || (mode === 1 && phase >= 3) ? "serving" : "idle";
    if (id === "dbA") return !up ? "down" : mode >= 2 ? "takes writes" : "primary";
    if (id === "dbB") {
      if (mode >= 2) return "takes writes";
      if (mode === 1 && phase === 2) return "promoting";
      return mode === 1 && phase >= 3 ? "primary" : "standby";
    }
    if (id === "route") return `DNS · TTL ${f("dnsTtlSec", d)}`;
    return null;
  };

  const lineOf = (id: string, d: Outputs): string => {
    const mode = num(d, "mode");
    const phase = num(d, "phase");
    const up = num(d, "mumbaiUp") === 1;
    const lag = f("lagMs", d);
    if (id === "usersA" || id === "usersB") {
      const g = id === "usersA" ? 0 : 1;
      const fail = failing(g, d);
      return fail > 0 ? `${Math.round(fail)}% failing` : `${f(g === 0 ? "indiaRttMs" : "usRttMs", d)} round trip`;
    }
    if (id === "route") {
      if (mode === 0) return "everyone → Mumbai";
      if (mode === 1) return phase >= 3 ? "everyone → Virginia" : "everyone → Mumbai";
      if (mode === 3 && phase >= 2) return "India → Virginia";
      return "nearest region";
    }
    if (mode === 4) {
      const v = num(d, id === "dbA" ? "mumbaiV" : "virginiaV");
      const newest = num(d, "mumbaiV");
      if (newest === 1) return "address: v1";
      return v < newest ? `address: v${v} (old)` : `address: v${v} (new)`;
    }
    if (id === "dbA") {
      if (!up) return "unreachable";
      return mode >= 2 ? `${lag} behind Virginia` : "copies to Virginia";
    }
    if (id === "dbB") {
      if (!up) return `missing ${lag} of writes`;
      return `${lag} behind Mumbai`;
    }
    return "";
  };

  const timelineText = (d: Outputs): string => {
    const mode = num(d, "mode");
    const phase = num(d, "phase");
    const s = `T+${Math.round(d.realSec ?? 0)} s`;
    const lag = f("lagMs", d);
    if (mode === 1) {
      if (phase === 1) return `${s}: ${f("checks", d)} failed checks needed, ${f("checkIntervalSec", d)} apart · no writes anywhere`;
      if (phase === 2) return `${s}: promoting Virginia's standby · no writes anywhere`;
      if (phase === 3) return `${s}: DNS repointed; ${Math.round(d.movedPct ?? 0)}% of users have moved`;
      if (phase === 4) return `${s}: everyone on Virginia · ${f("lostWrites", d)} writes lost`;
      return "Mumbai is healthy";
    }
    if (mode === 3) {
      if (phase === 1) return `${s}: checks failing · India's requests fail, the USA is fine`;
      if (phase === 2) return `${s}: India rerouted to Virginia; ${Math.round(d.movedPct ?? 0)}% moved`;
      if (phase === 3) return `${s}: everyone served · ${f("lostWrites", d)} writes lost`;
      return "Both regions are healthy";
    }
    if (mode === 4) {
      if (num(d, "mumbaiV") === 1) return "The address is v1 in both regions";
      if (num(d, "staleRead") === 1) return `T+${Math.round(((clock - 1) * 1000) / (d.speedup ?? 10))} ms: India saved v2 in Mumbai; a read in Virginia still gets v1`;
      return `T+${lag}: v2 reaches Virginia; reads there are up to date`;
    }
    if (mode === 2) return `Both regions take writes and copy them to each other, each landing about ${lag} later.`;
    return `Mumbai copies each write to Virginia, where it lands about ${lag} later. Virginia serves no one.`;
  };

  return {
    router: region({
      serve: (g) => {
        const d = live();
        const mode = num(d, "mode");
        if (mode === 0) return 0;
        if (mode === 1) return num(d, "primary") === 1 && moved(d) ? 1 : 0;
        if (mode === 3 && g === 0) return num(d, "mumbaiUp") === 1 || !moved(d) ? 0 : 1;
        return g;
      },
      up: (r) => r === 1 || num(live(), "mumbaiUp") === 1,
      copies: () => {
        const d = live();
        if (num(d, "mumbaiUp") === 0) return [];
        return num(d, "mode") >= 2 ? [[0, 1], [1, 0]] : [[0, 1]];
      },
    }),
    fx,
    legend: LEGEND,
    sim: { ratePerSec: 3 },
    chart: CHART,
    lane: null,
    liveInputs,

    enterStep(ctx) {
      ctxRef = ctx;
      restart();
      key = inputKey(ctx.inputs);
    },

    update(dt, ctx) {
      ctxRef = ctx;
      const k = inputKey(ctx.inputs);
      if (k !== key) {
        key = k;
        restart();
      }
      clock += dt;
    },

    onEvent(e: SimEvent, ctx) {
      ctxRef = ctx;
      if (e.kind === "miss" && e.node === "appA" && rand() < 0.3) fx.float(e.at[0] + 20, e.at[1] - 40, "Mumbai is dark", "red");
      if (e.kind === "fill" && num(live(), "mode") !== 4 && rand() < 0.15) fx.float(e.at[0] - 60, e.at[1] - 30, `copy, ${f("lagMs", live())} late`, "violet");
    },

    wireStyles(): WireStyle[] {
      const d = live();
      const mode = num(d, "mode");
      const up = num(d, "mumbaiUp") === 1;
      const phase = num(d, "phase");
      const toB = mode >= 2 || (mode === 1 && phase >= 3);
      const style = (wire: string, on: boolean): WireStyle => ({ wire, color: "blue", alpha: on ? 0.42 : 0.12, width: 2 });
      return [
        style("uA_r", true),
        style("uB_r", true),
        style("r_aA", up),
        style("r_aB", toB),
        style("aA_dA", up),
        style("aB_dB", toB),
        { wire: "dA_dB", color: "violet", alpha: up ? 0.45 : 0.12, width: 2, dash: [3, 8], ...(mode >= 2 ? {} : { flowDir: 1 as const }) },
      ];
    },

    tiles(d, ctx): Tile[] {
      ctxRef = ctx;
      const mode = num(d, "mode");
      const l = live();
      if (mode === 1) {
        return [
          { id: "a", label: "Writes accepted", icon: "activity", hue: "green", value: `${f("acceptedRate", d)}/s`, note: `of ${f("writeRate", d)} a second`, mood: (d.acceptedRate ?? 0) < (d.writeRate ?? 0) ? "bad" : "good" },
          { id: "b", label: "Writes stop for", icon: "hourglass", hue: "amber", value: f("writesDowntime", d), note: `${f("detectSec", d)} to notice + ${f("promoteSec", d)} to promote`, mood: "bad" },
          { id: "c", label: "Everyone moved after", icon: "users", hue: "violet", value: f("cutoverDowntime", d), note: `+ DNS TTL ${f("dnsTtlSec", d)}`, mood: "" },
        ];
      }
      if (mode === 3) {
        return [
          { id: "a", label: "Writes accepted", icon: "activity", hue: "green", value: `${f("acceptedRate", d)}/s`, note: `of ${f("writeRate", d)} a second`, mood: (d.acceptedRate ?? 0) < (d.writeRate ?? 0) ? "bad" : "good" },
          { id: "b", label: "US users down for", icon: "check", hue: "cyan", value: f("usDowntime", d), note: "nothing to promote", mood: "good" },
          { id: "c", label: "Indian users moved after", icon: "users", hue: "violet", value: f("indiaDowntime", d), note: `${f("detectSec", d)} to notice + TTL ${f("dnsTtlSec", d)}`, mood: "" },
        ];
      }
      if (mode === 4) {
        const stale = num(l, "staleRead") === 1;
        return [
          { id: "a", label: "Mumbai has", icon: "db", hue: "cyan", value: `v${num(l, "mumbaiV")}`, note: num(l, "mumbaiV") === 2 ? "India just saved it" : "", mood: "" },
          { id: "b", label: "Virginia has", icon: "db", hue: "violet", value: `v${num(l, "virginiaV")}`, note: `copies land ${f("lagMs", d)} later`, mood: stale ? "bad" : "" },
          { id: "c", label: "Virginia's read", icon: "target", hue: "amber", value: stale ? "old address" : num(l, "mumbaiV") === 2 ? "new address" : "same in both", note: stale ? "nothing failed: the copy hasn't landed" : "", mood: stale ? "bad" : "good" },
        ];
      }
      if (mode === 2) {
        return [
          { id: "a", label: "US users wait", icon: "users", hue: "cyan", value: f("usRttMs", d), note: "per round trip, to Virginia", mood: "good" },
          { id: "b", label: "Copies land", icon: "hourglass", hue: "violet", value: f("lagMs", d), note: "later, in both directions", mood: "" },
          { id: "c", label: "Writes per region", icon: "activity", hue: "green", value: `${f("regionRate", d)}/s`, note: "each region takes its own users'", mood: "" },
        ];
      }
      return [
        { id: "a", label: "US users wait", icon: "users", hue: "cyan", value: f("usRttMs", d), note: "per round trip, to Mumbai", mood: "bad" },
        { id: "b", label: "Standby is behind by", icon: "hourglass", hue: "violet", value: f("lagMs", d), note: "half a round trip + applying", mood: "" },
        { id: "c", label: "Standby serves", icon: "server", hue: "amber", value: f("standbyServesPct", d), note: "paid for, waiting", mood: "" },
      ];
    },

    nodeBody(id: string, n: SceneNode): string {
      if (id === "panel") return `<div class="tx-nh"><div><b data-ptitle>${n.label}</b></div></div><div class="tx-fobar" data-fobar hidden><i class="seg-detect" data-seg="detect">notice</i><i class="seg-promote" data-seg="promote">promote</i><i class="seg-dns" data-seg="dns">DNS catches up</i><b class="tx-fohead" data-fohead></b></div><p class="tx-calc-s" data-fotext></p>`;
      if (id === "appA" || id === "appB") return nodeHead(n);
      return `${nodeHead(n)}<p class="tx-calc-s tx-line" data-line></p>`;
    },

    mount(world: HTMLElement) {
      for (const id of Object.keys(o.scene.nodes)) {
        const el = world.querySelector<HTMLElement>(`[data-node="${id}"]`);
        if (!el) continue;
        els.nodes[id] = el;
        const line = el.querySelector<HTMLElement>("[data-line]");
        if (line) els.lines[id] = line;
      }
      for (const el of world.querySelectorAll<HTMLElement>("[data-seg]")) els.segs[el.dataset.seg!] = el;
      els.bar = world.querySelector("[data-fobar]");
      els.head = world.querySelector("[data-fohead]");
      els.fotext = world.querySelector("[data-fotext]");
      els.panelTitle = world.querySelector("[data-ptitle]");
      els.chartbox = world.closest(".tx-stage")?.querySelector<HTMLElement>(".tx-chartbox") ?? null;
    },

    paintWidgets(_d: Outputs, ctx: StepContext) {
      ctxRef = ctx;
      const d = live();
      const mode = num(d, "mode");
      const up = num(d, "mumbaiUp") === 1;
      if (els.chartbox) els.chartbox.hidden = true;
      for (const [id, el] of Object.entries(els.nodes)) {
        const sub = subOf(id, d);
        if (sub !== null) text(el.querySelector(".tx-sub"), sub);
        const line = els.lines[id];
        if (line) text(line, lineOf(id, d));
        el.classList.toggle("tx-down", (id === "appA" || id === "dbA") && !up);
        el.classList.toggle("tx-cand", id === "dbB" && mode === 1 && num(d, "phase") === 2);
      }
      const failover = mode === 1 || mode === 3;
      text(els.panelTitle, failover ? "Failover timeline" : mode === 4 ? "Replication, slowed down" : "Replication");
      if (els.bar) els.bar.hidden = !failover;
      if (failover) {
        const detect = d.detectSec ?? 0;
        const promote = mode === 1 ? (d.promoteSec ?? 0) : 0;
        const ttl = d.dnsTtlSec ?? 0;
        const scale = Math.max(1, detect + promote + ttl);
        const pct = (x: number) => `${Math.round((100 * x) / scale)}%`;
        if (els.segs.detect) els.segs.detect.style.width = pct(detect);
        if (els.segs.promote) {
          els.segs.promote.style.width = pct(promote);
          els.segs.promote.hidden = promote === 0;
        }
        if (els.segs.dns) els.segs.dns.style.width = pct(ttl);
        if (els.head) els.head.style.left = pct(Math.min(scale, d.realSec ?? 0));
      }
      text(els.fotext, timelineText(d));
      if (mode === 4) {
        const at = (id: string, dy: number): [number, number] => {
          const [x, y] = center(id);
          return [x - 60, y + dy];
        };
        if (num(d, "mumbaiV") === 2 && !floated.wrote) {
          floated.wrote = true;
          fx.float(...at("dbA", -14), "v2 saved", "cyan");
        }
        if (num(d, "staleRead") === 1 && !floated.stale && clock > 1.35) {
          floated.stale = true;
          fx.float(...at("dbB", -14), "read: v1, the old one", "red");
        }
        if (num(d, "virginiaV") === 2 && !floated.copied) {
          floated.copied = true;
          fx.float(...at("dbB", -14), "v2 lands", "violet");
        }
      }
    },

    chartSample(): number {
      return live().acceptedRate ?? 0;
    },
  };
}
