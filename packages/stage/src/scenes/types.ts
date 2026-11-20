import type { Inputs, Model, Outputs, Step } from "@tintelix/schema";
import type { Effects } from "../effects";
import type { IconName } from "../icons";
import type { PaletteKey } from "../palette";
import type { Router, SimEvent } from "../sim";

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

/** The part of a stage that knows about one kind of system: its routing, widgets and numbers. */
export interface SceneRuntime {
  readonly router: Router;
  /** Inputs as animated right now (for example, the hit rate while the cache warms up). */
  liveInputs(ctx: StepContext): Inputs;
  enterStep(ctx: StepContext): void;
  update(dt: number, ctx: StepContext): void;
  onEvent(e: SimEvent, ctx: StepContext): void;
  wireStyles(): WireStyle[];
  tiles(display: Outputs, ctx: StepContext): Tile[];
  readonly fx: Effects;
}
