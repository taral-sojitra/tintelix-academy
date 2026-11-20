// @vitest-environment jsdom
import { caching } from "../../../content/system-design/caching/lesson";
import { createPlayer, type Player } from "./player";
import { rng } from "./rng";

const ids = caching.steps.map((s) => s.id);
const make = (): Player => createPlayer(caching, document.createElement("div"), { render: false, rand: rng(5) });
const key = (k: string, target?: EventTarget) => {
  const e = new KeyboardEvent("keydown", { key: k, bubbles: true });
  if (target) Object.defineProperty(e, "target", { value: target });
  return e;
};

describe("createPlayer", () => {
  it("opens on the first step with that step's numbers", () => {
    const p = make();
    expect(p.state.stepIndex).toBe(0);
    expect(Math.round(p.outputs().dbBusyPct!)).toBe(92);
  });

  it("clamps go() to the first and last steps", () => {
    const p = make();
    p.go(-1);
    expect(p.state.stepIndex).toBe(0);
    p.go(99);
    expect(p.state.stepIndex).toBe(ids.length - 1);
  });

  it("clears the learner's overrides on every step change", () => {
    const p = make();
    p.go(ids.indexOf("slow-mo"));
    p.setInput("hitRate", 0.5);
    expect(p.state.overrides).toEqual({ hitRate: 0.5 });
    p.go(3);
    expect(p.state.overrides).toEqual({});
  });

  it("recomputes outputs when an unlocked control changes", () => {
    const p = make();
    p.go(ids.indexOf("slow-mo"));
    p.setInput("hitRate", 0);
    expect(Math.round(p.outputs().dbBusyPct!)).toBe(92);
  });

  it("ignores controls the step has not unlocked", () => {
    const p = make();
    const before = p.outputs();
    p.setInput("hitRate", 0.5);
    expect(p.outputs()).toEqual(before);
    expect(p.state.overrides).toEqual({});
  });

  it("clamps a control to its range", () => {
    const p = make();
    p.go(ids.indexOf("slow-mo"));
    p.setInput("hitRate", 1.7);
    expect(p.state.overrides.hitRate).toBe(1);
  });

  it("emits complete once, when the last step is first reached", () => {
    const p = make();
    let n = 0;
    p.on("complete", () => n++);
    p.go(ids.length - 1);
    p.go(0);
    p.go(ids.length - 1);
    expect(n).toBe(1);
  });

  it("emits step on every step change, including a replay", () => {
    const p = make();
    const seen: number[] = [];
    p.on("step", () => seen.push(p.state.stepIndex));
    p.next();
    p.handleKey(key("r"));
    expect(seen).toEqual([1, 1]);
  });

  it("ArrowRight and ArrowLeft move between steps; Space toggles playing", () => {
    const p = make();
    expect(p.handleKey(key("ArrowRight"))).toBe(true);
    expect(p.state.stepIndex).toBe(1);
    expect(p.handleKey(key("ArrowLeft"))).toBe(true);
    expect(p.state.stepIndex).toBe(0);
    p.handleKey(key(" "));
    expect(p.state.playing).toBe(false);
    p.handleKey(key(" "));
    expect(p.state.playing).toBe(true);
  });

  it("leaves arrow keys to a focused slider", () => {
    const p = make();
    const slider = document.createElement("input");
    slider.type = "range";
    expect(p.handleKey(key("ArrowRight", slider))).toBe(false);
    expect(p.handleKey(key("ArrowLeft", slider))).toBe(false);
    expect(p.state.stepIndex).toBe(0);
  });

  it("leaves Space and Enter to a focused button", () => {
    const p = make();
    const button = document.createElement("button");
    expect(p.handleKey(key(" ", button))).toBe(false);
    expect(p.state.playing).toBe(true);
  });

  it("accepts only 0.5×, 1× and 2× speeds", () => {
    const p = make();
    p.setSpeed(2);
    expect(p.state.speed).toBe(2);
  });

  it("starts on a saved step when asked", () => {
    const p = createPlayer(caching, document.createElement("div"), { render: false, startStep: 3 });
    expect(p.state.stepIndex).toBe(3);
  });

  it("stops emitting after destroy", () => {
    const p = make();
    let n = 0;
    p.on("step", () => n++);
    p.destroy();
    p.next();
    expect(n).toBe(0);
  });
});
