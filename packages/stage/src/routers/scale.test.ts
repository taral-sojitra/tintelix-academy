import { makeWire } from "../geometry";
import { rng } from "../rng";
import { Sim, type SimEvent } from "../sim";
import { scale } from "./scale";

const wires = { u_big: makeWire([150, 100], [400, 100]), u_lb: makeWire([150, 100], [210, 100]), lb_fleet: makeWire([350, 100], [400, 100]) };
const replies = (sim: Sim) => sim.events.filter((e): e is Extract<SimEvent, { kind: "reply" }> => e.kind === "reply");
function run(o: { horizontal: boolean; served: number }) {
  const sim = new Sim({ wires, router: scale({ horizontal: () => o.horizontal, served: () => o.served }), rand: rng(81), ratePerSec: 20, speed: 600 });
  for (let t = 0; t < 40; t += 1 / 30) sim.step(1 / 30);
  sim.ratePerSec = 0;
  for (let t = 0; t < 10; t += 1 / 30) sim.step(1 / 30);
  return sim;
}
const legs = (sim: Sim, w: string) => sim.events.filter((e) => e.kind === "leg" && e.wire === w).length;

describe("scale router", () => {
  it("one big server: requests go straight to it and back", () => {
    const sim = run({ horizontal: false, served: 1 });
    const n = sim.events.filter((e) => e.kind === "spawn").length;
    expect(legs(sim, "u_big")).toBe(2 * n);
    expect(legs(sim, "lb_fleet")).toBe(0);
    expect(replies(sim).every((r) => r.hit)).toBe(true);
  });

  it("a fleet: requests pass the load balancer, and the overflow share is dropped", () => {
    const sim = run({ horizontal: true, served: 0.6 });
    const n = sim.events.filter((e) => e.kind === "spawn").length;
    expect(legs(sim, "lb_fleet")).toBe(2 * n);
    expect(legs(sim, "u_big")).toBe(0);
    const ok = replies(sim).filter((r) => r.hit).length / replies(sim).length;
    expect(ok).toBeGreaterThan(0.55);
    expect(ok).toBeLessThan(0.65);
    expect(sim.packets).toHaveLength(0);
  });
});
