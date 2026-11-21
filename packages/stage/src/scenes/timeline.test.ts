// @vitest-environment jsdom
import type { Step } from "@tintelix/schema";
import { consistencyModel } from "../../../../content/system-design/consistency-models/model";
import { timelineScene } from "../../../../content/system-design/consistency-models/scene";
import { Effects } from "../effects";
import { buildStage } from "../render/dom";
import { rng } from "../rng";
import { createTimelineScene, SWEEP } from "./timeline";
import type { StepContext } from "./types";

const step = (model: Record<string, number>): Step => ({ id: "s", tag: "technique", title: "s", short: "s", text: ["x"], live: "LIVE", sim: { mode: "steady", speed: 1 }, model });

function setup(model: Record<string, number> = {}) {
  const fx = new Effects({ reducedMotion: false, rand: rng(20) });
  const scene = createTimelineScene({ fx, rand: rng(120), scene: timelineScene });
  const host = document.createElement("div");
  const dom = buildStage(host, timelineScene, { legend: scene.legend, chartLabel: scene.chart.label, nodeBody: (id, n) => scene.nodeBody(id, n) });
  scene.mount(dom.world);
  const inputs = { ...consistencyModel.defaults, ...model };
  const ctx = (): StepContext => ({ step: step(model), stepIndex: 0, stepTime: 0, simTime: 0, inputs, overridden: false, visible: new Set(["tl"]), model: consistencyModel, playing: true, reducedMotion: false });
  scene.enterStep(ctx());
  const advance = (sec: number) => {
    for (let k = Math.round(sec / 0.1); k > 0; k--) scene.update(0.1, ctx(), undefined as never);
    const out = consistencyModel.run(scene.liveInputs(ctx()));
    scene.paintWidgets(out, ctx(), 1 / 30, undefined as never);
    return Object.fromEntries(scene.tiles(out, ctx()).map((x) => [x.id, x.value]));
  };
  const q = (sel: string) => dom.world.querySelector<HTMLElement>(sel)!;
  return { advance, q, root: dom.root };
}

describe("timeline scene", () => {
  it("eventual: badges appear as the playhead passes each read", () => {
    const { advance, q, root } = setup();
    expect(advance(0.1)).toEqual({ a: "no", b: "a reply to nothing", c: "1 ms", d: "300 ms" });
    expect(q('[data-ev="asha"]').classList.contains("past")).toBe(false);
    advance(SWEEP * 0.3);
    expect(q('[data-ev="asha"]').classList.contains("past")).toBe(true);
    expect(q('[data-ev="asha"]').textContent).toContain("her post is missing");
    expect(q('[data-ev="asha"]').dataset.lane).toBe("r1");
    advance(SWEEP * 0.3);
    expect(q('[data-ev="ben"]').textContent).toContain("a reply to nothing");
    expect(root.querySelector<HTMLElement>(".tx-chartbox")!.hidden).toBe(true);
  });

  it("causal: the reply is held at replica 2 until the post arrives", () => {
    const { advance, q } = setup({ mode: 2 });
    expect(advance(0.1)).toMatchObject({ a: "yes", b: "neither yet" });
    expect(q('[data-ev="held"]')).not.toBeNull();
    expect(q('[data-ev="asha"]').dataset.lane).toBe("lead");
  });

  it("strong: Ben reads from the leaders, far away", () => {
    const { advance, q } = setup({ mode: 3 });
    expect(advance(0.1)).toMatchObject({ a: "yes", b: "post and reply", c: "70 ms" });
    expect(q('[data-ev="ben"]').dataset.lane).toBe("lead");
  });
});
