import type { Inputs, Model, Outputs, SceneNode, SceneSpec, Step } from "@tintelix/schema";
import type { Effects } from "../effects";
import type { IconName } from "../icons";
import type { PaletteKey } from "../palette";
import type { Router, Sim, SimEvent } from "../sim";

export interface StepContext {
  step: Step;
  stepIndex: number;
  /** Seconds of simulated time since the step opened. */
  stepTime: number;
  simTime: number;
  inputs: Inputs;
  /** True once the learner moved a control on this step. */
  overridden: boolean;
  visible: ReadonlySet<string>;
  model: Model;
  playing: boolean;
  reducedMotion: boolean;
}

export interface WireStyle {
  wire: string;
  color: PaletteKey;
  alpha: number;
  width: number;
  /** Dash pattern; a dashed wire flows along `flowDir`. */
  dash?: [number, number];
  flowDir?: 1 | -1;
  /** 0..1 of the wire drawn, for wires that grow in. */
  progress?: number;
}

export interface Tile {
  id: string;
  label: string;
  icon: IconName;
  hue: "cyan" | "green" | "violet" | "blue" | "amber";
  value: string;
  note: string;
  mood: "good" | "bad" | "";
}

export interface SceneChart {
  /** Text above the chart, such as "DB LOAD · LAST 30 S". */
  label: string;
  /** The model output the chart plots and labels. */
  output: string;
  /** Top of the scale, in the output's units. */
  max: number;
  /** Where the dashed danger line sits. */
  danger: number;
}

/** The part of a stage that knows about one kind of system: its routing, widgets and numbers. */
export interface SceneRuntime {
  readonly router: Router;
  readonly legend: [PaletteKey, string][];
  /** Visual request rate at 1×, and the service rate of each queue. */
  readonly sim: { ratePerSec: number; queues?: Record<string, number> };
  readonly chart: SceneChart;
  /** Where waiting requests line up, for the queue drawing; null when the scene has no queue. */
  readonly lane: [number, number] | null;
  /** The inside of a node box. Content strings must be escaped. */
  nodeBody(id: string, node: SceneNode): string;
  /** Finds the widgets nodeBody made, once the stage is built. */
  mount(world: HTMLElement): void;
  /** Updates the widgets; called every other frame with the smoothed outputs. */
  paintWidgets(display: Outputs, ctx: StepContext, rdt: number, sim: Sim): void;
  /** One chart sample, every 0.1 s of simulated time. Only the line carries noise. */
  chartSample(live: Outputs, sim: Sim): number;
  /** Inputs as animated right now (for example, the hit rate while the cache warms up). */
  liveInputs(ctx: StepContext): Inputs;
  enterStep(ctx: StepContext): void;
  update(dt: number, ctx: StepContext): void;
  onEvent(e: SimEvent, ctx: StepContext): void;
  wireStyles(): WireStyle[];
  tiles(display: Outputs, ctx: StepContext): Tile[];
  readonly fx: Effects;
}

export type SceneFactory = (o: { fx: Effects; rand: () => number; scene: SceneSpec }) => SceneRuntime;
