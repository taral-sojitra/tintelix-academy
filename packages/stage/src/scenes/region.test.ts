// @vitest-environment jsdom
import type { Step } from "@tintelix/schema";
import { regionModel } from "../../../../content/system-design/multi-region/model";
import { regionScene } from "../../../../content/system-design/multi-region/scene";
import { Effects } from "../effects";
import { buildStage } from "../render/dom";
import { rng } from "../rng";
import { createRegionScene } from "./region";
import type { StepContext } from "./types";

const step = (model: Record<string, number>): Step => ({ id: "s", tag: "technique", title: "s", short: "s", text: ["x"], live: "LIVE", sim: { mode: "steady", speed: 1 }, model });

function setup(model: Record<string, number> = {}) {
  const fx = new Effects({ reducedMotion: false, rand: rng(30) });
  const scene = createRegionScene({ fx, rand: rng(130), scene: regionScene });
  const host = document.createElement("div");
  const dom = buildStage(host, regionScene, { legend: scene.legend, chartLabel: scene.chart.label, nodeBody: (id, n) => scene.nodeBody(id, n) });
  scene.mount(dom.world);
  const inputs = { ...regionModel.defaults, ...model };
  const ctx = (): StepContext => ({ step: step(model), stepIndex: 0, stepTime: 0, simTime: 0, inputs, overridden: false, visible: new Set(Object.keys(regionScene.nodes)), model: regionModel, playing: true, reducedMotion: false });
  scene.enterStep(ctx());
  const advance = (sec: number) => {
    for (let k = Math.round(sec / 0.1); k > 0; k--) scene.update(0.1, ctx(), undefined as never);
    const out = regionModel.run(scene.liveInputs(ctx()));
    scene.paintWidgets(out, ctx(), 1 / 30, undefined as never);
    return Object.fromEntries(scene.tiles(out, ctx()).map((x) => [x.id, x.value]));
  };
  const q = (sel: string) => dom.world.querySelector<HTMLElement>(sel)!;
  const node = (id: string) => q(`[data-node="${id}"]`);
  const sub = (id: string) => node(id).querySelector(".tx-sub")!.textContent;
  const line = (id: string) => node(id).querySelector("[data-line]")!.textContent;
  return { advance, q, node, sub, line };
}

describe("region scene", () => {
  it("active-passive: Mumbai serves everyone, Virginia's copy trails", () => {
    const { advance, sub, line, q } = setup();
    expect(advance(0.5)).toEqual({ a: "193 ms", b: "172 ms", c: "0%" });
    expect(sub("dbB")).toBe("standby");
    expect(line("dbB")).toBe("172 ms behind Mumbai");
    expect(line("usersB")).toBe("193 ms round trip");
    expect(line("route")).toBe("everyone → Mumbai");
    expect(q("[data-fobar]").hidden).toBe(true);
  });

  it("active-passive failover: dark, detect, promote, then DNS moves people", () => {
    const { advance, node, sub, line, q } = setup({ mode: 1 });
    expect(advance(3)).toMatchObject({ a: "0/s", b: "90 s", c: "2.5 min" });
    expect(node("appA").classList.contains("tx-down")).toBe(true);
    expect(line("usersA")).toBe("100% failing");
    expect(q("[data-fotext]").textContent).toBe("T+20 s: 3 failed checks needed, 10 s apart · no writes anywhere");
    expect(q("[data-fohead]").style.left).toBe("13%");
    advance(4);
    expect(sub("dbB")).toBe("promoting");
    advance(6);
    expect(sub("dbB")).toBe("primary");
    expect(line("route")).toBe("everyone → Virginia");
    expect(q("[data-fotext]").textContent).toBe("T+120 s: DNS repointed; 50% of users have moved");
    advance(7);
    expect(q("[data-fotext]").textContent).toBe("T+190 s: everyone on Virginia · 343 writes lost");
    expect(line("usersB")).toBe("10 ms round trip");
  });

  it("active-active: each group local, copies both ways", () => {
    const { advance, sub, line } = setup({ mode: 2 });
    expect(advance(0.5)).toEqual({ a: "10 ms", b: "172 ms", c: "1,000/s" });
    expect(sub("dbB")).toBe("takes writes");
    expect(line("dbA")).toBe("172 ms behind Virginia");
    expect(line("route")).toBe("nearest region");
  });

  it("active-active failover: US fine, India moves after detect + TTL", () => {
    const { advance, line, q } = setup({ mode: 3 });
    expect(advance(3)).toMatchObject({ a: "1,000/s", b: "0 s", c: "90 s" });
    expect(line("usersA")).toBe("100% failing");
    expect(line("usersB")).toBe("10 ms round trip");
    advance(4);
    expect(line("route")).toBe("India → Virginia");
    expect(q('[data-seg="promote"]').hidden).toBe(true);
    expect(q("[data-fotext]").textContent).toBe("T+60 s: India rerouted to Virginia; 50% moved");
  });

  it("lag: Virginia reads the old address until the copy lands", () => {
    const { advance, line, q } = setup({ mode: 4 });
    advance(1.5);
    expect(line("dbA")).toBe("address: v2 (new)");
    expect(line("dbB")).toBe("address: v1 (old)");
    expect(q("[data-fotext]").textContent).toBe("T+50 ms: India saved v2 in Mumbai; a read in Virginia still gets v1");
    const tiles = advance(1.5);
    expect(tiles).toMatchObject({ c: "new address" });
    expect(line("dbB")).toBe("address: v2 (new)");
  });
});
