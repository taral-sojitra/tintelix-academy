import { makeWire } from "../geometry";
import { rng } from "../rng";
import { Sim } from "../sim";
import { fanout, type FanoutMode } from "./fanout";

const w = (x1: number, y1: number, x2: number, y2: number) => makeWire([x1, y1], [x2, y2]);
const wires = { a_w: w(0, 0, 100, 50), c_w: w(0, 100, 100, 50), w_f: w(100, 50, 300, 50) };
const legs = (sim: Sim, x: string) => sim.events.filter((e) => e.kind === "leg" && e.wire === x).length;
const spawns = (sim: Sim) => sim.events.filter((e) => e.kind === "spawn").length;
const count = (sim: Sim, kind: string, node: string) => sim.events.filter((e) => e.kind === kind && e.node === node).length;
function run(mode: FanoutMode, celeb: number) {
  const sim = new Sim({ wires, router: fanout({ mode: () => mode, celebShare: () => celeb }), rand: rng(83), ratePerSec: 10, speed: 600 });
  for (let t = 0; t < 30; t += 1 / 30) sim.step(1 / 30);
  sim.ratePerSec = 0;
  for (let t = 0; t < 10; t += 1 / 30) sim.step(1 / 30);
  return sim;
}

describe("fanout router", () => {
  it("push: posts flow from authors into the feeds", () => {
    const sim = run("push", 0);
    expect(count(sim, "fill", "feeds")).toBe(spawns(sim));
    expect(count(sim, "hit", "asha")).toBe(0);
    expect(sim.packets).toHaveLength(0);
  });
  it("pull: feed opens go back to the authors and return", () => {
    const sim = run("pull", 0.5);
    expect(count(sim, "hit", "asha") + count(sim, "hit", "celeb")).toBe(spawns(sim));
    expect(count(sim, "fill", "feeds")).toBe(0);
  });
  it("hybrid: celebrity activity is pulled, the rest pushed", () => {
    const sim = run("hybrid", 0.5);
    expect(count(sim, "hit", "asha")).toBe(0);
    expect(count(sim, "hit", "celeb") + count(sim, "fill", "feeds")).toBe(spawns(sim));
    expect(legs(sim, "c_w")).toBeGreaterThan(0);
  });
});
