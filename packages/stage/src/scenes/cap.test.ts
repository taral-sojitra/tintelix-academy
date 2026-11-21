// @vitest-environment jsdom
import type { Step } from "@tintelix/schema";
import { capModel } from "../../../../content/system-design/cap-theorem/model";
import { capScene } from "../../../../content/system-design/cap-theorem/scene";
import { Effects } from "../effects";
import { buildStage } from "../render/dom";
import { rng } from "../rng";
import { createCapScene } from "./cap";
import type { StepContext } from "./types";

const step = (model: Record<string, number>): Step => ({ id: "s", tag: "technique", title: "s", short: "s", text: ["x"], live: "LIVE", sim: { mode: "steady", speed: 1 }, model });

function setup(model: Record<string, number> = {}) {
  const fx = new Effects({ reducedMotion: false, rand: rng(19) });
  const scene = createCapScene({ fx, rand: rng(119), scene: capScene });
  const host = document.createElement("div");
  const dom = buildStage(host, capScene, { legend: scene.legend, chartLabel: scene.chart.label, nodeBody: (id, n) => scene.nodeBody(id, n) });
  scene.mount(dom.world);
  const inputs = { ...capModel.defaults, ...model };
  const ctx = (): StepContext => ({ step: step(model), stepIndex: 0, stepTime: 0, simTime: 0, inputs, overridden: false, visible: new Set(Object.keys(capScene.nodes)), model: capModel, playing: true, reducedMotion: false });
  scene.enterStep(ctx());
  const out = capModel.run(scene.liveInputs(ctx()));
  scene.paintWidgets(out, ctx(), 1 / 30, undefined as never);
  const tiles = Object.fromEntries(scene.tiles(out, ctx()).map((x) => [x.id, x.value]));
  const q = (sel: string) => dom.world.querySelector(sel)!;
  return { tiles, q, root: dom.root };
}

describe("cap scene", () => {
  it("healthy: the link is up and every copy agrees", () => {
    const { tiles, q, root } = setup();
    expect(tiles).toEqual({ a: "2 ms", b: "6", c: "3" });
    expect(q('.tx-wlabel[data-wire="link"]').textContent).toBe("network link");
    expect(q("[data-rule-b]").textContent).toBe("Site B: in step with the others");
    expect(root.querySelector<HTMLElement>(".tx-chartbox")!.hidden).toBe(true);
  });

  it("CP split: the link is cut and site B refuses", () => {
    const { tiles, q, root } = setup({ mode: 1 });
    expect(tiles).toEqual({ a: "30%", b: "0%", c: "0" });
    expect(q('.tx-wlabel[data-wire="link"]').textContent).toBe("✕ cut");
    expect(q("[data-rule-b]").textContent).toBe("Site B: alone, a minority: refuses");
    expect(q('[data-node="n3"]').classList.contains("tx-down")).toBe(true);
    expect(root.querySelector<HTMLElement>(".tx-chartbox")!.hidden).toBe(false);
  });

  it("AP split: site B answers from its own copy", () => {
    const { tiles, q } = setup({ mode: 2 });
    expect(tiles).toEqual({ a: "0%", b: "30%", c: "54,000" });
    expect(q("[data-rule-b]").textContent).toBe("Site B: alone: answers from its own copy");
    expect(q('[data-node="n3"]').classList.contains("tx-stale")).toBe(true);
  });
});
