// @vitest-environment jsdom
import type { Step } from "@tintelix/schema";
import { sessionModel } from "../../../../content/system-design/stateless-services/model";
import { sessionScene } from "../../../../content/system-design/stateless-services/scene";
import { Effects } from "../effects";
import { buildStage } from "../render/dom";
import { rng } from "../rng";
import { createSessionScene, type SessionScene } from "./session";
import type { StepContext } from "./types";

const step = (model: Record<string, number>): Step => ({ id: "s", tag: "technique", title: "s", short: "s", text: ["x"], live: "LIVE", sim: { mode: "steady", speed: 1 }, model });

function setup(model: Record<string, number> = {}) {
  const fx = new Effects({ reducedMotion: false, rand: rng(9) });
  const scene = createSessionScene({ fx, rand: rng(109), scene: sessionScene }) as SessionScene;
  const host = document.createElement("div");
  const dom = buildStage(host, sessionScene, { legend: scene.legend, chartLabel: scene.chart.label, nodeBody: (id, n) => scene.nodeBody(id, n) });
  scene.mount(dom.world);
  const inputs = { ...sessionModel.defaults, ...model };
  const ctx = (): StepContext => ({ step: step(model), stepIndex: 0, stepTime: 0, simTime: 0, inputs, overridden: false, visible: new Set(Object.keys(sessionScene.nodes)), model: sessionModel, playing: true, reducedMotion: false });
  scene.enterStep(ctx());
  const advance = (sec: number) => {
    for (let t = 0; t < sec; t += 0.1) scene.update(0.1, ctx(), undefined as never);
    const out = sessionModel.run(scene.liveInputs(ctx()));
    scene.paintWidgets(out, ctx(), 1 / 30, undefined as never);
    return Object.fromEntries(scene.tiles(out, ctx()).map((x) => [x.id, x.value]));
  };
  const q = (sel: string) => dom.world.querySelector(sel)!.textContent;
  return { scene, advance, q };
}

describe("session scene", () => {
  it("memory + round robin: each server holds one group, most requests lose their login", () => {
    const { advance, q, scene } = setup();
    expect(advance(0.1)).toMatchObject({ a: "5,000", b: "67%", e: "none" });
    expect(q('[data-holds="s1"]')).toBe("users B · 5,000 sessions");
    expect(q("[data-policy]")).toBe("round robin");
    expect(scene.state.mode()).toBe("memory");
  });

  it("sticky + deploy: the replaced server's users bounce, then log in again", () => {
    const { advance, q, scene } = setup({ mode: 1, deploy: 1 });
    expect(advance(0.5)).toMatchObject({ b: "0%", c: "5,000" });
    expect(q("[data-policy]")).toBe("sticky cookie");
    expect(q('[data-holds="s1"]')).toBe("new instance · sessions gone");
    expect(scene.state.bounced(1)).toBe(true);
    expect(scene.state.bounced(0)).toBe(false);
    advance(2);
    expect(scene.state.bounced(1)).toBe(false);
    expect(q('[data-holds="s1"]')).toBe("users B · logged in again");
  });

  it("shared store: servers keep nothing, the store holds every session", () => {
    const { advance, q, scene } = setup({ mode: 2, deploy: 1 });
    expect(advance(0.5)).toMatchObject({ c: "0", d: "151 ms", e: "6,000/s" });
    expect(q('[data-holds="s1"]')).toBe("keeps no sessions");
    expect(q("[data-store]")).toBe("15,000 sessions");
    expect(q("[data-reads]")).toBe("6,000 reads a second");
    expect(scene.state.mode()).toBe("shared");
  });
});
