// @vitest-environment jsdom
import type { Step } from "@tintelix/schema";
import { dataModel } from "../../../../content/system-design/sql-vs-nosql/model";
import { dataScene } from "../../../../content/system-design/sql-vs-nosql/scene";
import { Effects } from "../effects";
import { buildStage } from "../render/dom";
import { rng } from "../rng";
import { createDataScene, type DataScene } from "./data";
import type { StepContext } from "./types";

const step = (mode: string, model: Record<string, number>): Step => ({ id: "s", tag: "technique", title: "s", short: "s", text: ["x"], live: "LIVE", sim: { mode, speed: 1 }, model });

function setup(mode: string, model: Record<string, number> = {}, visible = Object.keys(dataScene.nodes)) {
  const fx = new Effects({ reducedMotion: false, rand: rng(12) });
  const scene = createDataScene({ fx, rand: rng(112), scene: dataScene }) as DataScene;
  const host = document.createElement("div");
  const dom = buildStage(host, dataScene, { legend: scene.legend, chartLabel: scene.chart.label, nodeBody: (id, n) => scene.nodeBody(id, n) });
  scene.mount(dom.world);
  const inputs = { ...dataModel.defaults, ...model };
  const ctx = (): StepContext => ({ step: step(mode, model), stepIndex: 0, stepTime: 0, simTime: 0, inputs, overridden: false, visible: new Set(visible), model: dataModel, playing: true, reducedMotion: false });
  scene.enterStep(ctx());
  const advance = (sec: number) => {
    for (let k = Math.round(sec / 0.1); k > 0; k--) scene.update(0.1, ctx(), undefined as never);
    const out = dataModel.run(scene.liveInputs(ctx()));
    scene.paintWidgets(out, ctx(), 1 / 30, undefined as never);
    return Object.fromEntries(scene.tiles(out, ctx()).map((x) => [x.id, x.value]));
  };
  const q = (sel: string) => dom.world.querySelector(sel)!.textContent;
  const chartHidden = () => dom.root.querySelector<HTMLElement>(".tx-chartbox")!.hidden;
  return { scene, advance, q, chartHidden };
}

describe("data scene", () => {
  it("read: a three-table join against one document read", () => {
    const { advance, scene, chartHidden } = setup("read");
    expect(advance(0.1)).toEqual({ a: "7 rows", b: "1 read", c: "3" });
    expect(scene.state.docSide()).toBe(true);
    expect(chartHidden()).toBe(true);
    // The rewrite only runs in the rename step, so the chart's history starts full.
    advance(5);
    expect(scene.liveInputs({ step: { sim: { mode: "read" } } } as never).elapsedSec).toBe(0);
  });

  it("read with only tables on stage: no document tile, no document traffic", () => {
    const { advance, scene } = setup("read", {}, ["app", "orders", "items", "products"]);
    expect(advance(0.1)).toEqual({ a: "7 rows", c: "3" });
    expect(scene.state.docSide()).toBe(false);
  });

  it("rename: one row against a rewrite that plays out", () => {
    const { advance, q, chartHidden } = setup("rename");
    expect(advance(5)).toMatchObject({ a: "1 row", b: "20,000 writes", c: "10 s", d: "50%" });
    expect(q("[data-rewrite]")).toBe("10,000 of 20,000 rewritten");
    expect(chartHidden()).toBe(false);
    advance(6);
    expect(q("[data-rewrite]")).toBe("all 20,000 rewritten");
  });

  it("schema: the table rejects bad writes, the collection keeps them", () => {
    const { advance, q } = setup("schema");
    expect(advance(0.1)).toEqual({ a: "0 stored", b: "500 a day", c: "5%" });
    expect(q("[data-cols=orders]")).toBe("currency NOT NULL");
  });
});
