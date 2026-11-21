import type { Point } from "../geometry";
import type { Router } from "../sim";

export type MqMode = "direct" | "queue" | "retry" | "dlq";

export interface MqRouterState {
  mode(): MqMode;
  /** Direct: share of jobs the workers can't take right now, 0..1. */
  failShare(): number;
  /** Queue: share of arriving jobs the workers pick up now; the rest wait in the queue, 0..1. */
  passShare(): number;
  /** Share of jobs that are poison and fail every time, 0..1. */
  poisonShare(): number;
  /** Tries before a poison job goes to the dead-letter queue. */
  attempts: number;
}

/**
 * Direct: shop → workers (p_w) and back. Queue: shop → queue (p_q); some go on to the workers (q_w),
 * the rest wait (absorbed into the backlog). Poison jobs fail at the workers and go back to the queue
 * for another try; with a dead-letter queue, after `attempts` tries they go there (w_d) instead.
 */
export function mq(state: MqRouterState): Router {
  const poison = new Set<number>();
  const tries = new Map<number, number>();
  const finish = (p: { id: number; dead: boolean }) => {
    poison.delete(p.id);
    tries.delete(p.id);
    p.dead = true;
  };
  return {
    spawn(p, sim) {
      const mode = state.mode();
      if ((mode === "retry" || mode === "dlq") && sim.rand() < state.poisonShare()) poison.add(p.id);
      p.route.push(mode === "direct" ? { wire: "p_w", dir: 1, color: "cyan", end: "workers" } : { wire: "p_q", dir: 1, color: poison.has(p.id) ? "violet" : "cyan", end: "queue" });
    },
    arrive(p, leg, sim) {
      const at: Point = [p.x, p.y];
      const mode = state.mode();
      const bad = poison.has(p.id);
      switch (leg.end) {
        case "workers":
          if (mode === "direct") {
            const ok = sim.rand() >= state.failShare();
            if (!ok) p.kind = "miss";
            sim.emit({ kind: ok ? "pass" : "miss", node: "workers", at });
            p.route.push({ wire: "p_w", dir: -1, color: ok ? "green" : "red", end: "shop" });
          } else if (bad) {
            const n = (tries.get(p.id) ?? 0) + 1;
            tries.set(p.id, n);
            sim.emit({ kind: "miss", node: "workers", at });
            if (mode === "dlq" && n >= state.attempts) p.route.push({ wire: "w_d", dir: 1, color: "violet", end: "dlq" });
            else p.route.push({ wire: "q_w", dir: -1, color: "amber", end: "requeue" });
          } else {
            sim.emit({ kind: "pass", node: "workers", at });
            sim.emit({ kind: "reply", node: "workers", at, hit: true });
            finish(p);
          }
          break;
        case "queue":
          sim.emit({ kind: "fill", node: "queue", at });
          if (bad || sim.rand() < state.passShare()) p.route.push({ wire: "q_w", dir: 1, color: bad ? "violet" : "cyan", end: "workers" });
          else finish(p);
          break;
        case "requeue":
          p.route.push({ wire: "q_w", dir: 1, color: "violet", end: "workers" });
          break;
        case "dlq":
          sim.emit({ kind: "fill", node: "dlq", at });
          finish(p);
          break;
        case "shop":
          sim.emit({ kind: "reply", node: "shop", at, hit: p.kind !== "miss" });
          finish(p);
          break;
      }
    },
  };
}
