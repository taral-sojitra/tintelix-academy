// @vitest-environment jsdom
import type { Step } from "@tintelix/schema";
import { lbModel, POLICY } from "../../../../content/system-design/load-balancing/model";
import { lbScene } from "../../../../content/system-design/load-balancing/scene";
import { Effects } from "../effects";
import { buildStage } from "../render/dom";
import { rng } from "../rng";
import { Sim } from "../sim";
import { createBalanceScene } from "./balance";
import type { StepContext } from "./types";

const step = (model: Record<string, number>): Step => ({ id: "s", tag: "technique", title: "s", short: "s", text: ["x"], live: "LIVE", sim: { mode: "steady", speed: 1 }, model });

function setup(model: Record<string, number>) {
  const fx = new Effects({ reducedMotion: false, rand: rng(2) });
  const scene = createBalanceScene({ fx, rand: rng(102), scene: lbScene });
  const host = document.createElement("div");
  const dom = buildStage(host, lbScene, { legend: scene.legend, chartLabel: scene.chart.label, nodeBody: (id, n) => scene.nodeBody(id, n) });
  scene.mount(dom.world);
  const inputs = { ...lbModel.defaults, ...model };
  const ctx = (): StepContext => ({ step: step(model), stepIndex: 0, stepTime: 0, simTime: 0, inputs, overridden: false, visible: new Set(Object.keys(lbScene.nodes)), model: lbModel, playing: true, reducedMotion: false });
  scene.enterStep(ctx());
  const sim = new Sim({ wires: {}, router: scene.router, rand: rng(1), ratePerSec: 0, speed: 100, queues: scene.sim.queues });
  const out = lbModel.run(inputs);
  scene.paintWidgets(out, ctx(), 1 / 30, sim);
  const tiles = Object.fromEntries(scene.tiles(out, ctx()).map((x) => [x.id, x.value]));
  return { scene, tiles, dom, sim };
}

describe("balance scene", () => {
  it("reads round robin from the model", () => {
    const { tiles, dom } = setup({ policy: POLICY.roundRobin });
    expect(tiles).toEqual({ lookups: "82 ms", reports: "272 ms", served: "100%", load: "69%", policy: "Round robin" });
    expect(dom.world.querySelector('[data-policy-name]')!.textContent).toBe("round robin");
  });

  it("shows overload plainly when one server takes everything", () => {
    const { tiles } = setup({ policy: POLICY.single });
    expect(tiles).toMatchObject({ lookups: "overloaded", served: "48%", load: "207%" });
  });

  it("compares every policy in the panel and marks the current one", () => {
    const { dom } = setup({ policy: POLICY.leastConnections });
    const rows = [...dom.world.querySelectorAll("[data-compare-row]")].map((r) => r.textContent);
    expect(rows).toEqual(["One server48% served", "Round robin82 ms", "Least connections27 ms", "Layer 7 by path16 ms"]);
    expect(dom.world.querySelector('[data-compare-row].on')!.textContent).toContain("Least connections");
  });

  it("picks servers the way each policy says", () => {
    const rr = setup({ policy: POLICY.roundRobin });
    expect([0, 1, 2, 3].map(() => rr.scene.state.pick(rr.sim, false))).toEqual(["s0", "s1", "s2", "s0"]);
    const path = setup({ policy: POLICY.byPath });
    expect(path.scene.state.pick(path.sim, true)).toBe("s2");
    expect(["s0", "s1"]).toContain(path.scene.state.pick(path.sim, false));
    const one = setup({ policy: POLICY.single });
    expect(one.scene.state.pick(one.sim, true)).toBe("s0");
  });

  it("least connections skips the busiest server", () => {
    const { scene, sim } = setup({ policy: POLICY.leastConnections });
    sim.queues.s0!.push({ id: 1 } as never);
    sim.queues.s0!.push({ id: 2 } as never);
    sim.queues.s1!.push({ id: 3 } as never);
    expect(scene.state.pick(sim, false)).toBe("s2");
  });
});
