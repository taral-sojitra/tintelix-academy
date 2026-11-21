import { makeWire } from "../geometry";
import { rng } from "../rng";
import { Sim } from "../sim";
import { retry, type RetryRouterState } from "./retry";

const w = (x1: number, y1: number, x2: number, y2: number) => makeWire([x1, y1], [x2, y2]);
const wires = { u_b: w(0, 0, 100, 0), b_c: w(100, 0, 300, 0), b_k: w(100, 0, 200, 0), k_c: w(200, 0, 300, 0) };
const spawns = (sim: Sim) => sim.events.filter((e) => e.kind === "spawn").length;
const count = (sim: Sim, kind: string, node: string) => sim.events.filter((e) => e.kind === kind && e.node === node).length;
const replies = (sim: Sim, hit: boolean) => sim.events.filter((e) => e.kind === "reply" && e.hit === hit).length;
function run(o: Partial<RetryRouterState>) {
  const state: RetryRouterState = { healthy: () => true, hasBreaker: () => false, open: () => false, attempts: 3, ...o };
  const sim = new Sim({ wires, router: retry(state), rand: rng(101), ratePerSec: 10, speed: 600 });
  for (let t = 0; t < 30; t += 1 / 30) sim.step(1 / 30);
  sim.ratePerSec = 0;
  for (let t = 0; t < 20; t += 1 / 30) sim.step(1 / 30);
  return sim;
}

describe("retry router", () => {
  it("healthy: one call each, all answered", () => {
    const sim = run({});
    expect(count(sim, "pass", "pricing")).toBe(spawns(sim));
    expect(replies(sim, false)).toBe(0);
    expect(sim.packets).toHaveLength(0);
  });
  it("slow: every request tries three times and still fails", () => {
    const sim = run({ healthy: () => false });
    expect(count(sim, "miss", "pricing")).toBe(3 * spawns(sim));
    expect(replies(sim, false)).toBe(spawns(sim));
  });
  it("open breaker: fails at once, pricing sees nothing", () => {
    const sim = run({ healthy: () => false, hasBreaker: () => true, open: () => true });
    expect(count(sim, "miss", "pricing") + count(sim, "pass", "pricing")).toBe(0);
    expect(count(sim, "fill", "breaker")).toBe(spawns(sim));
    expect(sim.packets).toHaveLength(0);
  });
});
