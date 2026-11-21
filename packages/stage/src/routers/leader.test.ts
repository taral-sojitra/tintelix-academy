import { makeWire } from "../geometry";
import { rng } from "../rng";
import { Sim } from "../sim";
import { leader, type LeaderRouterState, pairWire } from "./leader";

const at = (n: number): [number, number] => [Math.round(300 + 200 * Math.cos((2 * Math.PI * n) / 5)), Math.round(300 + 200 * Math.sin((2 * Math.PI * n) / 5))];
const wires: Record<string, ReturnType<typeof makeWire>> = { n1_st: makeWire(at(1), [700, 100]), n2_st: makeWire(at(2), [700, 100]) };
for (let a = 1; a <= 5; a++) for (let b = a + 1; b <= 5; b++) wires[`n${a}_n${b}`] = makeWire(at(a), at(b));
const count = (sim: Sim, kind: string, node: string) => sim.events.filter((e) => e.kind === kind && e.node === node).length;
const side = (n: number) => (n === 1 || n === 5 ? 0 : 1);
function run(o: Partial<LeaderRouterState>, sec = 20) {
  const state: LeaderRouterState = { leaders: () => [1], candidate: () => 0, up: () => true, reach: () => true, writer: () => 0, stale: () => false, ...o };
  const sim = new Sim({ wires, router: leader(state), rand: rng(29), ratePerSec: 10, speed: 600 });
  for (let t = 0; t < sec; t += 1 / 30) sim.step(1 / 30);
  sim.ratePerSec = 0;
  for (let t = 0; t < 10; t += 1 / 30) sim.step(1 / 30);
  return sim;
}

describe("leader router", () => {
  it("names each pair's wire once, low number first", () => {
    expect(pairWire(3, 1)).toEqual({ wire: "n1_n3", dir: -1 });
    expect(pairWire(2, 5)).toEqual({ wire: "n2_n5", dir: 1 });
  });
  it("steady: the leader's heartbeats reach every follower and nothing comes back", () => {
    const sim = run({});
    expect(count(sim, "pass", "n1")).toBe(0);
    for (const n of [2, 3, 4, 5]) expect(count(sim, "pass", `n${n}`)).toBeGreaterThan(5);
    expect(sim.packets).toHaveLength(0);
  });
  it("election: the candidate asks the live servers and each vote comes back", () => {
    const sim = run({ leaders: () => [], candidate: () => 2, up: (n) => n !== 1 });
    expect(count(sim, "hit", "n1")).toBe(0);
    const votes = [3, 4, 5].map((n) => count(sim, "hit", `n${n}`));
    for (const v of votes) expect(v).toBeGreaterThan(5);
    expect(count(sim, "pass", "n2")).toBe(votes.reduce((a, b) => a + b, 0));
  });
  it("partition: each leader reaches only its own side", () => {
    const sim = run({ leaders: () => [1, 2], reach: (a, b) => side(a) === side(b) });
    expect(count(sim, "pass", "n5")).toBeGreaterThan(5);
    expect(count(sim, "pass", "n3") + count(sim, "pass", "n4")).toBeGreaterThan(10);
    expect(count(sim, "pass", "n1") + count(sim, "pass", "n2")).toBe(0);
  });
  it("fencing: the new leader's writes land; the woken leader's one stale write is rejected", () => {
    const sim = run({ leaders: () => [2], writer: () => 2, up: () => true, stale: () => true });
    expect(count(sim, "dbIn", "storage")).toBeGreaterThan(5);
    expect(count(sim, "miss", "storage")).toBe(1);
    expect(count(sim, "fill", "n1")).toBe(1);
  });
});
