import { makeWire } from "../geometry";
import { rng } from "../rng";
import { Sim, type SimEvent } from "../sim";
import { queueRouter } from "./queue";

const wires = { users_app: makeWire([200, 100], [300, 100]) };
const SPEED = 400;

function setup(o: { workers: number; rate: number; mu: number; seed: number }) {
  let t = 0;
  const names = ["w0", "w1", "w2", "w3"];
  const picks: string[] = [];
  const router = queueRouter({
    pick: (sim) => {
      const n = names.slice(0, o.workers).reduce((best, x) => (load(sim, x) < load(sim, best) ? x : best));
      picks.push(n);
      return n;
    },
    now: () => t,
    ms: (sec) => sec * 100,
    hue: () => "green",
  });
  const load = (sim: Sim, n: string) => sim.queues[n]!.waiting + (sim.queues[n]!.serving ? 1 : 0);
  const sim = new Sim({ wires, router, rand: rng(o.seed), ratePerSec: o.rate, speed: SPEED, queues: { w0: o.mu, w1: o.mu, w2: o.mu, w3: o.mu }, exponential: true });
  const runFor = (seconds: number, dt = 1 / 60) => {
    for (let i = 0; i < Math.round(seconds / dt); i++) {
      t += dt;
      sim.step(dt);
    }
  };
  return { sim, runFor, picks };
}
const done = (sim: Sim) => sim.events.filter((e): e is Extract<SimEvent, { kind: "done" }> => e.kind === "done");

describe("queue router", () => {
  it("every request joins a worker's line, is served once and returns", () => {
    const { sim, runFor } = setup({ workers: 2, rate: 8, mu: 10, seed: 51 });
    runFor(60);
    sim.ratePerSec = 0;
    runFor(30);
    const spawned = sim.events.filter((e) => e.kind === "spawn").length;
    expect(spawned).toBeGreaterThan(400);
    expect(done(sim)).toHaveLength(spawned);
    expect(sim.events.filter((e) => e.kind === "work")).toHaveLength(spawned);
    expect(sim.packets).toHaveLength(0);
  });

  it("one worker at 80% busy: the mean time inside matches the model's 50 ms", () => {
    // At 90% busy a run this long still swings by ±25% (the line's long memory), so check at 80%.
    const { sim, runFor } = setup({ workers: 1, rate: 8, mu: 10, seed: 52 });
    runFor(2000);
    // Time inside = line + work, in sim seconds × 100 = ms; the model says S / (1 − ρ) = 10 ms / 0.2.
    const work = sim.events.filter((e): e is Extract<SimEvent, { kind: "work" }> => e.kind === "work").map((e) => e.ms);
    const mean = work.reduce((a, b) => a + b, 0) / work.length;
    expect(work.length).toBeGreaterThan(15000);
    expect(mean).toBeGreaterThan(44);
    expect(mean).toBeLessThan(56);
  });

  it("two workers share the load, and the unused ones get none", () => {
    const { runFor, picks } = setup({ workers: 2, rate: 9, mu: 10, seed: 53 });
    runFor(60);
    const share = (n: string) => picks.filter((p) => p === n).length / picks.length;
    expect(picks.length).toBeGreaterThan(400);
    expect(share("w0")).toBeGreaterThan(0.3);
    expect(share("w1")).toBeGreaterThan(0.3);
    expect(share("w2") + share("w3")).toBe(0);
  });
});
