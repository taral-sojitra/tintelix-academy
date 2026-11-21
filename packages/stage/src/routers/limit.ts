import type { Point } from "../geometry";
import type { Router } from "../sim";

export interface LimitRouterState {
  /** Share of requests on stage that come from the flooding client, 0..1. */
  flooderShare(): number;
  /** Share of the flooder's requests the limiter refuses with 429, 0..1. */
  refuseShare(): number;
  /** Share of requests reaching the API that it can't serve, 0..1. */
  overloadShare(): number;
}

/**
 * Normal users (n_l) or the flooding client (f_l) → limiter → API (l_a) and back. The limiter
 * refuses some of the flooder's requests with 429 (amber); an overloaded API drops some (red).
 */
export function limit(state: LimitRouterState): Router {
  const from = new Map<number, string>();
  return {
    spawn(p, sim) {
      const flood = sim.rand() < state.flooderShare();
      from.set(p.id, flood ? "f_l" : "n_l");
      p.route.push({ wire: flood ? "f_l" : "n_l", dir: 1, color: flood ? "violet" : "cyan", end: "limiter" });
    },
    arrive(p, leg, sim) {
      const at: Point = [p.x, p.y];
      const wire = from.get(p.id) ?? "n_l";
      switch (leg.end) {
        case "limiter":
          if (wire === "f_l" && sim.rand() < state.refuseShare()) {
            sim.emit({ kind: "fill", node: "limiter", at });
            p.route.push({ wire, dir: -1, color: "amber", end: "client" });
          } else {
            sim.emit({ kind: "pass", node: "limiter", at });
            p.route.push({ wire: "l_a", dir: 1, color: wire === "f_l" ? "violet" : "cyan", end: "api" });
          }
          break;
        case "api": {
          const ok = sim.rand() >= state.overloadShare();
          if (!ok) p.kind = "miss";
          sim.emit({ kind: ok ? "pass" : "miss", node: "api", at });
          const color = ok ? "green" : "red";
          p.route.push({ wire: "l_a", dir: -1, color, end: "via" }, { wire, dir: -1, color, end: "client" });
          break;
        }
        case "client":
          sim.emit({ kind: "reply", node: wire === "f_l" ? "flooder" : "users", at, hit: p.kind !== "miss" });
          from.delete(p.id);
          p.dead = true;
          break;
      }
    },
  };
}
