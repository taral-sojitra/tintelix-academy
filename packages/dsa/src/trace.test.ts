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

describe("trace calls and trees", () => {
  it("keeps a call stack, newest last, with a return value before the pop", () => {
    const run = trace(
      (t: Tracer) => {
        const c = t.calls("calls");
        c.push("f", "3");
        c.push("f", "2");
        t.at("deep", "two calls");
        c.ret(1);
        t.at("ret", "returned");
        c.pop();
        t.at("back", "one call");
      },
      {},
    );
    expect(run.frames.map((f) => f.structs.calls)).toEqual([
      { kind: "calls", frames: [{ fn: "f", args: "3" }, { fn: "f", args: "2" }] },
      { kind: "calls", frames: [{ fn: "f", args: "3" }, { fn: "f", args: "2", ret: 1 }] },
      { kind: "calls", frames: [{ fn: "f", args: "3" }] },
    ]);
  });
  it("builds a tree with children, binary sides, sub-labels and marks", () => {
    const run = trace(
      (t: Tracer) => {
        const tr = t.tree("calls");
        tr.node("a", "f(2)");
        tr.node("b", "f(1)", "a");
        tr.node("c", "f(0)", "a");
        tr.sub("b", "= 1");
        tr.mark("c", "bad");
        const bt = t.tree("bst");
        bt.node("5", "5");
        bt.node("7", "7", "5", "right");
        t.at("one", "built");
      },
      {},
    );
    expect(run.frames[0]!.structs.calls).toEqual({
      kind: "tree",
      root: "a",
      nodes: [
        { id: "a", label: "f(2)", children: ["b", "c"], mark: null },
        { id: "b", label: "f(1)", sub: "= 1", children: [], mark: null },
        { id: "c", label: "f(0)", children: [], mark: "bad" },
      ],
    });
    expect(run.frames[0]!.structs.bst).toEqual({
      kind: "tree",
      root: "5",
      nodes: [
        { id: "5", label: "5", left: null, right: "7", mark: null },
        { id: "7", label: "7", left: null, right: null, mark: null },
      ],
    });
  });
});

describe("trace lists", () => {
  it("keeps nodes in the order made, with next links, the head and named tags", () => {
    const run = trace(
      (t: Tracer) => {
        const l = t.list("list");
        l.add("a", 1);
        l.add("b", 2);
        l.link("a", "b");
        l.head("a");
        l.tag("curr", "b");
        l.mark("a", "done");
        t.at("one", "built");
        l.link("b", "a");
        l.link("a", null);
        l.put("a", 9);
        l.head("b");
        l.tag("curr", null);
        t.at("two", "flipped");
      },
      {},
    );
    expect(run.frames[0]!.structs.list).toEqual({
      kind: "list",
      head: "a",
      nodes: [
        { id: "a", value: 1, next: "b", mark: "done" },
        { id: "b", value: 2, next: null, mark: null },
      ],
      tags: [{ name: "curr", at: "b" }],
    });
    expect(run.frames[1]!.structs.list).toMatchObject({ head: "b", nodes: [{ value: 9, next: null }, { next: "a" }], tags: [] });
  });
});

describe("trace stacks and queues", () => {
  it("records a stack bottom first and a queue front first, with marks", () => {
    const run = trace(
      (t: Tracer) => {
        const s = t.stack("stack");
        const q = t.queue("queue");
        s.push("(");
        s.push("[");
        s.mark(1, "active");
        q.push(1);
        q.push(2);
        t.at("one", "pushed");
        expect(s.pop()).toBe("[");
        expect(s.peek()).toBe("(");
        expect(q.shift()).toBe(1);
        expect(q.front()).toBe(2);
        t.at("two", "taken");
      },
      {},
    );
    expect(run.frames[0]!.structs).toEqual({
      stack: { kind: "stack", items: ["(", "["], marks: [null, "active"] },
      queue: { kind: "queue", items: [1, 2], marks: [null, null] },
    });
    expect(run.frames[1]!.structs).toEqual({ stack: { kind: "stack", items: ["("], marks: [null] }, queue: { kind: "queue", items: [2], marks: [null] } });
  });
});
