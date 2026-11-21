// @vitest-environment jsdom
import type { Step } from "@tintelix/schema";
import { microModel } from "../../../../content/system-design/monolith-vs-microservices/model";
import { microScene } from "../../../../content/system-design/monolith-vs-microservices/scene";
import { Effects } from "../effects";
import { buildStage } from "../render/dom";
import { rng } from "../rng";
import { createMicroScene } from "./micro";
import type { StepContext } from "./types";

const step = (mode: string, model: Record<string, number>): Step => ({ id: "s", tag: "technique", title: "s", short: "s", text: ["x"], live: "LIVE", sim: { mode, speed: 1 }, model });

function setup(mode: string, model: Record<string, number>, visible: string[]) {
  const fx = new Effects({ reducedMotion: false, rand: rng(27) });
  const scene = createMicroScene({ fx, rand: rng(127), scene: microScene });
  const host = document.createElement("div");
  const dom = buildStage(host, microScene, { legend: scene.legend, chartLabel: scene.chart.label, nodeBody: (id, n) => scene.nodeBody(id, n) });
  scene.mount(dom.world);
  const inputs = { ...microModel.defaults, ...model };
  const ctx = (): StepContext => ({ step: step(mode, model), stepIndex: 0, stepTime: 0, simTime: 0, inputs, overridden: false, visible: new Set(visible), model: microModel, playing: true, reducedMotion: false });
  scene.enterStep(ctx());
  const paint = () => {
    const out = microModel.run(scene.liveInputs(ctx()));
    scene.paintWidgets(out, ctx(), 1 / 30, undefined as never);
    return Object.fromEntries(scene.tiles(out, ctx()).map((x) => [x.id, x.value]));
  };
  const all = (sel: string) => dom.world.querySelectorAll(sel).length;
  return { scene, paint, all, ctx };
}

const SPLIT = ["users", "orders", "search", "users_svc", "catalog", "payments", "shipping"];

describe("micro scene", () => {
  it("monolith deploys: one line for everyone, modules flash inside one box", () => {
    const { paint, all, scene, ctx } = setup("deploy", {}, ["users", "mono"]);
    expect(paint()).toEqual({ a: "16", b: "12 h", c: "45 min" });
    expect(all(".tx-modules span")).toBe(6);
    scene.onEvent({ kind: "pass", node: "mono", at: [270, 239] }, ctx());
    scene.update(0.05, ctx(), undefined as never);
    paint();
    expect(all(".tx-modules span.on")).toBe(1);
  });
  it("microservices deploy alone", () => {
    expect(setup("deploy", { mode: 1 }, SPLIT).paint()).toEqual({ a: "16", b: "0 h", c: "15 min" });
  });
  it("calls and scale", () => {
    expect(setup("calls", { mode: 1 }, SPLIT).paint()).toEqual({ a: "4,000 µs", b: "99.5%", c: "3 h 36 min" });
    expect(setup("scale", { mode: 1 }, SPLIT).paint()).toEqual({ a: "40 GB", b: "10 GB", c: "10" });
  });
});
