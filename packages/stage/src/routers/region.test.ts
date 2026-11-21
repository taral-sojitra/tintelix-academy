import { makeWire } from "../geometry";
import { rng } from "../rng";
import { Sim } from "../sim";
import { region, type RegionRouterState } from "./region";

const w = (x1: number, y1: number, x2: number, y2: number) => makeWire([x1, y1], [x2, y2]);
const wires = { uA_r: w(0, 0, 200, 0), uB_r: w(600, 0, 400, 0), r_aA: w(200, 0, 100, 200), r_aB: w(400, 0, 500, 200), aA_dA: w(100, 200, 100, 300), aB_dB: w(500, 200, 500, 300), dA_dB: w(100, 300, 500, 300) };
const count = (sim: Sim, kind: string, node: string) => sim.events.filter((e) => e.kind === kind && e.node === node).length;
const replies = (sim: Sim, node: string, hit: boolean) => sim.events.filter((e) => e.kind === "reply" && e.node === node && e.hit === hit).length;
function run(o: Partial<RegionRouterState>) {
  const state: RegionRouterState = { serve: () => 0, up: () => true, copies: () => [], ...o };
  const sim = new Sim({ wires, router: region(state), rand: rng(30), ratePerSec: 10, speed: 600 });
  for (let t = 0; t < 30; t += 1 / 30) sim.step(1 / 30);
  sim.ratePerSec = 0;
  for (let t = 0; t < 20; t += 1 / 30) sim.step(1 / 30);
  return sim;
}

describe("region router", () => {
  it("active-passive: both groups are served by Mumbai, and answered", () => {
    const sim = run({ copies: () => [[0, 1]] });
    expect(count(sim, "dbIn", "dbA")).toBeGreaterThan(20);
    expect(count(sim, "dbIn", "dbB")).toBe(0);
    expect(replies(sim, "usersA", true)).toBeGreaterThan(5);
    expect(replies(sim, "usersB", true)).toBeGreaterThan(5);
    expect(count(sim, "fill", "dbB")).toBeGreaterThan(5);
    expect(count(sim, "fill", "dbA")).toBe(0);
    expect(sim.packets).toHaveLength(0);
  });
  it("active-active: each group stays in its own region; copies go both ways", () => {
    const sim = run({ serve: (g) => g, copies: () => [[0, 1], [1, 0]] });
    expect(count(sim, "dbIn", "dbA")).toBeGreaterThan(5);
    expect(count(sim, "dbIn", "dbB")).toBeGreaterThan(5);
    expect(count(sim, "fill", "dbA")).toBeGreaterThan(2);
    expect(count(sim, "fill", "dbB")).toBeGreaterThan(2);
  });
  it("a dead region refuses its requests; nothing reaches its database", () => {
    const sim = run({ up: (r) => r === 1 });
    expect(count(sim, "miss", "appA")).toBeGreaterThan(10);
    expect(count(sim, "dbIn", "dbA")).toBe(0);
    expect(replies(sim, "usersA", true) + replies(sim, "usersB", true)).toBe(0);
    expect(replies(sim, "usersA", false)).toBeGreaterThan(5);
  });
});
