// @vitest-environment jsdom
import type { Step } from "@tintelix/schema";
import { indexModel } from "../../../../content/system-design/indexing/model";
import { indexScene } from "../../../../content/system-design/indexing/scene";
import { Effects } from "../effects";
import { buildStage } from "../render/dom";
import { rng } from "../rng";
import { createIndexScene, type IndexScene } from "./index-lookup";
import type { StepContext } from "./types";

const step = (mode: string, model: Record<string, number>): Step => ({ id: "s", tag: "technique", title: "s", short: "s", text: ["x"], live: "LIVE", sim: { mode, speed: 1 }, model });

function setup(mode: string, model: Record<string, number> = {}) {
  const fx = new Effects({ reducedMotion: false, rand: rng(13) });
  const scene = createIndexScene({ fx, rand: rng(113), scene: indexScene }) as IndexScene;
  const host = document.createElement("div");
  const dom = buildStage(host, indexScene, { legend: scene.legend, chartLabel: scene.chart.label, nodeBody: (id, n) => scene.nodeBody(id, n) });
  scene.mount(dom.world);
  const inputs = { ...indexModel.defaults, ...model };
  const visible = new Set(mode === "scan" ? ["app", "table"] : Object.keys(indexScene.nodes));
  const ctx = (): StepContext => ({ step: step(mode, model), stepIndex: 0, stepTime: 0, simTime: 0, inputs, overridden: false, visible, model: indexModel, playing: true, reducedMotion: false });
  scene.enterStep(ctx());
  const advance = (sec: number) => {
    for (let k = Math.round(sec / 0.1); k > 0; k--) scene.update(0.1, ctx(), undefined as never);
    const out = indexModel.run(scene.liveInputs(ctx()));
    scene.paintWidgets(out, ctx(), 1 / 30, undefined as never);
    return Object.fromEntries(scene.tiles(out, ctx()).map((x) => [x.id, x.value]));
  };
  const all = (sel: string) => dom.world.querySelectorAll(sel).length;
  const q = (sel: string) => dom.world.querySelector(sel)!.textContent;
  return { scene, advance, all, q };
}

describe("index scene", () => {
  it("scan: the sweep reads page after page, and no tree is used", () => {
    const { advance, all, scene, q } = setup("scan");
    expect(advance(1.5)).toEqual({ a: "100,000", b: "10 s", c: "10,000,000" });
    expect(all("[data-pages] i.read")).toBeGreaterThan(30);
    expect(all("[data-pages] i.read")).toBeLessThan(70);
    expect(scene.state.viaTree()).toBe(false);
    expect(q("[data-caption]")).toBe("reads all 100,000 pages");
  });

  it("seek: one root-to-leaf path, then one page", () => {
    const { advance, all, scene, q } = setup("seek");
    expect(advance(0.1)).toEqual({ a: "5", b: "0.5 ms", c: "20,000×" });
    expect(all(".tx-btree .on")).toBe(1);
    advance(1.6);
    expect(all("[data-pages] i.hit")).toBe(1);
    expect(scene.state.viaTree()).toBe(true);
    expect(q("[data-depth]")).toBe("4 levels for 10,000,000 rows");
  });

  it("range: walks several leaves and lights a run of pages", () => {
    const { advance, all } = setup("range");
    expect(advance(0.1)).toEqual({ a: "1,014", b: "101 ms", c: "1,000" });
    advance(1.7);
    expect(all("[data-pages] i.hit")).toBe(10);
  });

  it("write: one chip per index, and throughput drops with each", () => {
    const { advance, all } = setup("write", { secondary: 4 });
    expect(advance(0.1)).toEqual({ a: "5 trees", b: "4,000", c: "80%" });
    expect(all("[data-chips] span.on")).toBe(5);
  });
});
