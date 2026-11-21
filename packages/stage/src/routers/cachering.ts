import type { Point } from "../geometry";
import type { Router } from "../sim";

export interface CacheRingState {
  /** Share of reads whose key just moved, so the new owner doesn't have it yet, 0..1. */
  missShare(): number;
}

/** App → cache (a_c) → back on a hit; on a miss, cache → database (c_d) → back. */
export function cacheRing(state: CacheRingState): Router {
  return {
    spawn(p) {
      p.route.push({ wire: "a_c", dir: 1, color: "cyan", end: "cache" });
    },
    arrive(p, leg, sim) {
      const at: Point = [p.x, p.y];
      switch (leg.end) {
        case "cache":
          if (sim.rand() < state.missShare()) {
            sim.emit({ kind: "miss", node: "cache", at });
            p.route.push({ wire: "c_d", dir: 1, color: "amber", end: "db" });
          } else {
            sim.emit({ kind: "hit", node: "cache", at });
            p.route.push({ wire: "a_c", dir: -1, color: "green", end: "app" });
          }
          break;
        case "db":
          sim.emit({ kind: "pass", node: "db", at });
          p.route.push({ wire: "c_d", dir: -1, color: "amber", end: "via" }, { wire: "a_c", dir: -1, color: "amber", end: "app" });
          break;
        case "app":
          sim.emit({ kind: "reply", node: "app", at, hit: true });
          p.dead = true;
          break;
      }
    },
  };
}
