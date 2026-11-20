import type { Point } from "../geometry";
import type { Router } from "../sim";

/**
 * A CDN in front of a far-away origin. With no edge, every request crosses the ocean to the origin
 * and back (u_origin). With an edge, a hit is answered in the city (u_edge); a miss continues to the
 * origin (edge_origin), comes back, leaves a copy at the edge, and returns to the user.
 * Wire names: u_origin, u_edge, edge_origin.
 */
export function cdn(state: { hasEdge: () => boolean; hitRate: () => number }): Router {
  return {
    spawn(p) {
      if (state.hasEdge()) p.route.push({ wire: "u_edge", dir: 1, color: "cyan", end: "edge" });
      else p.route.push({ wire: "u_origin", dir: 1, color: "cyan", end: "origin" });
    },

    arrive(p, leg, sim) {
      const at: Point = [p.x, p.y];
      switch (leg.end) {
        case "origin":
          sim.emit({ kind: "pass", node: "origin", at });
          p.wait = 0.05;
          p.route.push({ wire: "u_origin", dir: -1, color: "amber", end: "user" });
          break;
        case "edge":
          if (sim.rand() < state.hitRate()) {
            p.kind = "hit";
            sim.emit({ kind: "hit", node: "edge", at });
            p.route.push({ wire: "u_edge", dir: -1, color: "green", end: "user" });
          } else {
            p.kind = "miss";
            sim.emit({ kind: "miss", node: "edge", at });
            p.route.push({ wire: "edge_origin", dir: 1, color: "cyan", end: "originFromEdge" });
          }
          break;
        case "originFromEdge":
          sim.emit({ kind: "pass", node: "origin", at });
          p.wait = 0.05;
          p.route.push({ wire: "edge_origin", dir: -1, color: "amber", end: "edgeBack" });
          break;
        case "edgeBack":
          sim.emit({ kind: "fill", node: "edge", at });
          p.route.push({ wire: "u_edge", dir: -1, color: "amber", end: "user" });
          break;
        case "user":
          sim.emit({ kind: "reply", node: "users", at, hit: p.kind === "hit" });
          p.dead = true;
          break;
      }
    },
  };
}
