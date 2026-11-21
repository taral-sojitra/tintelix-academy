import { makeWire } from "../geometry";
import { rng } from "../rng";
import { Sim } from "../sim";
import { pipeline } from "./pipeline";

const w = (x1: number, y1: number, x2: number, y2: number) => makeWire([x1, y1], [x2, y2]);
const wires = { m0: w(0, 0, 100, 0), m1: w(100, 0, 200, 0), m2: w(200, 0, 300, 0), m3: w(300, 0, 400, 0), g0: w(400, 0, 400, 100), s0: w(100, 0, 100, 100), s1: w(100, 100, 200, 100), s2: w(200, 100, 300, 100) };
const legs = (sim: Sim, wire: string) => sim.events.filter((e) => e.kind === "leg" && e.wire === wire).length;

function run(visible: string[]) {
  const sim = new Sim({ wires, router: pipeline({ visible: (x) => visible.includes(x) }), rand: rng(71), ratePerSec: 20, speed: 600 });
  for (let t = 0; t < 20; t += 1 / 30) sim.step(1 / 30);
  sim.ratePerSec = 0;
  for (let t = 0; t < 10; t += 1 / 30) sim.step(1 / 30);
  return sim;
}

describe("pipeline router", () => {
  it("tokens follow only the arrows that are shown", () => {
    const sim = run(["m0", "m1"]);
    const spawned = sim.events.filter((e) => e.kind === "spawn").length;
    expect(spawned).toBeGreaterThan(300);
    expect(legs(sim, "m0")).toBe(spawned);
    expect(legs(sim, "m1")).toBe(spawned);
    expect(legs(sim, "m2") + legs(sim, "s0")).toBe(0);
    expect(sim.packets).toHaveLength(0);
  });

  it("with the storage branch shown, tokens split at daily users", () => {
    const sim = run(["m0", "m1", "m2", "m3", "s0", "s1", "s2"]);
    const spawned = sim.events.filter((e) => e.kind === "spawn").length;
    expect(legs(sim, "m1") + legs(sim, "s0")).toBe(spawned);
    expect(legs(sim, "s0") / spawned).toBeGreaterThan(0.35);
    expect(legs(sim, "s0") / spawned).toBeLessThan(0.65);
    expect(legs(sim, "s2")).toBe(legs(sim, "s0"));
  });
});
