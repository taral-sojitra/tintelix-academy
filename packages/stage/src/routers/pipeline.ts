import type { Router } from "../sim";

/** Arrows leaving each box, and the box each arrow leads to. */
const NEXT: Record<string, string[]> = { mau: ["m0"], dau: ["m1", "s0"], avg: ["m2"], peak: ["m3"], cores: ["g0"], writes: ["s1"], year: ["s2"] };
const END: Record<string, string> = { m0: "dau", m1: "avg", m2: "peak", m3: "cores", g0: "growth", s0: "writes", s1: "year", s2: "stored" };

export interface PipelineState {
  /** Whether an arrow is shown yet. */
  visible(wire: string): boolean;
}

/** Tokens flow from monthly users along the arrows shown, choosing at random where a box has two. */
export function pipeline(state: PipelineState): Router {
  return {
    spawn(p) {
      p.route.push({ wire: "m0", dir: 1, color: "cyan", end: "dau" });
    },
    arrive(p, leg, sim) {
      const box = leg.end ?? "";
      sim.emit({ kind: "pass", node: box, at: [p.x, p.y] });
      const next = (NEXT[box] ?? []).filter((w) => state.visible(w));
      if (!next.length) {
        p.dead = true;
        return;
      }
      const wire = next[Math.floor(sim.rand() * next.length)]!;
      p.route.push({ wire, dir: 1, color: wire.startsWith("s") ? "violet" : "cyan", end: END[wire]! });
    },
  };
}
