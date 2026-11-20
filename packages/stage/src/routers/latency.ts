import type { Point } from "../geometry";
import type { Hue, Router } from "../sim";

export interface LatencyRouterState {
  /** Whether a request is a page that fans out to the services pool. */
  fanOut(): boolean;
  /** Latency in ms for the next request (one call, or a whole page when fanning out). */
  sample(): number;
  /** Seconds a request is held for a latency of `ms`, in slow motion. */
  hold(ms: number): number;
  /** Colour of the reply for a latency of `ms`. */
  hue(ms: number): Hue;
}

/**
 * Requests from users to the product service. With one call, the service holds the request for
 * its latency and replies. When a page fans out, the service passes it on to the services pool,
 * which holds it for the page's latency (its slowest call). Wire names: users_app, app_services.
 */
export function latency(state: LatencyRouterState): Router {
  const hold = (p: { ms?: number; wait: number }, node: string, at: Point, sim: Parameters<Router["spawn"]>[1]) => {
    const ms = state.sample();
    p.ms = ms;
    p.wait = Math.max(p.wait, state.hold(ms));
    sim.emit({ kind: "work", node, at, ms });
    return ms;
  };
  return {
    spawn(p) {
      p.route.push({ wire: "users_app", dir: 1, color: "cyan", end: "app" });
    },

    arrive(p, leg, sim) {
      const at: Point = [p.x, p.y];
      switch (leg.end) {
        case "app":
          if (state.fanOut()) {
            sim.emit({ kind: "pass", node: "app", at });
            p.route.push({ wire: "app_services", dir: 1, color: "cyan", end: "services" });
          } else {
            const ms = hold(p, "app", at, sim);
            p.route.push({ wire: "users_app", dir: -1, color: state.hue(ms), end: "user" });
          }
          break;
        case "services": {
          const ms = hold(p, "services", at, sim);
          p.route.push({ wire: "app_services", dir: -1, color: state.hue(ms), end: "back" });
          break;
        }
        case "back":
          sim.emit({ kind: "pass", node: "app", at });
          p.route.push({ wire: "users_app", dir: -1, color: state.hue(p.ms ?? 0), end: "user" });
          break;
        case "user":
          sim.emit({ kind: "done", node: "users", at, ms: p.ms ?? 0 });
          p.dead = true;
          break;
      }
    },
  };
}
