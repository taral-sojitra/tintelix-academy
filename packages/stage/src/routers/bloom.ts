import type { Point } from "../geometry";
import type { Router } from "../sim";

export interface BloomRouterState {
  filterOn(): boolean;
  /** Share of lookups for keys that aren't stored, 0..1. */
  absentShare(): number;
  /** Share of those the filter wrongly lets through ("maybe"), 0..1. */
  fpShare(): number;
}

/**
 * No filter: app → database (a_d) and back. With one: app → filter (a_f); a missing key is turned
 * away there ("definitely not"), unless it is a false positive; everything else goes on to the
 * database (f_d), where a false positive finds nothing.
 */
export function bloom(state: BloomRouterState): Router {
  const kind = new Map<number, "present" | "absent" | "fp">();
  return {
    spawn(p, sim) {
      const absent = sim.rand() < state.absentShare();
      const k = !absent ? "present" : sim.rand() < state.fpShare() ? "fp" : "absent";
      kind.set(p.id, k);
      p.route.push(state.filterOn() ? { wire: "a_f", dir: 1, color: "cyan", end: "filter" } : { wire: "a_d", dir: 1, color: "cyan", end: "db" });
    },
    arrive(p, leg, sim) {
      const at: Point = [p.x, p.y];
      const k = kind.get(p.id) ?? "present";
      const via = leg.wire === "f_d";
      switch (leg.end) {
        case "filter":
          if (k === "absent") {
            sim.emit({ kind: "miss", node: "filter", at });
            p.route.push({ wire: "a_f", dir: -1, color: "red", end: "app" });
          } else {
            sim.emit({ kind: "pass", node: "filter", at });
            p.route.push({ wire: "f_d", dir: 1, color: "cyan", end: "db" });
          }
          break;
        case "db": {
          const found = k === "present";
          sim.emit({ kind: found ? "hit" : "fill", node: "db", at });
          const color = found ? "green" : "amber";
          if (via) p.route.push({ wire: "f_d", dir: -1, color, end: "back" }, { wire: "a_f", dir: -1, color, end: "app" });
          else p.route.push({ wire: "a_d", dir: -1, color, end: "app" });
          break;
        }
        case "app":
          sim.emit({ kind: "reply", node: "app", at, hit: true });
          kind.delete(p.id);
          p.dead = true;
          break;
      }
    },
  };
}
