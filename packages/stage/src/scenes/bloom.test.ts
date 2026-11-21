// @vitest-environment jsdom
import type { Step } from "@tintelix/schema";
import { bloomModel } from "../../../../content/system-design/bloom-filters/model";
import { bloomScene } from "../../../../content/system-design/bloom-filters/scene";
import { Effects } from "../effects";
import { buildStage } from "../render/dom";
import { rng } from "../rng";
import { createBloomScene, TOY_BITS } from "./bloom";
import type { StepContext } from "./types";

const step = (model: Record<string, number>): Step => ({ id: "s", tag: "technique", title: "s", short: "s", text: ["x"], live: "LIVE", sim: { mode: "steady", speed: 1 }, model });

function setup(model: Record<string, number> = {}) {
  const fx = new Effects({ reducedMotion: false, rand: rng(17) });
  const scene = createBloomScene({ fx, rand: rng(117), scene: bloomScene });
  const host = document.createElement("div");
  const dom = buildStage(host, bloomScene, { legend: scene.legend, chartLabel: scene.chart.label, nodeBody: (id, n) => scene.nodeBody(id, n) });
  scene.mount(dom.world);
  const inputs = { ...bloomModel.defaults, ...model };
  const visible = new Set((model.filter ?? 0) >= 0.5 ? Object.keys(bloomScene.nodes) : ["app", "db"]);
  const ctx = (): StepContext => ({ step: step(model), stepIndex: 0, stepTime: 0, simTime: 0, inputs, overridden: false, visible, model: bloomModel, playing: true, reducedMotion: false });
  scene.enterStep(ctx());
  const paint = () => {
    const out = bloomModel.run(scene.liveInputs(ctx()));
    scene.paintWidgets(out, ctx(), 1 / 30, undefined as never);
    return Object.fromEntries(scene.tiles(out, ctx()).map((x) => [x.id, x.value]));
  };
  const all = (sel: string) => dom.world.querySelectorAll(sel).length;
  const q = (sel: string) => dom.world.querySelector(sel)!.textContent;
  return { scene, paint, all, q, ctx };
}

describe("bloom scene", () => {
  it("no filter: every lookup reads the disk", () => {
    const { paint, q } = setup();
    expect(paint()).toEqual({ a: "10,000", b: "8,000", c: "100,000,000" });
    expect(q("[data-reads]")).toBe("10,000 reads a second");
  });

  it("filter: a toy array with some bits set, and a probe that finds a zero says no", () => {
    const { paint, all, scene, ctx, q } = setup({ filter: 1 });
    expect(paint()).toEqual({ a: "2,066", b: "0.82%", c: "125 MB", d: "7,934" });
    expect(all(".tx-bits i")).toBe(TOY_BITS);
    const set = all(".tx-bits i.on");
    expect(set).toBeGreaterThan(10);
    expect(set).toBeLessThan(40);
    scene.onEvent({ kind: "miss", node: "filter", at: [300, 239] }, ctx());
    paint();
    expect(all(".tx-bits i.zero")).toBeGreaterThan(0);
    expect(q("[data-verdict]")).toBe("a bit is 0: definitely not here");
    scene.onEvent({ kind: "pass", node: "filter", at: [300, 239] }, ctx());
    paint();
    expect(all(".tx-bits i.zero")).toBe(0);
    expect(all(".tx-bits i.probe")).toBeGreaterThan(0);
    expect(q("[data-verdict]")).toBe("all bits are 1: maybe, so check the disk");
  });

  it("more keys in the same filter set more of the toy bits", () => {
    const a = setup({ filter: 1 });
    a.paint();
    const b = setup({ filter: 1, keys: 200_000_000 });
    b.paint();
    expect(b.all(".tx-bits i.on")).toBeGreaterThan(a.all(".tx-bits i.on"));
  });
});
