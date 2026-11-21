import type { Inputs, Outputs, SceneNode, SceneSpec } from "@tintelix/schema";
import { formatOutput } from "@tintelix/schema/format";
import type { Effects } from "../effects";
import { nodeHead } from "../render/dom";
import { leader } from "../routers/leader";
import type { SimEvent } from "../sim";
import type { SceneChart, SceneRuntime, StepContext, Tile, WireStyle } from "./types";

const LEGEND: SceneRuntime["legend"] = [["green", "heartbeat"], ["amber", "vote request"], ["violet", "vote"], ["cyan", "write"], ["red", "rejected"]];
const CHART: SceneChart = { label: "WRITES ACCEPTED A SECOND", output: "acceptedRate", max: 2000, danger: 0 };
const SERVERS = [1, 2, 3, 4, 5];
/** The partition in step 3 cuts n1 and n5 off from n2, n3 and n4. */
const side = (n: number) => (n === 1 || n === 5 ? 0 : 1);
const CUT_LINE = "515,30 470,240 30,280";

export function createLeaderScene(o: { fx: Effects; rand: () => number; scene: SceneSpec }): SceneRuntime {
  const { fx, rand } = o;
  let ctxRef: StepContext | null = null;
  let clock = 0;
  let key = "";
  const inputKey = (i: Inputs) => JSON.stringify(Object.entries(i).filter(([k]) => k !== "elapsedSec").sort());
  const liveInputs = (ctx: StepContext): Inputs => ({ ...ctx.inputs, elapsedSec: clock });
  const live = (): Outputs => (ctxRef ? ctxRef.model.run(liveInputs(ctxRef)) : {});
  const f = (name: string, d: Outputs) => formatOutput(name, d[name] ?? 0);
  const num = (d: Outputs, k: string) => Math.round(d[k] ?? 0);
  const split = (d: Outputs) => num(d, "mode") === 2 && num(d, "staleLeader") === 1;
  const n1Up = (d: Outputs) => num(d, "n1State") !== 1 && num(d, "n1State") !== 3;
  const els: { nodes: Record<number, HTMLElement>; timers: Record<number, HTMLElement>; timerBoxes: Record<number, HTMLElement>; dots: HTMLElement[]; tally: HTMLElement | null; token: HTMLElement | null; slog: HTMLElement | null; cut: SVGElement | null; chartbox: HTMLElement | null } = { nodes: {}, timers: {}, timerBoxes: {}, dots: [], tally: null, token: null, slog: null, cut: null, chartbox: null };
  const text = (el: Element | null | undefined, t: string) => {
    if (el && el.textContent !== t) el.textContent = t;
  };

  const leadersNow = (d: Outputs): number[] => {
    const l = num(d, "leader");
    if (split(d)) return l === 2 ? [1, 2] : [1];
    return l ? [l] : [];
  };

  /** A server's role, short enough for the box's header. */
  const subOf = (n: number, d: Outputs): string => {
    const s1 = num(d, "n1State");
    if (n === 1) {
      if (s1 === 1) return "down";
      if (s1 === 2) return "old leader";
      if (s1 === 3) return "frozen";
      if (s1 === 4) return "follower";
      return num(d, "leader") === 1 ? "leader" : "follower";
    }
    if (n === 2 && num(d, "candidate") === 2) return "candidate";
    if (n === 2 && num(d, "leader") === 2) return "leader";
    return "follower";
  };

  /** The line under the header: the term this server is in, or why it's out. */
  const termOf = (n: number, d: Outputs): string => {
    const s1 = num(d, "n1State");
    const old = `term ${f("oldTerm", d)}`;
    if (n === 1) {
      if (s1 === 1) return "no heartbeats";
      if (s1 === 2) return `${old}, cut off`;
      if (s1 === 3) return "GC pause";
      return s1 === 4 ? `term ${f("newTerm", d)}` : old;
    }
    if (n === 5 && split(d)) return `${old}, cut off`;
    return num(d, "phase") >= 2 ? `term ${f("newTerm", d)}` : old;
  };

  const dotOf = (n: number, d: Outputs): string => {
    const phase = num(d, "phase");
    const s1 = num(d, "n1State");
    if (n === 1) return s1 === 1 || s1 === 2 || s1 === 3 ? "v-down" : "v-yes";
    if (n === 5 && split(d)) return "v-down";
    if (phase === 0) return "v-yes";
    if (phase === 1) return "v-no";
    if (n === 2) return phase === 2 ? "v-cand" : "v-yes";
    if (phase >= 3) return "v-yes";
    const voters = split(d) ? [3, 4] : [3, 4, 5];
    return voters.indexOf(n) < num(d, "votes") - 1 ? "v-yes" : "v-no";
  };

  const tallyOf = (d: Outputs): string => {
    const phase = num(d, "phase");
    const mode = num(d, "mode");
    const wait = f("electionTimeoutMs", d);
    if (phase === 1) {
      if (mode === 2) return `split from n1: n2, n3 and n4 wait ${wait} for a heartbeat`;
      return `n1 is ${mode === 3 ? "frozen" : "silent"}: followers wait ${wait} for a heartbeat`;
    }
    if (phase === 2) return `n2 asks for votes in term ${f("newTerm", d)}: ${f("votes", d)} of ${f("majority", d)} needed`;
    if (phase === 3) return mode === 2 ? `n2 leads term ${f("newTerm", d)} with ${f("votes", d)} votes; n1 reaches only ${f("minoritySize", d)}` : `n2 leads term ${f("newTerm", d)} with ${f("votes", d)} votes`;
    if (phase === 4) return `n1 woke, wrote with token ${f("oldTerm", d)}, was refused and stepped down`;
    if (num(d, "n1State") === 3) return `n1 is frozen for ${f("pauseSec", d)}, less than the ${wait} timeout`;
    return `n1 leads term ${f("oldTerm", d)} · a write needs ${f("majority", d)} of ${f("nodes", d)}`;
  };

  return {
    router: leader({
      leaders: () => leadersNow(live()),
      candidate: () => num(live(), "candidate"),
      up: (n) => n !== 1 || n1Up(live()),
      reach: (a, b) => !split(live()) || side(a) === side(b),
      writer: () => {
        const d = live();
        if (num(d, "mode") !== 3) return 0;
        const l = num(d, "leader");
        return l === 2 || (l === 1 && n1Up(d)) ? l : 0;
      },
      stale: () => num(live(), "staleRejected") === 1,
    }),
    fx,
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
      // Above the n1 → storage wire, where there's open space near both.
      if (e.kind === "miss" && e.node === "storage") fx.float(490, 52, `token ${f("oldTerm", live())} is old: rejected`, "red");
      if (e.kind === "fill" && e.node === "n1") fx.float(e.at[0], e.at[1] - 50, "steps down", "amber");
      if (e.kind === "hit" && rand() < 0.35) fx.float(e.at[0], e.at[1] - 40, "vote", "violet");
    },

    wireStyles(): WireStyle[] {
      const d = live();
      const out: WireStyle[] = [];
      const leaders = leadersNow(d);
      const cand = num(d, "candidate");
      for (let a = 1; a <= 5; a++) {
        for (let b = a + 1; b <= 5; b++) {
          const wire = `n${a}_n${b}`;
          if (split(d) && side(a) !== side(b)) out.push({ wire, color: "red", alpha: 0.5, width: 1.6, dash: [4, 6] });
          else if (a === 1 && !n1Up(d)) out.push({ wire, color: "blue", alpha: 0.08, width: 1.2 });
          else if (leaders.includes(a) || leaders.includes(b)) out.push({ wire, color: "green", alpha: 0.4, width: 2 });
          else if (cand === a || cand === b) out.push({ wire, color: "amber", alpha: 0.45, width: 2 });
          else out.push({ wire, color: "blue", alpha: 0.18, width: 1.4 });
        }
      }
      if (num(d, "mode") === 3) {
        out.push({ wire: "n1_st", color: "blue", alpha: n1Up(d) ? 0.4 : 0.15, width: 2 });
        if (num(d, "leader") === 2) out.push({ wire: "n2_st", color: "blue", alpha: 0.4, width: 2 });
      }
      return out;
    },

    tiles(d, ctx): Tile[] {
      ctxRef = ctx;
      const mode = num(d, "mode");
      const l = live();
      const phase = num(l, "phase");
      const who = num(l, "leader");
      const leaderName = who ? `n${who}` : "none";
      if (mode === 1) {
        return [
          { id: "a", label: "Leader", icon: "target", hue: "green", value: leaderName, note: phase === 1 ? "n1 is down" : phase === 2 ? "n2 is asking for votes" : `term ${f("term", l)}`, mood: who ? "good" : "bad" },
          { id: "b", label: "Writes wait", icon: "hourglass", hue: "amber", value: f("failoverMs", d), note: `${f("waitingWrites", d)} writes at ${f("writeRate", d)} a second`, mood: "" },
          { id: "c", label: "Needless elections", icon: "activity", hue: "violet", value: `${f("falseElections", d)} a day`, note: "from blips longer than the timeout", mood: "" },
        ];
      }
      if (mode === 2) {
        return [
          { id: "a", label: "Leader", icon: "target", hue: "green", value: who === 2 ? `n2 · term ${f("newTerm", l)}` : "electing", note: "on the majority side", mood: who === 2 ? "good" : "" },
          { id: "b", label: "n2's side", icon: "check", hue: "cyan", value: `${f("majoritySize", d)} of ${f("nodes", d)}`, note: `commits ${f("majorityCommitPct", l)} of writes`, mood: who === 2 ? "good" : "" },
          { id: "c", label: "n1's side", icon: "users", hue: "amber", value: `${f("minoritySize", d)} of ${f("nodes", d)}`, note: `commits ${f("minorityCommitPct", d)}: short of ${f("majority", d)}`, mood: "bad" },
        ];
      }
      if (mode === 3) {
        const s1 = num(l, "n1State");
        return [
          { id: "a", label: "Leader", icon: "target", hue: "green", value: leaderName, note: who ? `term ${f(who === 2 ? "newTerm" : "oldTerm", l)}` : "n1 is frozen", mood: who ? "good" : "bad" },
          { id: "b", label: "Storage's highest token", icon: "stack", hue: "cyan", value: f("storageToken", l), note: "it refuses anything lower", mood: "" },
          { id: "c", label: "n1's late write", icon: "alert", hue: "violet", value: num(l, "staleRejected") ? "rejected" : s1 === 3 ? "n1 frozen" : "none yet", note: num(l, "staleRejected") ? `token ${f("oldTerm", l)} < ${f("newTerm", l)}` : "", mood: num(l, "staleRejected") ? "good" : "" },
        ];
      }
      return [
        { id: "a", label: "Leader", icon: "target", hue: "green", value: leaderName, note: `term ${f("oldTerm", d)}`, mood: "" },
        { id: "b", label: "A write needs", icon: "check", hue: "cyan", value: `${f("majority", d)} of ${f("nodes", d)}`, note: `can lose ${f("canLose", d)} servers`, mood: "" },
        { id: "c", label: "Heartbeats", icon: "activity", hue: "violet", value: `${f("heartbeatRate", d)}/s`, note: `one every ${f("heartbeatMs", d)} to each follower`, mood: "" },
      ];
    },

    nodeBody(id: string, n: SceneNode): string {
      if (/^n[1-5]$/.test(id)) return `${nodeHead(n)}<div class="tx-srow"><span data-term></span><div class="tx-meter tx-timer" data-timerbox hidden><i data-timer></i></div></div>`;
      if (id === "tally") return `${nodeHead(n)}<div class="tx-chipsrow tx-votes">${SERVERS.map((s) => `<span><i data-v="${s}"></i>n${s}</span>`).join("")}</div><p class="tx-calc-s" data-tally></p>`;
      if (id === "storage") return `${nodeHead(n)}<p class="tx-calc-s" data-token></p><ul class="tx-log" data-slog></ul>`;
      return nodeHead(n);
    },

    mount(world: HTMLElement) {
      for (const s of SERVERS) {
        const el = world.querySelector<HTMLElement>(`[data-node="n${s}"]`);
        if (!el) continue;
        els.nodes[s] = el;
        const timer = el.querySelector<HTMLElement>("[data-timer]");
        const box = el.querySelector<HTMLElement>("[data-timerbox]");
        if (timer) els.timers[s] = timer;
        if (box) els.timerBoxes[s] = box;
      }
      els.dots = [...world.querySelectorAll<HTMLElement>("[data-v]")];
      els.tally = world.querySelector("[data-tally]");
      els.token = world.querySelector("[data-token]");
      els.slog = world.querySelector("[data-slog]");
      const { w, h } = o.scene.world;
      world.insertAdjacentHTML("afterbegin", `<svg class="tx-cutline" data-cut hidden width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><polyline points="${CUT_LINE}"/><text x="40" y="268">network split</text></svg>`);
      els.cut = world.querySelector<SVGElement>("[data-cut]");
      els.chartbox = world.closest(".tx-stage")?.querySelector<HTMLElement>(".tx-chartbox") ?? null;
    },

    paintWidgets(_d: Outputs, ctx: StepContext) {
      ctxRef = ctx;
      const d = live();
      const mode = num(d, "mode");
      const phase = num(d, "phase");
      const s1 = num(d, "n1State");
      if (els.chartbox) els.chartbox.hidden = mode === 0;
      for (const s of SERVERS) {
        const el = els.nodes[s];
        if (!el) continue;
        text(el.querySelector(".tx-sub"), subOf(s, d));
        text(el.querySelector("[data-term]"), termOf(s, d));
        el.classList.toggle("tx-lead", (s === 1 && num(d, "leader") === 1 && s1 === 0) || (s === 2 && num(d, "leader") === 2));
        el.classList.toggle("tx-cand", s === 2 && num(d, "candidate") === 2);
        el.classList.toggle("tx-down", s === 1 && s1 === 1);
        el.classList.toggle("tx-ghost", s === 1 && s1 === 2);
        el.classList.toggle("tx-stale", s === 1 && s1 === 3);
        const box = els.timerBoxes[s];
        const timer = els.timers[s];
        if (box && timer) {
          const waiting = s !== 1 && phase === 1 && (!split(d) || side(s) === 1);
          box.hidden = !waiting;
          // n2 drew the shortest random timeout; the others' timers are a little behind.
          const share = (d.timerPct ?? 0) / (1 + 0.15 * (s - 2));
          timer.style.width = `${Math.round(100 * Math.min(1, share))}%`;
        }
      }
      els.dots.forEach((el, i) => {
        const c = dotOf(i + 1, d);
        if (el.className !== c) el.className = c;
      });
      text(els.tally, tallyOf(d));
      text(els.token, `highest token seen: ${f("storageToken", d)}`);
      if (els.slog) {
        const lines = [`${f("oldTerm", d)} · n1 · accepted`];
        if (num(d, "storageToken") === num(d, "newTerm")) lines.push(`${f("newTerm", d)} · n2 · accepted`);
        if (num(d, "staleRejected") === 1) lines.push(`${f("oldTerm", d)} · n1, late · rejected`);
        const html = lines.map((l) => `<li>${l}</li>`).join("");
        if (els.slog.innerHTML !== html) els.slog.innerHTML = html;
      }
      if (els.cut) {
        if (split(d)) els.cut.removeAttribute("hidden");
        else els.cut.setAttribute("hidden", "");
      }
    },

    chartSample(): number {
      return live().acceptedRate ?? 0;
    },
  };
}
