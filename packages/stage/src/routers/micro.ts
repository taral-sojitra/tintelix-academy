import type { Point } from "../geometry";
import type { Router } from "../sim";

export interface MicroRouterState {
  /** True when the shop is split into services. */
  split(): boolean;
  /** Services Orders calls, in turn, for a checkout. */
  checkoutCalls: string[];
  /** Share of requests that are searches rather than checkouts, 0..1. */
  searchShare: number;
}

/**
 * Monolith: shopper → the monolith (u_m) and back, everything inside one process. Split: a checkout
 * goes to Orders (u_o), which calls each service in turn (o_<id>), then replies; a search goes to
 * Search (u_q).
 */
export function micro(state: MicroRouterState): Router {
  const step = new Map<number, number>();
  return {
    spawn(p, sim) {
      if (!state.split()) {
        p.route.push({ wire: "u_m", dir: 1, color: "cyan", end: "mono" });
        return;
      }
      if (sim.rand() < state.searchShare) p.route.push({ wire: "u_q", dir: 1, color: "cyan", end: "search" });
      else {
        step.set(p.id, 0);
        p.route.push({ wire: "u_o", dir: 1, color: "cyan", end: "orders" });
      }
    },
    arrive(p, leg, sim) {
      const at: Point = [p.x, p.y];
      const end = leg.end ?? "";
      if (end === "shopper") {
        sim.emit({ kind: "reply", node: "users", at, hit: true });
        step.delete(p.id);
        p.dead = true;
      } else if (end === "mono") {
        sim.emit({ kind: "pass", node: "mono", at });
        p.route.push({ wire: "u_m", dir: -1, color: "green", end: "shopper" });
      } else if (end === "search") {
        sim.emit({ kind: "pass", node: "search", at });
        p.route.push({ wire: "u_q", dir: -1, color: "green", end: "shopper" });
      } else if (end === "orders" || end === "back") {
        if (end === "orders") sim.emit({ kind: "pass", node: "orders", at });
        const k = step.get(p.id) ?? 0;
        const next = state.checkoutCalls[k];
        if (next) {
          step.set(p.id, k + 1);
          p.route.push({ wire: `o_${next}`, dir: 1, color: "violet", end: `call:${next}` });
        } else p.route.push({ wire: "u_o", dir: -1, color: "green", end: "shopper" });
      } else if (end.startsWith("call:")) {
        const svc = end.slice(5);
        sim.emit({ kind: "pass", node: svc, at });
        p.route.push({ wire: `o_${svc}`, dir: -1, color: "violet", end: "back" });
      }
    },
  };
}
