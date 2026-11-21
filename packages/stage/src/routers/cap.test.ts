import { makeWire } from "../geometry";
import { rng } from "../rng";
import { Sim } from "../sim";
import { cap, type CapMode } from "./cap";

const w = (x1: number, y1: number, x2: number, y2: number) => makeWire([x1, y1], [x2, y2]);
const wires = { ua_n1: w(0, 0, 200, 0), ua_n2: w(0, 0, 200, 50), ub_n3: w(0, 100, 200, 150) };
const replies = (sim: Sim, hit: boolean) => sim.events.filter((e) => e.kind === "reply" && e.hit === hit).length;
const spawns = (sim: Sim) => sim.events.filter((e) => e.kind === "spawn").length;
const count = (sim: Sim, kind: string) => sim.events.filter((e) => e.kind === kind).length;
function run(mode: CapMode) {
  const sim = new Sim({ wires, router: cap({ mode: () => mode, sideBShare: () => 0.3 }), rand: rng(61), ratePerSec: 20, speed: 600 });
  for (let t = 0; t < 30; t += 1 / 30) sim.step(1 / 30);
  sim.ratePerSec = 0;
  for (let t = 0; t < 10; t += 1 / 30) sim.step(1 / 30);
  return sim;
}

describe("cap router", () => {
  it("healthy: everyone answered", () => {
    const sim = run("healthy");
    expect(replies(sim, false)).toBe(0);
    expect(count(sim, "fill")).toBe(0);
    expect(sim.packets).toHaveLength(0);
  });
  it("CP: about the side-B share is refused", () => {
    const sim = run("cp");
    const share = replies(sim, false) / spawns(sim);
    expect(share).toBeGreaterThan(0.2);
    expect(share).toBeLessThan(0.4);
  });
  it("AP: nobody refused, side B answers possibly stale", () => {
    const sim = run("ap");
    expect(replies(sim, false)).toBe(0);
    expect(count(sim, "fill") / spawns(sim)).toBeGreaterThan(0.2);
  });
});
