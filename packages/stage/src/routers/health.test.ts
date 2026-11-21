import { makeWire } from "../geometry";
import { rng } from "../rng";
import { Sim } from "../sim";
import { health } from "./health";

const w = (x1: number, y1: number, x2: number, y2: number) => makeWire([x1, y1], [x2, y2]);
const wires: Record<string, ReturnType<typeof w>> = { u_lb: w(0, 0, 100, 0) };
for (let k = 0; k < 4; k++) wires[`lb_s${k}`] = w(100, 0, 300, k * 40);
const legs = (sim: Sim, x: string) => sim.events.filter((e) => e.kind === "leg" && e.wire === x).length / 2;
const replies = (sim: Sim, hit: boolean) => sim.events.filter((e) => e.kind === "reply" && e.hit === hit).length;
function run(o: { rotation: string[]; faulty?: string; overloadFail?: number }) {
  const sim = new Sim({ wires, router: health({ rotation: () => o.rotation, faulty: () => o.faulty ?? null, overloadFail: () => o.overloadFail ?? 0 }), rand: rng(23), ratePerSec: 20, speed: 600 });
  for (let t = 0; t < 30; t += 1 / 30) sim.step(1 / 30);
  sim.ratePerSec = 0;
  for (let t = 0; t < 10; t += 1 / 30) sim.step(1 / 30);
  return sim;
}

describe("health router", () => {
  it("round-robins over the servers in rotation, and the faulty one's requests fail", () => {
    const sim = run({ rotation: ["s0", "s1", "s2", "s3"], faulty: "s2" });
    const n = sim.events.filter((e) => e.kind === "spawn").length;
    for (const s of ["s0", "s1", "s2", "s3"]) expect(Math.abs(legs(sim, `lb_${s}`) - n / 4)).toBeLessThanOrEqual(1);
    expect(Math.abs(replies(sim, false) - n / 4)).toBeLessThanOrEqual(1);
    expect(sim.events.some((e) => e.kind === "miss" && e.node === "s2")).toBe(true);
    expect(sim.packets).toHaveLength(0);
  });

  it("skips servers out of rotation", () => {
    const sim = run({ rotation: ["s0", "s1", "s3"], faulty: "s2" });
    expect(legs(sim, "lb_s2")).toBe(0);
    expect(replies(sim, false)).toBe(0);
  });

  it("with nobody in rotation, every request fails at the balancer", () => {
    const sim = run({ rotation: [] });
    const n = sim.events.filter((e) => e.kind === "spawn").length;
    expect(replies(sim, false)).toBe(n);
    expect(sim.events.some((e) => e.kind === "miss" && e.node === "lb")).toBe(true);
  });

  it("overloaded servers drop about their share", () => {
    const sim = run({ rotation: ["s0", "s1"], overloadFail: 0.25 });
    const n = sim.events.filter((e) => e.kind === "spawn").length;
    const failed = replies(sim, false) / n;
    expect(failed).toBeGreaterThan(0.15);
    expect(failed).toBeLessThan(0.35);
  });
});
