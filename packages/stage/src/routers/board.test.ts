import type { BoardFlow } from "@tintelix/schema";
import { makeWire } from "../geometry";
import { rng } from "../rng";
import { Sim } from "../sim";
import { board, type BoardRouterState } from "./board";

const wires = { u_a: makeWire([0, 0], [200, 0]), a_d: makeWire([200, 0], [400, 0]), a_c: makeWire([200, 0], [300, -100]) };
const read: BoardFlow = { path: [{ wire: "u_a", dir: 1, at: "app" }, { wire: "a_d", dir: 1, at: "db" }], color: "cyan", back: "green" };
const cached: BoardFlow = { path: [{ wire: "u_a", dir: 1, at: "app" }, { wire: "a_c", dir: 1, at: "cache" }], color: "cyan", back: "green" };
const count = (sim: Sim, kind: string, node: string) => sim.events.filter((e) => e.kind === kind && e.node === node).length;
const spawns = (sim: Sim) => sim.events.filter((e) => e.kind === "spawn").length;
const replies = (sim: Sim, hit: boolean) => sim.events.filter((e) => e.kind === "reply" && e.hit === hit).length;
function run(state: Partial<BoardRouterState>, sec = 30) {
  const s: BoardRouterState = { flows: () => [{ id: "read", flow: read, weight: 1 }], failShare: () => 0, ...state };
  const sim = new Sim({ wires, router: board(s), rand: rng(31), ratePerSec: 10, speed: 600 });
  for (let t = 0; t < sec; t += 1 / 30) sim.step(1 / 30);
  sim.ratePerSec = 0;
  for (let t = 0; t < 10; t += 1 / 30) sim.step(1 / 30);
  return sim;
}

describe("board router", () => {
  it("sends packets along the flow's path and back", () => {
    const sim = run({});
    expect(count(sim, "pass", "app")).toBe(spawns(sim));
    expect(count(sim, "pass", "db")).toBe(spawns(sim));
    expect(replies(sim, true)).toBe(spawns(sim));
    expect(sim.packets).toHaveLength(0);
  });
  it("splits traffic by weight", () => {
    const sim = run({ flows: () => [{ id: "read", flow: read, weight: 3 }, { id: "cached", flow: cached, weight: 1 }] });
    const share = count(sim, "pass", "db") / spawns(sim);
    expect(share).toBeGreaterThan(0.65);
    expect(share).toBeLessThan(0.85);
  });
  it("a zero or negative weight sends nothing; all zero spawns nothing", () => {
    const some = run({ flows: () => [{ id: "read", flow: read, weight: 1 }, { id: "cached", flow: cached, weight: -2 }] });
    expect(count(some, "pass", "cache")).toBe(0);
    const none = run({ flows: () => [{ id: "read", flow: read, weight: 0 }, { id: "cached", flow: cached, weight: Number.NaN }] });
    expect(count(none, "pass", "app")).toBe(0);
    expect(none.packets).toHaveLength(0);
  });
  it("fails the share the model gives, at the named node", () => {
    const failing: BoardFlow = { ...read, fail: { at: "db", share: "dbFailPct" } };
    const sim = run({ flows: () => [{ id: "read", flow: failing, weight: 1 }], failShare: () => 0.5 });
    const share = count(sim, "miss", "db") / spawns(sim);
    expect(share).toBeGreaterThan(0.38);
    expect(share).toBeLessThan(0.62);
    expect(replies(sim, false)).toBe(count(sim, "miss", "db"));
  });
  it("a one-way flow stops at its last node", () => {
    const oneWay: BoardFlow = { path: read.path, color: "amber" };
    const sim = run({ flows: () => [{ id: "w", flow: oneWay, weight: 1 }] });
    expect(count(sim, "pass", "db")).toBe(spawns(sim));
    expect(replies(sim, true) + replies(sim, false)).toBe(0);
    expect(sim.packets).toHaveLength(0);
  });
});
