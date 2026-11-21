import { makeWire } from "../geometry";
import { rng } from "../rng";
import { Sim } from "../sim";
import { session, type SessionMode } from "./session";

const w = (x1: number, y1: number, x2: number, y2: number) => makeWire([x1, y1], [x2, y2]);
const wires: Record<string, ReturnType<typeof w>> = { u_lb: w(0, 0, 100, 0) };
for (let k = 0; k < 3; k++) {
  wires[`lb_s${k}`] = w(100, 0, 300, k * 50);
  wires[`s${k}_st`] = w(300, k * 50, 400, 50);
}
const legs = (sim: Sim, x: string) => sim.events.filter((e) => e.kind === "leg" && e.wire === x).length / 2;
const replies = (sim: Sim, hit: boolean) => sim.events.filter((e) => e.kind === "reply" && e.hit === hit).length;
function run(mode: SessionMode, bounced: (g: number) => boolean = () => false) {
  const sim = new Sim({ wires, router: session({ mode: () => mode, home: (g) => `s${g}`, bounced, groups: 3 }), rand: rng(29), ratePerSec: 20, speed: 600 });
  for (let t = 0; t < 30; t += 1 / 30) sim.step(1 / 30);
  sim.ratePerSec = 0;
  for (let t = 0; t < 10; t += 1 / 30) sim.step(1 / 30);
  return sim;
}
const spawns = (sim: Sim) => sim.events.filter((e) => e.kind === "spawn").length;

describe("session router", () => {
  it("in-memory sessions with round robin: about two in three requests miss their session", () => {
    const sim = run("memory");
    const lost = replies(sim, false) / spawns(sim);
    expect(lost).toBeGreaterThan(0.55);
    expect(lost).toBeLessThan(0.78);
    expect(legs(sim, "s0_st")).toBe(0);
    expect(sim.packets).toHaveLength(0);
  });

  it("sticky: every request finds its session, unless its user is being logged out", () => {
    expect(replies(run("sticky"), false)).toBe(0);
    const sim = run("sticky", (g) => g === 1);
    const lost = replies(sim, false) / spawns(sim);
    expect(lost).toBeGreaterThan(0.22);
    expect(lost).toBeLessThan(0.45);
  });

  it("shared store: every request reads the store once and succeeds", () => {
    const sim = run("shared", (g) => g === 1);
    expect(replies(sim, false)).toBe(0);
    expect(legs(sim, "s0_st") + legs(sim, "s1_st") + legs(sim, "s2_st")).toBe(spawns(sim));
  });
});
