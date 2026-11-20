import { makeWire } from "../geometry";
import { rng } from "../rng";
import { Sim, type SimEvent } from "../sim";
import { latency } from "./latency";

const wires = {
  users_app: makeWire([200, 100], [400, 100]),
  app_services: makeWire([600, 100], [760, 110]),
};
const runFor = (sim: Sim, seconds: number, dt = 1 / 30) => {
  for (let t = 0; t < seconds; t += dt) sim.step(dt);
};
const settle = (sim: Sim, seconds: number) => {
  runFor(sim, seconds);
  sim.ratePerSec = 0;
  runFor(sim, 30);
  expect(sim.packets).toHaveLength(0);
};
const count = (sim: Sim, kind: string) => sim.events.filter((e) => e.kind === kind).length;
const legs = (sim: Sim, wire: string) => sim.events.filter((e) => e.kind === "leg" && e.wire === wire).length;
const state = (o: Partial<Parameters<typeof latency>[0]> = {}) => ({
  fanOut: () => false,
  sample: () => 2,
  hold: () => 0.1,
  hue: () => "green" as const,
  ...o,
});

describe("latency router", () => {
  it("one call: every request goes to the app and back, never to the services", () => {
    const sim = new Sim({ wires, router: latency(state()), rand: rng(31), ratePerSec: 20, speed: 400 });
    settle(sim, 20);
    const spawned = count(sim, "spawn");
    expect(spawned).toBeGreaterThan(300);
    expect(legs(sim, "users_app")).toBe(2 * spawned);
    expect(legs(sim, "app_services")).toBe(0);
    expect(count(sim, "done")).toBe(spawned);
    expect(sim.events.filter((e) => e.kind === "work").every((e) => e.node === "app")).toBe(true);
  });

  it("fan-out: every page crosses app_services both ways and is worked on at the services", () => {
    const sim = new Sim({ wires, router: latency(state({ fanOut: () => true })), rand: rng(32), ratePerSec: 20, speed: 400 });
    settle(sim, 20);
    const spawned = count(sim, "spawn");
    expect(legs(sim, "app_services")).toBe(2 * spawned);
    expect(legs(sim, "users_app")).toBe(2 * spawned);
    const work = sim.events.filter((e) => e.kind === "work");
    expect(work).toHaveLength(spawned);
    expect(work.every((e) => e.node === "services")).toBe(true);
    expect(count(sim, "done")).toBe(spawned);
  });

  it("done carries the sampled latency, and the slow share follows sample()", () => {
    const r = rng(33);
    const sim = new Sim({ wires, router: latency(state({ sample: () => (r() < 0.2 ? 200 : 2) })), rand: rng(34), ratePerSec: 40, speed: 400 });
    runFor(sim, 60);
    const done = sim.events.filter((e): e is Extract<SimEvent, { kind: "done" }> => e.kind === "done");
    expect(done.length).toBeGreaterThan(2000);
    expect(done.every((e) => e.ms === 2 || e.ms === 200)).toBe(true);
    const slow = done.filter((e) => e.ms === 200).length / done.length;
    expect(slow).toBeGreaterThan(0.17);
    expect(slow).toBeLessThan(0.23);
  });

  it("a request waits hold(ms) in the app before it returns", () => {
    const sim = new Sim({ wires, router: latency(state({ hold: () => 1.5 })), rand: rng(35), ratePerSec: 0, speed: 400 });
    const p = sim.packet(0, [200, 100]);
    latency(state({ hold: () => 1.5 })).spawn(p, sim);
    sim.add(p);
    // 200 units at 400 a second reach the app in 0.5 s; then 1.5 s in the app; then 0.5 s back.
    runFor(sim, 0.5 + 1.4);
    expect(count(sim, "work")).toBe(1);
    expect(count(sim, "done")).toBe(0);
    runFor(sim, 0.75);
    expect(count(sim, "done")).toBe(1);
  });
});
