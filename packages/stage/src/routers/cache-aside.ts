import type { Router, Sim } from "../sim";

/**
 * Cache-aside: users → load balancer → app (round robin) → cache. A hit goes straight back;
 * a miss goes back to the app, then to the database queue, back to the user, and a fill
 * packet stores the answer in the cache. With no cache ready, every request goes to the database.
 * Wire names: u_lb, lb_a<n>, a<n>_c, a<n>_d. Queue name: db.
 */
export function cacheAside(state: { hitRate: () => number; cacheReady: () => boolean; apps?: number }): Router {
  const apps = state.apps ?? 3;
  let rr = 0;
  return {
    spawn(p) {
      p.lane = rr++ % apps;
      p.route.push({ wire: "u_lb", dir: 1, color: "cyan" }, { wire: `lb_a${p.lane}`, dir: 1, color: "cyan", end: "app" });
    },

    arrive(p, leg, sim: Sim) {
      const a = p.lane;
      const at: [number, number] = [p.x, p.y];
      switch (leg.end) {
        case "app":
          sim.emit({ kind: "pass", node: `a${a}`, at });
          p.wait = 0.05;
          if (state.cacheReady()) p.route.push({ wire: `a${a}_c`, dir: 1, color: "cyan", end: "cache" });
          else {
            p.kind = "db";
            p.route.push({ wire: `a${a}_d`, dir: 1, color: "cyan", end: "db" });
          }
          break;
        case "cache":
          if (sim.rand() < state.hitRate()) {
            p.kind = "hit";
            sim.emit({ kind: "hit", node: "cache", at });
            p.route.push({ wire: `a${a}_c`, dir: -1, color: "green" }, { wire: `lb_a${a}`, dir: -1, color: "green" }, { wire: "u_lb", dir: -1, color: "green", end: "user" });
          } else {
            p.kind = "miss";
            sim.emit({ kind: "miss", node: "cache", at });
            p.route.push({ wire: `a${a}_c`, dir: -1, color: "amber", end: "appMiss" });
          }
          break;
        case "appMiss":
          sim.emit({ kind: "pass", node: `a${a}`, at });
          p.wait = 0.03;
          p.route.push({ wire: `a${a}_d`, dir: 1, color: "amber", end: "db" });
          break;
        case "db":
          sim.emit({ kind: "dbIn", node: "db", at });
          p.hidden = true;
          p.trail = [];
          sim.queues.db?.push(p);
          break;
        case "appFromDb":
          sim.emit({ kind: "pass", node: `a${a}`, at });
          if (p.kind === "miss") {
            const fill = sim.packet(a, at, { kind: "fill", small: true, color: "violet", wait: 0.02 });
            fill.route.push({ wire: `a${a}_c`, dir: 1, color: "violet", end: "fill" });
            sim.add(fill);
          }
          p.route.push({ wire: `lb_a${a}`, dir: -1, color: "amber" }, { wire: "u_lb", dir: -1, color: "amber", end: "user" });
          break;
        case "fill":
          sim.emit({ kind: "fill", node: "cache", at });
          p.dead = true;
          break;
        case "user":
          sim.emit({ kind: "reply", node: "users", at, hit: p.kind === "hit" });
          p.dead = true;
          break;
      }
    },

    served(p, queue, sim) {
      if (queue !== "db") return;
      sim.emit({ kind: "dbOut", node: "db", at: [p.x, p.y] });
      p.route.push({ wire: `a${p.lane}_d`, dir: -1, color: "amber", end: "appFromDb" });
    },
  };
}
