import { makeWire } from "../geometry";
import { rng } from "../rng";
import { Sim } from "../sim";
import { bloom } from "./bloom";

const w = (x1: number, y1: number, x2: number, y2: number) => makeWire([x1, y1], [x2, y2]);
const wires = { a_d: w(0, 0, 300, 0), a_f: w(0, 0, 100, 0), f_d: w(100, 0, 300, 0) };
const legs = (sim: Sim, x: string) => sim.events.filter((e) => e.kind === "leg" && e.wire === x).length / 2;
const spawns = (sim: Sim) => sim.events.filter((e) => e.kind === "spawn").length;
const count = (sim: Sim, kind: string, node: string) => sim.events.filter((e) => e.kind === kind && e.node === node).length;
function run(o: { filter: boolean; absent: number; fp: number }) {
  const sim = new Sim({ wires, router: bloom({ filterOn: () => o.filter, absentShare: () => o.absent, fpShare: () => o.fp }), rand: rng(53), ratePerSec: 20, speed: 600 });
  for (let t = 0; t < 30; t += 1 / 30) sim.step(1 / 30);
  sim.ratePerSec = 0;
  for (let t = 0; t < 10; t += 1 / 30) sim.step(1 / 30);
  return sim;
}

describe("bloom router", () => {
  it("without a filter, every lookup goes to the database", () => {
    const sim = run({ filter: false, absent: 0.8, fp: 0 });
    expect(legs(sim, "a_d")).toBe(spawns(sim));
    expect(legs(sim, "a_f")).toBe(0);
    expect(sim.packets).toHaveLength(0);
  });

  it("with a filter, missing keys are turned away; present ones and false positives go on", () => {
    const sim = run({ filter: true, absent: 0.8, fp: 0 });
    const n = spawns(sim);
    expect(legs(sim, "a_f")).toBe(n);
    expect(legs(sim, "f_d") / n).toBeGreaterThan(0.12);
    expect(legs(sim, "f_d") / n).toBeLessThan(0.3);
    expect(count(sim, "miss", "filter") + legs(sim, "f_d")).toBe(n);
    const fps = run({ filter: true, absent: 1, fp: 0.5 });
    expect(count(fps, "fill", "db")).toBeGreaterThan(0);
    expect(count(fps, "hit", "db")).toBe(0);
  });
});
