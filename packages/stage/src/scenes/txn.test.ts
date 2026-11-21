// @vitest-environment jsdom
import type { Step } from "@tintelix/schema";
import { txnModel } from "../../../../content/system-design/distributed-transactions/model";
import { txnScene } from "../../../../content/system-design/distributed-transactions/scene";
import { Effects } from "../effects";
import { buildStage } from "../render/dom";
import { rng } from "../rng";
import { createTxnScene } from "./txn";
import type { StepContext } from "./types";

const step = (model: Record<string, number>): Step => ({ id: "s", tag: "technique", title: "s", short: "s", text: ["x"], live: "LIVE", sim: { mode: "steady", speed: 1 }, model });

function setup(model: Record<string, number> = {}) {
  const fx = new Effects({ reducedMotion: false, rand: rng(21) });
  const scene = createTxnScene({ fx, rand: rng(121), scene: txnScene });
  const host = document.createElement("div");
  const dom = buildStage(host, txnScene, { legend: scene.legend, chartLabel: scene.chart.label, nodeBody: (id, n) => scene.nodeBody(id, n) });
  scene.mount(dom.world);
  const inputs = { ...txnModel.defaults, ...model };
  const ctx = (): StepContext => ({ step: step(model), stepIndex: 0, stepTime: 0, simTime: 0, inputs, overridden: false, visible: new Set(Object.keys(txnScene.nodes)), model: txnModel, playing: true, reducedMotion: false });
  scene.enterStep(ctx());
  const paint = () => {
    const out = txnModel.run(scene.liveInputs(ctx()));
    scene.paintWidgets(out, ctx(), 1 / 30, undefined as never);
    return Object.fromEntries(scene.tiles(out, ctx()).map((x) => [x.id, x.value]));
  };
  const q = (sel: string) => dom.world.querySelector<HTMLElement>(sel)!;
  return { scene, paint, q, ctx };
}

describe("txn scene", () => {
  it("none: broken orders, no locks", () => {
    const { paint, q } = setup();
    expect(paint()).toEqual({ a: "2", b: "2%", c: "20 ms" });
    expect(q('[data-lock="s1"]').textContent).toBe("commits on its own");
  });

  it("2pc: a prepare locks a participant until its commit", () => {
    const { paint, q, scene, ctx } = setup({ mode: 1 });
    expect(paint()).toEqual({ a: "0", b: "40 ms", c: "25" });
    scene.onEvent({ kind: "fill", node: "s1", at: [500, 232] }, ctx());
    paint();
    expect(q('[data-lock="s1"]').textContent).toBe("prepared: rows locked");
    expect(q('[data-node="s1"]').classList.contains("tx-locked")).toBe(true);
    scene.onEvent({ kind: "pass", node: "s1", at: [500, 232] }, ctx());
    paint();
    expect(q('[data-lock="s1"]').textContent).toBe("free");
  });

  it("down: every participant stays locked", () => {
    const { paint, q } = setup({ mode: 2 });
    expect(paint()).toEqual({ a: "900", b: "down", c: "30 s" });
    expect(q('[data-lock="s2"]').textContent).toBe("locked, waiting for checkout");
    expect(q('[data-node="coord"]').classList.contains("tx-down")).toBe(true);
  });

  it("saga: compensations instead of broken orders", () => {
    const { paint, q } = setup({ mode: 3 });
    expect(paint()).toEqual({ a: "0", b: "2", c: "50" });
    expect(q("[data-role]").textContent).toBe("each step commits; undo on failure");
  });
});
