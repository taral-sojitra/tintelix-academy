// @vitest-environment jsdom
import type { Step } from "@tintelix/schema";
import { idemModel } from "../../../../content/system-design/idempotency/model";
import { idemScene } from "../../../../content/system-design/idempotency/scene";
import { Effects } from "../effects";
import { buildStage } from "../render/dom";
import { rng } from "../rng";
import { createIdemScene } from "./idem";
import type { StepContext } from "./types";

const step = (mode: string, model: Record<string, number>): Step => ({ id: "s", tag: "technique", title: "s", short: "s", text: ["x"], live: "LIVE", sim: { mode, speed: 1 }, model });

function setup(mode: string, model: Record<string, number> = {}) {
  const fx = new Effects({ reducedMotion: false, rand: rng(23) });
  const scene = createIdemScene({ fx, rand: rng(123), scene: idemScene });
  const host = document.createElement("div");
  const dom = buildStage(host, idemScene, { legend: scene.legend, chartLabel: scene.chart.label, nodeBody: (id, n) => scene.nodeBody(id, n) });
  scene.mount(dom.world);
  const inputs = { ...idemModel.defaults, ...model };
  const ctx = (): StepContext => ({ step: step(mode, model), stepIndex: 0, stepTime: 0, simTime: 0, inputs, overridden: false, visible: new Set(Object.keys(idemScene.nodes)), model: idemModel, playing: true, reducedMotion: false });
  scene.enterStep(ctx());
  const out = idemModel.run(scene.liveInputs(ctx()));
  scene.paintWidgets(out, ctx(), 1 / 30, undefined as never);
  const tiles = Object.fromEntries(scene.tiles(out, ctx()).map((x) => [x.id, x.value]));
  const q = (sel: string) => dom.world.querySelector<HTMLElement>(sel)!;
  return { tiles, q };
}

describe("idem scene", () => {
  it("no key: double charges from retries and double taps", () => {
    const { tiles, q } = setup("retries");
    expect(tiles).toEqual({ a: "6", b: "10", c: "1" });
    expect(q("[data-policy]").textContent).toBe("no key: every call charges");
  });
  it("key, check then insert: retries fixed, races not", () => {
    const { tiles, q } = setup("races", { mode: 1 });
    expect(tiles).toEqual({ a: "1", b: "0", c: "1", d: "86,400,000" });
    expect(q("[data-policy]").textContent).toBe("looks up the key, then saves it");
  });
  it("atomic claim: nothing charged twice", () => {
    const { tiles, q } = setup("races", { mode: 2 });
    expect(tiles).toMatchObject({ a: "0", c: "0" });
    expect(q("[data-policy]").textContent).toBe("claims the key first, atomically");
  });
});
