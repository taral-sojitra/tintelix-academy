// @vitest-environment jsdom
import type { Step } from "@tintelix/schema";
import { mqModel } from "../../../../content/system-design/message-queues/model";
import { mqScene } from "../../../../content/system-design/message-queues/scene";
import { Effects } from "../effects";
import { buildStage } from "../render/dom";
import { rng } from "../rng";
import { createMqScene } from "./mq";
import type { StepContext } from "./types";

const step = (model: Record<string, number>): Step => ({ id: "s", tag: "technique", title: "s", short: "s", text: ["x"], live: "LIVE", sim: { mode: "steady", speed: 1 }, model });

function setup(model: Record<string, number> = {}) {
  const fx = new Effects({ reducedMotion: false, rand: rng(22) });
  const scene = createMqScene({ fx, rand: rng(122), scene: mqScene });
  const host = document.createElement("div");
  const dom = buildStage(host, mqScene, { legend: scene.legend, chartLabel: scene.chart.label, nodeBody: (id, n) => scene.nodeBody(id, n) });
  scene.mount(dom.world);
  const inputs = { ...mqModel.defaults, ...model };
  const sim = { ratePerSec: 1 } as never as import("../sim").Sim;
  const ctx = (): StepContext => ({ step: step(model), stepIndex: 0, stepTime: 0, simTime: 0, inputs, overridden: false, visible: new Set(Object.keys(mqScene.nodes)), model: mqModel, playing: true, reducedMotion: false });
  scene.enterStep(ctx());
  const advance = (sec: number) => {
    for (let k = Math.round(sec / 0.1); k > 0; k--) scene.update(0.1, ctx(), sim);
    const out = mqModel.run(scene.liveInputs(ctx()));
    scene.paintWidgets(out, ctx(), 1 / 30, sim);
    return Object.fromEntries(scene.tiles(out, ctx()).map((x) => [x.id, x.value]));
  };
  const q = (sel: string) => dom.world.querySelector<HTMLElement>(sel)!;
  return { advance, q, sim };
}

describe("mq scene", () => {
  it("direct: the spike fails, and the stage sends more traffic during it", () => {
    const { advance, sim } = setup();
    advance(1);
    const calm = sim.ratePerSec;
    expect(advance(9)).toEqual({ a: "75%", b: "45,000", c: "500/s" });
    expect(sim.ratePerSec).toBeGreaterThan(calm * 3);
  });

  it("queue: the backlog grows during the spike and shows in the queue box", () => {
    const { advance, q } = setup({ mode: 1 });
    expect(advance(12)).toMatchObject({ a: "15,000", b: "90 s", c: "0" });
    expect(q("[data-backlog]").textContent).toBe("15,000 waiting · 30 s wait");
    expect(q('[data-workers] i.on') ? q("[data-workers]").querySelectorAll("i.on").length : 0).toBe(4);
  });

  it("dlq: little waste, and the dead letters pile up for a person", () => {
    const { advance } = setup({ mode: 3 });
    expect(advance(10)).toMatchObject({ a: "1.2%" });
  });
});
