import type { Anchor, DsaLesson, DsaStep, Frame } from "@tintelix/schema";
import { trace, type Algo } from "./trace";

/** The frame an anchor names, or null when the run never gets there. */
export function resolveAnchor(frames: Frame[], anchor: Anchor): number | null {
  if (!frames.length) return null;
  if (anchor === "start") return 0;
  if (anchor === "end") return frames.length - 1;
  let seen = 0;
  for (let i = 0; i < frames.length; i++) if (frames[i]!.site === anchor.site && ++seen === (anchor.nth ?? 1)) return i;
  return null;
}

const label = (a: Anchor) => (typeof a === "string" ? a : `${a.site} #${a.nth ?? 1}`);

export type Slice = { start: number; end: number; predictAt: number | null };

/** The frames a step plays, from its `from` anchor to its `to` anchor, and where its prediction pauses. */
export function stepSlice(frames: Frame[], step: Pick<DsaStep, "from" | "to" | "predict">): Slice | { error: string } {
  const start = resolveAnchor(frames, step.from ?? "start");
  if (start === null) return { error: `no frame at ${label(step.from ?? "start")}` };
  const end = resolveAnchor(frames, step.to ?? "end");
  if (end === null) return { error: `no frame at ${label(step.to ?? "end")}` };
  if (end < start) return { error: `${label(step.to ?? "end")} comes before ${label(step.from ?? "start")}` };
  if (!step.predict) return { start, end, predictAt: null };
  const at = resolveAnchor(frames, step.predict.at);
  if (at === null) return { error: `no frame at ${label(step.predict.at)} for the prediction` };
  if (at < start || at >= end) return { error: `the prediction at ${label(step.predict.at)} needs a frame after it inside the step` };
  return { start, end, predictAt: at };
}

/** Each run's final step count on a preset, as the outputs step text quotes: `{slowSteps}`. */
export function runCounts(lesson: DsaLesson, presetId: string, algos: Record<string, Algo>): Record<string, number> {
  const preset = lesson.presets.find((p) => p.id === presetId);
  const out: Record<string, number> = {};
  if (!preset) return out;
  for (const [name, run] of Object.entries(lesson.runs)) {
    const algo = algos[run.algo];
    if (algo) out[`${name}Steps`] = trace(algo, preset.input).frames.at(-1)?.steps ?? 0;
  }
  return out;
}
