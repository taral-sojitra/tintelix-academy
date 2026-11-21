// @vitest-environment jsdom
import type { Step } from "@tintelix/schema";
import { healthModel } from "../../../../content/system-design/health-checks/model";
import { healthScene } from "../../../../content/system-design/health-checks/scene";
import { Effects } from "../effects";
import { buildStage } from "../render/dom";
import { rng } from "../rng";
import { createHealthScene } from "./health";
import type { StepContext } from "./types";

const step = (model: Record<string, number>): Step => ({ id: "s", tag: "technique", title: "s", short: "s", text: ["x"], live: "LIVE", sim: { mode: "steady", speed: 1 }, model });

function setup(model: Record<string, number> = {}) {
  const fx = new Effects({ reducedMotion: false, rand: rng(8) });
  const scene = createHealthScene({ fx, rand: rng(108), scene: healthScene });
  const host = document.createElement("div");
  const dom = buildStage(host, healthScene, { legend: scene.legend, chartLabel: scene.chart.label, nodeBody: (id, n) => scene.nodeBody(id, n) });
  scene.mount(dom.world);
  let inputs = { ...healthModel.defaults, ...model };
  const ctx = (): StepContext => ({ step: step(model), stepIndex: 0, stepTime: 0, simTime: 0, inputs, overridden: false, visible: new Set(Object.keys(healthScene.nodes)), model: healthModel, playing: true, reducedMotion: false });
  scene.enterStep(ctx());
  const advance = (sec: number) => {
    for (let t = 0; t < sec; t += 0.1) scene.update(0.1, ctx(), undefined as never);
    const out = healthModel.run(scene.liveInputs(ctx()));
    scene.paintWidgets(out, ctx(), 1 / 30, undefined as never);
    return Object.fromEntries(scene.tiles(out, ctx()).map((x) => [x.id, x.value]));
  };
  const row = (s: string) => dom.world.querySelector<HTMLElement>(`[data-row="${s}"]`)!;
  const log = () => dom.world.querySelector("[data-log]")!.textContent ?? "";
  const setInputs = (extra: Record<string, number>) => (inputs = { ...inputs, ...extra });
  return { scene, advance, row, log, setInputs };
}

describe("health scene", () => {
  it("without checks, the dead server keeps getting its share", () => {
    const { advance, row } = setup({ checks: 0 });
    const tiles = advance(30);
    expect(tiles).toMatchObject({ b: "10 of 10", c: "10%", e: "never" });
    expect(row("s2").className).toContain("bad");
    expect(row("s2").querySelector("[data-state]")!.textContent).toBe("dead · no checks");
    expect(row("s0").querySelector("[data-load]")!.textContent).toBe("80/s");
  });

  it("checks miss, then eject the dead server", () => {
    const { advance, row, log } = setup();
    expect(advance(0.1)).toMatchObject({ b: "10 of 10", c: "10%", e: "10 s" });
    advance(6);
    expect(row("s2").querySelector("[data-state]")!.textContent).toBe("dead · missed 1 of 2");
    const tiles = advance(5);
    expect(tiles).toMatchObject({ b: "9 of 10", c: "0%", d: "89/s" });
    expect(row("s2").className).toContain("out");
    expect(log()).toContain("S3 ejected");
  });

  it("near the limit, the survivors are ejected next and nothing is left", () => {
    const { advance, row, log } = setup({ rps: 1000, fault: 1 });
    advance(15);
    expect(row("s0").className).toContain("slow");
    const tiles = advance(6);
    expect(tiles).toMatchObject({ b: "0 of 10", c: "100%" });
    expect(row("s0").className).toContain("out");
    expect(log()).toContain("no servers left");
  });

  it("an ejection cap keeps the slow survivors in rotation", () => {
    const { advance, row, log } = setup({ rps: 1000, fault: 1, maxEjectPct: 10 });
    const tiles = advance(21);
    expect(tiles).toMatchObject({ b: "9 of 10", c: "1%" });
    expect(row("s0").className).toContain("slow");
    expect(row("s0").className).not.toContain("out");
    expect(log()).toContain("cap reached");
  });

  it("restarts the story when a control changes", () => {
    const { advance, row, setInputs } = setup();
    advance(21);
    expect(row("s2").className).toContain("out");
    // At 10 s a check, it would take 20 s: still out without a restart, back in with one.
    setInputs({ intervalSec: 10 });
    advance(0.1);
    expect(row("s2").className).not.toContain("out");
  });
});
