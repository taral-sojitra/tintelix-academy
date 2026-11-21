import type { Point } from "../geometry";
import type { Router } from "../sim";

export interface IndexLookupState {
  /** True once there is an index to go through. */
  viaTree(): boolean;
}

/** App → table (a_t) and back, or app → index (a_x) → table (x_t) and back the same way. */
export function indexLookup(state: IndexLookupState): Router {
  return {
    spawn(p) {
      p.route.push(state.viaTree() ? { wire: "a_x", dir: 1, color: "cyan", end: "tree" } : { wire: "a_t", dir: 1, color: "cyan", end: "scan" });
    },
    arrive(p, leg, sim) {
      const at: Point = [p.x, p.y];
      switch (leg.end) {
        case "scan":
          sim.emit({ kind: "pass", node: "table", at });
          p.route.push({ wire: "a_t", dir: -1, color: "green", end: "app" });
          break;
        case "tree":
          sim.emit({ kind: "hit", node: "tree", at });
          p.route.push({ wire: "x_t", dir: 1, color: "cyan", end: "row" });
          break;
        case "row":
          sim.emit({ kind: "pass", node: "table", at });
          p.route.push({ wire: "x_t", dir: -1, color: "green", end: "via" }, { wire: "a_x", dir: -1, color: "green", end: "app" });
          break;
        case "app":
          sim.emit({ kind: "reply", node: "app", at, hit: true });
          p.dead = true;
          break;
      }
    },
  };
}
