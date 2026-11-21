// @vitest-environment jsdom
import type { Step } from "@tintelix/schema";
import { fanoutModel } from "../../../../content/system-design/fan-out/model";
import { fanoutScene } from "../../../../content/system-design/fan-out/scene";
import { Effects } from "../effects";
import { buildStage } from "../render/dom";
import { rng } from "../rng";
import { createFanoutScene, FEED_CELLS } from "./fanout";
import type { StepContext } from "./types";

const step = (model: Record<string, number>): Step => ({ id: "s", tag: "technique", title: "s", short: "s", text: ["x"], live: "LIVE", sim: { mode: "steady", speed: 1 }, model });

function setup(model: Record<string, number> = {}) {
  const fx = new Effects({ reducedMotion: false, rand: rng(25) });
  const scene = createFanoutScene({ fx, rand: rng(125), scene: fanoutScene });
  const host = document.createElement("div");
  const dom = buildStage(host, fanoutScene, { legend: scene.legend, chartLabel: scene.chart.label, nodeBody: (id, n) => scene.nodeBody(id, n) });
  scene.mount(dom.world);
  const inputs = { ...fanoutModel.defaults, ...model };
  const ctx = (): StepContext => ({ step: step(model), stepIndex: 0, stepTime: 0, simTime: 0, inputs, overridden: false, visible: new Set(Object.keys(fanoutScene.nodes)), model: fanoutModel, playing: true, reducedMotion: false });
  scene.enterStep(ctx());
  const advance = (sec: number) => {
    for (let k = Math.round(sec / 0.1); k > 0; k--) scene.update(0.1, ctx(), undefined as never);
    const out = fanoutModel.run(scene.liveInputs(ctx()));
    scene.paintWidgets(out, ctx(), 1 / 30, undefined as never);
    return Object.fromEntries(scene.tiles(out, ctx()).map((x) => [x.id, x.value]));
  };
  const all = (sel: string) => dom.world.querySelectorAll(sel).length;
  const q = (sel: string) => dom.world.querySelector<HTMLElement>(sel)!;
  return { advance, all, q };
}

describe("fanout scene", () => {
  it("push: feeds full of pushed posts", () => {
    const { advance, all } = setup();
    expect(advance(0.1)).toEqual({ a: "1,500,000/s", b: "1 read", c: "20,000/s" });
    expect(all(".tx-feeds i")).toBe(FEED_CELLS);
    expect(all(".tx-feeds i.got")).toBe(0);
  });
  it("celebrity post: delivered to the feeds a little at a time", () => {
    const { advance, all } = setup({ mode: 1 });
    expect(advance(11)).toMatchObject({ a: "50%", b: "20 s" });
    expect(all(".tx-feeds i.got")).toBe(FEED_CELLS / 2);
  });
  it("pull and hybrid: feeds built at read time", () => {
    const pull = setup({ mode: 2 });
    expect(pull.advance(0.1)).toEqual({ a: "0/s", b: "200", c: "4,000,000/s" });
    expect(pull.q("[data-feedline]").textContent).toBe("built when someone opens the app");
    const hybrid = setup({ mode: 3 });
    expect(hybrid.advance(0.1)).toEqual({ a: "6", b: "120,000/s", c: "now" });
    expect(hybrid.all(".tx-feeds i.pulled")).toBe(FEED_CELLS);
  });
});
