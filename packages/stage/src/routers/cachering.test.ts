import { makeWire } from "../geometry";
import { rng } from "../rng";
import { Sim } from "../sim";
import { cacheRing } from "./cachering";

const w = (x1: number, y1: number, x2: number, y2: number) => makeWire([x1, y1], [x2, y2]);
const wires = { a_c: w(0, 0, 100, 0), c_d: w(100, 0, 200, 50) };
function run(miss: number) {
  const sim = new Sim({ wires, router: cacheRing({ missShare: () => miss }), rand: rng(47), ratePerSec: 20, speed: 600 });
  for (let t = 0; t < 30; t += 1 / 30) sim.step(1 / 30);
  sim.ratePerSec = 0;
  for (let t = 0; t < 10; t += 1 / 30) sim.step(1 / 30);
  return sim;
}
const legs = (sim: Sim, x: string) => sim.events.filter((e) => e.kind === "leg" && e.wire === x).length / 2;
const spawns = (sim: Sim) => sim.events.filter((e) => e.kind === "spawn").length;

describe("cache ring router", () => {
  it("a warm cache answers everything itself", () => {
    const sim = run(0);
    expect(legs(sim, "c_d")).toBe(0);
    expect(sim.packets).toHaveLength(0);
  });
  it("moved keys go on to the database", () => {
    const sim = run(0.8);
    const share = legs(sim, "c_d") / spawns(sim);
    expect(share).toBeGreaterThan(0.7);
    expect(share).toBeLessThan(0.9);
  });
});
