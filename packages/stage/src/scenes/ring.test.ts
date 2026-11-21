// @vitest-environment jsdom
import type { Step } from "@tintelix/schema";
import { ringModel } from "../../../../content/system-design/consistent-hashing/model";
import { ringScene } from "../../../../content/system-design/consistent-hashing/scene";
import { Effects } from "../effects";
import { buildStage } from "../render/dom";
import { rng } from "../rng";
import { createRingScene, KEY_COUNT } from "./ring";
import type { StepContext } from "./types";

const step = (mode: string, model: Record<string, number>): Step => ({ id: "s", tag: "technique", title: "s", short: "s", text: ["x"], live: "LIVE", sim: { mode, speed: 1 }, model });

function setup(mode: string, model: Record<string, number> = {}) {
  const fx = new Effects({ reducedMotion: false, rand: rng(16) });
  const scene = createRingScene({ fx, rand: rng(116), scene: ringScene });
  const host = document.createElement("div");
  const dom = buildStage(host, ringScene, { legend: scene.legend, chartLabel: scene.chart.label, nodeBody: (id, n) => scene.nodeBody(id, n) });
  scene.mount(dom.world);
  const inputs = { ...ringModel.defaults, ...model };
  const ctx = (): StepContext => ({ step: step(mode, model), stepIndex: 0, stepTime: 0, simTime: 0, inputs, overridden: false, visible: new Set(Object.keys(ringScene.nodes)), model: ringModel, playing: true, reducedMotion: false });
  scene.enterStep(ctx());
  const advance = (sec: number) => {
    for (let k = Math.round(sec / 0.1); k > 0; k--) scene.update(0.1, ctx(), undefined as never);
    const out = ringModel.run(scene.liveInputs(ctx()));
    scene.paintWidgets(out, ctx(), 1 / 30, undefined as never);
    return Object.fromEntries(scene.tiles(out, ctx()).map((x) => [x.id, x.value]));
  };
  const all = (sel: string) => dom.world.querySelectorAll(sel).length;
  return { advance, all, world: dom.world };
}

describe("ring scene", () => {
  it("mod: before the join nothing has moved; after, most keys change server", () => {
    const { advance, all } = setup("mod");
    expect(advance(1)).toMatchObject({ a: "80%", b: "0%", c: "4 → 5" });
    expect(all(".tx-kgrid .moved")).toBe(0);
    expect(all(".tx-kgrid i")).toBe(KEY_COUNT);
    expect(advance(2)).toMatchObject({ b: "80%" });
    const moved = all(".tx-kgrid .moved");
    expect(moved).toBeGreaterThan(KEY_COUNT * 0.6);
  });

  it("ring: one point per server, and after the join only one arc's keys move", () => {
    const { advance, all } = setup("ring", { scheme: 1 });
    advance(3);
    expect(all(".tx-ring circle.srv")).toBe(5);
    const moved = all(".tx-ring .key.moved");
    expect(moved).toBeGreaterThan(0);
    expect(moved).toBeLessThan(KEY_COUNT * 0.35);
  });

  it("ring with virtual nodes: many points per server", () => {
    const { advance, all } = setup("ring", { scheme: 1, vnodes: 100 });
    expect(advance(3)).toMatchObject({ c: "22%" });
    expect(all(".tx-ring circle.srv")).toBe(500);
  });
});
