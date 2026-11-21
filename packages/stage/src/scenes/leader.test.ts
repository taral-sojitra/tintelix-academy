// @vitest-environment jsdom
import type { Step } from "@tintelix/schema";
import { leaderModel } from "../../../../content/system-design/leader-election/model";
import { leaderScene } from "../../../../content/system-design/leader-election/scene";
import { Effects } from "../effects";
import { buildStage } from "../render/dom";
import { rng } from "../rng";
import { createLeaderScene } from "./leader";
import type { StepContext } from "./types";

const step = (model: Record<string, number>): Step => ({ id: "s", tag: "technique", title: "s", short: "s", text: ["x"], live: "LIVE", sim: { mode: "steady", speed: 1 }, model });

function setup(model: Record<string, number> = {}) {
  const fx = new Effects({ reducedMotion: false, rand: rng(29) });
  const scene = createLeaderScene({ fx, rand: rng(129), scene: leaderScene });
  const host = document.createElement("div");
  const dom = buildStage(host, leaderScene, { legend: scene.legend, chartLabel: scene.chart.label, nodeBody: (id, n) => scene.nodeBody(id, n) });
  scene.mount(dom.world);
  const inputs = { ...leaderModel.defaults, ...model };
  const ctx = (): StepContext => ({ step: step(model), stepIndex: 0, stepTime: 0, simTime: 0, inputs, overridden: false, visible: new Set(Object.keys(leaderScene.nodes)), model: leaderModel, playing: true, reducedMotion: false });
  scene.enterStep(ctx());
  const advance = (sec: number) => {
    for (let k = Math.round(sec / 0.1); k > 0; k--) scene.update(0.1, ctx(), undefined as never);
    const out = leaderModel.run(scene.liveInputs(ctx()));
    scene.paintWidgets(out, ctx(), 1 / 30, undefined as never);
    return Object.fromEntries(scene.tiles(out, ctx()).map((x) => [x.id, x.value]));
  };
  const q = (sel: string) => dom.world.querySelector<HTMLElement>(sel)!;
  const node = (id: string) => q(`[data-node="${id}"]`);
  const sub = (id: string) => node(id).querySelector(".tx-sub")!.textContent;
  const term = (id: string) => node(id).querySelector("[data-term]")!.textContent;
  const dots = () => [...dom.world.querySelectorAll<HTMLElement>("[data-v]")].map((el) => el.className);
  return { advance, q, node, sub, term, dots, scene, ctx };
}

describe("leader scene", () => {
  it("steady: n1 leads term 33, everyone acks", () => {
    const { advance, node, sub, term, dots, q } = setup();
    expect(advance(0.5)).toEqual({ a: "n1", b: "3 of 5", c: "40/s" });
    expect(sub("n1")).toBe("leader");
    expect(term("n1")).toBe("term 33");
    expect(sub("n3")).toBe("follower");
    expect(node("n1").classList.contains("tx-lead")).toBe(true);
    expect(dots()).toEqual(["v-yes", "v-yes", "v-yes", "v-yes", "v-yes"]);
    expect(q("[data-tally]").textContent).toBe("n1 leads term 33 · a write needs 3 of 5");
  });

  it("the leader dies: timers run, n2 asks for votes, then leads term 34", () => {
    const { advance, node, sub, term, dots, q } = setup({ mode: 1 });
    expect(advance(1.5)).toMatchObject({ a: "none", b: "1010 ms" });
    expect(node("n1").classList.contains("tx-down")).toBe(true);
    expect(sub("n1")).toBe("down");
    expect(q('[data-node="n2"] [data-timer]').style.width).toBe("50%");
    expect(q('[data-node="n3"] [data-timer]').style.width).toBe("43%");
    expect(q("[data-tally]").textContent).toBe("n1 is silent: followers wait 1000 ms for a heartbeat");
    advance(0.7);
    expect(sub("n2")).toBe("candidate");
    expect(term("n3")).toBe("term 34");
    expect(node("n2").classList.contains("tx-cand")).toBe(true);
    expect(dots()[0]).toBe("v-down");
    expect(dots()[1]).toBe("v-cand");
    advance(2);
    expect(sub("n2")).toBe("leader");
    expect(dots()).toEqual(["v-down", "v-yes", "v-yes", "v-yes", "v-yes"]);
    expect(q("[data-tally]").textContent).toBe("n2 leads term 34 with 4 votes");
  });

  it("partition: n2's side elects; n1 still thinks it leads but commits nothing", () => {
    const { advance, node, sub, term, dots, q, scene } = setup({ mode: 2 });
    expect(advance(4)).toEqual({ a: "n2 · term 34", b: "3 of 5", c: "2 of 5" });
    expect(sub("n1")).toBe("old leader");
    expect(term("n1")).toBe("term 33, cut off");
    expect(term("n5")).toBe("term 33, cut off");
    expect(term("n4")).toBe("term 34");
    expect(node("n1").classList.contains("tx-ghost")).toBe(true);
    expect(dots()).toEqual(["v-down", "v-yes", "v-yes", "v-yes", "v-down"]);
    expect(q("[data-cut]").hasAttribute("hidden")).toBe(false);
    const cut = scene.wireStyles().filter((w) => w.color === "red").map((w) => w.wire).sort();
    expect(cut).toEqual(["n1_n2", "n1_n3", "n1_n4", "n2_n5", "n3_n5", "n4_n5"]);
  });

  it("fencing: storage logs token 33, then 34, then rejects n1's late 33", () => {
    const { advance, node, sub, term, q } = setup({ mode: 3 });
    expect(advance(2)).toMatchObject({ a: "none", b: "33", c: "n1 frozen" });
    expect(node("n1").classList.contains("tx-stale")).toBe(true);
    expect(sub("n1")).toBe("frozen");
    expect(term("n1")).toBe("GC pause");
    advance(2);
    expect(q("[data-token]").textContent).toBe("highest token seen: 34");
    const tiles = advance(3);
    expect(tiles).toMatchObject({ a: "n2", b: "34", c: "rejected" });
    expect([...q("[data-slog]").querySelectorAll("li")].map((li) => li.textContent)).toEqual(["33 · n1 · accepted", "34 · n2 · accepted", "33 · n1, late · rejected"]);
    expect(sub("n1")).toBe("follower");
    expect(term("n1")).toBe("term 34");
  });
});
