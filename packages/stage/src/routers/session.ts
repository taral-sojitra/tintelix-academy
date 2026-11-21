import type { Point } from "../geometry";
import type { Hue, Router } from "../sim";

export type SessionMode = "memory" | "sticky" | "shared";
/** Requests are coloured by which group of users sent them. */
export const GROUP_HUES: Hue[] = ["cyan", "amber", "violet"];

export interface SessionRouterState {
  mode(): SessionMode;
  /** The server holding group g's sessions (s0, s1, …). */
  home(g: number): string;
  /** True while group g's sessions are gone and its users are being sent to log in. */
  bounced(g: number): boolean;
  groups: number;
}

/**
 * Users → balancer (u_lb) → a server (lb_sK) → back. Memory: round robin, and only the home server
 * has the session. Sticky: always the home server. Shared: round robin, and the server reads the
 * session from the store (sK_st) first.
 */
export function session(state: SessionRouterState): Router {
  let next = 0;
  const group = new Map<number, number>();
  const fail = (p: { kind: string }) => (p.kind = "miss");
  return {
    spawn(p, sim) {
      const g = Math.floor(sim.rand() * state.groups) % state.groups;
      group.set(p.id, g);
      p.route.push({ wire: "u_lb", dir: 1, color: GROUP_HUES[g % GROUP_HUES.length]!, end: "lb" });
    },
    arrive(p, leg, sim) {
      const at: Point = [p.x, p.y];
      const end = leg.end ?? "";
      const g = group.get(p.id) ?? 0;
      const hue = GROUP_HUES[g % GROUP_HUES.length]!;
      const mode = state.mode();
      const reply = (s: string, ok: boolean) => {
        if (!ok) fail(p);
        sim.emit({ kind: ok ? "pass" : "miss", node: s, at });
        const color = ok ? "green" : "red";
        p.route.push({ wire: `lb_${s}`, dir: -1, color, end: "back" });
        p.route.push({ wire: "u_lb", dir: -1, color, end: "user" });
      };
      if (end === "lb") {
        sim.emit({ kind: "pass", node: "lb", at });
        const s = mode === "sticky" ? state.home(g) : `s${next++ % state.groups}`;
        p.route.push({ wire: `lb_${s}`, dir: 1, color: hue, end: s });
      } else if (end === "user") {
        sim.emit({ kind: "reply", node: "users", at, hit: p.kind !== "miss" });
        group.delete(p.id);
        p.dead = true;
      } else if (end.startsWith("st:")) {
        const s = end.slice(3);
        sim.emit({ kind: "hit", node: "store", at });
        p.route.push({ wire: `${s}_st`, dir: -1, color: "green", end: `got:${s}` });
      } else if (end.startsWith("got:")) {
        reply(end.slice(4), true);
      } else if (end !== "back") {
        if (mode === "shared") p.route.push({ wire: `${end}_st`, dir: 1, color: hue, end: `st:${end}` });
        else if (mode === "sticky") reply(end, !state.bounced(g));
        else reply(end, end === state.home(g));
      }
    },
  };
}
