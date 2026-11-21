// @vitest-environment jsdom
import type { Model, SceneSpec, Step } from "@tintelix/schema";
import { Effects } from "../effects";
import { makeWire } from "../geometry";
import { buildStage } from "../render/dom";
import { rng } from "../rng";
import { Sim } from "../sim";
import { createBoardScene } from "./board";
import type { StepContext } from "./types";

const model: Model = {
  defaults: { mode: 0, load: 50 },
  run: ({ mode = 0, load = 0, elapsedSec = 0 }) => ({ mode, load, elapsedSec, dbBusyPct: load * (mode + 1), dbReads: load * 10, failPct: 0 }),
};

const spec = (over: Partial<NonNullable<SceneSpec["board"]>> = {}): SceneSpec => ({
  kind: "board",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 40, w: 984, h: 390 },
  nodes: {
    users: { x: 16, y: 190, w: 160, h: 80, kind: "users", label: "Users", sub: "clicking" },
    app: { x: 300, y: 190, w: 160, h: 80, kind: "app", label: "App", sub: "serves" },
    cache: { x: 600, y: 40, w: 160, h: 80, kind: "cache", label: "Cache", sub: "memory", hidden: true },
    db: { x: 600, y: 300, w: 160, h: 110, kind: "db", label: "Database", sub: "stores" },
  },
  wires: { u_a: { from: [176, 230], to: [300, 230] }, a_c: { from: [460, 220], to: [600, 80] }, a_d: { from: [460, 240], to: [600, 355] } },
  board: {
    legend: [["cyan", "request"], ["green", "answered"]],
    flows: {
      read: { path: [{ wire: "u_a", dir: 1, at: "app" }, { wire: "a_d", dir: 1, at: "db" }], color: "cyan", back: "green", fail: { at: "db", share: "failPct" } },
      readCached: { path: [{ wire: "u_a", dir: 1, at: "app" }, { wire: "a_c", dir: 1, at: "cache" }], color: "cyan", back: "green" },
    },
    modes: [
      { flows: [{ flow: "read", weight: 1 }], tiles: [{ id: "a", label: "DB busy", icon: "db", hue: "cyan", value: "{dbBusyPct}", note: "" }] },
      { flows: [{ flow: "read", weight: 1 }, { flow: "readCached", weight: 3 }], tiles: [{ id: "b", label: "DB busy", icon: "db", hue: "cyan", value: "{dbBusyPct}", note: "with a cache" }] },
    ],
    widgets: { db: [{ kind: "meter", output: "dbBusyPct", max: 100, text: "{dbBusyPct} busy" }] },
    states: [{ node: "db", cls: "tx-down", when: { output: "dbBusyPct", above: 100 } }],
    subs: { db: "{dbReads} reads a second" },
    ...over,
  },
});

const step: Step = { id: "s", tag: "technique", title: "s", short: "s", text: ["x"], live: "LIVE", sim: { mode: "steady", speed: 1 } };

function setup(inputs: Record<string, number> = {}, opts: { visible?: string[]; scene?: SceneSpec } = {}) {
  const scene0 = opts.scene ?? spec();
  const fx = new Effects({ reducedMotion: false, rand: rng(30) });
  const scene = createBoardScene({ fx, rand: rng(131), scene: scene0 });
  const host = document.createElement("div");
  const dom = buildStage(host, scene0, { legend: scene.legend, chartLabel: scene.chart.label, nodeBody: (id, n) => scene.nodeBody(id, n) });
  scene.mount(dom.world);
  const state = { inputs: { ...model.defaults, ...inputs } };
  const visible = new Set(opts.visible ?? Object.keys(scene0.nodes));
  const ctx = (): StepContext => ({ step, stepIndex: 0, stepTime: 0, simTime: 0, inputs: state.inputs, overridden: false, visible, model, playing: true, reducedMotion: false });
  scene.enterStep(ctx());
  const wires = Object.fromEntries(Object.entries(scene0.wires).map(([k, w]) => [k, makeWire(w.from, w.to)]));
  const sim = new Sim({ wires, router: scene.router, rand: rng(7), ratePerSec: scene.sim.ratePerSec, speed: 600 });
  const advance = (sec: number) => {
    for (let k = Math.round(sec / 0.1); k > 0; k--) {
      scene.update(0.1, ctx(), sim);
      sim.step(0.1);
      for (const e of sim.drain()) scene.onEvent(e, ctx());
    }
    const out = model.run(scene.liveInputs(ctx()));
    scene.paintWidgets(out, ctx(), 1 / 30, sim);
    return Object.fromEntries(scene.tiles(out, ctx()).map((x) => [x.id, x.value]));
  };
  const node = (id: string) => dom.world.querySelector<HTMLElement>(`[data-node="${id}"]`)!;
  return { advance, node, state, sim, scene, host };
}

describe("board scene", () => {
  it("tiles fill from the mode", () => {
    const { advance } = setup();
    expect(advance(0.5)).toEqual({ a: "50%" });
  });

  it("a mode past the last plays the last mode", () => {
    const { advance } = setup({ mode: 9 });
    expect(advance(0.5)).toEqual({ b: "500%" });
  });

  it("flows through hidden nodes are skipped", () => {
    const run = (visible: string[]) => {
      const { scene, sim } = setup({ mode: 1 }, { visible });
      let cacheVisits = 0;
      for (let k = 0; k < 200; k++) {
        scene.update(0.1, { step, stepIndex: 0, stepTime: 0, simTime: 0, inputs: { mode: 1, load: 50 }, overridden: false, visible: new Set(visible), model, playing: true, reducedMotion: false }, sim);
        sim.step(0.1);
        for (const e of sim.drain()) if (e.kind === "pass" && e.node === "cache") cacheVisits++;
      }
      return cacheVisits;
    };
    expect(run(["users", "app", "db"])).toBe(0);
    expect(run(["users", "app", "cache", "db"])).toBeGreaterThan(0);
  });

  it("states and subs follow the model", () => {
    const hot = setup({ load: 120 });
    hot.advance(0.2);
    expect(hot.node("db").classList.contains("tx-down")).toBe(true);
    expect(hot.node("db").querySelector(".tx-sub")!.textContent).toBe("1,200 reads a second");
    const calm = setup({ load: 50 });
    calm.advance(0.2);
    expect(calm.node("db").classList.contains("tx-down")).toBe(false);
  });

  it("widgets render in their node and repaint", () => {
    const { advance, node, state } = setup({ load: 50 });
    advance(0.2);
    const meter = node("db").querySelector<HTMLElement>('[data-w="db.0"] .tx-meter i')!;
    expect(meter.style.width).toBe("50%");
    expect(node("db").textContent).toContain("50% busy");
    state.inputs = { ...state.inputs, load: 80 };
    advance(0.2);
    expect(meter.style.width).toBe("80%");
  });

  it("the chart is hidden when the board has none", () => {
    const { advance, host } = setup();
    advance(0.2);
    expect(host.querySelector<HTMLElement>(".tx-chartbox")!.hidden).toBe(true);
  });
  it("a flow's float fires when a request passes its node, not when it fails there", () => {
    const withFloat = (failPct: number) => {
      const sc = spec({
        flows: {
          read: { path: [{ wire: "u_a", dir: 1, at: "app" }, { wire: "a_d", dir: 1, at: "db" }], color: "cyan", back: "green", fail: { at: "db", share: "failPct" }, float: { at: "db", text: "found it", color: "green", chance: 1 } },
          readCached: { path: [{ wire: "u_a", dir: 1, at: "app" }, { wire: "a_c", dir: 1, at: "cache" }], color: "cyan" },
        },
      });
      const m: Model = { defaults: { mode: 0, load: 50, failPct }, run: (i) => ({ ...model.run(i), failPct: i.failPct ?? 0 }) };
      const fx = new Effects({ reducedMotion: false, rand: rng(30) });
      const scene = createBoardScene({ fx, rand: rng(131), scene: sc });
      const ctx: StepContext = { step, stepIndex: 0, stepTime: 0, simTime: 0, inputs: { ...m.defaults }, overridden: false, visible: new Set(Object.keys(sc.nodes)), model: m, playing: true, reducedMotion: false };
      scene.enterStep(ctx);
      const wires = Object.fromEntries(Object.entries(sc.wires).map(([k, w]) => [k, makeWire(w.from, w.to)]));
      const sim = new Sim({ wires, router: scene.router, rand: rng(7), ratePerSec: 3, speed: 600 });
      const texts: string[] = [];
      const float = fx.float.bind(fx);
      fx.float = (x, y, t, c, big) => {
        texts.push(t);
        float(x, y, t, c, big);
      };
      for (let k = 0; k < 100; k++) {
        scene.update(0.1, ctx, sim);
        sim.step(0.1);
        for (const e of sim.drain()) scene.onEvent(e, ctx);
      }
      return texts.filter((t) => t === "found it").length;
    };
    expect(withFloat(0)).toBeGreaterThan(5);
    expect(withFloat(100)).toBe(0);
  });
});
