import type { Point } from "../geometry";
import type { Router } from "../sim";

export interface ReplRouterState {
  /** Who takes writes: the primary, a promoted replica, or nobody during failover. */
  writeTarget(): "primary" | `r${number}` | null;
  /** Replicas that serve reads. */
  readers(): readonly string[];
  /** True when a read of the user's own write goes to whoever takes writes. */
  readBackPrimary(): boolean;
  /** Share of read-backs a lagging replica answers with the old value, 0..1. */
  staleShare(): number;
  /** Visual mix: share of requests that are writes, and that are read-backs of a write. */
  writeShare: number;
  readBackShare: number;
}

type Kind = "write" | "back" | "read";
const wireTo = (node: string) => (node === "primary" ? "a_p" : `a_${node}`);

/** App → primary (a_p) for writes, → a replica (a_rK) for reads; a read-back may go either way. */
export function repl(state: ReplRouterState): Router {
  let next = 0;
  const kinds = new Map<number, Kind>();
  const targetOf = new Map<number, string>();
  return {
    spawn(p, sim) {
      const r = sim.rand();
      const kind: Kind = r < state.writeShare ? "write" : r < state.writeShare + state.readBackShare ? "back" : "read";
      kinds.set(p.id, kind);
      const readers = state.readers();
      const writer = state.writeTarget();
      let target: string;
      if (kind === "write" || (kind === "back" && state.readBackPrimary())) target = writer ?? "primary";
      else target = readers.length ? readers[next++ % readers.length]! : (writer ?? "primary");
      targetOf.set(p.id, target);
      p.route.push({ wire: wireTo(target), dir: 1, color: kind === "write" ? "amber" : kind === "back" ? "violet" : "cyan", end: target });
    },
    arrive(p, leg, sim) {
      const at: Point = [p.x, p.y];
      const end = leg.end ?? "";
      if (end === "app") {
        sim.emit({ kind: "reply", node: "app", at, hit: p.kind !== "miss" });
        kinds.delete(p.id);
        targetOf.delete(p.id);
        p.dead = true;
        return;
      }
      const kind = kinds.get(p.id) ?? "read";
      const writer = state.writeTarget();
      let ok = true;
      if (kind === "write" && writer === null) ok = false;
      else if (kind === "back" && end !== writer && sim.rand() < state.staleShare()) ok = false;
      if (!ok) p.kind = "miss";
      sim.emit({ kind: ok ? "pass" : "miss", node: end, at });
      p.route.push({ wire: wireTo(targetOf.get(p.id) ?? end), dir: -1, color: ok ? "green" : "red", end: "app" });
    },
  };
}
