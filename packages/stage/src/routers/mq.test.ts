import { makeWire } from "../geometry";
import { rng } from "../rng";
import { Sim } from "../sim";
import { mq, type MqMode, type MqRouterState } from "./mq";

const w = (x1: number, y1: number, x2: number, y2: number) => makeWire([x1, y1], [x2, y2]);
const wires = { p_w: w(0, 0, 300, 0), p_q: w(0, 0, 100, 0), q_w: w(100, 0, 300, 0), w_d: w(300, 0, 400, 50) };
const legs = (sim: Sim, x: string) => sim.events.filter((e) => e.kind === "leg" && e.wire === x).length;
const spawns = (sim: Sim) => sim.events.filter((e) => e.kind === "spawn").length;
const count = (sim: Sim, kind: string, node: string) => sim.events.filter((e) => e.kind === kind && e.node === node).length;
function run(mode: MqMode, o: Partial<MqRouterState> = {}, seconds = 30) {
  const state: MqRouterState = { mode: () => mode, failShare: () => 0, passShare: () => 1, poisonShare: () => 0, attempts: 3, ...o };
  const sim = new Sim({ wires, router: mq(state), rand: rng(71), ratePerSec: 10, speed: 600 });
  for (let t = 0; t < seconds; t += 1 / 30) sim.step(1 / 30);
  sim.ratePerSec = 0;
  for (let t = 0; t < 10; t += 1 / 30) sim.step(1 / 30);
  return sim;
}

describe("mq router", () => {
  it("direct: jobs over capacity fail", () => {
    const sim = run("direct", { failShare: () => 0.75 });
    const failed = count(sim, "miss", "workers") / spawns(sim);
    expect(failed).toBeGreaterThan(0.65);
    expect(failed).toBeLessThan(0.85);
    expect(sim.packets).toHaveLength(0);
  });

  it("queue: everything is accepted; only the pass share reaches the workers now", () => {
    const sim = run("queue", { passShare: () => 0.25 });
    expect(count(sim, "fill", "queue")).toBe(spawns(sim));
    const share = count(sim, "pass", "workers") / spawns(sim);
    expect(share).toBeGreaterThan(0.15);
    expect(share).toBeLessThan(0.35);
    expect(count(sim, "miss", "workers")).toBe(0);
  });

  it("dlq: a poison job is tried a few times, then parked", () => {
    const sim = run("dlq", { poisonShare: () => 1 });
    expect(count(sim, "miss", "workers")).toBe(3 * spawns(sim));
    expect(count(sim, "fill", "dlq")).toBe(spawns(sim));
    expect(sim.packets).toHaveLength(0);
  });

  it("retry: poison jobs keep coming back", () => {
    const sim = run("retry", { poisonShare: () => 1 }, 5);
    expect(count(sim, "miss", "workers")).toBeGreaterThan(3 * spawns(sim));
    expect(legs(sim, "w_d")).toBe(0);
  });
});
