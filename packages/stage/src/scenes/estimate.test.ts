// @vitest-environment jsdom
import type { Step } from "@tintelix/schema";
import { estimationModel } from "../../../../content/system-design/estimation/model";
import { estimationScene } from "../../../../content/system-design/estimation/scene";
import { Effects } from "../effects";
import { buildStage } from "../render/dom";
import { rng } from "../rng";
import { createEstimateScene } from "./estimate";
import type { StepContext } from "./types";

const step = (id: string, model: Record<string, number> = {}): Step => ({
  id, tag: "technique", title: id, short: id, text: ["x"], live: "LIVE", sim: { mode: "steady", speed: 1 }, model,
});

function setup(visible: string[]) {
  const fx = new Effects({ reducedMotion: false, rand: rng(4) });
  const scene = createEstimateScene({ fx, rand: rng(104), scene: estimationScene });
  const host = document.createElement("div");
  const dom = buildStage(host, estimationScene, { legend: scene.legend, chartLabel: scene.chart.label, nodeBody: (id, n) => scene.nodeBody(id, n) });
  scene.mount(dom.world);
  const inputs = { ...estimationModel.defaults };
  const ctx = (): StepContext => ({ step: step("x"), stepIndex: 0, stepTime: 0, simTime: 0, inputs, overridden: false, visible: new Set(visible), model: estimationModel, playing: true, reducedMotion: false });
  scene.enterStep(ctx());
  const out = estimationModel.run(inputs);
  scene.paintWidgets(out, ctx(), 1 / 30, undefined as never);
  const tiles = Object.fromEntries(scene.tiles(out, ctx()).map((x) => [x.id, x.value]));
  const q = (sel: string) => dom.world.querySelector(sel)?.textContent;
  return { scene, tiles, q };
}

describe("estimate scene", () => {
  it("shows only what the step has revealed", () => {
    const { tiles } = setup(["mau", "dau", "avg"]);
    expect(tiles).toEqual({ dau: "2,000,000", peak: "—", cores: "—", storage: "—", growth: "—" });
  });

  it("fills every box and arrow from the model once shown", () => {
    const { tiles, q } = setup(Object.keys(estimationScene.nodes));
    expect(tiles).toEqual({ dau: "2,000,000", peak: "2,778/s", cores: "24", storage: "4.4 TB", growth: "42" });
    expect(q('[data-value="avg"]')).toBe("926/s");
    expect(q('[data-sub="avg"]')).toBe("80,000,000 a day");
    expect(q('[data-value="cores"]')).toBe("24");
    expect(q('[data-sub="cores"]')).toBe("14 if flat out");
    expect(q('[data-value="stored"]')).toBe("4.4 TB");
    expect(q('.tx-wlabel[data-wire="m0"]')).toBe("× 20%");
    expect(q('.tx-wlabel[data-wire="m3"]')).toBe("÷ 120");
    expect(q('.tx-wlabel[data-wire="g0"]')).toBe("× 1.8");
  });

  it("tells the router which arrows are shown", () => {
    const { scene } = setup(["mau", "dau", "avg", "writes"]);
    expect(scene.state.visibleWire("m1")).toBe(true);
    expect(scene.state.visibleWire("s0")).toBe(true);
    expect(scene.state.visibleWire("m2")).toBe(false);
  });
});
