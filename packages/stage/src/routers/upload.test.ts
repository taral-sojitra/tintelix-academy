import { makeWire } from "../geometry";
import { rng } from "../rng";
import { Sim } from "../sim";
import { upload } from "./upload";

const w = (x1: number, y1: number, x2: number, y2: number) => makeWire([x1, y1], [x2, y2]);
const wires = { p_a: w(0, 0, 100, 0), a_s: w(100, 0, 300, 0), p_s: w(0, 0, 300, 50) };
const legs = (sim: Sim, x: string) => sim.events.filter((e) => e.kind === "leg" && e.wire === x).length / 2;
const spawns = (sim: Sim) => sim.events.filter((e) => e.kind === "spawn").length;
function run(direct: boolean) {
  const sim = new Sim({ wires, router: upload({ direct: () => direct }), rand: rng(59), ratePerSec: 10, speed: 600 });
  for (let t = 0; t < 30; t += 1 / 30) sim.step(1 / 30);
  sim.ratePerSec = 0;
  for (let t = 0; t < 10; t += 1 / 30) sim.step(1 / 30);
  return sim;
}

describe("upload router", () => {
  it("through the app: phone → app → storage and back", () => {
    const sim = run(false);
    expect(legs(sim, "a_s")).toBe(spawns(sim));
    expect(legs(sim, "p_s")).toBe(0);
    expect(sim.packets).toHaveLength(0);
  });

  it("signed URL: ask the app, then upload straight to storage", () => {
    const sim = run(true);
    const n = spawns(sim);
    expect(legs(sim, "p_a")).toBe(n);
    expect(legs(sim, "p_s")).toBe(n);
    expect(legs(sim, "a_s")).toBe(0);
    expect(sim.packets).toHaveLength(0);
  });
});
