// @vitest-environment jsdom
import type { Step } from "@tintelix/schema";
import { latencyModel } from "../../../../content/system-design/latency-percentiles/model";
import { latencyScene } from "../../../../content/system-design/latency-percentiles/scene";
import { Effects } from "../effects";
import { buildStage } from "../render/dom";
import { rng } from "../rng";
import { barHeight, createLatencyScene, histX, holdSec, MARKER_ROWS, sampleMs } from "./latency";
import type { StepContext } from "./types";

const step = (id: string, mode: string, model: Record<string, number> = {}): Step => ({
  id, tag: "technique", title: id, short: id, text: ["x"], live: "LIVE", sim: { mode, speed: 1 }, model,
});
const steps = {
  average: step("calm-dashboard", "average"),
  histogram: step("two-humps", "histogram"),
  fanout: step("fan-out", "fanout", { slowPct: 1, calls: 10 }),
  hedge: step("hedge", "hedge", { slowPct: 1, calls: 10, hedge: 1 }),
};
const run = (x: Record<string, number>) => latencyModel.run({ ...latencyModel.defaults, ...x });

function setup(o: { reducedMotion?: boolean } = {}) {
  const fx = new Effects({ reducedMotion: !!o.reducedMotion, rand: rng(7) });
  const scene = createLatencyScene({ fx, rand: rng(107), scene: latencyScene });
  const host = document.createElement("div");
  const dom = buildStage(host, latencyScene, { legend: scene.legend, chartLabel: scene.chart.label, nodeBody: (id, n) => scene.nodeBody(id, n) });
  scene.mount(dom.world);
  let t = 0;
  let current = steps.average;
  let inputs: Record<string, number> = {};
  const ctx = (): StepContext => ({
    step: current,
    stepIndex: 0,
    stepTime: t,
    simTime: t,
    inputs,
    overridden: false,
    visible: new Set(["users", "app", ...(current === steps.average ? [] : ["histogram"]), ...(current.sim?.mode === "fanout" || current.sim?.mode === "hedge" ? ["services"] : [])]),
    model: latencyModel,
    playing: true,
    reducedMotion: !!o.reducedMotion,
  });
  const enter = (s: Step) => {
    current = s;
    t = 0;
    inputs = { ...latencyModel.defaults, ...s.model };
    scene.enterStep(ctx());
  };
  const advance = (seconds: number, dt = 1 / 30) => {
    for (let i = 0; i < Math.round(seconds / dt); i++) {
      t += dt;
      scene.update(dt, ctx());
    }
  };
  const tiles = () => Object.fromEntries(scene.tiles(latencyModel.run(scene.liveInputs(ctx())), ctx()).map((x) => [x.id, x.value]));
  return { scene, ctx, enter, advance, tiles, dom };
}

describe("latency scene helpers", () => {
  it("places latencies on a log axis from 1 ms to 1,000 ms, clamped", () => {
    expect(histX(1, 300)).toBe(0);
    expect(histX(1000, 300)).toBe(300);
    expect(histX(10, 300)).toBeCloseTo(100, 9);
    expect(histX(0.5, 300)).toBe(0);
    expect(histX(5000, 300)).toBe(300);
  });
  it("draws bar heights on a square-root scale, so 1% stays visible", () => {
    expect(barHeight(1, 100)).toBeCloseTo(10, 9);
    expect(barHeight(100, 100)).toBe(100);
    expect(barHeight(0, 100)).toBe(0);
  });
  it("holds a slow request about ten times as long as a fast one, at most 3 s", () => {
    expect(holdSec(2, 2)).toBe(0.25);
    expect(holdSec(200, 2)).toBeCloseTo(2.5, 9);
    expect(holdSec(20000, 2)).toBe(3);
  });
  it("samples latencies in the model's shares", () => {
    expect(sampleMs(run({}), 0.94)).toBe(2);
    expect(sampleMs(run({}), 0.96)).toBe(200);
    const hedged = run({ slowPct: 1, calls: 10, hedge: 1 });
    expect(sampleMs(hedged, 0.5)).toBe(2);
    expect(sampleMs(hedged, 0.95)).toBe(12);
    expect(sampleMs(hedged, 0.9995)).toBe(200);
  });
  it("gives the three marker labels their own rows, so equal values never overprint", () => {
    expect(new Set(Object.values(MARKER_ROWS)).size).toBe(3);
  });
});

describe("latency scene", () => {
  it("in the dashboard step, only the average is shown", () => {
    const { enter, tiles } = setup();
    enter(steps.average);
    expect(tiles()).toEqual({ avg: "12 ms", p50: "—", p99: "—", slow: "—", fifth: "—" });
  });

  it("with the histogram, the tiles read the percentiles", () => {
    const { enter, tiles } = setup();
    enter(steps.histogram);
    expect(tiles()).toEqual({ avg: "12 ms", p50: "2 ms", p99: "200 ms", slow: "5%", fifth: "50,000" });
  });

  it("when hedging, page p99 and the extra calls show", () => {
    const { enter, tiles } = setup();
    enter(steps.hedge);
    const t = tiles();
    expect(t.p99).toBe("12 ms");
    expect(t.fifth).toBe("1%");
    expect(t.slow).toBe("0.1%");
  });

  it("fans pages out to the services only in the fan-out steps", () => {
    const { scene, enter } = setup();
    enter(steps.histogram);
    expect(scene.state.fanOut).toBe(false);
    enter(steps.fanout);
    expect(scene.state.fanOut).toBe(true);
  });

  it("a step opened with no traffic yet has no running service cell", () => {
    const { scene, enter, advance } = setup();
    enter(steps.fanout);
    advance(3);
    expect(scene.state.cells.every((c) => c.t <= 0)).toBe(true);
  });

  it("a slow page marks one cell slow while the others finish fast", () => {
    const { scene, ctx, enter } = setup();
    enter(steps.fanout);
    scene.onEvent({ kind: "work", node: "services", at: [0, 0], ms: 200 }, ctx());
    const lit = scene.state.cells.filter((c) => c.t > 0);
    expect(lit).toHaveLength(10);
    expect(lit.filter((c) => c.tone === "slow")).toHaveLength(1);
  });

  it("a finished request drops a dot at its latency; with reduced motion it lands at once", () => {
    const moving = setup();
    moving.enter(steps.histogram);
    moving.scene.onEvent({ kind: "done", node: "users", at: [0, 0], ms: 200 }, moving.ctx());
    const dot = moving.scene.state.dots.find((d) => d.life > 0)!;
    expect(dot.ms).toBe(200);
    expect(dot.fall).toBe(0);
    const still = setup({ reducedMotion: true });
    still.enter(steps.histogram);
    still.scene.onEvent({ kind: "done", node: "users", at: [0, 0], ms: 2 }, still.ctx());
    expect(still.scene.state.dots.find((d) => d.life > 0)!.fall).toBe(1);
  });

  it("labels the markers from the model", () => {
    const { scene, ctx, enter, dom } = setup();
    enter(steps.histogram);
    scene.paintWidgets(latencyModel.run(scene.liveInputs(ctx())), ctx(), 1 / 30, undefined as never);
    const label = (m: string) => dom.world.querySelector(`[data-marker-label="${m}"]`)!.textContent;
    expect(label("avg")).toBe("avg 12 ms");
    expect(label("p50")).toBe("p50 2 ms");
    expect(label("p99")).toBe("p99 200 ms");
    expect(dom.world.querySelector('[data-bar-label="fast"]')!.textContent).toBe("95%");
    expect(dom.world.querySelector('[data-bar-label="slow"]')!.textContent).toBe("5%");
  });
});
