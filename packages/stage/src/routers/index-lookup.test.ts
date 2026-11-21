import { makeWire } from "../geometry";
import { rng } from "../rng";
import { Sim } from "../sim";
import { indexLookup } from "./index-lookup";

const w = (x1: number, y1: number, x2: number, y2: number) => makeWire([x1, y1], [x2, y2]);
const wires = { a_t: w(0, 0, 300, 0), a_x: w(0, 0, 30, 0), x_t: w(200, 0, 300, 0) };
const legs = (sim: Sim, x: string) => sim.events.filter((e) => e.kind === "leg" && e.wire === x).length / 2;
function run(viaTree: boolean) {
  const sim = new Sim({ wires, router: indexLookup({ viaTree: () => viaTree }), rand: rng(37), ratePerSec: 10, speed: 600 });
  for (let t = 0; t < 30; t += 1 / 30) sim.step(1 / 30);
  sim.ratePerSec = 0;
  for (let t = 0; t < 10; t += 1 / 30) sim.step(1 / 30);
  return sim;
}
const spawns = (sim: Sim) => sim.events.filter((e) => e.kind === "spawn").length;

describe("index lookup router", () => {
  it("without an index, queries go straight to the table", () => {
    const sim = run(false);
    expect(legs(sim, "a_t")).toBe(spawns(sim));
    expect(legs(sim, "a_x")).toBe(0);
    expect(sim.packets).toHaveLength(0);
  });

  it("with an index, queries pass through the tree, then the table", () => {
    const sim = run(true);
    expect(legs(sim, "a_x")).toBe(spawns(sim));
    expect(legs(sim, "x_t")).toBe(spawns(sim));
    expect(sim.events.filter((e) => e.kind === "hit" && e.node === "tree").length).toBe(spawns(sim));
  });
});
