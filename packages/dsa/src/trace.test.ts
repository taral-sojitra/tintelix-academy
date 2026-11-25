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
    expect((run.frames[1]!.structs.nums as { values: unknown[]; marks: unknown[] }).marks).toEqual([null, "compare"]);
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
    expect((run.frames[0]!.structs.a as { values: unknown[]; marks: unknown[] }).values).toEqual([1]);
    expect(run.frames[0]!.vars).toEqual({});
    expect((run.frames[1]!.structs.a as { values: unknown[]; marks: unknown[] }).values).toEqual([9]);
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

describe("trace grids", () => {
  it("records a grid's cells and marks, copied per frame", () => {
    const run = trace(
      (t: Tracer) => {
        const g = t.grid("g", 2, 3);
        g.put(0, 1, 5);
        g.mark(0, 1, "active");
        t.at("one", "one");
        g.put(1, 2, 7);
        g.clearMarks();
        t.at("two", "two");
      },
      {},
    );
    expect(run.frames[0]!.structs.g).toEqual({ kind: "grid", rows: [[null, 5, null], [null, null, null]], marks: [[null, "active", null], [null, null, null]] });
    expect(run.frames[1]!.structs.g).toEqual({ kind: "grid", rows: [[null, 5, null], [null, null, 7]], marks: [[null, null, null], [null, null, null]] });
  });
});

describe("trace maps", () => {
  it("keeps entries in the order they were first set, with marks", () => {
    const run = trace(
      (t: Tracer) => {
        const m = t.map("counts");
        m.put("b", 1);
        m.put("a", 2);
        m.put("b", 3);
        m.mark("a", "active");
        t.at("one", "one");
        m.remove("b");
        t.at("two", "two");
      },
      {},
    );
    expect(run.frames[0]!.structs.counts).toEqual({ kind: "map", entries: [["b", 3], ["a", 2]], marks: [null, "active"] });
    expect(run.frames[1]!.structs.counts).toEqual({ kind: "map", entries: [["a", 2]], marks: ["active"] });
  });
});
