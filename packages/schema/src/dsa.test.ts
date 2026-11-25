import { describe, expect, it } from "vitest";
import { DsaLesson } from "./dsa";

const lesson = () => ({
  id: "dsa-example",
  home: "dsa",
  slug: "example",
  topic: "Example",
  title: "A short hook title",
  promise: "You will see it.",
  minutes: 8,
  level: 1,
  runs: { slow: { algo: "pairs", label: "Every pair", listing: "pairs", time: "O(n²)", space: "O(1)" } },
  presets: [
    { id: "example", label: "Example", input: { nums: [1, 2] }, expect: null },
    { id: "empty", label: "Empty", input: { nums: [] }, expect: null, edge: "empty" },
  ],
  input: { nums: { kind: "ints", label: "Numbers", min: -9, max: 9, length: [0, 16] } },
  counter: "Pairs checked",
  steps: [{ id: "one", part: "slow", title: "One", short: "One", text: ["Hello."], run: "slow", preset: "example" }],
  practice: [{ slug: "two-sum", core: false }],
  ask: ["Is it sorted?"],
  buildsOn: [],
  questions: [],
  cheatsheet: [{ heading: "Idea", text: ["Check every pair."] }],
});

describe("DsaLesson", () => {
  it("accepts a minimal lesson", () => {
    expect(DsaLesson.safeParse(lesson()).success).toBe(true);
  });
  it("needs the dsa- prefix on the id", () => {
    expect(DsaLesson.safeParse({ ...lesson(), id: "example" }).success).toBe(false);
  });
  it("keeps hook titles to 40 characters", () => {
    expect(DsaLesson.safeParse({ ...lesson(), title: "x".repeat(41) }).success).toBe(false);
  });
  it("needs 2 to 6 presets", () => {
    const one = lesson();
    expect(DsaLesson.safeParse({ ...one, presets: one.presets.slice(0, 1) }).success).toBe(false);
    expect(DsaLesson.safeParse({ ...one, presets: Array.from({ length: 7 }, (_, i) => ({ ...one.presets[0], id: `p${i}` })) }).success).toBe(false);
  });
  it("accepts a prediction with a check function", () => {
    const l = lesson();
    l.steps[0] = { ...l.steps[0]!, predict: { at: { site: "check", nth: 2 }, ask: "Which?", options: ["a", "b"], answer: 0, check: () => 0 } } as never;
    expect(DsaLesson.safeParse(l).success).toBe(true);
  });
});
