import type { Point } from "../geometry";
import type { Router } from "../sim";

export interface ShardRouterState {
  /** Relative write load on each shard (s0, s1, …); a write picks a shard in proportion. */
  weights(): readonly number[];
  /** Share of writes shard k can't take in time, 0..1. */
  failShare(k: number): number;
}

/** App → router (a_r) → the chosen shard (r_sK) → back. */
export function shard(state: ShardRouterState): Router {
  const target = new Map<number, number>();
  return {
    spawn(p) {
      p.route.push({ wire: "a_r", dir: 1, color: "cyan", end: "router" });
    },
    arrive(p, leg, sim) {
      const at: Point = [p.x, p.y];
      const end = leg.end ?? "";
      if (end === "router") {
        const w = state.weights();
        const total = w.reduce((s, x) => s + x, 0);
        let r = sim.rand() * total;
        let k = 0;
        while (k < w.length - 1 && r >= (w[k] ?? 0)) r -= w[k++] ?? 0;
        target.set(p.id, k);
        sim.emit({ kind: "pass", node: "router", at });
        p.route.push({ wire: `r_s${k}`, dir: 1, color: "cyan", end: `s${k}` });
      } else if (end === "app") {
        sim.emit({ kind: "reply", node: "app", at, hit: p.kind !== "miss" });
        target.delete(p.id);
        p.dead = true;
      } else if (end.startsWith("s")) {
        const k = target.get(p.id) ?? 0;
        const ok = sim.rand() >= state.failShare(k);
        if (!ok) p.kind = "miss";
        sim.emit({ kind: ok ? "pass" : "miss", node: end, at });
        const color = ok ? "green" : "red";
        p.route.push({ wire: `r_s${k}`, dir: -1, color, end: "back" }, { wire: "a_r", dir: -1, color, end: "app" });
      }
    },
  };
}
