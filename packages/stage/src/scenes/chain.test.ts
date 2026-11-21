// @vitest-environment jsdom
import type { Step } from "@tintelix/schema";
import { availabilityModel } from "../../../../content/system-design/availability/model";
import { availabilityScene } from "../../../../content/system-design/availability/scene";
import { Effects } from "../effects";
import { buildStage } from "../render/dom";
import { rng } from "../rng";
import { createChainScene, OUTAGE_SPEEDUP, outageRate } from "./chain";
import type { StepContext } from "./types";

const step = (id: string, mode: string, model: Record<string, number> = {}): Step => ({
  id, tag: "technique", title: id, short: id, text: ["x"], live: "LIVE", sim: { mode, speed: 1 }, model,
});

function setup() {
  const fx = new Effects({ reducedMotion: false, rand: rng(5) });
  const scene = createChainScene({ fx, rand: rng(105), scene: availabilityScene });
  const host = document.createElement("div");
  const dom = buildStage(host, availabilityScene, { legend: scene.legend, chartLabel: scene.chart.label, nodeBody: (id, n) => scene.nodeBody(id, n) });
  scene.mount(dom.world);
  let t = 0;
  let current = step("chain", "steady");
  let inputs: Record<string, number> = {};
  const ctx = (): StepContext => ({ step: current, stepIndex: 0, stepTime: t, simTime: t, inputs, overridden: false, visible: new Set(Object.keys(availabilityScene.nodes)), model: availabilityModel, playing: true, reducedMotion: false });
  const enter = (s: Step) => {
    current = s;
    inputs = { ...availabilityModel.defaults, ...s.model };
    scene.enterStep(ctx());
  };
  const advance = (seconds: number, dt = 1 / 30) => {
    for (let i = 0; i < Math.round(seconds / dt); i++) {
      t += dt;
      scene.update(dt, ctx());
    }
  };
  const tiles = () => Object.fromEntries(scene.tiles(availabilityModel.run(scene.liveInputs(ctx())), ctx()).map((x) => [x.id, x.value]));
  const paint = () => scene.paintWidgets(availabilityModel.run(scene.liveInputs(ctx())), ctx(), 1 / 30, undefined as never);
  return { scene, enter, advance, tiles, paint, dom, ctx };
}

describe("chain scene helpers", () => {
  it("starts outages often enough that a copy is down the given share of the time", () => {
    // Down share s with outages of D seconds: rate = s / (D (1 − s)).
    expect(outageRate(0.1, 1.4)).toBeCloseTo(0.1 / (1.4 * 0.9), 9);
    expect(outageRate(0, 1.4)).toBe(0);
  });
});

describe("chain scene", () => {
  it("reads the model in the tiles", () => {
    const { enter, tiles } = setup();
    enter(step("chain", "steady"));
    expect(tiles()).toEqual({ each: "99.9%", path: "99.5%", down: "3 h 39 min", failed: "4,990", nines: "2.3" });
    enter(step("copies", "steady", { copies: 2 }));
    expect(tiles()).toMatchObject({ path: "99.9995%", down: "13 s" });
  });

  it("each copy is down about the sped-up share of the time", () => {
    const { scene, enter, advance } = setup();
    enter(step("chain", "steady"));
    let down = 0;
    let samples = 0;
    for (let i = 0; i < 3000; i++) {
      advance(0.1, 0.1);
      for (let tier = 0; tier < 5; tier++) {
        samples++;
        if (scene.state.down[tier]![0]! > 0) down++;
      }
    }
    const want = 0.001 * OUTAGE_SPEEDUP;
    expect(down / samples).toBeGreaterThan(want * 0.75);
    expect(down / samples).toBeLessThan(want * 1.25);
  });

  it("services past the path are switched off and never go down", () => {
    const { scene, enter, advance, paint, dom } = setup();
    enter(step("chain", "steady"));
    advance(60);
    expect(scene.state.down[5]!.every((d) => d <= 0)).toBe(true);
    paint();
    expect(dom.world.querySelector('[data-node="t5"]')!.classList.contains("tx-off")).toBe(true);
    expect(dom.world.querySelector('[data-node="t4"]')!.classList.contains("tx-off")).toBe(false);
  });

  it("a request finds a working copy only when one is up, and a shared outage takes all copies down", () => {
    const { scene, enter } = setup();
    enter(step("shared", "shared", { copies: 2, sharedPct: 0.05 }));
    scene.state.down[0] = [0, 0, 0];
    expect(scene.state.pickCopy(0)).toBe(0);
    scene.state.down[0] = [1, 0, 0];
    expect(scene.state.pickCopy(0)).toBe(1);
    scene.state.shared[0] = 1;
    expect(scene.state.pickCopy(0)).toBe(-1);
  });

  it("writes the path's arithmetic from the model", () => {
    const { enter, paint, dom } = setup();
    enter(step("chain", "steady"));
    paint();
    expect(dom.world.querySelector("[data-math-sum]")!.textContent).toBe("99.9% × 5 services in a row = 99.5%");
    expect(dom.world.querySelector("[data-math-down]")!.textContent).toBe("3 h 39 min down a month");
  });
});
