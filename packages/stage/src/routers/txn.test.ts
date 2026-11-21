import { makeWire } from "../geometry";
import { rng } from "../rng";
import { Sim } from "../sim";
import { txn, type TxnMode } from "./txn";

const w = (x1: number, y1: number, x2: number, y2: number) => makeWire([x1, y1], [x2, y2]);
const wires = { u_c: w(0, 0, 50, 0), c_s0: w(50, 0, 200, -50), c_s1: w(50, 0, 200, 0), c_s2: w(50, 0, 200, 50) };
const replies = (sim: Sim, hit: boolean) => sim.events.filter((e) => e.kind === "reply" && e.hit === hit).length;
const spawns = (sim: Sim) => sim.events.filter((e) => e.kind === "spawn").length;
const count = (sim: Sim, kind: string, node: string) => sim.events.filter((e) => e.kind === kind && e.node === node).length;
function run(mode: TxnMode, fail = 0) {
  const sim = new Sim({ wires, router: txn({ mode: () => mode, failShare: () => fail }), rand: rng(67), ratePerSec: 10, speed: 600 });
  for (let t = 0; t < 30; t += 1 / 30) sim.step(1 / 30);
  sim.ratePerSec = 0;
  for (let t = 0; t < 20; t += 1 / 30) sim.step(1 / 30);
  return sim;
}

describe("txn router", () => {
  it("none: each order visits the three services in turn; a failure leaves it broken", () => {
    const ok = run("none");
    expect(count(ok, "pass", "s2")).toBe(spawns(ok));
    expect(ok.packets).toHaveLength(0);
    const bad = run("none", 1);
    expect(replies(bad, false)).toBe(spawns(bad));
    expect(count(bad, "pass", "s1")).toBe(spawns(bad));
  });

  it("2pc: prepare then commit on a participant", () => {
    const sim = run("2pc");
    expect(count(sim, "fill", "s0") + count(sim, "fill", "s1") + count(sim, "fill", "s2")).toBe(spawns(sim));
    expect(replies(sim, false)).toBe(0);
  });

  it("down: every order fails at the coordinator", () => {
    const sim = run("down");
    expect(replies(sim, false)).toBe(spawns(sim));
  });

  it("saga: a failure is compensated at Payments and Orders, nobody left broken", () => {
    const sim = run("saga", 1);
    const n = spawns(sim);
    expect(replies(sim, false)).toBe(0);
    expect(count(sim, "fill", "s1")).toBe(n);
    expect(count(sim, "fill", "s0")).toBe(n);
    expect(sim.packets).toHaveLength(0);
  });
});
