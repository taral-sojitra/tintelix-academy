// @vitest-environment jsdom
import type { Step } from "@tintelix/schema";
import { queueModel } from "../../../../content/system-design/queueing/model";
import { queueScene } from "../../../../content/system-design/queueing/scene";
import { Effects } from "../effects";
import { makeWire } from "../geometry";
import { buildStage } from "../render/dom";
import { rng } from "../rng";
import { Sim } from "../sim";
import { createQueueScene, curvePoints, LINE_DOTS, VIS } from "./queue";
import type { StepContext } from "./types";

const step = (id: string, model: Record<string, number> = {}): Step => ({
  id, tag: "technique", title: id, short: id, text: ["x"], live: "LIVE", sim: { mode: "steady", speed: 1 }, model,
});

function setup() {
  const fx = new Effects({ reducedMotion: false, rand: rng(9) });
  const scene = createQueueScene({ fx, rand: rng(109), scene: queueScene });
  const host = document.createElement("div");
  const dom = buildStage(host, queueScene, { legend: scene.legend, chartLabel: scene.chart.label, nodeBody: (id, n) => scene.nodeBody(id, n) });
  scene.mount(dom.world);
  const sim = new Sim({ wires: { users_app: makeWire([202, 157], [300, 157]) }, router: scene.router, rand: rng(3), ratePerSec: scene.sim.ratePerSec, speed: 400, queues: scene.sim.queues, exponential: true });
  let t = 0;
  let current = step("half-busy");
  let inputs: Record<string, number> = {};
  const ctx = (): StepContext => ({ step: current, stepIndex: 0, stepTime: t, simTime: t, inputs, overridden: false, visible: new Set(["users", "app", "curve"]), model: queueModel, playing: true, reducedMotion: false });
  const enter = (s: Step) => {
    current = s;
    inputs = { ...queueModel.defaults, ...s.model };
    scene.enterStep(ctx());
  };
  const tiles = () => Object.fromEntries(scene.tiles(queueModel.run(scene.liveInputs(ctx())), ctx()).map((x) => [x.id, x.value]));
  const paint = () => scene.paintWidgets(queueModel.run(scene.liveInputs(ctx())), ctx(), 1 / 30, sim);
  const advance = (seconds: number, dt = 1 / 60) => {
    for (let i = 0; i < Math.round(seconds / dt); i++) {
      t += dt;
      scene.update(dt, ctx(), sim);
      sim.step(dt);
      for (const e of sim.drain()) scene.onEvent(e, ctx());
    }
  };
  return { scene, sim, ctx, enter, tiles, paint, advance, dom };
}

describe("queue scene helpers", () => {
  it("plots the model's response time against busyness", () => {
    const pts = curvePoints(queueModel, { ...queueModel.defaults });
    const at = (u: number) => pts.find(([x]) => Math.abs(x - u) < 1e-9)![1];
    expect(at(50)).toBeCloseTo(20, 6);
    expect(at(90)).toBeCloseTo(100, 6);
    expect(pts.every(([x, y], i) => i === 0 || (x > pts[i - 1]![0] && y >= pts[i - 1]![1]))).toBe(true);
  });
  it("with two workers, the curve stays lower at the same busyness", () => {
    const one = curvePoints(queueModel, { ...queueModel.defaults });
    const two = curvePoints(queueModel, { ...queueModel.defaults, workers: 2 });
    const at = (pts: [number, number][], u: number) => pts.find(([x]) => Math.abs(x - u) < 1e-9)![1];
    expect(at(two, 80)).toBeLessThan(at(one, 80));
  });
});

describe("queue scene", () => {
  it("reads the model in the tiles", () => {
    const { enter, tiles } = setup();
    enter(step("half-busy", { traffic: 50 }));
    expect(tiles()).toEqual({ busy: "50%", wait: "10 ms", response: "20 ms", inside: "1", traffic: "50/s" });
    enter(step("evening-peak", { traffic: 90 }));
    expect(tiles()).toMatchObject({ busy: "90%", wait: "90 ms", response: "100 ms", inside: "9" });
    enter(step("add-worker", { traffic: 90, workers: 2 }));
    expect(tiles()).toMatchObject({ busy: "45%", response: "12.5 ms" });
  });

  it("runs the sim at a tenth of the real rates", () => {
    const { enter, advance, sim } = setup();
    enter(step("evening-peak", { traffic: 90 }));
    advance(0.1);
    expect(sim.ratePerSec).toBeCloseTo(90 / VIS, 9);
    expect(sim.queues.w0!.mu).toBeCloseTo(1000 / 10 / VIS, 9);
  });

  it("sends arrivals only to the workers the step has", () => {
    const { enter, advance, sim } = setup();
    enter(step("evening-peak", { traffic: 90 }));
    advance(20);
    expect(sim.queues.w1!.waiting + (sim.queues.w1!.serving ? 1 : 0)).toBe(0);
  });

  it("draws the line and the curve's point from the sim and the model", () => {
    const { enter, advance, paint, dom, sim } = setup();
    enter(step("evening-peak", { traffic: 90 }));
    advance(30);
    paint();
    const lit = dom.world.querySelectorAll("[data-line] i.on").length;
    expect(lit).toBe(Math.min(LINE_DOTS, sim.queues.w0!.waiting));
    expect(dom.world.querySelector("[data-curve-label]")!.textContent).toBe("90% busy → 100 ms");
    expect(dom.world.querySelectorAll("[data-workers] b:not([hidden])")).toHaveLength(1);
  });
});
