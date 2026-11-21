// @vitest-environment jsdom
import type { Step } from "@tintelix/schema";
import { shardModel } from "../../../../content/system-design/sharding/model";
import { shardScene } from "../../../../content/system-design/sharding/scene";
import { Effects } from "../effects";
import { buildStage } from "../render/dom";
import { rng } from "../rng";
import { createShardScene } from "./shard";
import type { StepContext } from "./types";

const step = (model: Record<string, number>): Step => ({ id: "s", tag: "technique", title: "s", short: "s", text: ["x"], live: "LIVE", sim: { mode: "steady", speed: 1 }, model });

function setup(model: Record<string, number> = {}) {
  const fx = new Effects({ reducedMotion: false, rand: rng(15) });
  const scene = createShardScene({ fx, rand: rng(115), scene: shardScene });
  const host = document.createElement("div");
  const dom = buildStage(host, shardScene, { legend: scene.legend, chartLabel: scene.chart.label, nodeBody: (id, n) => scene.nodeBody(id, n) });
  scene.mount(dom.world);
  const inputs = { ...shardModel.defaults, ...model };
  const ctx = (): StepContext => ({ step: step(model), stepIndex: 0, stepTime: 0, simTime: 0, inputs, overridden: false, visible: new Set(Object.keys(shardScene.nodes)), model: shardModel, playing: true, reducedMotion: false });
  scene.enterStep(ctx());
  const out = shardModel.run(scene.liveInputs(ctx()));
  scene.paintWidgets(out, ctx(), 1 / 30, undefined as never);
  const tiles = Object.fromEntries(scene.tiles(out, ctx()).map((x) => [x.id, x.value]));
  const q = (sel: string) => dom.world.querySelector(sel)!;
  return { tiles, q };
}

describe("shard scene", () => {
  it("single: one database, the rest of the rows sit out", () => {
    const { tiles, q } = setup();
    expect(tiles).toEqual({ a: "400%", b: "25%", c: "1", d: "1" });
    expect(q('[data-node="s1"]').classList.contains("tx-off")).toBe(true);
    expect(q('[data-keys="s0"]').textContent).toBe("every order");
    expect(q('[data-load="s0"]').textContent).toBe("20,000/s");
  });

  it("range: the last shard owns the newest ids and takes every write", () => {
    const { tiles, q } = setup({ scheme: 1 });
    expect(tiles).toMatchObject({ a: "400%", b: "25%", c: "5", d: "1" });
    expect(q('[data-keys="s4"]').textContent).toBe("ids 8M+");
    expect(q('[data-keys="s0"]').textContent).toBe("ids 0 to 2M");
    expect(q('[data-load="s0"]').textContent).toBe("idle");
    expect(q('[data-node="s4"]').classList.contains("tx-hot")).toBe(true);
  });

  it("hash: even shards, and a range query asks all of them", () => {
    const { tiles, q } = setup({ scheme: 2 });
    expect(tiles).toMatchObject({ a: "80%", b: "100%", d: "5" });
    expect(q('[data-keys="s2"]').textContent).toBe("hash % 5 = 2");
    expect(q('[data-load="s2"]').textContent).toBe("4,000/s");
  });
});
