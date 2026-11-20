import type { Inputs, Lesson, Outputs, SceneKind, Step } from "@tintelix/schema";
import { formatOutput } from "@tintelix/schema/format";
import { fitView, type View } from "./camera";
import { Effects } from "./effects";
import { makeWire, type Wire } from "./geometry";
import { startLoop } from "./loop";
import { readPalette, type Palette } from "./palette";
import { drawBack, drawChart, drawFront, type Surface } from "./render/canvas";
import { buildStage, renderTiles, type StageDom } from "./render/dom";
import { scenes } from "./scenes";
import type { SceneRuntime, StepContext } from "./scenes/types";
import { Sim } from "./sim";

export type Speed = 0.5 | 1 | 2;

export interface PlayerState {
  stepIndex: number;
  inputs: Inputs;
  overrides: Partial<Inputs>;
  playing: boolean;
  speed: Speed;
}

export type PlayerEvent = "step" | "change" | "complete" | "play";

export interface Player {
  readonly state: Readonly<PlayerState>;
  /** The model's numbers for this step's inputs and the learner's overrides. */
  outputs(): Outputs;
  go(i: number): void;
  next(): void;
  back(): void;
  setPlaying(v: boolean): void;
  setSpeed(v: Speed): void;
  setInput(name: string, value: number): void;
  /** Handles a keydown; returns true when the player used it (the caller then prevents the default). */
  handleKey(e: KeyboardEvent): boolean;
  on(ev: PlayerEvent, fn: () => void): () => void;
  destroy(): void;
}

export interface PlayerOptions {
  reducedMotion?: boolean;
  /** false skips all DOM and canvas work (tests, server rendering). */
  render?: boolean;
  rand?: () => number;
  startStep?: number;
  /** Element to fill with the number tiles. */
  hud?: HTMLElement;
}

const SPEED = 400;
const INSETS = { top: 50, side: 14, bottom: 56 };

const editableTarget = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  if (!el || typeof el.tagName !== "string") return false;
  return /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable === true;
};

/** Plays a lesson's steps on a live diagram inside `host`. */
export function createPlayer(lesson: Lesson, host: HTMLElement, opts: PlayerOptions = {}): Player {
  const rand = opts.rand ?? Math.random;
  const reducedMotion = opts.reducedMotion ?? (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const listeners: Record<PlayerEvent, Set<() => void>> = { step: new Set(), change: new Set(), complete: new Set(), play: new Set() };
  const emit = (ev: PlayerEvent) => {
    if (!destroyed) for (const fn of listeners[ev]) fn();
  };
  const last = lesson.steps.length - 1;
  const clampStep = (i: number) => Math.max(0, Math.min(last, Math.round(i)));

  const state: PlayerState = { stepIndex: 0, inputs: {}, overrides: {}, playing: true, speed: 1 };
  let destroyed = false;
  let completed = false;
  let stepTime = 0;
  let simTime = 0;

  const wires: Record<string, Wire> = Object.fromEntries(Object.entries(lesson.scene.wires).map(([k, w]) => [k, makeWire(w.from, w.to, 48, w.pace ?? 1)]));
  const fx = new Effects({ reducedMotion, rand });
  const factory = scenes[lesson.scene.kind as SceneKind] as (typeof scenes)[SceneKind] | undefined;
  if (!factory) throw new Error(`no scene runtime for "${lesson.scene.kind}"`);
  const scene: SceneRuntime = factory({ fx, rand, scene: lesson.scene });
  const sim = new Sim({ wires, router: scene.router, rand, ratePerSec: scene.sim.ratePerSec, speed: SPEED, queues: scene.sim.queues ?? {}, trailLimit: fx.trailLimit });

  const step = (): Step => lesson.steps[state.stepIndex]!;
  const visibleAt = (i: number) => {
    const set = new Set(Object.entries(lesson.scene.nodes).filter(([, n]) => !n.hidden).map(([id]) => id));
    for (const s of lesson.steps.slice(0, i + 1)) {
      for (const id of s.scene?.add ?? []) set.add(id);
      for (const id of s.scene?.remove ?? []) set.delete(id);
    }
    return set;
  };
  let visible = visibleAt(0);
  const ctx = (): StepContext => ({
    step: step(),
    stepIndex: state.stepIndex,
    stepTime,
    simTime,
    inputs: state.inputs,
    overridden: Object.keys(state.overrides).length > 0,
    visible,
    model: lesson.model,
    playing: state.playing,
    reducedMotion,
  });
  const live = () => lesson.model.run(scene.liveInputs(ctx()));

  // ---- rendering (skipped when render: false) ----
  const render = opts.render !== false && typeof document !== "undefined";
  let dom: StageDom | null = null;
  let surfaces: { back: Surface; front: Surface; chart: Surface } | null = null;
  let view: View = { s: 1, ox: 0, oy: 0 };
  let palette: Palette | null = null;
  const hist: number[] = new Array(300).fill(0);
  let histClock = 0;
  let display: Outputs = {};
  let stopLoop: (() => void) | null = null;
  let ro: ResizeObserver | null = null;
  let mo: MutationObserver | null = null;

  function resize() {
    if (!dom || !surfaces) return;
    const r = dom.root.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    for (const key of ["back", "front"] as const) {
      const s = surfaces[key];
      s.dpr = dpr;
      s.w = r.width;
      s.h = r.height;
      s.ctx.canvas.width = Math.round(r.width * dpr);
      s.ctx.canvas.height = Math.round(r.height * dpr);
    }
    const cr = dom.chart.getBoundingClientRect();
    surfaces.chart.dpr = dpr;
    surfaces.chart.w = cr.width || 216;
    surfaces.chart.h = cr.height || 50;
    dom.chart.width = Math.round(surfaces.chart.w * dpr);
    dom.chart.height = Math.round(surfaces.chart.h * dpr);
    const chartShown = dom.chart.offsetParent !== null;
    let v = fitView({ w: r.width, h: r.height }, lesson.scene.bounds, INSETS);
    if (chartShown) {
      // Make room above the chart box when a box would sit behind it.
      const hits = Object.values(lesson.scene.nodes).some((n) => n.x * v.s + v.ox < 14 + 236 && (n.y + n.h) * v.s + v.oy > r.height - 12 - 78);
      if (hits) v = fitView({ w: r.width, h: r.height }, lesson.scene.bounds, { ...INSETS, bottom: 102 });
    }
    view = v;
    dom.world.style.transform = `translate(${v.ox}px, ${v.oy}px) scale(${v.s})`;
    const g = 24 * Math.max(0.6, v.s);
    dom.root.style.backgroundSize = `${g}px ${g}px`;
    dom.root.style.backgroundPosition = `${v.ox % g}px ${v.oy % g}px`;
  }

  function paintDom(rdt: number) {
    if (!dom) return;
    const target = live();
    const k = 1 - Math.exp(-rdt * 5);
    for (const [name, value] of Object.entries(target)) display[name] = (display[name] ?? value) + (value - (display[name] ?? value)) * k;
    const c = ctx();
    if (opts.hud) renderTiles(opts.hud, scene.tiles(display, c));
    scene.paintWidgets(display, c, rdt, sim);
    // The label states the model's number; only the line carries the noise.
    const out = scene.chart.output;
    dom.chartValue.textContent = formatOutput(out, display[out] ?? 0);
  }

  function paintCanvas() {
    if (!surfaces || !palette) return;
    drawBack(surfaces.back, view, wires, scene.wireStyles(), fx.ripples, palette, fx.flow);
    const lane = scene.lane;
    const qName = Object.keys(scene.sim.queues ?? {})[0];
    const q = qName ? sim.queues[qName] : undefined;
    drawFront(surfaces.front, view, sim.packets, q && lane ? { at: lane, waiting: q.waiting, serving: q.serving !== null, simTime } : null, fx.particles, fx.floats, palette);
  }

  function update(dt: number) {
    if (dt <= 0) return;
    simTime += dt;
    stepTime += dt;
    const c = ctx();
    scene.update(dt, c);
    sim.step(dt);
    for (const e of sim.drain()) scene.onEvent(e, c);
    fx.step(dt);
    histClock += dt;
    while (histClock >= 0.1) {
      histClock -= 0.1;
      hist.push(scene.chartSample(live(), sim));
      hist.shift();
    }
  }

  let frameN = 0;
  function frame(rdt: number) {
    const dt = state.playing ? rdt * state.speed * (step().sim?.speed ?? 1) : 0;
    update(dt);
    paintCanvas();
    if ((frameN++ & 1) === 0) {
      if (surfaces && palette) drawChart(surfaces.chart, hist, palette, scene.chart);
      paintDom(rdt * 2);
    }
  }

  function applyStepToDom() {
    if (!dom) return;
    const s = step();
    for (const [id, el] of Object.entries(dom.nodes)) {
      el.classList.toggle("hidden", !visible.has(id));
      el.classList.toggle("dim", !!s.scene?.focus && !s.scene.focus.includes(id));
    }
    dom.tagText.textContent = state.playing ? s.live : "PAUSED";
    dom.root.classList.toggle("paused", !state.playing);
  }

  function enter(i: number) {
    state.stepIndex = i;
    state.overrides = {};
    state.inputs = { ...lesson.model.defaults, ...lesson.steps[i]!.model };
    stepTime = 0;
    visible = visibleAt(i);
    sim.reset();
    fx.clear();
    scene.enterStep(ctx());
    applyStepToDom();
  }

  const api: Player = {
    get state() {
      return state;
    },
    outputs: () => lesson.model.run(state.inputs),
    go(i) {
      if (destroyed) return;
      enter(clampStep(i));
      emit("step");
      if (state.stepIndex === last && !completed) {
        completed = true;
        emit("complete");
      }
    },
    next() {
      api.go(state.stepIndex + 1);
    },
    back() {
      api.go(state.stepIndex - 1);
    },
    setPlaying(v) {
      state.playing = v;
      applyStepToDom();
      emit("play");
    },
    setSpeed(v) {
      state.speed = v;
      emit("play");
    },
    setInput(name, value) {
      const control = lesson.controls[name];
      if (!control || !(step().controls ?? []).includes(name)) return;
      const v = Math.max(control.min, Math.min(control.max, value));
      state.overrides = { ...state.overrides, [name]: v };
      state.inputs = { ...state.inputs, [name]: v };
      emit("change");
    },
    handleKey(e) {
      const inField = editableTarget(e.target);
      const onButton = (e.target as HTMLElement | null)?.tagName === "BUTTON";
      switch (e.key) {
        case "ArrowRight":
          if (inField) return false;
          api.next();
          return true;
        case "ArrowLeft":
          if (inField) return false;
          api.back();
          return true;
        case " ":
          if (inField || onButton) return false;
          api.setPlaying(!state.playing);
          return true;
        case "r":
        case "R":
          if (inField) return false;
          api.go(state.stepIndex);
          return true;
        default:
          return false;
      }
    },
    on(ev, fn) {
      listeners[ev].add(fn);
      return () => listeners[ev].delete(fn);
    },
    destroy() {
      destroyed = true;
      stopLoop?.();
      ro?.disconnect();
      mo?.disconnect();
      for (const set of Object.values(listeners)) set.clear();
      if (dom) host.innerHTML = "";
    },
  };

  if (render) {
    dom = buildStage(host, lesson.scene, { legend: scene.legend, chartLabel: scene.chart.label, nodeBody: (id, n) => scene.nodeBody(id, n) });
    scene.mount(dom.world);
    const surface = (c: HTMLCanvasElement): Surface => ({ ctx: c.getContext("2d")!, dpr: 1, w: 0, h: 0 });
    surfaces = { back: surface(dom.back), front: surface(dom.front), chart: surface(dom.chart) };
    palette = readPalette(dom.root);
    ro = new ResizeObserver(resize);
    ro.observe(dom.root);
    mo = new MutationObserver(() => {
      if (dom) palette = readPalette(dom.root);
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  }

  enter(clampStep(opts.startStep ?? 0));
  hist.fill(live()[scene.chart.output] ?? 0);
  if (state.stepIndex === last) completed = true;
  if (render && dom) {
    // Warm start: the first frame already shows a working system.
    for (let i = 0; i < 90; i++) update(1 / 30);
    display = live();
    resize();
    stopLoop = startLoop(dom.root, frame);
  }
  return api;
}
