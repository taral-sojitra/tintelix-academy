import type { Point } from "../geometry";
import type { Router } from "../sim";

export interface LeaderRouterState {
  /** Servers acting as leader, each sending heartbeats to the followers it can reach. */
  leaders(): number[];
  /** The server asking for votes, or 0. */
  candidate(): number;
  /** False for a server that is dead or frozen: it neither sends nor answers. */
  up(n: number): boolean;
  /** False when a partition separates the two servers. */
  reach(a: number, b: number): boolean;
  /** The leader whose writes go to storage, or 0 when storage isn't in the picture. */
  writer(): number;
  /** True once the frozen leader has woken: it sends one stale write to storage. */
  stale(): boolean;
}

const SERVERS = [1, 2, 3, 4, 5];

/** The wire between two servers is named low number first; travelling from the higher one runs it backwards. */
export function pairWire(from: number, to: number): { wire: string; dir: 1 | -1 } {
  return from < to ? { wire: `n${from}_n${to}`, dir: 1 } : { wire: `n${to}_n${from}`, dir: -1 };
}

type Message = { kind: "hb" | "vreq"; from: number; to: number } | { kind: "write"; from: number };

/**
 * Five servers wired to each other (n1_n2 … n4_n5) and two of them to storage (n1_st, n2_st). Each new
 * packet is the next message in a round robin over what is being said right now: leaders' heartbeats
 * (green), a candidate's vote requests (amber, answered in violet), and the writer's writes to storage
 * (cyan). Once `stale()` turns on, the next packet is n1's stale write, which storage rejects (red).
 */
export function leader(state: LeaderRouterState): Router {
  const sent = new Map<number, Message>();
  let turn = 0;
  let staleSent = false;
  const messages = (): Message[] => {
    const out: Message[] = [];
    for (const l of state.leaders()) {
      if (!state.up(l)) continue;
      for (const f of SERVERS) if (f !== l && state.up(f) && state.reach(l, f)) out.push({ kind: "hb", from: l, to: f });
    }
    const c = state.candidate();
    if (c && state.up(c)) for (const f of SERVERS) if (f !== c && state.up(f) && state.reach(c, f)) out.push({ kind: "vreq", from: c, to: f });
    const w = state.writer();
    if (w && state.up(w)) out.push({ kind: "write", from: w });
    return out;
  };
  return {
    spawn(p) {
      if (!state.stale()) staleSent = false;
      else if (!staleSent) {
        staleSent = true;
        p.route.push({ wire: "n1_st", dir: 1, color: "cyan", end: "stale" });
        return;
      }
      const list = messages();
      if (list.length === 0) return;
      const m = list[turn++ % list.length]!;
      sent.set(p.id, m);
      if (m.kind === "write") p.route.push({ wire: `n${m.from}_st`, dir: 1, color: "cyan", end: "write" });
      else {
        if (m.kind === "hb") p.small = true;
        p.route.push({ ...pairWire(m.from, m.to), color: m.kind === "hb" ? "green" : "amber", end: m.kind });
      }
    },
    arrive(p, leg, sim) {
      const at: Point = [p.x, p.y];
      const m = sent.get(p.id);
      switch (leg.end) {
        case "hb":
          if (m && m.kind === "hb") sim.emit({ kind: "pass", node: `n${m.to}`, at });
          p.dead = true;
          break;
        case "vreq":
          if (m && m.kind === "vreq") {
            sim.emit({ kind: "hit", node: `n${m.to}`, at });
            p.route.push({ ...pairWire(m.to, m.from), color: "violet", end: "vote" });
          } else p.dead = true;
          break;
        case "vote":
          if (m && m.kind === "vreq") sim.emit({ kind: "pass", node: `n${m.from}`, at });
          p.dead = true;
          break;
        case "write":
          sim.emit({ kind: "dbIn", node: "storage", at });
          p.dead = true;
          break;
        case "stale":
          sim.emit({ kind: "miss", node: "storage", at });
          p.kind = "miss";
          p.route.push({ wire: "n1_st", dir: -1, color: "red", end: "fenced" });
          break;
        case "fenced":
          sim.emit({ kind: "fill", node: "n1", at });
          p.dead = true;
          break;
      }
      if (p.dead) sent.delete(p.id);
    },
  };
}
