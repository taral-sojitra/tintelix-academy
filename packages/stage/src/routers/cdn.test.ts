import { makeWire } from "../geometry";
import { rng } from "../rng";
import { Sim } from "../sim";
import { cdn } from "./cdn";

const wires = {
  u_origin: makeWire([180, 240], [760, 240], 48, 0.3),
  u_edge: makeWire([180, 240], [230, 170]),
  edge_origin: makeWire([380, 170], [760, 220], 48, 0.3),
};
const runFor = (sim: Sim, seconds: number, dt = 1 / 30) => {
  for (let t = 0; t < seconds; t += dt) sim.step(dt);
};
/** Runs with requests arriving, then lets every request in flight finish. */
const settle = (sim: Sim, seconds: number) => {
  runFor(sim, seconds);
  sim.ratePerSec = 0;
  runFor(sim, 30);
  expect(sim.packets).toHaveLength(0);
};
const count = (sim: Sim, kind: string) => sim.events.filter((e) => e.kind === kind).length;
const legs = (sim: Sim, wire: string) => sim.events.filter((e) => e.kind === "leg" && e.wire === wire).length;

describe("CDN router", () => {
  it("with no edge, every request crosses u_origin both ways", () => {
    const sim = new Sim({ wires, router: cdn({ hasEdge: () => false, hitRate: () => 0.9 }), rand: rng(21), ratePerSec: 20, speed: 400 });
    settle(sim, 20);
    const spawned = count(sim, "spawn");
    expect(spawned).toBeGreaterThan(300);
    expect(legs(sim, "u_origin")).toBe(2 * spawned);
    expect(legs(sim, "u_edge") + legs(sim, "edge_origin")).toBe(0);
    expect(count(sim, "reply")).toBe(spawned);
  });

  it("with an edge, the hit share follows hitRate", () => {
    const sim = new Sim({ wires, router: cdn({ hasEdge: () => true, hitRate: () => 0.9 }), rand: rng(22), ratePerSec: 40, speed: 400 });
    runFor(sim, 60);
    const hits = count(sim, "hit"), misses = count(sim, "miss");
    expect(hits + misses).toBeGreaterThan(2000);
    expect(hits / (hits + misses)).toBeGreaterThan(0.87);
    expect(hits / (hits + misses)).toBeLessThan(0.93);
  });

  it("every miss crosses edge_origin both ways and stores exactly one copy; hits never touch it", () => {
    const sim = new Sim({ wires, router: cdn({ hasEdge: () => true, hitRate: () => 0.5 }), rand: rng(23), ratePerSec: 20, speed: 400 });
    settle(sim, 20);
    const hits = count(sim, "hit"), misses = count(sim, "miss");
    expect(misses).toBeGreaterThan(50);
    expect(count(sim, "fill")).toBe(misses);
    expect(legs(sim, "edge_origin")).toBe(2 * misses);
    expect(legs(sim, "u_edge")).toBe(2 * (hits + misses));
    expect(legs(sim, "u_origin")).toBe(0);
    const replies = sim.events.filter((e) => e.kind === "reply") as { hit: boolean }[];
    expect(replies.filter((r) => r.hit)).toHaveLength(hits);
  });
});
