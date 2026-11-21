import type { Point } from "../geometry";
import type { Leg, Router } from "../sim";

export type DataMode = "read" | "rename" | "schema";

export interface DataRouterState {
  mode(): DataMode;
  /** True once the document side is on stage. */
  docSide(): boolean;
  /** Share of schema-step writes missing a required field, 0..1. */
  badShare(): number;
}

/**
 * App → relational side or document side, alternating. Read: a_o → orders → o_i → items → i_p →
 * products and back (the join), or a_d → docs and back. Rename: a_s → sellers or a_l → listings.
 * Schema: a write to orders (a bad one is rejected) or to docs (a bad one is stored anyway).
 */
export function data(state: DataRouterState): Router {
  let n = 0;
  const bad = new Set<number>();
  const back = (wire: string, color: Leg["color"], end: string): Leg => ({ wire, dir: -1, color, end });
  return {
    spawn(p, sim) {
      const sql = !state.docSide() || n++ % 2 === 0;
      const mode = state.mode();
      if (mode === "schema" && sim.rand() < state.badShare()) bad.add(p.id);
      if (mode === "rename") p.route.push(sql ? { wire: "a_s", dir: 1, color: "cyan", end: "sellers" } : { wire: "a_l", dir: 1, color: "cyan", end: "listings" });
      else p.route.push(sql ? { wire: "a_o", dir: 1, color: "cyan", end: "orders" } : { wire: "a_d", dir: 1, color: "cyan", end: "docs" });
    },
    arrive(p, leg, sim) {
      const at: Point = [p.x, p.y];
      const end = leg.end ?? "";
      const mode = state.mode();
      const isBad = bad.has(p.id);
      switch (end) {
        case "orders":
          if (mode === "schema") {
            if (isBad) {
              p.kind = "miss";
              sim.emit({ kind: "miss", node: "orders", at });
              p.route.push(back("a_o", "red", "app"));
            } else {
              sim.emit({ kind: "pass", node: "orders", at });
              p.route.push(back("a_o", "green", "app"));
            }
          } else {
            sim.emit({ kind: "pass", node: "orders", at });
            p.route.push({ wire: "o_i", dir: 1, color: "cyan", end: "items" });
          }
          break;
        case "items":
          sim.emit({ kind: "pass", node: "items", at });
          p.route.push({ wire: "i_p", dir: 1, color: "cyan", end: "products" });
          break;
        case "products":
          sim.emit({ kind: "pass", node: "products", at });
          p.route.push(back("i_p", "green", "via"), back("o_i", "green", "via"), back("a_o", "green", "app"));
          break;
        case "docs":
          if (mode === "schema" && isBad) {
            sim.emit({ kind: "fill", node: "docs", at });
            p.route.push(back("a_d", "amber", "app"));
          } else {
            sim.emit({ kind: "pass", node: "docs", at });
            p.route.push(back("a_d", "green", "app"));
          }
          break;
        case "sellers":
          sim.emit({ kind: "pass", node: "sellers", at });
          p.route.push(back("a_s", "green", "app"));
          break;
        case "listings":
          sim.emit({ kind: "pass", node: "listings", at });
          p.route.push(back("a_l", "green", "app"));
          break;
        case "app":
          sim.emit({ kind: "reply", node: "app", at, hit: p.kind !== "miss" });
          bad.delete(p.id);
          p.dead = true;
          break;
      }
    },
  };
}
