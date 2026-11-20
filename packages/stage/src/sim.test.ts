import { makeWire } from "./geometry";
import { rng } from "./rng";
import { Queue, Sim, type Leg, type Packet, type Router } from "./sim";

const runFor = (sim: Sim, seconds: number, dt = 1 / 30) => {
  for (let t = 0; t < seconds; t += dt) sim.step(dt);
};

describe("rng", () => {
  it("is repeatable for a seed and stays in [0, 1)", () => {
    const a = rng(7), b = rng(7);
    const xs = Array.from({ length: 1000 }, () => a());
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
    expect(Array.from({ length: 1000 }, () => b())).toEqual(xs);
  });
});

describe("Queue", () => {
  it("serves packets one at a time, in arrival order, at 1/mu seconds each", () => {
    const q = new Queue(2);
    const mk = (id: number) => ({ id }) as Packet;
    q.push(mk(1)); q.push(mk(2)); q.push(mk(3));
    const served: { id: number; t: number }[] = [];
    for (let i = 1; i <= 31; i++) {
      for (const p of q.tick(0.05)) served.push({ id: p.id, t: i * 0.05 });
    }
    expect(served.map((s) => s.id)).toEqual([1, 2, 3]);
    expect(served[0]!.t).toBeCloseTo(0.5, 1);
    expect(q.waiting).toBe(0);
  });

  it.each([1 / 60, 1 / 30, 1 / 15])("keeps its service rate when the tick is %f s", (dt) => {
    const mu = 6.5 / 0.96;
    const q = new Queue(mu);
    for (let i = 0; i < 2000; i++) q.push({ id: i } as Packet);
    let served = 0;
    const ticks = Math.round(100 / dt);
    for (let i = 0; i < ticks; i++) served += q.tick(dt).length;
    expect(served).toBeGreaterThanOrEqual(Math.floor(mu * 100) - 1);
    expect(served).toBeLessThanOrEqual(Math.ceil(mu * 100) + 1);
  });
});

describe("wire pace", () => {
  const travel = (pace: number) => {
    const wires = { a_b: makeWire([0, 0], [400, 0], 48, pace) };
    let t = 0;
    let spawnedAt = -1;
    let arrivedAt = -1;
    const router: Router = {
      spawn(p) {
        if (spawnedAt < 0) spawnedAt = t;
        p.route.push({ wire: "a_b", dir: 1, color: "cyan", end: "b" });
      },
      arrive(p: Packet) {
        if (arrivedAt < 0) arrivedAt = t;
        p.dead = true;
      },
    };
    const sim = new Sim({ wires, router, rand: rng(3), ratePerSec: 0.5, speed: 400 });
    const dt = 1 / 240;
    for (; t < 60 && arrivedAt < 0; t += dt) sim.step(dt);
    return arrivedAt - spawnedAt;
  };

  it("a packet on a wire with pace 0.25 takes four times as long", () => {
    const ratio = travel(0.25) / travel(1);
    expect(ratio).toBeGreaterThan(3.9);
    expect(ratio).toBeLessThan(4.1);
  });
});

describe("Sim", () => {
  const wires = { a_b: makeWire([0, 0], [100, 0]) };
  const straight: Router = {
    spawn(p) { p.route.push({ wire: "a_b", dir: 1, color: "cyan", end: "b" }); },
    arrive(p: Packet, leg: Leg) { if (leg.end === "b") p.dead = true; },
  };

  it("spawns requests as a Poisson process at the given rate", () => {
    const sim = new Sim({ wires, router: straight, rand: rng(1), ratePerSec: 6.5, speed: 400 });
    runFor(sim, 60);
    const spawned = sim.events.filter((e) => e.kind === "spawn").length;
    expect(spawned).toBeGreaterThan(390 * 0.85);
    expect(spawned).toBeLessThan(390 * 1.15);
  });

  it("removes packets once they finish their route", () => {
    const sim = new Sim({ wires, router: straight, rand: rng(2), ratePerSec: 5, speed: 400 });
    runFor(sim, 10);
    sim.ratePerSec = 0;
    runFor(sim, 2);
    expect(sim.packets).toHaveLength(0);
  });

  it("keeps each packet's trail within the trail limit", () => {
    const sim = new Sim({ wires: { a_b: makeWire([0, 0], [4000, 0]) }, router: straight, rand: rng(3), ratePerSec: 3, speed: 400, trailLimit: 3 });
    runFor(sim, 3);
    expect(sim.packets.length).toBeGreaterThan(0);
    expect(Math.max(...sim.packets.map((p) => p.trail.length))).toBeLessThanOrEqual(3);
  });
});
