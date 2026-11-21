import { makeWire } from "../geometry";
import { rng } from "../rng";
import { Sim } from "../sim";
import { limit } from "./limit";

const w = (x1: number, y1: number, x2: number, y2: number) => makeWire([x1, y1], [x2, y2]);
const wires = { n_l: w(0, 0, 100, 50), f_l: w(0, 100, 100, 50), l_a: w(100, 50, 300, 50) };
const spawns = (sim: Sim) => sim.events.filter((e) => e.kind === "spawn").length;
const count = (sim: Sim, kind: string, node: string) => sim.events.filter((e) => e.kind === kind && e.node === node).length;
function run(flood: number, refuse: number, overload: number) {
  const sim = new Sim({ wires, router: limit({ flooderShare: () => flood, refuseShare: () => refuse, overloadShare: () => overload }), rand: rng(79), ratePerSec: 20, speed: 600 });
  for (let t = 0; t < 30; t += 1 / 30) sim.step(1 / 30);
  sim.ratePerSec = 0;
  for (let t = 0; t < 10; t += 1 / 30) sim.step(1 / 30);
  return sim;
}

describe("limit router", () => {
  it("no limit: the API drops its overload share", () => {
    const sim = run(0.5, 0, 0.6);
    const dropped = count(sim, "miss", "api") / spawns(sim);
    expect(dropped).toBeGreaterThan(0.5);
    expect(dropped).toBeLessThan(0.7);
    expect(sim.packets).toHaveLength(0);
  });
  it("a limit refuses the flooder at the limiter, and normal users get through", () => {
    const sim = run(0.5, 1, 0);
    const refused = count(sim, "fill", "limiter") / spawns(sim);
    expect(refused).toBeGreaterThan(0.4);
    expect(refused).toBeLessThan(0.6);
    expect(count(sim, "miss", "api")).toBe(0);
  });
});
