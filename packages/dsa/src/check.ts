import { spawnSync } from "node:child_process";
import ts from "typescript";
import { quotedOutputs, type DsaLesson } from "@tintelix/schema";
import { argsFor, checkValue } from "./input";
import { parseListing, siteLiterals } from "./listing";
import { stepSlice } from "./play";
import { trace, type Algo } from "./trace";

/** Build-time only: imports the TypeScript compiler and Node's child_process, so the page never loads it. */

export interface LessonCode {
  algos: Record<string, Algo>;
  listings: Record<string, { ts: string; py: string }>;
}

/** Slugs the DSA subject keeps for its own pages. */
export const RESERVED_SLUGS = ["which-pattern", "tintelix-50", "patterns"];
const MAX_SLICE = 40;

const show = (v: unknown) => JSON.stringify(v ?? null);
const same = (a: unknown, b: unknown) => show(a) === show(b);

/** Transpiles a TypeScript listing and calls its one exported function. */
export function runTsListing(code: string, args: unknown[]): unknown {
  const js = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports: Record<string, unknown> = {};
  new Function("exports", js)(exports);
  const fns = Object.values(exports).filter((v): v is (...a: unknown[]) => unknown => typeof v === "function");
  if (fns.length !== 1) throw new Error(`a listing must export exactly one function, found ${fns.length}`);
  return fns[0]!(...args);
}

const HARNESS = `
import json, sys, types
req = json.loads(sys.stdin.read())
ns = {}
exec(req["code"], ns)
fns = [v for k, v in ns.items() if isinstance(v, types.FunctionType) and not k.startswith("_")]
if len(fns) != 1:
    raise SystemExit("a listing must define exactly one function, found %d" % len(fns))
print(json.dumps(fns[0](*req["args"])))
`;

/** True when python3 runs on this machine. */
export function hasPython(): boolean {
  return spawnSync("python3", ["--version"]).status === 0;
}

/** Runs a Python listing's one function with python3 -I and returns what it prints as JSON. */
export function runPyListing(code: string, args: unknown[]): unknown {
  const r = spawnSync("python3", ["-I", "-c", HARNESS], { input: JSON.stringify({ code, args }), encoding: "utf8", timeout: 10_000 });
  if (r.status !== 0) throw new Error(r.stderr || r.error?.message || "python3 failed");
  return JSON.parse(r.stdout);
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

/**
 * Everything the content build checks for one DSA lesson (LLD §12). `order` is the lesson's place in the
 * subject, counted from 1; it decides the practice and pattern-card rules.
 */
export function checkDsaLesson(lesson: DsaLesson, code: LessonCode, registry: readonly string[], order: number): string[] {
  const problems: string[] = [];
  const say = (m: string) => problems.push(`${lesson.id}: ${m}`);
  const ok = (input: Record<string, unknown>, result: unknown, expect: unknown) => (lesson.accept ? lesson.accept(input, result) : same(result, expect));

  if (RESERVED_SLUGS.includes(lesson.slug)) say(`slug ${lesson.slug} is kept for a DSA page`);
  for (const p of lesson.presets) for (const m of checkValue(lesson.input, p.input)) say(`preset ${p.id}: ${m}`);
  if (!lesson.presets.some((p) => p.edge)) say("no preset is an edge case");

  for (const [name, run] of Object.entries(lesson.runs)) {
    const algo = code.algos[run.algo];
    if (!algo) {
      say(`run ${name} names algorithm ${run.algo}, which the lesson doesn't export`);
      continue;
    }
    const emitted = new Set(siteLiterals(algo.toString()));
    for (const p of lesson.presets) {
      const t = trace(algo, p.input);
      if (t.stopped) say(`run ${name} on preset ${p.id} stopped at the frame limit`);
      else if (!ok(p.input, t.result, p.expect)) say(`run ${name} on preset ${p.id} returned ${show(t.result)}, expected ${show(p.expect)}`);
      for (const f of t.frames) emitted.add(f.site);
    }
    const listing = code.listings[run.listing];
    if (!listing) {
      say(`run ${name} names listing ${run.listing}, which the lesson doesn't have`);
      continue;
    }
    for (const lang of ["ts", "py"] as const) {
      const marked = new Set(Object.keys(parseListing(listing[lang], lang).sites));
      for (const s of emitted) if (!marked.has(s)) say(`listing ${run.listing} (${lang}) has no line for site ${s}`);
      for (const s of marked) if (!emitted.has(s)) say(`listing ${run.listing} (${lang}) marks site ${s}, which the algorithm never reaches`);
    }
    for (const p of lesson.presets) {
      try {
        const got = runTsListing(parseListing(listing.ts, "ts").code, argsFor(lesson.input, p.input));
        if (!ok(p.input, got, p.expect)) say(`listing ${run.listing} (ts) on preset ${p.id} returned ${show(got)}, expected ${show(p.expect)}`);
      } catch (e) {
        say(`listing ${run.listing} (ts) on preset ${p.id} failed: ${(e as Error).message}`);
      }
    }
  }

  for (const step of lesson.steps) {
    const presetId = step.preset ?? lesson.presets[0]!.id;
    const outputs = runCounts(lesson, presetId, code.algos);
    for (const q of step.text.flatMap(quotedOutputs)) if (!(q in outputs)) say(`step ${step.id} quotes {${q}}, which no run makes`);
    if (step.compare) for (const r of step.compare) if (!lesson.runs[r]) say(`step ${step.id} compares run ${r}, which doesn't exist`);
    if (!step.run) {
      if (step.predict) say(`step ${step.id} has a prediction but plays no run`);
      continue;
    }
    const run = lesson.runs[step.run];
    const preset = lesson.presets.find((p) => p.id === presetId);
    if (!run) say(`step ${step.id} plays run ${step.run}, which doesn't exist`);
    if (step.preset && !preset) say(`step ${step.id} uses preset ${step.preset}, which doesn't exist`);
    const algo = run && code.algos[run.algo];
    if (!algo || !preset) continue;
    const frames = trace(algo, preset.input).frames;
    const slice = stepSlice(frames, step);
    if ("error" in slice) {
      say(`step ${step.id}: ${slice.error}`);
      continue;
    }
    if (slice.end - slice.start + 1 > MAX_SLICE) say(`step ${step.id} plays ${slice.end - slice.start + 1} frames; keep a step to ${MAX_SLICE}`);
    if (step.predict && slice.predictAt !== null) {
      const { answer, options, check } = step.predict;
      if (answer >= options.length) say(`step ${step.id}: the prediction's answer is option ${answer}, but it has ${options.length} options`);
      const shown = check(frames[slice.predictAt + 1]!);
      if (shown !== answer) say(`step ${step.id}: the prediction's answer is option ${answer}, but the next frame shows option ${shown}`);
    }
  }

  for (const p of lesson.practice) if (!registry.includes(p.slug)) say(`practice problem ${p.slug} isn't in the LeetCode registry`);
  if (order === 1 && lesson.practice.length !== 1) say("lesson 1 links exactly one practice problem");
  if (order === 23 && lesson.practice.length) say("lesson 23 links no practice problems");
  if (order >= 2 && order <= 22 && order !== 23 && (lesson.practice.length < 2 || lesson.practice.length > 5)) say("lessons 2–22 need 2–5 practice problems");
  if (order === 24 && (lesson.practice.length < 1 || lesson.practice.length > 5)) say("lesson 24 needs 1–5 practice problems");
  if (order >= 2 && order <= 22 && !lesson.card) say("lessons 2–22 need a pattern card");
  return problems;
}
