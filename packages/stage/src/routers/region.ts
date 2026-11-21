import type { Point } from "../geometry";
import type { Router } from "../sim";

type Region = 0 | 1;

export interface RegionRouterState {
  /** Which region (0 Mumbai, 1 Virginia) serves this request from a user group (0 India, 1 USA). */
  serve(group: 0 | 1): Region;
  /** False while a region is dark: its app servers refuse everything. */
  up(region: Region): boolean;
  /** Replication streams to draw, as [from, to] regions. */
  copies(): [Region, Region][];
}

const SIDE = ["A", "B"] as const;

/**
 * Users in India (uA_r) and the USA (uB_r) go through global routing to the app servers of the region
 * that serves them (r_aA, r_aB), then its database (aA_dA, aB_dB), and back: cyan out, green back, red if
 * the region is dark. Every fourth packet is a replication message along dA_dB (violet, small).
 */
export function region(state: RegionRouterState): Router {
  const served = new Map<number, Region>();
  const group = new Map<number, 0 | 1>();
  let turn = 0;
  let copyTurn = 0;
  let userTurn = 0;
  return {
    spawn(p) {
      const n = turn++;
      const copies = state.copies();
      if (n % 4 === 3 && copies.length > 0) {
        const [from] = copies[copyTurn++ % copies.length]!;
        if (!state.up(from)) return;
        p.small = true;
        p.route.push({ wire: "dA_dB", dir: from === 0 ? 1 : -1, color: "violet", end: from === 0 ? "copyB" : "copyA" });
        return;
      }
      const g: 0 | 1 = userTurn++ % 2 === 0 ? 0 : 1;
      group.set(p.id, g);
      p.route.push({ wire: g === 0 ? "uA_r" : "uB_r", dir: 1, color: "cyan", end: "route" });
    },
    arrive(p, leg, sim) {
      const at: Point = [p.x, p.y];
      const g = group.get(p.id) ?? 0;
      const users = g === 0 ? "uA_r" : "uB_r";
      switch (leg.end) {
        case "route": {
          const r = state.serve(g);
          served.set(p.id, r);
          sim.emit({ kind: "pass", node: "route", at });
          p.route.push({ wire: `r_a${SIDE[r]}`, dir: 1, color: "cyan", end: "app" });
          break;
        }
        case "app": {
          const r = served.get(p.id) ?? 0;
          if (!state.up(r)) {
            sim.emit({ kind: "miss", node: `app${SIDE[r]}`, at });
            p.kind = "miss";
            p.route.push({ wire: `r_a${SIDE[r]}`, dir: -1, color: "red" }, { wire: users, dir: -1, color: "red", end: "user" });
          } else {
            sim.emit({ kind: "pass", node: `app${SIDE[r]}`, at });
            p.route.push({ wire: `a${SIDE[r]}_d${SIDE[r]}`, dir: 1, color: "cyan", end: "db" });
          }
          break;
        }
        case "db": {
          const r = served.get(p.id) ?? 0;
          sim.emit({ kind: "dbIn", node: `db${SIDE[r]}`, at });
          p.kind = "hit";
          p.route.push({ wire: `a${SIDE[r]}_d${SIDE[r]}`, dir: -1, color: "green" }, { wire: `r_a${SIDE[r]}`, dir: -1, color: "green" }, { wire: users, dir: -1, color: "green", end: "user" });
          break;
        }
        case "user":
          sim.emit({ kind: "reply", node: g === 0 ? "usersA" : "usersB", at, hit: p.kind !== "miss" });
          p.dead = true;
          break;
        case "copyA":
        case "copyB":
          sim.emit({ kind: "fill", node: leg.end === "copyA" ? "dbA" : "dbB", at });
          p.dead = true;
          break;
      }
      if (p.dead) {
        served.delete(p.id);
        group.delete(p.id);
      }
    },
  };
}
