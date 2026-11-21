import { makeWire } from "../geometry";
import { rng } from "../rng";
import { Sim } from "../sim";
import { data, type DataMode } from "./data";

const w = (x1: number, y1: number, x2: number, y2: number) => makeWire([x1, y1], [x2, y2]);
const wires = { a_o: w(0, 0, 100, -50), o_i: w(100, -50, 200, -50), i_p: w(200, -50, 300, -50), a_d: w(0, 0, 100, 50), a_s: w(0, 0, 100, -50), a_l: w(0, 0, 100, 50) };
const legs = (sim: Sim, x: string) => sim.events.filter((e) => e.kind === "leg" && e.wire === x).length / 2;
const replies = (sim: Sim, hit: boolean) => sim.events.filter((e) => e.kind === "reply" && e.hit === hit).length;
function run(mode: DataMode, o: { doc?: boolean; bad?: number } = {}) {
  const sim = new Sim({ wires, router: data({ mode: () => mode, docSide: () => o.doc ?? true, badShare: () => o.bad ?? 0 }), rand: rng(31), ratePerSec: 20, speed: 600 });
  for (let t = 0; t < 30; t += 1 / 30) sim.step(1 / 30);
  sim.ratePerSec = 0;
  for (let t = 0; t < 10; t += 1 / 30) sim.step(1 / 30);
  return sim;
}
const spawns = (sim: Sim) => sim.events.filter((e) => e.kind === "spawn").length;

describe("data router", () => {
  it("read: queries alternate; SQL walks all three tables, documents take one hop", () => {
    const sim = run("read");
    const n = spawns(sim);
    expect(Math.abs(legs(sim, "a_o") - n / 2)).toBeLessThanOrEqual(1);
    expect(legs(sim, "i_p")).toBe(legs(sim, "a_o"));
    expect(legs(sim, "a_d") + legs(sim, "a_o")).toBe(n);
    expect(sim.packets).toHaveLength(0);
  });

  it("read with only the relational side on stage: every query joins", () => {
    const sim = run("read", { doc: false });
    expect(legs(sim, "a_d")).toBe(0);
    expect(legs(sim, "a_o")).toBe(spawns(sim));
  });

  it("rename: one hop to sellers or to listings", () => {
    const sim = run("rename");
    expect(legs(sim, "a_s") + legs(sim, "a_l")).toBe(spawns(sim));
    expect(legs(sim, "o_i")).toBe(0);
  });

  it("schema: bad writes fail at the table but are stored as documents", () => {
    const sim = run("schema", { bad: 0.5 });
    const sqlFails = sim.events.filter((e) => e.kind === "miss" && e.node === "orders").length;
    const docStored = sim.events.filter((e) => e.kind === "fill" && e.node === "docs").length;
    expect(sqlFails).toBeGreaterThan(0);
    expect(docStored).toBeGreaterThan(0);
    expect(replies(sim, false)).toBe(sqlFails);
  });
});
