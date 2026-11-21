import type { Point } from "../geometry";
import type { Router } from "../sim";

export type CapMode = "healthy" | "cp" | "ap";

export interface CapRouterState {
  mode(): CapMode;
  /** Share of users who reach site B, 0..1. */
  sideBShare(): number;
}

/**
 * Users near site A → copy 1 or 2 (ua_n1, ua_n2), always answered. Users near site B → copy 3
 * (ub_n3): answered when healthy, refused when the split is handled CP, answered from a copy that may
 * be stale when it is handled AP.
 */
export function cap(state: CapRouterState): Router {
  let next = 0;
  const wireOf = new Map<number, string>();
  return {
    spawn(p, sim) {
      const b = sim.rand() < state.sideBShare();
      const wire = b ? "ub_n3" : next++ % 2 === 0 ? "ua_n1" : "ua_n2";
      wireOf.set(p.id, wire);
      p.route.push({ wire, dir: 1, color: "cyan", end: wire.slice(3) });
    },
    arrive(p, leg, sim) {
      const at: Point = [p.x, p.y];
      const end = leg.end ?? "";
      if (end === "user") {
        sim.emit({ kind: "reply", node: "users", at, hit: p.kind !== "miss" });
        wireOf.delete(p.id);
        p.dead = true;
        return;
      }
      const mode = state.mode();
      const wire = wireOf.get(p.id) ?? leg.wire;
      if (end === "n3" && mode === "cp") {
        p.kind = "miss";
        sim.emit({ kind: "miss", node: end, at });
        p.route.push({ wire, dir: -1, color: "red", end: "user" });
      } else if (end === "n3" && mode === "ap") {
        sim.emit({ kind: "fill", node: end, at });
        p.route.push({ wire, dir: -1, color: "amber", end: "user" });
      } else {
        sim.emit({ kind: "pass", node: end, at });
        p.route.push({ wire, dir: -1, color: "green", end: "user" });
      }
    },
  };
}
