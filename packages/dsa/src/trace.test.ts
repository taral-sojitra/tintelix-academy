import { describe, expect, it } from "vitest";
import { trace, type Tracer } from "./trace";

const pairs = (t: Tracer, { nums }: { nums: number[] }) => {
  const a = t.array("nums", nums);
  const i = t.pointer("i", a, 0);
  t.set("best", null);
  for (; i.at < a.length; i.move(1)) {
    t.count();
    a.mark(i.at, "compare");
    t.at("look", `look at ${a.get(i.at)}`);
    a.mark(i.at, null);
  }
  t.at("done", "done");
  t.result(nums.length);
};

describe("trace", () => {
  it("records one frame per at() with a copy of the state", () => {
    const run = trace(pairs, { nums: [4, 7] });
    expect(run.frames.map((f) => f.site)).toEqual(["look", "look", "done"]);
    expect(run.frames[0]!.structs.nums).toEqual({ kind: "array", values: [4, 7], marks: ["compare", null] });
    expect(run.frames[1]!.structs.nums!.marks).toEqual([null, "compare"]);
    expect(run.result).toBe(2);
    expect(run.stopped).toBeUndefined();
  });

  it("shows a pointer move in the next frame only", () => {
    const run = trace(pairs, { nums: [4, 7] });
    expect(run.frames[0]!.pointers).toEqual([{ name: "i", on: "nums", at: 0 }]);
    expect(run.frames[1]!.pointers).toEqual([{ name: "i", on: "nums", at: 1 }]);
  });

  it("adds counts into the step counter and keeps variables", () => {
    const run = trace(pairs, { nums: [1, 2, 3] });
    expect(run.frames.map((f) => f.steps)).toEqual([1, 2, 3, 3]);
    expect(run.frames[0]!.vars).toEqual({ best: null });
  });

  it("lets later writes leave earlier frames alone", () => {
    const run = trace(
      (t: Tracer) => {
        const a = t.array("a", [1]);
        t.at("one", "one");
        a.put(0, 9);
        t.set("x", 2);
        t.at("two", "two");
      },
      {},
    );
    expect(run.frames[0]!.structs.a!.values).toEqual([1]);
    expect(run.frames[0]!.vars).toEqual({});
    expect(run.frames[1]!.structs.a!.values).toEqual([9]);
  });

  it("stops a run that never ends at the frame limit", () => {
    const run = trace(
      (t: Tracer) => {
        for (;;) t.at("spin", "again");
      },
      {},
    );
    expect(run.frames).toHaveLength(400);
    expect(run.stopped).toBe("limit");
  });

  it("hides a pointer that has left its structure", () => {
    const run = trace(pairs, { nums: [5] });
    expect(run.frames.at(-1)!.pointers).toEqual([]);
  });
});
