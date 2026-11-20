// @vitest-environment jsdom
import type { Step } from "@tintelix/schema";
import { cdnModel } from "../../../../content/system-design/cdn/model";
import { cdnScene } from "../../../../content/system-design/cdn/scene";
import { Effects } from "../effects";
import { buildStage } from "../render/dom";
import { rng } from "../rng";
import { Sim } from "../sim";
import { cdnLatencyMs, COPY_COUNT, createCdnScene } from "./cdn";
import type { StepContext } from "./types";

const step = (id: string, mode: string, model: Record<string, number> = { edge: 1 }, speed = 1): Step => ({
  id, tag: "technique", title: id, short: id, text: ["x"], live: "LIVE", sim: { mode, speed }, model,
});
const steps = {
  direct: step("far-away", "direct", { edge: 0 }),
  warm: step("add-edge", "warm"),
  stale: step("old-price", "stale"),
  purge: step("purge", "purge", { edge: 1, ttlSec: 60, purge: 1 }),
  recap: step("recap", "steady", { edge: 1, ttlSec: 60, purge: 1 }),
};

function setup(seed = 1) {
  const fx = new Effects({ reducedMotion: false, rand: rng(seed) });
  const scene = createCdnScene({ fx, rand: rng(seed + 100), scene: cdnScene });
  let t = 0;
  let current = steps.warm;
  let inputs: Record<string, number> = {};
  const ctx = (): StepContext => ({
    step: current,
    stepIndex: 0,
    stepTime: t,
    simTime: t,
    inputs,
    overridden: false,
    visible: new Set(current.sim?.mode === "direct" ? ["users", "origin"] : ["users", "edge", "origin"]),
    model: cdnModel,
    playing: true,
    reducedMotion: false,
  });
  const enter = (s: Step, extra: Record<string, number> = {}) => {
    current = s;
    t = 0;
    inputs = { ...cdnModel.defaults, ...s.model, ...extra };
    scene.enterStep(ctx());
  };
  const advance = (seconds: number, dt = 1 / 30) => {
    for (let i = 0; i < Math.round(seconds / dt); i++) {
      t += dt;
      scene.update(dt, ctx());
    }
  };
  const fill = (n: number) => {
    for (let i = 0; i < n; i++) scene.onEvent({ kind: "fill", node: "edge", at: [0, 0] }, ctx());
  };
  return { scene, ctx, enter, advance, fill, fx };
}

describe("CDN scene", () => {
  it("the edge holds nothing until a copy comes back from the origin", () => {
    const { scene, ctx, enter, advance, fill } = setup();
    enter(steps.warm);
    advance(6);
    expect(scene.liveInputs(ctx()).filled).toBe(0);
    expect(scene.state.copies.some((c) => c.on)).toBe(false);
    fill(COPY_COUNT / 2);
    expect(scene.liveInputs(ctx()).filled).toBeCloseTo(0.5, 5);
    fill(COPY_COUNT / 2);
    expect(scene.liveInputs(ctx()).filled).toBe(1);
  });

  it("a step can say how much of the catalogue the edge holds, so misses show", () => {
    const { scene, ctx, enter } = setup();
    enter(step("slow-mo", "steady", { edge: 1, filled: 0.9 }, 0.35));
    expect(scene.liveInputs(ctx()).filled).toBeCloseTo(0.9, 5);
    expect(scene.state.copies.filter((c) => c.on)).toHaveLength(Math.round(COPY_COUNT * 0.9));
    const hits = scene.tiles(cdnModel.run(scene.liveInputs(ctx())), ctx()).find((t) => t.id === "hits")!;
    expect(hits.note).toBe("served in Mumbai");
  });

  it("skips the warm start on steps whose story is scripted from their first second", () => {
    const { scene, ctx, enter } = setup();
    for (const [s, want] of [[steps.stale, false], [steps.purge, false], [steps.warm, true], [steps.direct, true], [steps.recap, true]] as const) {
      enter(s);
      expect(scene.warmStart?.(ctx())).toBe(want);
    }
  });

  it("draws latency labels below Users, clear of the trip label above", () => {
    const { scene, ctx, enter, fx } = setup();
    enter(step("slow-mo", "steady", { edge: 1 }, 0.35));
    scene.onEvent({ kind: "reply", node: "users", at: [0, 0], hit: true }, ctx());
    const users = cdnScene.nodes.users!;
    expect(fx.floats.at(-1)!.y).toBeGreaterThan(users.y + users.h);
  });

  it("in the stale step the edge keeps the old price after the origin changes", () => {
    const { scene, enter, advance } = setup();
    enter(steps.stale);
    expect(scene.state.price).toEqual({ origin: 999, edge: 999 });
    advance(3.1);
    expect(scene.state.price).toEqual({ origin: 799, edge: 999 });
    expect(scene.state.copies.every((c) => c.on && c.stale)).toBe(true);
  });

  it("the purge step clears every copy, then refills only from the origin, with the new price", () => {
    const { scene, ctx, enter, advance, fill } = setup();
    enter(steps.purge);
    expect(scene.state.price.edge).toBe(999);
    advance(1.6);
    expect(scene.state.copies.every((c) => !c.on)).toBe(true);
    expect(scene.liveInputs(ctx()).filled).toBe(0);
    advance(10);
    expect(scene.state.copies.some((c) => c.on)).toBe(false);
    expect(scene.state.price.edge).toBeNull();
    fill(1);
    expect(scene.state.price).toEqual({ origin: 799, edge: 799 });
    fill(COPY_COUNT - 1);
    expect(scene.state.copies.every((c) => c.on && !c.stale)).toBe(true);
    expect(scene.liveInputs(ctx()).filled).toBe(1);
  });

  it("re-entering the stale step resets prices and copies", () => {
    const { scene, enter, advance } = setup();
    enter(steps.purge);
    advance(3);
    enter(steps.stale);
    expect(scene.state.price).toEqual({ origin: 999, edge: 999 });
    expect(scene.state.copies.every((c) => c.on && !c.stale)).toBe(true);
  });

  it("latency labels put about 5% of reads above p95 when misses are common, and never show a hit slower than p95", () => {
    const share = (inputs: Record<string, number>, seed: number) => {
      const live = cdnModel.run({ ...cdnModel.defaults, ...inputs });
      const rand = rng(seed);
      const edge = (inputs.edge ?? 0) === 1;
      const hit = (live.edgeHitPct ?? 0) / 100;
      let above = 0;
      const n = 20000;
      for (let i = 0; i < n; i++) {
        const path = !edge ? "direct" : rand() < hit ? "hit" : "miss";
        if (cdnLatencyMs(path, live, rand) > live.p95!) above++;
      }
      return above / n;
    };
    for (const [inputs, seed] of [[{ edge: 0 }, 1], [{ edge: 1, ttlSec: 1 }, 2]] as const) {
      expect(share(inputs, seed)).toBeGreaterThan(0.035);
      expect(share(inputs, seed)).toBeLessThan(0.065);
    }
    expect(share({ edge: 1 }, 3)).toBeLessThanOrEqual(0.05);
    const live = cdnModel.run({ ...cdnModel.defaults, edge: 1 });
    const rand = rng(4);
    for (let i = 0; i < 5000; i++) expect(cdnLatencyMs("hit", live, rand)).toBeLessThanOrEqual(live.p95!);
  });

  it("the fifth tile is the round trip before the price change and the stale time after", () => {
    const { scene, ctx, enter } = setup();
    const fifth = () => scene.tiles(cdnModel.run(scene.liveInputs(ctx())), ctx())[4]!.id;
    enter(steps.warm);
    expect(fifth()).toBe("rtt");
    enter(steps.stale);
    expect(fifth()).toBe("stale");
    enter(steps.recap);
    expect(fifth()).toBe("stale");
    expect(scene.tiles(cdnModel.run(scene.liveInputs(ctx())), ctx()).map((t) => t.id)).toEqual(["page", "p95", "hits", "origin", "stale"]);
  });

  it("shows no price tags before the old-price step, and the ocean label follows the distance", () => {
    const { scene, ctx, enter } = setup();
    const host = document.createElement("div");
    const dom = buildStage(host, cdnScene, { legend: scene.legend, chartLabel: scene.chart.label, nodeBody: (id, n) => scene.nodeBody(id, n) });
    scene.mount(dom.world);
    const sim = new Sim({ wires: {}, router: scene.router, rand: rng(9), ratePerSec: 0, speed: 400 });
    const paint = () => scene.paintWidgets(cdnModel.run(scene.liveInputs(ctx())), ctx(), 1 / 30, sim);
    enter(steps.warm, { originKm: 1000 });
    paint();
    const tags = [...host.querySelectorAll<HTMLElement>("[data-price-row]")];
    expect(tags).toHaveLength(2);
    expect(tags.every((t) => t.hidden)).toBe(true);
    expect(host.querySelector("[data-wire=edge_origin]")!.textContent).toContain("1,000 km");
    expect(host.querySelector("[data-wire=edge_origin]")!.textContent).toContain("17 ms");
    enter(steps.stale);
    paint();
    expect(tags.every((t) => !t.hidden)).toBe(true);
    expect(host.querySelector("[data-price=edge]")!.textContent).toBe("₹999");
  });
});
