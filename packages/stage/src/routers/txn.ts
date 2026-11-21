import type { Point } from "../geometry";
import type { Leg, Router } from "../sim";

export type TxnMode = "none" | "2pc" | "down" | "saga";
export const PARTICIPANTS = ["s0", "s1", "s2"];

export interface TxnRouterState {
  mode(): TxnMode;
  /** Share of orders whose last step (Inventory) fails, 0..1. */
  failShare(): number;
}

/**
 * User → coordinator (u_c), then:
 * none and saga: Orders, Payments, Inventory in turn (c_sK out and back); on an Inventory failure,
 *   none stops with the earlier steps done (broken), saga compensates Payments then Orders (amber).
 * 2pc: one participant per order on stage: prepare (violet out and back), then commit (green).
 * down: the coordinator is gone and every order fails there.
 */
export function txn(state: TxnRouterState): Router {
  const step = new Map<number, number>();
  const failing = new Set<number>();
  const out = (k: number, color: Leg["color"], end: string): Leg => ({ wire: `c_s${k}`, dir: 1, color, end });
  const back = (k: number, color: Leg["color"], end: string): Leg => ({ wire: `c_s${k}`, dir: -1, color, end });
  const home = (color: Leg["color"]): Leg => ({ wire: "u_c", dir: -1, color, end: "user" });
  let next = 0;
  return {
    spawn(p, sim) {
      if (sim.rand() < state.failShare()) failing.add(p.id);
      p.route.push({ wire: "u_c", dir: 1, color: "cyan", end: "coord" });
    },
    arrive(p, leg, sim) {
      const at: Point = [p.x, p.y];
      const end = leg.end ?? "";
      const mode = state.mode();
      const fails = failing.has(p.id);
      if (end === "user") {
        sim.emit({ kind: "reply", node: "users", at, hit: p.kind !== "miss" });
        step.delete(p.id);
        failing.delete(p.id);
        p.dead = true;
        return;
      }
      if (end === "coord") {
        if (mode === "down") {
          p.kind = "miss";
          sim.emit({ kind: "miss", node: "coord", at });
          p.route.push(home("red"));
        } else if (mode === "2pc") {
          const k = next++ % PARTICIPANTS.length;
          step.set(p.id, k);
          sim.emit({ kind: "pass", node: "coord", at });
          p.route.push(out(k, "violet", `prep${k}`));
        } else {
          sim.emit({ kind: "pass", node: "coord", at });
          p.route.push(out(0, "cyan", "do0"));
        }
        return;
      }
      // Ends carry the participant's number: prep0, commit1, do2, next1, undo0, comp1.
      const k = Number(end.replace(/\D/g, ""));
      if (end.startsWith("prep")) {
        sim.emit({ kind: "fill", node: `s${k}`, at });
        p.route.push(back(k, "violet", "vote"));
      } else if (end === "vote") {
        const kk = step.get(p.id) ?? 0;
        p.route.push(out(kk, "green", `commit${kk}`));
      } else if (end.startsWith("commit")) {
        sim.emit({ kind: "pass", node: `s${k}`, at });
        p.route.push(back(k, "green", "via"), home("green"));
      } else if (end.startsWith("do")) {
        if (k === 2 && fails) {
          sim.emit({ kind: "miss", node: "s2", at });
          if (mode === "saga") p.route.push(back(2, "amber", "undo1"));
          else {
            p.kind = "miss";
            p.route.push(back(2, "red", "via"), home("red"));
          }
        } else {
          sim.emit({ kind: "pass", node: `s${k}`, at });
          p.route.push(k < 2 ? back(k, "cyan", `next${k + 1}`) : back(k, "green", "fin"));
        }
      } else if (end.startsWith("next")) {
        p.route.push(out(k, "cyan", `do${k}`));
      } else if (end === "fin") {
        p.route.push(home("green"));
      } else if (end.startsWith("undo")) {
        p.route.push(out(k, "amber", `comp${k}`));
      } else if (end.startsWith("comp")) {
        sim.emit({ kind: "fill", node: `s${k}`, at });
        p.route.push(k > 0 ? back(k, "amber", `undo${k - 1}`) : back(0, "amber", "reverted"));
      } else if (end === "reverted") {
        p.route.push(home("amber"));
      }
    },
  };
}
