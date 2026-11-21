import { makeWire } from "../geometry";
import { rng } from "../rng";
import { Sim } from "../sim";
import { repl, type ReplRouterState } from "./repl";

const w = (x1: number, y1: number, x2: number, y2: number) => makeWire([x1, y1], [x2, y2]);
const wires = { a_p: w(0, 0, 100, -50), a_r0: w(0, 0, 200, 0), a_r1: w(0, 0, 200, 50), a_r2: w(0, 0, 200, 100) };
const legs = (sim: Sim, x: string) => sim.events.filter((e) => e.kind === "leg" && e.wire === x).length / 2;
const replies = (sim: Sim, hit: boolean) => sim.events.filter((e) => e.kind === "reply" && e.hit === hit).length;
const spawns = (sim: Sim) => sim.events.filter((e) => e.kind === "spawn").length;
function run(o: Partial<ReplRouterState>) {
  const state: ReplRouterState = { writeTarget: () => "primary", readers: () => ["r0", "r1"], readBackPrimary: () => false, staleShare: () => 0, writeShare: 0.2, readBackShare: 0.2, ...o };
  const sim = new Sim({ wires, router: repl(state), rand: rng(41), ratePerSec: 20, speed: 600 });
  for (let t = 0; t < 30; t += 1 / 30) sim.step(1 / 30);
  sim.ratePerSec = 0;
  for (let t = 0; t < 10; t += 1 / 30) sim.step(1 / 30);
  return sim;
}

describe("replication router", () => {
  it("writes go to the primary, reads round-robin over the replicas", () => {
    const sim = run({});
    const n = spawns(sim);
    expect(legs(sim, "a_p") / n).toBeGreaterThan(0.12);
    expect(legs(sim, "a_p") / n).toBeLessThan(0.3);
    expect(Math.abs(legs(sim, "a_r0") - legs(sim, "a_r1"))).toBeLessThanOrEqual(1);
    expect(legs(sim, "a_r2")).toBe(0);
    expect(replies(sim, false)).toBe(0);
    expect(sim.packets).toHaveLength(0);
  });

  it("stale read-backs come back red; sending them to the primary fixes it", () => {
    const stale = run({ staleShare: () => 1 });
    expect(replies(stale, false) / spawns(stale)).toBeGreaterThan(0.12);
    const fixed = run({ staleShare: () => 1, readBackPrimary: () => true });
    expect(replies(fixed, false)).toBe(0);
  });

  it("while nobody takes writes, writes fail; after promotion they go to the new primary", () => {
    const down = run({ writeTarget: () => null });
    expect(replies(down, false) / spawns(down)).toBeGreaterThan(0.12);
    const promoted = run({ writeTarget: () => "r0", readers: () => ["r1"] });
    expect(legs(promoted, "a_p")).toBe(0);
    expect(replies(promoted, false)).toBe(0);
    expect(legs(promoted, "a_r1")).toBeGreaterThan(legs(promoted, "a_r0"));
  });
});
