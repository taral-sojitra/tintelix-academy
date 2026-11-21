import type { Point } from "../geometry";
import type { Router } from "../sim";

export interface UploadRouterState {
  /** True when the phone gets a signed URL and uploads straight to storage. */
  direct(): boolean;
}

/**
 * Through the app: phone → app (p_a) → storage (a_s) and back. Direct: phone → app for a signed URL
 * and back, then phone → storage (p_s) and back.
 */
export function upload(state: UploadRouterState): Router {
  const direct = new Set<number>();
  return {
    spawn(p) {
      const d = state.direct();
      if (d) direct.add(p.id);
      p.small = d;
      p.route.push({ wire: "p_a", dir: 1, color: d ? "cyan" : "amber", end: "app" });
    },
    arrive(p, leg, sim) {
      const at: Point = [p.x, p.y];
      const d = direct.has(p.id);
      switch (leg.end) {
        case "app":
          sim.emit({ kind: "pass", node: "app", at });
          if (d) p.route.push({ wire: "p_a", dir: -1, color: "violet", end: "url" });
          else p.route.push({ wire: "a_s", dir: 1, color: "amber", end: "store" });
          break;
        case "url":
          p.small = false;
          p.route.push({ wire: "p_s", dir: 1, color: "amber", end: "store" });
          break;
        case "store":
          sim.emit({ kind: "fill", node: "store", at });
          if (d) p.route.push({ wire: "p_s", dir: -1, color: "green", end: "done" });
          else p.route.push({ wire: "a_s", dir: -1, color: "green", end: "via" }, { wire: "p_a", dir: -1, color: "green", end: "done" });
          break;
        case "done":
          sim.emit({ kind: "reply", node: "phones", at, hit: true });
          direct.delete(p.id);
          p.dead = true;
          break;
      }
    },
  };
}
