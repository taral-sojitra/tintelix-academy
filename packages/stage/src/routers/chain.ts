import type { Point } from "../geometry";
import type { Packet, Router } from "../sim";

/** Services drawn in a row; the path uses the first `services()` of them. */
export const CHAIN_MAX = 6;

export interface ChainRouterState {
  /** How many services the path crosses. */
  services(): number;
  /** The copy of service `tier` that takes this request, or −1 when every copy is down. */
  pick(tier: number): number;
}

/**
 * A request crosses services t0, t1, … in a row (wire wK leads into tK). It stops at the first
 * service with no copy up and comes back as a failure; otherwise it comes back from the last one.
 */
export function chain(state: ChainRouterState): Router {
  const back = (p: Packet, from: number, ok: boolean) => {
    for (let i = from; i >= 0; i--) p.route.push({ wire: `w${i}`, dir: -1, color: ok ? "green" : "red", end: i === 0 ? (ok ? "ok" : "fail") : "back" });
  };
  return {
    spawn(p) {
      p.route.push({ wire: "w0", dir: 1, color: "cyan", end: "t0" });
    },
    arrive(p, leg, sim) {
      const at: Point = [p.x, p.y];
      if (leg.end === "ok" || leg.end === "fail") {
        sim.emit({ kind: "reply", node: "users", at, hit: leg.end === "ok" });
        p.dead = true;
        return;
      }
      const node = leg.end ?? "";
      if (node === "back" || !node.startsWith("t")) return;
      const tier = Number(node.slice(1));
      const last = Math.min(CHAIN_MAX, Math.max(1, state.services())) - 1;
      if (state.pick(tier) < 0) {
        sim.emit({ kind: "miss", node, at });
        back(p, tier, false);
      } else if (tier >= last) {
        sim.emit({ kind: "pass", node, at });
        back(p, tier, true);
      } else {
        sim.emit({ kind: "pass", node, at });
        p.route.push({ wire: `w${tier + 1}`, dir: 1, color: "cyan", end: `t${tier + 1}` });
      }
    },
  };
}
