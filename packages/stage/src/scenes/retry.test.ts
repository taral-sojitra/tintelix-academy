// @vitest-environment jsdom
import type { Step } from "@tintelix/schema";
import { retryModel } from "../../../../content/system-design/retries-and-circuit-breakers/model";
import { retryScene } from "../../../../content/system-design/retries-and-circuit-breakers/scene";
import { Effects } from "../effects";
import { buildStage } from "../render/dom";
import { rng } from "../rng";
import { createRetryScene } from "./retry";
import type { StepContext } from "./types";

const step = (model: Record<string, number>): Step => ({ id: "s", tag: "technique", title: "s", short: "s", text: ["x"], live: "LIVE", sim: { mode: "steady", speed: 1 }, model });

function setup(model: Record<string, number> = {}) {
  const fx = new Effects({ reducedMotion: false, rand: rng(28) });
  const scene = createRetryScene({ fx, rand: rng(128), scene: retryScene });
  const host = document.createElement("div");
  const dom = buildStage(host, retryScene, { legend: scene.legend, chartLabel: scene.chart.label, nodeBody: (id, n) => scene.nodeBody(id, n) });
  scene.mount(dom.world);
  const inputs = { ...retryModel.defaults, ...model };
  const ctx = (): StepContext => ({ step: step(model), stepIndex: 0, stepTime: 0, simTime: 0, inputs, overridden: false, visible: new Set(Object.keys(retryScene.nodes)), model: retryModel, playing: true, reducedMotion: false });
  scene.enterStep(ctx());
  const advance = (sec: number) => {
    for (let k = Math.round(sec / 0.1); k > 0; k--) scene.update(0.1, ctx(), undefined as never);
    const out = retryModel.run(scene.liveInputs(ctx()));
    scene.paintWidgets(out, ctx(), 1 / 30, undefined as never);
    return Object.fromEntries(scene.tiles(out, ctx()).map((x) => [x.id, x.value]));
  };
  const q = (sel: string) => dom.world.querySelector<HTMLElement>(sel)!;
  const all = (sel: string) => dom.world.querySelectorAll<HTMLElement>(sel);
  return { advance, q, all };
}

describe("retry scene", () => {
  it("budget: nested bars with the spare shown", () => {
    const { advance, q } = setup();
    expect(advance(0.1)).toEqual({ a: "700 ms", b: "100 ms", c: "1000 ms" });
    expect(q('[data-bar="pricing"]').style.width).toBe("40%");
    expect(q("[data-pool]").textContent).toBe("answers in 40 ms · 20 of 50 connections busy");
  });
  it("storm: the pool is overrun and every wave of retries lands at once", () => {
    const { advance, q, all } = setup({ mode: 1 });
    expect(advance(0.1)).toEqual({ a: "0%", b: "1,500/s", c: "900 ms" });
    expect(q("[data-pool]").textContent).toBe("answers in 400 ms · needs 200 of 50 connections");
    expect([...all("[data-wave] i")].map((el) => el.style.height)).toEqual(["100%", "0%", "0%", "0%"]);
    expect(q("[data-wavecap]").textContent).toBe("500 retries land in the same 100 ms");
  });
  it("jitter: the wave spreads over four slices", () => {
    const { advance, all, q } = setup({ mode: 2 });
    expect(advance(0.1)).toMatchObject({ a: "125" });
    expect(q("[data-wavecap]").textContent).toBe("125 per 100 ms, spread over 400 ms");
    expect([...all("[data-wave] i")].map((el) => el.style.height)).toEqual(["25%", "25%", "25%", "25%"]);
  });
  it("breaker: open, counting down, then closed again", () => {
    const { advance, q } = setup({ mode: 3 });
    advance(3);
    expect(q("[data-brk]").textContent).toBe("OPEN · 9 s left");
    expect(q('[data-node="breaker"]').classList.contains("tx-down")).toBe(true);
    expect(q("[data-pool]").textContent).toBe("no calls: catching up");
    const tiles = advance(10);
    expect(tiles).toMatchObject({ a: "closed again", b: "100%", c: "40 ms" });
    expect(q("[data-brk]").textContent).toBe("CLOSED: test calls passed");
  });
});
