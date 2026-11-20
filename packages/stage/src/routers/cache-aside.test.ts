import { cachingScene } from "../../../../content/system-design/caching/scene";
import { makeWire } from "../geometry";
import { rng } from "../rng";
import { Sim } from "../sim";
import { cacheAside } from "./cache-aside";

const wires = Object.fromEntries(Object.entries(cachingScene.wires).map(([k, w]) => [k, makeWire(w.from, w.to)]));
const runFor = (sim: Sim, seconds: number, dt = 1 / 30) => {
  for (let t = 0; t < seconds; t += dt) sim.step(dt);
};
const count = (sim: Sim, kind: string) => sim.events.filter((e) => e.kind === kind).length;

describe("cache-aside router", () => {
  it("answers about hitRate of cache arrivals from the cache", () => {
    const sim = new Sim({ wires, router: cacheAside({ hitRate: () => 0.82, cacheReady: () => true }), rand: rng(11), ratePerSec: 40, speed: 400, queues: { db: 40 } });
    runFor(sim, 60);
    const hits = count(sim, "hit"), misses = count(sim, "miss");
    expect(hits + misses).toBeGreaterThan(2000);
    expect(hits / (hits + misses)).toBeGreaterThan(0.79);
    expect(hits / (hits + misses)).toBeLessThan(0.85);
  });

  it("sends nothing to the cache while the cache is not ready", () => {
    const sim = new Sim({ wires, router: cacheAside({ hitRate: () => 0.82, cacheReady: () => false }), rand: rng(12), ratePerSec: 10, speed: 400, queues: { db: 20 } });
    runFor(sim, 10);
    expect(count(sim, "hit") + count(sim, "miss")).toBe(0);
    expect(sim.packets.some((p) => p.route.some((leg) => leg.wire.endsWith("_c")))).toBe(false);
    expect(count(sim, "dbIn")).toBeGreaterThan(0);
  });

  it("stores every miss back in the cache once the database answers", () => {
    const sim = new Sim({ wires, router: cacheAside({ hitRate: () => 0.5, cacheReady: () => true }), rand: rng(13), ratePerSec: 10, speed: 400, queues: { db: 30 } });
    runFor(sim, 20);
    sim.ratePerSec = 0;
    runFor(sim, 20);
    expect(count(sim, "miss")).toBeGreaterThan(0);
    expect(count(sim, "fill")).toBe(count(sim, "miss"));
    expect(sim.packets).toHaveLength(0);
  });

  it("spreads requests across the three app servers in turn", () => {
    const sim = new Sim({ wires, router: cacheAside({ hitRate: () => 1, cacheReady: () => true }), rand: rng(14), ratePerSec: 30, speed: 400, queues: { db: 30 } });
    runFor(sim, 5);
    const apps = sim.events.filter((e) => e.kind === "pass" && /^a\d$/.test(e.node)).map((e) => e.node);
    for (const a of ["a0", "a1", "a2"]) expect(apps.filter((x) => x === a).length).toBeGreaterThan(apps.length / 4);
  });
});
