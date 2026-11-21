// @vitest-environment jsdom
import type { Step } from "@tintelix/schema";
import { limitModel } from "../../../../content/system-design/rate-limiting/model";
import { limitScene } from "../../../../content/system-design/rate-limiting/scene";
import { Effects } from "../effects";
import { buildStage } from "../render/dom";
import { rng } from "../rng";
import { createLimitScene } from "./limit";
import type { StepContext } from "./types";

const step = (mode: string, model: Record<string, number>): Step => ({ id: "s", tag: "technique", title: "s", short: "s", text: ["x"], live: "LIVE", sim: { mode, speed: 1 }, model });

function setup(mode: string, model: Record<string, number> = {}) {
  const fx = new Effects({ reducedMotion: false, rand: rng(24) });
  const scene = createLimitScene({ fx, rand: rng(124), scene: limitScene });
  const host = document.createElement("div");
  const dom = buildStage(host, limitScene, { legend: scene.legend, chartLabel: scene.chart.label, nodeBody: (id, n) => scene.nodeBody(id, n) });
  scene.mount(dom.world);
  const inputs = { ...limitModel.defaults, ...model };
  const ctx = (): StepContext => ({ step: step(mode, model), stepIndex: 0, stepTime: 0, simTime: 0, inputs, overridden: false, visible: new Set(Object.keys(limitScene.nodes)), model: limitModel, playing: true, reducedMotion: false });
  scene.enterStep(ctx());
  const advance = (sec: number) => {
    for (let k = Math.round(sec / 0.1); k > 0; k--) scene.update(0.1, ctx(), undefined as never);
    const out = limitModel.run(scene.liveInputs(ctx()));
    scene.paintWidgets(out, ctx(), 1 / 30, undefined as never);
    return Object.fromEntries(scene.tiles(out, ctx()).map((x) => [x.id, x.value]));
  };
  const q = (sel: string) => dom.world.querySelector<HTMLElement>(sel)!;
  return { advance, q };
}

describe("limit scene", () => {
  it("no limit: everyone suffers", () => {
    const { advance, q } = setup("flood");
    expect(advance(0.1)).toEqual({ a: "40%", b: "250%", c: "2,000/s" });
    expect(q("[data-tokens]").textContent).toBe("no limit");
  });
  it("a limit: the flooder's bucket stays empty", () => {
    const { advance, q } = setup("flood", { mode: 1 });
    expect(advance(0.1)).toEqual({ a: "100%", b: "1,990/s", c: "10/s" });
    expect(q("[data-tokens]").textContent).toBe("flooder's bucket: 0 of 50, refills 10 a second");
  });
  it("burst: the bucket drains by the burst and refills", () => {
    const { advance, q } = setup("burst", { mode: 1 });
    expect(advance(1)).toEqual({ a: "30 of 30", b: "10", c: "5 s" });
    expect(q("[data-tokens]").textContent).toBe("page's bucket: 25 of 50 after a burst of 30");
    advance(4);
    expect(q("[data-tokens]").textContent).toBe("page's bucket: 50 of 50");
  });
  it("per-server buckets: four times the limit", () => {
    const { advance } = setup("flood", { mode: 2 });
    expect(advance(0.1)).toEqual({ a: "40/s", b: "10/s", c: "100%" });
  });
});
