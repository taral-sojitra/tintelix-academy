import { makeWire } from "../geometry";
import { rng } from "../rng";
import { Sim } from "../sim";
import { idem } from "./idem";

const w = (x1: number, y1: number, x2: number, y2: number) => makeWire([x1, y1], [x2, y2]);
const wires = { c_a: w(0, 0, 100, 0), a_b: w(100, 0, 300, 0), a_k: w(100, 0, 200, 80) };
const spawns = (sim: Sim) => sim.events.filter((e) => e.kind === "spawn").length;
const count = (sim: Sim, kind: string, node: string) => sim.events.filter((e) => e.kind === kind && e.node === node).length;
function run(mode: number, lost: number, dup: number) {
  const sim = new Sim({ wires, router: idem({ mode: () => mode, lostShare: () => lost, dupShare: () => dup }), rand: rng(73), ratePerSec: 10, speed: 600 });
  for (let t = 0; t < 30; t += 1 / 30) sim.step(1 / 30);
  sim.ratePerSec = 0;
  for (let t = 0; t < 20; t += 1 / 30) sim.step(1 / 30);
  return sim;
}

describe("idem router", () => {
  it("no key: every lost reply leads to a second charge", () => {
    const sim = run(0, 1, 0);
    expect(count(sim, "miss", "bank")).toBe(spawns(sim));
    expect(sim.packets).toHaveLength(0);
  });
  it("with a key: the retry gets the saved result and the bank is charged once", () => {
    const sim = run(1, 1, 0);
    expect(count(sim, "miss", "bank")).toBe(0);
    expect(count(sim, "hit", "keys")).toBe(spawns(sim));
  });
  it("check-then-insert lets a simultaneous duplicate through; an atomic claim doesn't", () => {
    expect(count(run(1, 0, 1), "miss", "bank")).toBeGreaterThan(0);
    const atomic = run(2, 0, 1);
    expect(count(atomic, "miss", "bank")).toBe(0);
    expect(count(atomic, "fill", "keys")).toBe(spawns(atomic));
  });
});
