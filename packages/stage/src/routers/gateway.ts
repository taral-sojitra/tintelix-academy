import type { Point } from "../geometry";
import type { Leg, Router } from "../sim";

export interface GatewayRouterState {
  /** 0 straight to each service, 1 through the gateway, 2 one call aggregated at the gateway. */
  mode(): number;
  services: number;
  /** For an aggregated screen: the services called in turn. */
  screen: number[];
}

/**
 * Mode 0: phone → a service directly (p_sK) and back. Mode 1: phone → gateway (p_g) → a service
 * (g_sK) and back. Mode 2: phone → gateway, which calls the screen's services in turn, then back.
 */
export function gateway(state: GatewayRouterState): Router {
  const pick = new Map<number, number>();
  const at2 = new Map<number, number>();
  const toService = (k: number, color: Leg["color"]): Leg => ({ wire: `g_s${k}`, dir: 1, color, end: `s${k}` });
  return {
    spawn(p, sim) {
      const k = Math.floor(sim.rand() * state.services) % state.services;
      pick.set(p.id, k);
      p.route.push(state.mode() === 0 ? { wire: `p_s${k}`, dir: 1, color: "cyan", end: `s${k}` } : { wire: "p_g", dir: 1, color: "cyan", end: "gateway" });
    },
    arrive(p, leg, sim) {
      const at: Point = [p.x, p.y];
      const end = leg.end ?? "";
      const mode = state.mode();
      if (end === "phone") {
        sim.emit({ kind: "reply", node: "phone", at, hit: true });
        pick.delete(p.id);
        at2.delete(p.id);
        p.dead = true;
      } else if (end === "gateway") {
        sim.emit({ kind: "pass", node: "gateway", at });
        if (mode === 2) {
          at2.set(p.id, 0);
          p.route.push(toService(state.screen[0] ?? 0, "violet"));
        } else p.route.push(toService(pick.get(p.id) ?? 0, "cyan"));
      } else if (end === "back") {
        const n = (at2.get(p.id) ?? 0) + 1;
        if (mode === 2 && n < state.screen.length) {
          at2.set(p.id, n);
          p.route.push(toService(state.screen[n] ?? 0, "violet"));
        } else p.route.push({ wire: "p_g", dir: -1, color: "green", end: "phone" });
      } else if (end.startsWith("s")) {
        const k = Number(end.slice(1));
        sim.emit({ kind: "pass", node: end, at });
        if (leg.wire.startsWith("p_")) p.route.push({ wire: `p_s${k}`, dir: -1, color: "green", end: "phone" });
        else p.route.push({ wire: `g_s${k}`, dir: -1, color: mode === 2 ? "violet" : "green", end: "back" });
      }
    },
  };
}
