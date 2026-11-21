// @vitest-environment jsdom
import type { Step } from "@tintelix/schema";
import { replModel } from "../../../../content/system-design/replication/model";
import { replScene } from "../../../../content/system-design/replication/scene";
import { Effects } from "../effects";
import { buildStage } from "../render/dom";
import { rng } from "../rng";
import { createReplScene, type ReplScene } from "./repl";
import type { StepContext } from "./types";

const step = (mode: string, model: Record<string, number>): Step => ({ id: "s", tag: "technique", title: "s", short: "s", text: ["x"], live: "LIVE", sim: { mode, speed: 1 }, model });

function setup(mode: string, model: Record<string, number> = {}) {
  const fx = new Effects({ reducedMotion: false, rand: rng(14) });
  const scene = createReplScene({ fx, rand: rng(114), scene: replScene }) as ReplScene;
  const host = document.createElement("div");
  const dom = buildStage(host, replScene, { legend: scene.legend, chartLabel: scene.chart.label, nodeBody: (id, n) => scene.nodeBody(id, n) });
  scene.mount(dom.world);
  const inputs = { ...replModel.defaults, ...model };
  const ctx = (): StepContext => ({ step: step(mode, model), stepIndex: 0, stepTime: 0, simTime: 0, inputs, overridden: false, visible: new Set(Object.keys(replScene.nodes)), model: replModel, playing: true, reducedMotion: false });
  scene.enterStep(ctx());
  const advance = (sec: number) => {
    for (let k = Math.round(sec / 0.1); k > 0; k--) scene.update(0.1, ctx(), undefined as never);
    const out = replModel.run(scene.liveInputs(ctx()));
    scene.paintWidgets(out, ctx(), 1 / 30, undefined as never);
    return Object.fromEntries(scene.tiles(out, ctx()).map((x) => [x.id, x.value]));
  };
  const q = (sel: string) => dom.world.querySelector(sel)!;
  const paint = (extra: Record<string, number>) => scene.paintWidgets({ ...replModel.run(scene.liveInputs(ctx())), ...extra }, ctx(), 1 / 30, undefined as never);
  return { scene, advance, q, root: dom.root, paint };
}

describe("replication scene", () => {
  it("copies: replicas share reads; the third box sits out with two replicas", () => {
    const { advance, q, scene } = setup("copies");
    expect(advance(0.1)).toEqual({ a: "4,500", b: "1,000", c: "10,000" });
    expect(q('[data-node="r2"]').classList.contains("tx-off")).toBe(true);
    expect(q('[data-reads="r0"]').textContent).toBe("4,500 reads/s · 90% busy");
    expect(scene.state.readers()).toEqual(["r0", "r1"]);
    expect(scene.state.writeTarget()).toBe("primary");
  });

  it("lag: the replication label shows the lag, and the chart appears", () => {
    const { advance, q, root } = setup("lag");
    expect(advance(0.1)).toEqual({ a: "90 ms", b: "45%", c: "20%" });
    expect(q('.tx-wlabel[data-wire="p_r0"]').textContent).toBe("lag 90 ms");
    expect(root.querySelector<HTMLElement>(".tx-chartbox")!.hidden).toBe(false);
  });

  it("failover: no one takes writes, then Replica 1 is promoted", () => {
    const { advance, q, scene, paint } = setup("failover", { crash: 1 });
    expect(advance(2)).toEqual({ a: "90", b: "100%", c: "62 ms" });
    expect(scene.state.writeTarget()).toBe(null);
    expect(q("[data-role=primary]").textContent).toBe("down");
    expect(q("[data-role=r0]").textContent).toBe("being promoted…");
    // Halfway between "down" and "promoted", as the smoothed numbers on screen would be.
    advance(9);
    paint({ writesDownPct: 0.4 });
    expect(q("[data-role=r0]").textContent).toBe("new primary: takes writes");
    expect(scene.state.writeTarget()).toBe("r0");
    expect(scene.state.readers()).toEqual(["r1"]);
    expect(q("[data-role=r0]").textContent).toBe("new primary: takes writes");
  });
});
