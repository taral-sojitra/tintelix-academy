import type { Point } from "../geometry";
import type { Router } from "../sim";

export interface ScaleRouterState {
  /** Many servers behind a load balancer, instead of one big server. */
  horizontal(): boolean;
  /** Share of requests the servers can take, 0..1; the rest are dropped. */
  served(): number;
}

/** Users → one big server (u_big), or users → load balancer → fleet (u_lb, lb_fleet), and back. */
export function scale(state: ScaleRouterState): Router {
  return {
    spawn(p) {
      if (state.horizontal()) p.route.push({ wire: "u_lb", dir: 1, color: "cyan", end: "lb" });
      else p.route.push({ wire: "u_big", dir: 1, color: "cyan", end: "big" });
    },
    arrive(p, leg, sim) {
      const at: Point = [p.x, p.y];
      switch (leg.end) {
        case "lb":
          sim.emit({ kind: "pass", node: "lb", at });
          p.route.push({ wire: "lb_fleet", dir: 1, color: "cyan", end: "fleet" });
          break;
        case "big":
        case "fleet": {
          const ok = sim.rand() < state.served();
          p.kind = ok ? "hit" : "miss";
          sim.emit({ kind: ok ? "pass" : "miss", node: leg.end, at });
          const color = ok ? "green" : "red";
          if (leg.end === "big") p.route.push({ wire: "u_big", dir: -1, color, end: "user" });
          else {
            p.route.push({ wire: "lb_fleet", dir: -1, color, end: "back" });
            p.route.push({ wire: "u_lb", dir: -1, color, end: "user" });
          }
          break;
        }
        case "user":
          sim.emit({ kind: "reply", node: "users", at, hit: p.kind === "hit" });
          p.dead = true;
          break;
      }
    },
  };
}
