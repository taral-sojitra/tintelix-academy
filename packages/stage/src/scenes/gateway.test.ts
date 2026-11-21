// @vitest-environment jsdom
import type { Step } from "@tintelix/schema";
import { gatewayModel } from "../../../../content/system-design/api-gateway/model";
import { gatewayScene } from "../../../../content/system-design/api-gateway/scene";
import { Effects } from "../effects";
import { buildStage } from "../render/dom";
import { rng } from "../rng";
import { createGatewayScene } from "./gateway";
import type { StepContext } from "./types";

const step = (mode: string, model: Record<string, number>): Step => ({ id: "s", tag: "technique", title: "s", short: "s", text: ["x"], live: "LIVE", sim: { mode, speed: 1 }, model });

function setup(mode: string, model: Record<string, number> = {}) {
  const fx = new Effects({ reducedMotion: false, rand: rng(26) });
  const scene = createGatewayScene({ fx, rand: rng(126), scene: gatewayScene });
  const host = document.createElement("div");
  const dom = buildStage(host, gatewayScene, { legend: scene.legend, chartLabel: scene.chart.label, nodeBody: (id, n) => scene.nodeBody(id, n) });
  scene.mount(dom.world);
  const inputs = { ...gatewayModel.defaults, ...model };
  const ctx = (): StepContext => ({ step: step(mode, model), stepIndex: 0, stepTime: 0, simTime: 0, inputs, overridden: false, visible: new Set(Object.keys(gatewayScene.nodes)), model: gatewayModel, playing: true, reducedMotion: false });
  scene.enterStep(ctx());
  const out = gatewayModel.run(scene.liveInputs(ctx()));
  scene.paintWidgets(out, ctx(), 1 / 30, undefined as never);
  const tiles = Object.fromEntries(scene.tiles(out, ctx()).map((x) => [x.id, x.value]));
  const q = (sel: string) => dom.world.querySelector<HTMLElement>(sel)!;
  return { tiles, q };
}

describe("gateway scene", () => {
  it("no gateway: every service checks sign-in itself", () => {
    const { tiles, q } = setup("steady");
    expect(tiles).toEqual({ a: "6", b: "6", c: "240 ms" });
    expect(q('[data-guard="s2"]').textContent).toBe("checks sign-in itself");
  });
  it("gateway: services trust it", () => {
    const { tiles, q } = setup("steady", { mode: 1 });
    expect(tiles).toEqual({ a: "1", b: "2 ms", c: "244 ms" });
    expect(q('[data-guard="s2"]').textContent).toBe("trusts the gateway");
    expect(q("[data-gw]").textContent).toBe("checks sign-in · limits · routes");
  });
  it("aggregation and the fleet", () => {
    expect(setup("steady", { mode: 2 }).tiles).toEqual({ a: "1", b: "144 ms", c: "100 ms" });
    const fleet = setup("fleet", { mode: 2 });
    expect(fleet.tiles).toMatchObject({ a: "6" });
    expect(fleet.q("[data-gw]").textContent).toBe("6 copies behind a load balancer");
  });
});
