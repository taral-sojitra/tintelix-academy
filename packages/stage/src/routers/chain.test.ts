import { makeWire } from "../geometry";
import { rng } from "../rng";
import { Sim, type SimEvent } from "../sim";
import { chain, CHAIN_MAX } from "./chain";

const wires = Object.fromEntries(Array.from({ length: CHAIN_MAX }, (_, i) => [`w${i}`, makeWire([100 + i * 134, 100], [222 + i * 134, 100])]));
const replies = (sim: Sim) => sim.events.filter((e): e is Extract<SimEvent, { kind: "reply" }> => e.kind === "reply");

function run(o: { services: number; up: (tier: number) => boolean; seconds?: number }) {
  const sim = new Sim({ wires, router: chain({ services: () => o.services, pick: (t) => (o.up(t) ? 0 : -1) }), rand: rng(61), ratePerSec: 20, speed: 900 });
  for (let t = 0; t < (o.seconds ?? 20); t += 1 / 30) sim.step(1 / 30);
  sim.ratePerSec = 0;
  for (let t = 0; t < 30; t += 1 / 30) sim.step(1 / 30);
  return sim;
}

describe("chain router", () => {
  it("with every service up, each request crosses the whole path and comes back", () => {
    const sim = run({ services: 3, up: () => true });
    const spawned = sim.events.filter((e) => e.kind === "spawn").length;
    expect(spawned).toBeGreaterThan(300);
    expect(replies(sim).every((r) => r.hit)).toBe(true);
    expect(replies(sim)).toHaveLength(spawned);
    const legs = (w: string) => sim.events.filter((e) => e.kind === "leg" && e.wire === w).length;
    expect(legs("w0")).toBe(2 * spawned);
    expect(legs("w2")).toBe(2 * spawned);
    expect(legs("w3")).toBe(0);
  });

  it("a request stops at the first service that is down and comes back as a failure", () => {
    const sim = run({ services: 4, up: (t) => t !== 1 });
    expect(replies(sim).length).toBeGreaterThan(300);
    expect(replies(sim).every((r) => !r.hit)).toBe(true);
    expect(sim.events.filter((e) => e.kind === "miss").every((e) => e.node === "t1")).toBe(true);
    expect(sim.events.filter((e) => e.kind === "leg" && e.wire === "w2")).toHaveLength(0);
    expect(sim.packets).toHaveLength(0);
  });
});
