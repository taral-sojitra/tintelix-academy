import type { Point } from "../geometry";
import type { Leg, Router } from "../sim";

export interface IdemRouterState {
  /** 0 no key, 1 key checked then inserted, 2 key claimed atomically. */
  mode(): number;
  /** Share of payments whose reply is lost after the charge, so the client retries, 0..1. */
  lostShare(): number;
  /** Share of payments sent twice at the same moment, 0..1. */
  dupShare(): number;
}

type Kind = "normal" | "lost" | "dup";

/**
 * Client → API (c_a) → bank (a_b) and back. A lost reply comes back red and the client retries
 * (amber): without a key the bank charges again; with one the API finds the saved result in the key
 * store (a_k). A duplicate sent at the same moment races past a check-then-insert key and is charged
 * again, but is turned away when the key is claimed atomically.
 */
export function idem(state: IdemRouterState): Router {
  const kind = new Map<number, Kind>();
  const retried = new Set<number>();
  const toApi = (color: Leg["color"], end: string): Leg => ({ wire: "c_a", dir: 1, color, end });
  const toClient = (color: Leg["color"], end: string): Leg => ({ wire: "c_a", dir: -1, color, end });
  return {
    spawn(p, sim) {
      const r = sim.rand();
      kind.set(p.id, r < state.dupShare() ? "dup" : r < state.dupShare() + state.lostShare() ? "lost" : "normal");
      p.route.push(toApi("cyan", "api"));
    },
    arrive(p, leg, sim) {
      const at: Point = [p.x, p.y];
      const k = kind.get(p.id) ?? "normal";
      const mode = state.mode();
      const again = retried.has(p.id);
      switch (leg.end) {
        case "api":
          sim.emit({ kind: "pass", node: "api", at });
          if (mode === 0) p.route.push({ wire: "a_b", dir: 1, color: again ? "amber" : "cyan", end: "bank" });
          else p.route.push({ wire: "a_k", dir: 1, color: again ? "amber" : "cyan", end: "keys" });
          break;
        case "keys":
          if (again) {
            sim.emit({ kind: "hit", node: "keys", at });
            p.route.push({ wire: "a_k", dir: -1, color: "green", end: "via" }, toClient("green", "client"));
          } else if (k === "dup" && mode === 2) {
            sim.emit({ kind: "fill", node: "keys", at });
            p.route.push({ wire: "a_k", dir: -1, color: "amber", end: "via" }, toClient("amber", "client"));
          } else {
            sim.emit({ kind: "pass", node: "keys", at });
            p.route.push({ wire: "a_k", dir: -1, color: "cyan", end: "charge" });
          }
          break;
        case "charge":
          p.route.push({ wire: "a_b", dir: 1, color: "cyan", end: "bank" });
          break;
        case "bank": {
          const twice = again || k === "dup";
          if (twice) p.kind = "miss";
          sim.emit({ kind: twice ? "miss" : "pass", node: "bank", at });
          const lostNow = k === "lost" && !again;
          p.route.push({ wire: "a_b", dir: -1, color: twice ? "red" : "green", end: "via" }, toClient(lostNow ? "red" : twice ? "red" : "green", lostNow ? "lost" : "client"));
          break;
        }
        case "lost":
          retried.add(p.id);
          sim.emit({ kind: "fill", node: "client", at });
          p.route.push(toApi("amber", "api"));
          break;
        case "client":
          sim.emit({ kind: "reply", node: "client", at, hit: p.kind !== "miss" });
          kind.delete(p.id);
          retried.delete(p.id);
          p.dead = true;
          break;
      }
    },
  };
}
