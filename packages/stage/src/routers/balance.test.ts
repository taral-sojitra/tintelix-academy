import { makeWire } from "../geometry";
import { rng } from "../rng";
import { Sim, type SimEvent } from "../sim";
import { balance, MAX_LINE } from "./balance";

const wires = { u_lb: makeWire([150, 200], [220, 200]), lb_s0: makeWire([340, 200], [480, 100]), lb_s1: makeWire([340, 200], [480, 220]), lb_s2: makeWire([340, 200], [480, 340]) };
function run(o: { pick: (heavy: boolean) => string; heavy: number; seconds?: number; mu?: number }) {
  const sim = new Sim({ wires, router: balance({ pick: (_sim, heavy) => o.pick(heavy), heavyShare: () => o.heavy, workSec: (heavy) => (heavy ? 2 : 0.1), now: () => 0, ms: () => 0 }), rand: rng(91), ratePerSec: 12, speed: 600, queues: { s0: 10, s1: 10, s2: 10 } });
  for (let t = 0; t < (o.seconds ?? 40); t += 1 / 30) sim.step(1 / 30);
  sim.ratePerSec = 0;
  for (let t = 0; t < 60; t += 1 / 30) sim.step(1 / 30);
  return sim;
}
const legs = (sim: Sim, w: string) => sim.events.filter((e) => e.kind === "leg" && e.wire === w).length;
const replies = (sim: Sim) => sim.events.filter((e): e is Extract<SimEvent, { kind: "reply" }> => e.kind === "reply");

describe("balance router", () => {
  it("every request reaches the server the policy picks, is served and returns", () => {
    let i = 0;
    const sim = run({ pick: () => `s${i++ % 3}`, heavy: 0 });
    const n = sim.events.filter((e) => e.kind === "spawn").length;
    expect(n).toBeGreaterThan(300);
    for (const w of ["lb_s0", "lb_s1", "lb_s2"]) expect(legs(sim, w)).toBeGreaterThan((2 * n) / 3 - 4);
    expect(replies(sim)).toHaveLength(n);
    expect(sim.packets).toHaveLength(0);
  });

  it("marks the heavy share and routes it as asked", () => {
    const sim = run({ pick: (heavy) => (heavy ? "s2" : "s0"), heavy: 0.1, seconds: 30 });
    const n = sim.events.filter((e) => e.kind === "spawn").length;
    const share = legs(sim, "lb_s2") / 2 / n;
    expect(share).toBeGreaterThan(0.06);
    expect(share).toBeLessThan(0.14);
    expect(legs(sim, "lb_s1")).toBe(0);
  });

  it("a server whose line is full turns new requests away", () => {
    const sim = run({ pick: () => "s0", heavy: 1, seconds: 20 });
    expect(replies(sim).some((r) => !r.hit)).toBe(true);
    expect(sim.events.filter((e) => e.kind === "miss").length).toBeGreaterThan(0);
    expect(MAX_LINE).toBeGreaterThan(5);
  });
});
