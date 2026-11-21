import { makeWire } from "../geometry";
import { rng } from "../rng";
import { Sim } from "../sim";
import { gateway } from "./gateway";

const w = (x1: number, y1: number, x2: number, y2: number) => makeWire([x1, y1], [x2, y2]);
const wires: Record<string, ReturnType<typeof w>> = { p_g: w(0, 0, 100, 0) };
for (let k = 0; k < 3; k++) {
  wires[`p_s${k}`] = w(0, 0, 300, k * 40);
  wires[`g_s${k}`] = w(100, 0, 300, k * 40);
}
const legs = (sim: Sim, x: string) => sim.events.filter((e) => e.kind === "leg" && e.wire === x).length / 2;
const spawns = (sim: Sim) => sim.events.filter((e) => e.kind === "spawn").length;
function run(mode: number) {
  const sim = new Sim({ wires, router: gateway({ mode: () => mode, services: 3, screen: [0, 2] }), rand: rng(89), ratePerSec: 10, speed: 600 });
  for (let t = 0; t < 30; t += 1 / 30) sim.step(1 / 30);
  sim.ratePerSec = 0;
  for (let t = 0; t < 10; t += 1 / 30) sim.step(1 / 30);
  return sim;
}

describe("gateway router", () => {
  it("no gateway: the phone calls services directly", () => {
    const sim = run(0);
    expect(legs(sim, "p_s0") + legs(sim, "p_s1") + legs(sim, "p_s2")).toBe(spawns(sim));
    expect(legs(sim, "p_g")).toBe(0);
    expect(sim.packets).toHaveLength(0);
  });
  it("gateway: every call goes through it", () => {
    const sim = run(1);
    expect(legs(sim, "p_g")).toBe(spawns(sim));
    expect(legs(sim, "g_s0") + legs(sim, "g_s1") + legs(sim, "g_s2")).toBe(spawns(sim));
  });
  it("aggregation: one phone call, the screen's services in turn", () => {
    const sim = run(2);
    const n = spawns(sim);
    expect(legs(sim, "p_g")).toBe(n);
    expect(legs(sim, "g_s0")).toBe(n);
    expect(legs(sim, "g_s2")).toBe(n);
    expect(legs(sim, "g_s1")).toBe(0);
    expect(sim.packets).toHaveLength(0);
  });
});
