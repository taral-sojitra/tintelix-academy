import type { BoardFlow } from "@tintelix/schema";
import type { Point } from "../geometry";
import type { Leg, Packet, Router, Sim } from "../sim";

export interface BoardRouterState {
  /** The flows running now, with their weights (≤ 0 or NaN sends none). */
  flows(): { id: string; flow: BoardFlow; weight: number }[];
  /** The share (0–1) of requests that fail, read from the named …Pct output. */
  failShare(output: string): number;
}

interface Trip {
  flow: BoardFlow;
  id: string;
}

const START = "users";

/**
 * Legs from hop `from` back to the start, reversed, in one colour. An out-and-back detour (a wire
 * travelled out then straight back, such as asking the cache) is skipped on the way home.
 */
function homeward(flow: BoardFlow, from: number, color: Leg["color"]): Leg[] {
  const legs: Leg[] = [];
  for (let j = from; j >= 0; j--) {
    const hop = flow.path[j]!;
    const prev = flow.path[j - 1];
    if (prev && prev.wire === hop.wire && prev.dir !== hop.dir) {
      j--;
      continue;
    }
    legs.push({ wire: hop.wire, dir: hop.dir === 1 ? -1 : 1, color });
  }
  const last = legs[legs.length - 1];
  if (last) last.end = "ret:0";
  return legs;
}

/** Picks a flow by cumulative weight; null when nothing has a positive weight. */
function pick(flows: { id: string; flow: BoardFlow; weight: number }[], r: number): { id: string; flow: BoardFlow } | null {
  const w = flows.map((f) => (Number.isFinite(f.weight) && f.weight > 0 ? f.weight : 0));
  const total = w.reduce((a, b) => a + b, 0);
  if (total <= 0) return null;
  let at = r * total;
  for (const [i, f] of flows.entries()) {
    at -= w[i]!;
    if (at < 0 && w[i]! > 0) return f;
  }
  for (let i = flows.length - 1; i >= 0; i--) if (w[i]! > 0) return flows[i]!;
  return null;
}

/**
 * A case-study board's requests: each spawn picks a flow by weight and walks its path hop by hop
 * ("hop:<i>"), passing each node; some fail at `fail.at` (red, back the way they came); the rest come
 * back in the flow's `back` colour ("ret:0"), or stop at the last node when it has none.
 */
export function board(state: BoardRouterState): Router {
  const trips = new Map<number, Trip>();
  const finish = (p: Packet) => {
    p.dead = true;
    trips.delete(p.id);
  };
  /** Sends a packet home, or replies at once when it is already there. */
  const goHome = (p: Packet, legs: Leg[], sim: Sim, at: Point) => {
    if (legs.length > 0) {
      p.route.push(...legs);
      return;
    }
    sim.emit({ kind: "reply", node: START, at, hit: p.kind !== "miss" });
    finish(p);
  };
  return {
    spawn(p: Packet, sim: Sim) {
      const chosen = pick(state.flows(), sim.rand());
      if (!chosen) return;
      const { flow } = chosen;
      trips.set(p.id, { flow, id: chosen.id });
      p.small = flow.small ?? false;
      const first = flow.path[0]!;
      p.route.push({ wire: first.wire, dir: first.dir, color: flow.color, end: "hop:0" });
    },
    arrive(p: Packet, leg: Leg, sim: Sim) {
      const trip = trips.get(p.id);
      if (!trip) {
        p.dead = true;
        return;
      }
      const { flow } = trip;
      const at: Point = [p.x, p.y];
      if (leg.end === "ret:0") {
        sim.emit({ kind: "reply", node: START, at, hit: p.kind !== "miss" });
        finish(p);
        return;
      }
      const i = flow.path.findIndex((_, k) => leg.end === `hop:${k}`);
      if (i < 0) return;
      const hop = flow.path[i]!;
      if (flow.fail && flow.fail.at === hop.at && sim.rand() < state.failShare(flow.fail.share)) {
        sim.emit({ kind: "miss", node: hop.at, at });
        p.kind = "miss";
        goHome(p, homeward(flow, i, "red"), sim, at);
        return;
      }
      sim.emit({ kind: "pass", node: hop.at, at });
      const next = flow.path[i + 1];
      if (next) {
        p.route.push({ wire: next.wire, dir: next.dir, color: flow.color, end: `hop:${i + 1}` });
      } else if (flow.back) {
        p.kind = "hit";
        goHome(p, homeward(flow, i, flow.back), sim, at);
      } else {
        finish(p);
      }
    },
  };
}
