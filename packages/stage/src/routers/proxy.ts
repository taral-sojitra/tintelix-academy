import type { Point } from "../geometry";
import type { Router } from "../sim";

export interface ProxyRouterState {
  /** Forward proxy (an office going out) or reverse proxy (the internet coming in). */
  mode(): "forward" | "reverse";
  /** Share of office downloads the forward proxy already has, 0..1. */
  hitShare(): number;
  /** Share of incoming clients on slow phones, 0..1. */
  slowShare(): number;
}

/**
 * Forward: office → proxy (o_fp) → back if cached, else → site (fp_net) and back.
 * Reverse: laptops (f_rp) or phones (p_rp) → reverse proxy → backend (rp_be) → back the same way.
 */
export function proxy(state: ProxyRouterState): Router {
  const phone = new Set<number>();
  return {
    spawn(p, sim) {
      if (state.mode() === "forward") {
        p.route.push({ wire: "o_fp", dir: 1, color: "cyan", end: "fproxy" });
        return;
      }
      const slow = sim.rand() < state.slowShare();
      if (slow) phone.add(p.id);
      p.route.push({ wire: slow ? "p_rp" : "f_rp", dir: 1, color: "cyan", end: "rproxy" });
    },
    arrive(p, leg, sim) {
      const at: Point = [p.x, p.y];
      switch (leg.end) {
        case "fproxy":
          if (sim.rand() < state.hitShare()) {
            sim.emit({ kind: "hit", node: "fproxy", at });
            p.route.push({ wire: "o_fp", dir: -1, color: "green", end: "done" });
          } else {
            sim.emit({ kind: "miss", node: "fproxy", at });
            p.route.push({ wire: "fp_net", dir: 1, color: "amber", end: "net" });
          }
          break;
        case "net":
          sim.emit({ kind: "pass", node: "net", at });
          p.route.push({ wire: "fp_net", dir: -1, color: "amber", end: "fill" });
          break;
        case "fill":
          sim.emit({ kind: "fill", node: "fproxy", at });
          p.route.push({ wire: "o_fp", dir: -1, color: "amber", end: "done" });
          break;
        case "rproxy":
          sim.emit({ kind: "pass", node: "rproxy", at });
          p.route.push({ wire: "rp_be", dir: 1, color: "cyan", end: "backend" });
          break;
        case "backend":
          sim.emit({ kind: "pass", node: "backend", at });
          p.route.push({ wire: "rp_be", dir: -1, color: "green", end: "relay" });
          break;
        case "relay": {
          const slow = phone.has(p.id);
          sim.emit({ kind: "pass", node: "rproxy", at });
          p.route.push({ wire: slow ? "p_rp" : "f_rp", dir: -1, color: slow ? "amber" : "green", end: "done" });
          break;
        }
        case "done":
          sim.emit({ kind: "reply", node: "users", at, hit: true });
          phone.delete(p.id);
          p.dead = true;
          break;
      }
    },
  };
}
