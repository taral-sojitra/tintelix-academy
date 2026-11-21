import type { Point } from "../geometry";
import type { Router } from "../sim";

export type FanoutMode = "push" | "celeb" | "pull" | "hybrid";

export interface FanoutRouterState {
  mode(): FanoutMode;
  /** Share of activity on stage that is the celebrity's, 0..1. */
  celebShare(): number;
}

/**
 * Push: a post goes from its author (a_w or c_w) through the fan-out workers into the feeds (w_f).
 * Pull: a feed open goes the other way, from the feeds back through the workers to an author's
 * timeline and returns. Hybrid: normal posts are pushed and celebrity posts are pulled at read time.
 */
export function fanout(state: FanoutRouterState): Router {
  const celeb = new Set<number>();
  const read = new Set<number>();
  return {
    spawn(p, sim) {
      const mode = state.mode();
      const isCeleb = sim.rand() < state.celebShare();
      if (isCeleb) celeb.add(p.id);
      const isRead = mode === "pull" || (mode === "hybrid" && isCeleb);
      if (isRead) {
        read.add(p.id);
        p.small = true;
        p.route.push({ wire: "w_f", dir: -1, color: "violet", end: "workers" });
      } else p.route.push({ wire: isCeleb ? "c_w" : "a_w", dir: 1, color: isCeleb ? "amber" : "cyan", end: "workers" });
    },
    arrive(p, leg, sim) {
      const at: Point = [p.x, p.y];
      const author = celeb.has(p.id) ? "c_w" : "a_w";
      switch (leg.end) {
        case "workers":
          sim.emit({ kind: "pass", node: "workers", at });
          if (read.has(p.id)) p.route.push({ wire: author, dir: -1, color: "violet", end: "author" });
          else p.route.push({ wire: "w_f", dir: 1, color: celeb.has(p.id) ? "amber" : "cyan", end: "feeds" });
          break;
        case "author":
          sim.emit({ kind: "hit", node: celeb.has(p.id) ? "celeb" : "asha", at });
          p.route.push({ wire: author, dir: 1, color: "green", end: "via" }, { wire: "w_f", dir: 1, color: "green", end: "feeds" });
          break;
        case "feeds":
          sim.emit({ kind: read.has(p.id) ? "reply" : "fill", node: "feeds", at, hit: true });
          celeb.delete(p.id);
          read.delete(p.id);
          p.dead = true;
          break;
      }
    },
  };
}
