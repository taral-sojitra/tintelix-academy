// @vitest-environment jsdom
import type { Step } from "@tintelix/schema";
import { scalingModel } from "../../../../content/system-design/scaling/model";
import { scalingScene } from "../../../../content/system-design/scaling/scene";
import { Effects } from "../effects";
import { buildStage } from "../render/dom";
import { rng } from "../rng";
import { createScaleScene, MAX_CORE_CELLS, MAX_SERVER_CELLS, throughputCurve } from "./scale";
import type { StepContext } from "./types";

const step = (model: Record<string, number>): Step => ({ id: "s", tag: "technique", title: "s", short: "s", text: ["x"], live: "LIVE", sim: { mode: "steady", speed: 1 }, model });

function setup(model: Record<string, number>, visible: string[]) {
  const fx = new Effects({ reducedMotion: false, rand: rng(3) });
  const scene = createScaleScene({ fx, rand: rng(103), scene: scalingScene });
  const host = document.createElement("div");
  const dom = buildStage(host, scalingScene, { legend: scene.legend, chartLabel: scene.chart.label, nodeBody: (id, n) => scene.nodeBody(id, n) });
  scene.mount(dom.world);
  const inputs = { ...scalingModel.defaults, ...model };
  const ctx = (): StepContext => ({ step: step(model), stepIndex: 0, stepTime: 0, simTime: 0, inputs, overridden: false, visible: new Set(visible), model: scalingModel, playing: true, reducedMotion: false });
  scene.enterStep(ctx());
  const out = scalingModel.run(inputs);
  scene.paintWidgets(out, ctx(), 1 / 30, undefined as never);
  const tiles = Object.fromEntries(scene.tiles(out, ctx()).map((x) => [x.id, x.value]));
  return { scene, tiles, dom };
}

describe("scale scene", () => {
  it("one big server lights one cell per core", () => {
    const { tiles, dom } = setup({ cores: 32 }, ["users", "big"]);
    expect(tiles).toEqual({ traffic: "6,000/s", capacity: "6,400/s", served: "100%", size: "32 cores", speedup: "—" });
    expect(dom.world.querySelectorAll("[data-cores] i.on")).toHaveLength(32);
    expect(dom.world.querySelectorAll("[data-cores] i")).toHaveLength(MAX_CORE_CELLS);
  });

  it("a fleet lights one cell per server and reads the speedup", () => {
    const { tiles, dom } = setup({ horizontal: 1, nodes: 16, traffic: 20000, sigmaPct: 3, kappaPct: 0.05 }, ["users", "lb", "fleet", "curve"]);
    expect(tiles).toMatchObject({ capacity: "16,306/s", served: "82%", size: "16 servers", speedup: "10×" });
    expect(dom.world.querySelectorAll("[data-servers] i.on")).toHaveLength(16);
    expect(dom.world.querySelectorAll("[data-servers] i")).toHaveLength(MAX_SERVER_CELLS);
    expect(dom.world.querySelector("[data-curve-label]")!.textContent).toBe("16 servers → 16,306/s");
  });

  it("plots the model's throughput for 1 to 100 servers", () => {
    const pts = throughputCurve(scalingModel, { ...scalingModel.defaults, horizontal: 1, sigmaPct: 3, kappaPct: 0.05 });
    expect(pts).toHaveLength(100);
    const best = pts.reduce((a, b) => (b[1] > a[1] ? b : a));
    expect(best[0]).toBe(44);
    expect(pts[99]![1]).toBeLessThan(best[1]);
  });

  it("tells the router the served share", () => {
    const { scene } = setup({ traffic: 20000, cores: 64 }, ["users", "big"]);
    expect(scene.state.served()).toBeCloseTo(0.64, 9);
  });
});
