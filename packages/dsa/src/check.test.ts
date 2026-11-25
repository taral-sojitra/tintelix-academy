import { describe, expect, it } from "vitest";
import type { DsaLesson } from "@tintelix/schema";
import { checkDsaLesson, runCounts, runTsListing } from "./check";
import { stepSlice } from "./play";
import { trace, type Tracer } from "./trace";

function firstPositive(t: Tracer, { nums }: { nums: number[] }) {
  const a = t.array("nums", nums);
  for (let i = 0; i < nums.length; i++) {
    t.count();
    t.at("check", `look at ${a.get(i)}`);
    if (nums[i]! > 0) {
      t.at("found", "found it");
      return t.result(i);
    }
  }
  t.at("none", "none");
  t.result(-1);
}

const TS = `export function firstPositive(nums: number[]): number {
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] > 0) { // @check
      return i; // @found
    }
  }
  return -1; // @none
}`;
const PY = `def first_positive(nums):
    for i in range(len(nums)):
        if nums[i] > 0:  # @check
            return i  # @found
    return -1  # @none`;

const base = (): DsaLesson => ({
  id: "dsa-fixture",
  home: "dsa",
  slug: "fixture",
  topic: "Fixture",
  title: "Find the first positive",
  promise: "p",
  minutes: 5,
  level: 1,
  runs: { slow: { algo: "firstPositive", label: "Scan", listing: "scan", time: "O(n)", space: "O(1)" } },
  presets: [
    { id: "example", label: "Example", input: { nums: [-2, -1, 3, 4] }, expect: 2 },
    { id: "empty", label: "Empty", input: { nums: [] }, expect: -1, edge: "empty" },
  ],
  input: { nums: { kind: "ints", label: "Numbers", min: -9, max: 9, length: [0, 16] } },
  counter: "Numbers checked",
  steps: [
    {
      id: "scan",
      part: "slow",
      title: "Scan",
      short: "Scan",
      text: ["It checks {slowSteps} numbers."],
      run: "slow",
      preset: "example",
      predict: { at: { site: "check", nth: 2 }, ask: "Next?", options: ["Stop", "Check 3"], answer: 1, check: (f) => (f.site === "check" ? 1 : 0) },
    },
  ],
  practice: [{ slug: "two-sum", core: false }],
  ask: [],
  buildsOn: [],
  questions: [],
  cheatsheet: [{ heading: "Idea", text: ["Scan."] }],
});
const code = { algos: { firstPositive }, listings: { scan: { ts: TS, py: PY } } };
const registry = ["two-sum"];
const check = (l: DsaLesson, c = code, order = 1) => checkDsaLesson(l, c, registry, order);

describe("checkDsaLesson", () => {
  it("passes a clean lesson", () => {
    expect(check(base())).toEqual([]);
  });
  it("reports a preset whose expected result is wrong", () => {
    const l = base();
    l.presets[0]!.expect = 3;
    expect(check(l)).toEqual(expect.arrayContaining(["dsa-fixture: run slow on preset example returned 2, expected 3", "dsa-fixture: listing scan (ts) on preset example returned 2, expected 3"]));
  });
  it("reports a site the listing doesn't mark", () => {
    const c = { ...code, listings: { scan: { ts: TS.replace(" // @found", ""), py: PY } } };
    expect(check(base(), c)).toEqual(["dsa-fixture: listing scan (ts) has no line for site found"]);
  });
  it("reports an anchor that isn't in the run", () => {
    const l = base();
    l.steps[0]!.from = { site: "check", nth: 9 };
    expect(check(l)).toEqual(["dsa-fixture: step scan: no frame at check #9"]);
  });
  it("keeps a step's slice to 40 frames", () => {
    const l = base();
    l.presets[0] = { id: "example", label: "Long", input: { nums: Array.from({ length: 16 }, () => -1) }, expect: -1 };
    l.steps[0]!.predict = undefined;
    l.presets.push({ id: "worst", label: "Worst", input: { nums: [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1] }, expect: -1, edge: "worst" });
    const long = { ...code, algos: { firstPositive: (t: Tracer, i: { nums: number[] }) => { for (let k = 0; k < 3; k++) firstPositive(t, i); } } };
    expect(check(l, long)).toContain("dsa-fixture: step scan plays 51 frames; keep a step to 40");
  });
  it("reports a prediction whose answer the trace doesn't show", () => {
    const l = base();
    l.steps[0]!.predict!.answer = 0;
    expect(check(l)).toEqual(["dsa-fixture: step scan: the prediction's answer is option 0, but the next frame shows option 1"]);
  });
  it("reports a quoted count no run makes", () => {
    const l = base();
    l.steps[0]!.text = ["{fastSteps} checks."];
    expect(check(l)).toEqual(["dsa-fixture: step scan quotes {fastSteps}, which no run makes"]);
  });
  it("reports practice that breaks the lesson's rules or isn't in the registry", () => {
    const l = base();
    l.practice = [{ slug: "made-up", core: false }];
    expect(check(l)).toEqual(["dsa-fixture: practice problem made-up isn't in the LeetCode registry"]);
    expect(check(base(), code, 5)).toEqual(["dsa-fixture: lessons 2–22 need 2–5 practice problems", "dsa-fixture: lessons 2–22 need a pattern card"]);
  });
  it("needs an edge-case preset", () => {
    const l = base();
    delete l.presets[1]!.edge;
    expect(check(l)).toEqual(["dsa-fixture: no preset is an edge case"]);
  });
});

describe("runTsListing, runCounts and stepSlice", () => {
  it("runs a TypeScript listing", () => {
    expect(runTsListing(TS, [[-1, 5]])).toBe(1);
  });
  it("counts each run's steps on a preset", () => {
    expect(runCounts(base(), "example", code.algos)).toEqual({ slowSteps: 3 });
  });
  it("finds a step's slice and its prediction frame", () => {
    const frames = trace(firstPositive, { nums: [-2, -1, 3, 4] }).frames;
    expect(stepSlice(frames, { from: { site: "check", nth: 2 }, to: "end", predict: base().steps[0]!.predict })).toEqual({ start: 1, end: 3, predictAt: 1 });
    expect(stepSlice(frames, {})).toEqual({ start: 0, end: 3, predictAt: null });
  });
});
