import type { Point } from "../geometry";
import type { Router, Sim } from "../sim";

/** A server turns requests away once this many are waiting in its line. */
export const MAX_LINE = 16;

export interface BalanceRouterState {
  /** The server (s0, s1, …) the balancer sends this request to. */
  pick(sim: Sim, heavy: boolean): string;
  /** Share of requests that are heavy reports, 0..1. */
  heavyShare(): number;
  /** Seconds of work on stage for a heavy or a light request. */
  workSec(heavy: boolean): number;
  /** Simulated time now, in seconds. */
  now(): number;
  /** Real milliseconds for `sec` seconds on stage. */
  ms(sec: number): number;
}

/** Users → balancer → one server's line → back. Wires: u_lb, lb_sK; one queue per server, sK. */
export function balance(state: BalanceRouterState): Router {
  const heavy = new Set<number>();
  const arrived = new Map<number, number>();
  const server = new Map<number, string>();
  return {
    spawn(p, sim) {
      const isHeavy = sim.rand() < state.heavyShare();
      if (isHeavy) heavy.add(p.id);
      p.work = state.workSec(isHeavy);
      p.small = !isHeavy;
      p.route.push({ wire: "u_lb", dir: 1, color: isHeavy ? "amber" : "cyan", end: "lb" });
    },
    arrive(p, leg, sim) {
      const at: Point = [p.x, p.y];
      const end = leg.end ?? "";
      if (end === "lb") {
        const s = state.pick(sim, heavy.has(p.id));
        server.set(p.id, s);
        sim.emit({ kind: "pass", node: "lb", at });
        p.route.push({ wire: `lb_${s}`, dir: 1, color: heavy.has(p.id) ? "amber" : "cyan", end: s });
      } else if (end.startsWith("s")) {
        const q = sim.queues[end];
        if (!q || q.waiting >= MAX_LINE) {
          p.kind = "miss";
          sim.emit({ kind: "miss", node: end, at });
          p.route.push({ wire: `lb_${end}`, dir: -1, color: "red", end: "back" });
          p.route.push({ wire: "u_lb", dir: -1, color: "red", end: "user" });
          return;
        }
        arrived.set(p.id, state.now());
        p.hidden = true;
        q.push(p);
      } else if (end === "user") {
        sim.emit({ kind: "reply", node: "users", at, hit: p.kind !== "miss" });
        heavy.delete(p.id);
        server.delete(p.id);
        p.dead = true;
      }
    },
    served(p, _q, sim) {
      const s = server.get(p.id) ?? "s0";
      p.ms = state.ms(state.now() - (arrived.get(p.id) ?? state.now()));
      arrived.delete(p.id);
      sim.emit({ kind: "work", node: s, at: [p.x, p.y], ms: p.ms });
      const color = heavy.has(p.id) ? "amber" : "green";
      p.route.push({ wire: `lb_${s}`, dir: -1, color, end: "back" });
      p.route.push({ wire: "u_lb", dir: -1, color, end: "user" });
    },
  };
}
