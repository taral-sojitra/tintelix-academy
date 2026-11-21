import { makeWire } from "../geometry";
import { rng } from "../rng";
import { Sim } from "../sim";
import { micro } from "./micro";

const w = (x1: number, y1: number, x2: number, y2: number) => makeWire([x1, y1], [x2, y2]);
const wires = { u_m: w(0, 0, 100, 0), u_o: w(0, 0, 100, 0), u_q: w(0, 0, 100, 100), o_users: w(100, 0, 200, -50), o_pay: w(100, 0, 200, 50) };
const legs = (sim: Sim, x: string) => sim.events.filter((e) => e.kind === "leg" && e.wire === x).length / 2;
const spawns = (sim: Sim) => sim.events.filter((e) => e.kind === "spawn").length;
function run(split: boolean) {
  const sim = new Sim({ wires, router: micro({ split: () => split, checkoutCalls: ["users", "pay"], searchShare: 0.25 }), rand: rng(97), ratePerSec: 10, speed: 600 });
  for (let t = 0; t < 30; t += 1 / 30) sim.step(1 / 30);
  sim.ratePerSec = 0;
  for (let t = 0; t < 10; t += 1 / 30) sim.step(1 / 30);
  return sim;
}

describe("micro router", () => {
  it("monolith: one hop in and out", () => {
    const sim = run(false);
    expect(legs(sim, "u_m")).toBe(spawns(sim));
    expect(sim.packets).toHaveLength(0);
  });
  it("split: each checkout calls every service in turn; searches go straight to search", () => {
    const sim = run(true);
    const n = spawns(sim);
    expect(legs(sim, "u_o")).toBe(legs(sim, "o_users"));
    expect(legs(sim, "o_pay")).toBe(legs(sim, "o_users"));
    expect(legs(sim, "u_o") + legs(sim, "u_q")).toBe(n);
    expect(sim.packets).toHaveLength(0);
  });
});
