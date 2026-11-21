import { makeWire } from "../geometry";
import { rng } from "../rng";
import { Sim } from "../sim";
import { proxy } from "./proxy";

const w = (x1: number, y1: number, x2: number, y2: number) => makeWire([x1, y1], [x2, y2]);
const wires = { o_fp: w(0, 0, 100, 0), fp_net: w(100, 0, 300, 0), f_rp: w(0, 100, 100, 150), p_rp: w(0, 200, 100, 160), rp_be: w(100, 150, 250, 150) };
const legs = (sim: Sim, x: string) => sim.events.filter((e) => e.kind === "leg" && e.wire === x).length;
function run(o: { mode: "forward" | "reverse"; hit?: number; slow?: number }) {
  const sim = new Sim({ wires, router: proxy({ mode: () => o.mode, hitShare: () => o.hit ?? 0, slowShare: () => o.slow ?? 0 }), rand: rng(17), ratePerSec: 20, speed: 600 });
  for (let t = 0; t < 30; t += 1 / 30) sim.step(1 / 30);
  sim.ratePerSec = 0;
  for (let t = 0; t < 10; t += 1 / 30) sim.step(1 / 30);
  return sim;
}

describe("proxy router", () => {
  it("forward: a cached file comes straight back from the proxy; a miss goes out to the site", () => {
    const sim = run({ mode: "forward", hit: 0.75 });
    const n = sim.events.filter((e) => e.kind === "spawn").length;
    expect(legs(sim, "o_fp")).toBe(2 * n);
    const out = legs(sim, "fp_net") / 2 / n;
    expect(out).toBeGreaterThan(0.18);
    expect(out).toBeLessThan(0.32);
    expect(sim.packets).toHaveLength(0);
  });

  it("reverse: laptops and phones both go through the proxy to the backend and back the way they came", () => {
    const sim = run({ mode: "reverse", slow: 0.3 });
    const n = sim.events.filter((e) => e.kind === "spawn").length;
    expect(legs(sim, "rp_be")).toBe(2 * n);
    const phones = legs(sim, "p_rp") / 2 / n;
    expect(phones).toBeGreaterThan(0.24);
    expect(phones).toBeLessThan(0.36);
    expect(legs(sim, "p_rp") % 2).toBe(0);
    expect(legs(sim, "o_fp")).toBe(0);
  });
});
