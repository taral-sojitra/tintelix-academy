// @vitest-environment jsdom
import type { Step } from "@tintelix/schema";
import { proxyModel } from "../../../../content/system-design/proxies/model";
import { proxyScene } from "../../../../content/system-design/proxies/scene";
import { Effects } from "../effects";
import { buildStage } from "../render/dom";
import { rng } from "../rng";
import { createProxyScene, MAX_WORKER_CELLS } from "./proxy";
import type { StepContext } from "./types";

const step = (mode: string, model: Record<string, number> = {}): Step => ({ id: "s", tag: "technique", title: "s", short: "s", text: ["x"], live: "LIVE", sim: { mode, speed: 1 }, model });

function setup(mode: string, model: Record<string, number> = {}) {
  const fx = new Effects({ reducedMotion: false, rand: rng(6) });
  const scene = createProxyScene({ fx, rand: rng(106), scene: proxyScene });
  const host = document.createElement("div");
  const dom = buildStage(host, proxyScene, { legend: scene.legend, chartLabel: scene.chart.label, nodeBody: (id, n) => scene.nodeBody(id, n) });
  scene.mount(dom.world);
  const inputs = { ...proxyModel.defaults, ...model };
  const ctx = (): StepContext => ({ step: step(mode, model), stepIndex: 0, stepTime: 0, simTime: 0, inputs, overridden: false, visible: new Set(Object.keys(proxyScene.nodes)), model: proxyModel, playing: true, reducedMotion: false });
  scene.enterStep(ctx());
  const out = proxyModel.run(inputs);
  scene.paintWidgets(out, ctx(), 1 / 30, undefined as never);
  const tiles = Object.fromEntries(scene.tiles(out, ctx()).map((x) => [x.id, x.value]));
  return { scene, tiles, dom };
}

describe("proxy scene", () => {
  it("forward mode reads the office's download", () => {
    const { tiles, scene } = setup("forward");
    expect(tiles).toEqual({ a: "100 GB", b: "0.2 GB", c: "99.8%", d: "500", e: "1 address" });
    expect(scene.state.mode()).toBe("forward");
  });

  it("forward mode hides the slow-network label and the workers chart", () => {
    const { dom } = setup("forward");
    expect(dom.world.querySelector<HTMLElement>('.tx-wlabel[data-wire="p_rp"]')!.hidden).toBe(true);
    expect(dom.root.querySelector<HTMLElement>(".tx-chartbox")!.hidden).toBe(true);
  });

  it("reverse mode without buffering: workers overflow", () => {
    const { tiles, dom } = setup("reverse");
    expect(tiles).toEqual({ a: "334 ms", b: "134", c: "75%", d: "299/s", e: "30%" });
    expect(dom.world.querySelectorAll("[data-workers] i.on")).toHaveLength(MAX_WORKER_CELLS);
    expect(dom.world.querySelector("[data-buffering]")!.textContent).toBe("buffering off");
    expect(dom.world.querySelector("[data-workers-note]")!.textContent).toBe("134 needed, 100 exist");
    expect(dom.world.querySelector<HTMLElement>('.tx-wlabel[data-wire="p_rp"]')!.hidden).toBe(false);
    expect(dom.root.querySelector<HTMLElement>(".tx-chartbox")!.hidden).toBe(false);
  });

  it("reverse mode with buffering: a few workers do it all", () => {
    const { tiles, dom } = setup("reverse", { buffering: 1 });
    expect(tiles).toMatchObject({ a: "21 ms", b: "8.4", c: "100%" });
    expect(dom.world.querySelectorAll("[data-workers] i.on")).toHaveLength(8);
    expect(dom.world.querySelector("[data-buffering]")!.textContent).toBe("buffering on");
  });
});
