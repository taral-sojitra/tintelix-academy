import { Effects } from "./effects";
import { rng } from "./rng";

describe("Effects", () => {
  it("with reduced motion, bursts add no particles and trails keep 3 points", () => {
    const fx = new Effects({ reducedMotion: true, rand: rng(1) });
    fx.burst(10, 10, 30, ["green"]);
    expect(fx.particles).toHaveLength(0);
    expect(fx.trailLimit).toBe(3);
  });

  it("without reduced motion, a burst adds one particle per count and trails keep 13 points", () => {
    const fx = new Effects({ reducedMotion: false, rand: rng(1) });
    fx.burst(10, 10, 30, ["green"]);
    expect(fx.particles).toHaveLength(30);
    expect(fx.trailLimit).toBe(13);
  });

  it("ripples, particles and labels disappear when their life runs out", () => {
    const fx = new Effects({ reducedMotion: false, rand: rng(2) });
    fx.ripple(0, 0, "amber");
    fx.burst(0, 0, 5, ["red"]);
    fx.float(0, 0, "✓ HIT", "green");
    for (let i = 0; i < 100; i++) fx.step(0.05);
    expect(fx.ripples.length + fx.particles.length + fx.floats.length).toBe(0);
  });

  it("never stacks two small labels on the same spot", () => {
    const fx = new Effects({ reducedMotion: false, rand: rng(3) });
    fx.float(100, 100, "a", "green");
    fx.float(110, 105, "b", "green");
    expect(fx.floats).toHaveLength(1);
  });
});
