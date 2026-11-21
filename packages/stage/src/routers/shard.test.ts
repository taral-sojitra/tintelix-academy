import { makeWire } from "../geometry";
import { rng } from "../rng";
import { Sim } from "../sim";
import { shard } from "./shard";

const w = (x1: number, y1: number, x2: number, y2: number) => makeWire([x1, y1], [x2, y2]);
const wires: Record<string, ReturnType<typeof w>> = { a_r: w(0, 0, 50, 0) };
for (let k = 0; k < 3; k++) wires[`r_s${k}`] = w(50, 0, 200, k * 40);
const legs = (sim: Sim, x: string) => sim.events.filter((e) => e.kind === "leg" && e.wire === x).length / 2;
const replies = (sim: Sim, hit: boolean) => sim.events.filter((e) => e.kind === "reply" && e.hit === hit).length;
const spawns = (sim: Sim) => sim.events.filter((e) => e.kind === "spawn").length;
function run(weights: number[], fail: number[] = [0, 0, 0]) {
  const sim = new Sim({ wires, router: shard({ weights: () => weights, failShare: (k) => fail[k] ?? 0 }), rand: rng(43), ratePerSec: 20, speed: 600 });
  for (let t = 0; t < 30; t += 1 / 30) sim.step(1 / 30);
  sim.ratePerSec = 0;
  for (let t = 0; t < 10; t += 1 / 30) sim.step(1 / 30);
  return sim;
}

describe("shard router", () => {
  it("sends writes to shards in proportion to their load", () => {
    const sim = run([1, 1, 2]);
    const n = spawns(sim);
    expect(legs(sim, "r_s2") / n).toBeGreaterThan(0.4);
    expect(legs(sim, "r_s2") / n).toBeLessThan(0.6);
    expect(legs(sim, "r_s0") + legs(sim, "r_s1") + legs(sim, "r_s2")).toBe(n);
    expect(sim.packets).toHaveLength(0);
  });

  it("a shard with no share gets nothing; an overloaded one fails some", () => {
    const sim = run([0, 0, 1], [0, 0, 0.75]);
    expect(legs(sim, "r_s0")).toBe(0);
    const failed = replies(sim, false) / spawns(sim);
    expect(failed).toBeGreaterThan(0.6);
    expect(failed).toBeLessThan(0.9);
  });
});
