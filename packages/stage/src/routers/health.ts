import type { Point } from "../geometry";
import type { Router } from "../sim";

export interface HealthRouterState {
  /** Servers the balancer still sends traffic to, in order. */
  rotation(): readonly string[];
  /** The server that is dead or stalled, or null. Its requests fail. */
  faulty(): string | null;
  /** Share of requests a healthy but overloaded server fails to answer in time, 0..1. */
  overloadFail(): number;
}

/** Users → balancer (u_lb) → the next server in rotation (lb_sK) → back. Nobody in rotation: fails at the balancer. */
export function health(state: HealthRouterState): Router {
  let next = 0;
  return {
    spawn(p) {
      p.route.push({ wire: "u_lb", dir: 1, color: "cyan", end: "lb" });
    },
    arrive(p, leg, sim) {
      const at: Point = [p.x, p.y];
      const end = leg.end ?? "";
      if (end === "lb") {
        const rot = state.rotation();
        if (rot.length === 0) {
          p.kind = "miss";
          sim.emit({ kind: "miss", node: "lb", at });
          p.route.push({ wire: "u_lb", dir: -1, color: "red", end: "user" });
          return;
        }
        const s = rot[next++ % rot.length]!;
        sim.emit({ kind: "pass", node: "lb", at });
        p.route.push({ wire: `lb_${s}`, dir: 1, color: "cyan", end: s });
      } else if (end === "user") {
        sim.emit({ kind: "reply", node: "users", at, hit: p.kind !== "miss" });
        p.dead = true;
      } else if (end !== "back") {
        const failed = end === state.faulty() || sim.rand() < state.overloadFail();
        if (failed) {
          p.kind = "miss";
          sim.emit({ kind: "miss", node: end, at });
        } else sim.emit({ kind: "pass", node: end, at });
        const color = failed ? "red" : "green";
        p.route.push({ wire: `lb_${end}`, dir: -1, color, end: "back" });
        p.route.push({ wire: "u_lb", dir: -1, color, end: "user" });
      }
    },
  };
}
