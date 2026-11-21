import type { Point } from "../geometry";
import type { Leg, Router } from "../sim";

export interface RetryRouterState {
  /** Pricing answers in time (true), or so slowly that the caller times out (false). */
  healthy(): boolean;
  /** True when a circuit breaker sits between the caller and pricing. */
  hasBreaker(): boolean;
  /** True while the breaker is open: calls fail at once. */
  open(): boolean;
  attempts: number;
}

/**
 * Shopper → order service (u_b) → pricing, directly (b_c) or through the breaker (b_k, k_c), and back.
 * A slow pricing call times out at the order service, which tries again up to `attempts` times; an open
 * breaker fails the call at once without touching pricing.
 */
export function retry(state: RetryRouterState): Router {
  const tries = new Map<number, number>();
  const toPricing = (color: Leg["color"]): Leg[] => (state.hasBreaker() ? [{ wire: "b_k", dir: 1, color, end: "breaker" }] : [{ wire: "b_c", dir: 1, color, end: "pricing" }]);
  const fromPricing = (color: Leg["color"]): Leg[] => (state.hasBreaker() ? [{ wire: "k_c", dir: -1, color, end: "via" }, { wire: "b_k", dir: -1, color, end: "order" }] : [{ wire: "b_c", dir: -1, color, end: "order" }]);
  return {
    spawn(p) {
      tries.set(p.id, 0);
      p.route.push({ wire: "u_b", dir: 1, color: "cyan", end: "start" });
    },
    arrive(p, leg, sim) {
      const at: Point = [p.x, p.y];
      switch (leg.end) {
        case "start":
          sim.emit({ kind: "pass", node: "order", at });
          tries.set(p.id, 1);
          p.route.push(...toPricing("cyan"));
          break;
        case "breaker":
          if (state.open()) {
            sim.emit({ kind: "fill", node: "breaker", at });
            p.kind = "miss";
            p.route.push({ wire: "b_k", dir: -1, color: "red", end: "via" }, { wire: "u_b", dir: -1, color: "red", end: "user" });
          } else p.route.push({ wire: "k_c", dir: 1, color: (tries.get(p.id) ?? 1) > 1 ? "amber" : "cyan", end: "pricing" });
          break;
        case "pricing": {
          const ok = state.healthy();
          sim.emit({ kind: ok ? "pass" : "miss", node: "pricing", at });
          p.route.push(...fromPricing(ok ? "green" : "red"));
          if (ok) p.kind = "hit";
          break;
        }
        case "order": {
          const n = tries.get(p.id) ?? 1;
          if (p.kind === "hit") p.route.push({ wire: "u_b", dir: -1, color: "green", end: "user" });
          else if (n < state.attempts && !(state.hasBreaker() && state.open())) {
            tries.set(p.id, n + 1);
            sim.emit({ kind: "fill", node: "order", at });
            p.route.push(...toPricing("amber"));
          } else {
            p.kind = "miss";
            p.route.push({ wire: "u_b", dir: -1, color: "red", end: "user" });
          }
          break;
        }
        case "user":
          sim.emit({ kind: "reply", node: "users", at, hit: p.kind !== "miss" });
          tries.delete(p.id);
          p.dead = true;
          break;
      }
    },
  };
}
