// @vitest-environment jsdom
import type { Step } from "@tintelix/schema";
import { uploadModel } from "../../../../content/system-design/object-storage/model";
import { uploadScene } from "../../../../content/system-design/object-storage/scene";
import { Effects } from "../effects";
import { buildStage } from "../render/dom";
import { rng } from "../rng";
import { createUploadScene, SERVER_CELLS } from "./upload";
import type { StepContext } from "./types";

const step = (mode: string, model: Record<string, number>): Step => ({ id: "s", tag: "technique", title: "s", short: "s", text: ["x"], live: "LIVE", sim: { mode, speed: 1 }, model });

function setup(mode: string, model: Record<string, number> = {}) {
  const fx = new Effects({ reducedMotion: false, rand: rng(18) });
  const scene = createUploadScene({ fx, rand: rng(118), scene: uploadScene });
  const host = document.createElement("div");
  const dom = buildStage(host, uploadScene, { legend: scene.legend, chartLabel: scene.chart.label, nodeBody: (id, n) => scene.nodeBody(id, n) });
  scene.mount(dom.world);
  const inputs = { ...uploadModel.defaults, ...model };
  const ctx = (): StepContext => ({ step: step(mode, model), stepIndex: 0, stepTime: 0, simTime: 0, inputs, overridden: false, visible: new Set(Object.keys(uploadScene.nodes)), model: uploadModel, playing: true, reducedMotion: false });
  scene.enterStep(ctx());
  const advance = (sec: number) => {
    for (let k = Math.round(sec / 0.1); k > 0; k--) scene.update(0.1, ctx(), undefined as never);
    const out = uploadModel.run(scene.liveInputs(ctx()));
    scene.paintWidgets(out, ctx(), 1 / 30, undefined as never);
    return Object.fromEntries(scene.tiles(out, ctx()).map((x) => [x.id, x.value]));
  };
  const all = (sel: string) => dom.world.querySelectorAll(sel).length;
  const q = (sel: string) => dom.world.querySelector(sel)!.textContent;
  return { advance, all, q };
}

describe("upload scene", () => {
  it("through the app: sixteen servers lit", () => {
    const { advance, all } = setup("small");
    expect(advance(0.1)).toEqual({ a: "1,600", b: "16", c: "8 Gbit/s", d: "8 s" });
    expect(all(".tx-fleet i")).toBe(SERVER_CELLS);
    expect(all(".tx-fleet i.on")).toBe(16);
  });

  it("signed URL: one server, nothing through the app", () => {
    const { advance, all } = setup("small", { direct: 1 });
    expect(advance(0.1)).toMatchObject({ a: "1", b: "1", c: "0 Gbit/s" });
    expect(all(".tx-fleet i.on")).toBe(1);
  });

  it("one big request: fails at 90% and starts over", () => {
    const { advance, all, q } = setup("big");
    expect(advance(5)).toEqual({ a: "2,000 MB", b: "1,800 MB", c: "1" });
    expect(all(".tx-parts i.done")).toBe(10);
    advance(4.2);
    expect(q("[data-status]")).toBe("connection dropped at 90%: starting over");
    advance(1);
    expect(all(".tx-parts i.done")).toBeLessThan(5);
  });

  it("multipart: only the failed part is sent again", () => {
    const { advance, all, q } = setup("big", { multipart: 1 });
    expect(advance(9.2)).toEqual({ a: "2,000 MB", b: "100 MB", c: "20" });
    expect(all(".tx-parts i.failed")).toBe(1);
    expect(q("[data-status]")).toBe("part 19 failed: sending just that part again");
    advance(3);
    expect(all(".tx-parts i.done")).toBe(20);
  });
});
