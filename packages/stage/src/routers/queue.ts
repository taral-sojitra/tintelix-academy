import type { Point } from "../geometry";
import type { Hue, Router, Sim } from "../sim";

export interface QueueRouterState {
  /** The worker queue a new arrival joins. */
  pick(sim: Sim): string;
  /** Simulated time now, in seconds. */
  now(): number;
  /** Real milliseconds for `sec` seconds of simulated time. */
  ms(sec: number): number;
  /** Colour of the reply for a time inside of `ms`. */
  hue(ms: number): Hue;
}

/**
 * Requests walk to the product service, wait in a worker's line (hidden while they wait and are
 * worked on; the scene draws the line), then walk back. Wire: users_app; queues: one per worker.
 */
export function queueRouter(state: QueueRouterState): Router {
  const arrived = new Map<number, number>();
  return {
    spawn(p) {
      p.route.push({ wire: "users_app", dir: 1, color: "cyan", end: "app" });
    },

    arrive(p, leg, sim) {
      const at: Point = [p.x, p.y];
      if (leg.end === "app") {
        arrived.set(p.id, state.now());
        p.hidden = true;
        sim.queues[state.pick(sim)]?.push(p);
        sim.emit({ kind: "pass", node: "app", at });
      } else if (leg.end === "user") {
        sim.emit({ kind: "done", node: "users", at, ms: p.ms ?? 0 });
        p.dead = true;
      }
    },

    served(p, _queue, sim) {
      const ms = state.ms(state.now() - (arrived.get(p.id) ?? state.now()));
      arrived.delete(p.id);
      p.ms = ms;
      sim.emit({ kind: "work", node: "app", at: [p.x, p.y], ms });
      p.route.push({ wire: "users_app", dir: -1, color: state.hue(ms), end: "user" });
    },
  };
}
