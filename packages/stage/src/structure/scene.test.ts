// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import type { Frame } from "@tintelix/schema";
import { createStructureScene } from "./scene";

const frame = (over: Partial<Frame> = {}): Frame => ({
  site: "check",
  note: "3 + 8 = 11",
  structs: { nums: { kind: "array", values: [3, 8, 1, 9, 4, 6], marks: ["compare", "compare", null, null, null, null] } },
  pointers: [
    { name: "i", on: "nums", at: 0 },
    { name: "j", on: "nums", at: 1 },
  ],
  vars: { target: 10, sum: 11 },
  steps: 1,
  ...over,
});

describe("createStructureScene", () => {
  it("draws an array's cells with their indexes, values and marks", () => {
    const el = document.createElement("div");
    createStructureScene(el).render(frame(), { counter: "Pairs checked" });
    const cells = el.querySelectorAll<HTMLElement>(".ts-array[data-id='nums'] .ts-cell");
    expect(cells).toHaveLength(6);
    expect([...cells].map((c) => c.querySelector("b")!.textContent)).toEqual(["3", "8", "1", "9", "4", "6"]);
    expect(cells[0]!.querySelector("i")!.textContent).toBe("0");
    expect(cells[0]!.classList.contains("m-compare")).toBe(true);
    expect(cells[2]!.className).toBe("ts-cell");
  });

  it("moves the same pointer element when a pointer moves", () => {
    const el = document.createElement("div");
    const scene = createStructureScene(el);
    scene.render(frame());
    const j = el.querySelector<HTMLElement>(".ts-ptr[data-name='j']")!;
    expect(j.style.getPropertyValue("--at")).toBe("1");
    scene.render(frame({ pointers: [{ name: "i", on: "nums", at: 0 }, { name: "j", on: "nums", at: 2 }] }));
    expect(el.querySelector(".ts-ptr[data-name='j']")).toBe(j);
    expect(j.style.getPropertyValue("--at")).toBe("2");
    expect(j.textContent).toBe("j");
  });

  it("stacks two pointers on one cell", () => {
    const el = document.createElement("div");
    createStructureScene(el).render(frame({ pointers: [{ name: "i", on: "nums", at: 3 }, { name: "j", on: "nums", at: 3 }] }));
    const [i, j] = [...el.querySelectorAll<HTMLElement>(".ts-ptr")];
    expect(i!.style.getPropertyValue("--row")).toBe("0");
    expect(j!.style.getPropertyValue("--row")).toBe("1");
  });

  it("lists variables and the step counter", () => {
    const el = document.createElement("div");
    createStructureScene(el).render(frame({ steps: 4 }), { counter: "Pairs checked" });
    expect([...el.querySelectorAll(".ts-vars dt")].map((d) => d.textContent)).toEqual(["target", "sum"]);
    expect([...el.querySelectorAll(".ts-vars dd")].map((d) => d.textContent)).toEqual(["10", "11"]);
    expect(el.querySelector(".ts-steps")!.textContent).toBe("Pairs checked: 4");
  });

  it("says an empty array is empty and hides the counter without a label", () => {
    const el = document.createElement("div");
    createStructureScene(el).render(frame({ structs: { nums: { kind: "array", values: [], marks: [] } }, pointers: [], vars: {} }));
    expect(el.querySelector(".ts-array .ts-empty")!.textContent).toBe("empty");
    expect(el.querySelector(".ts-steps")).toBeNull();
    expect(el.querySelector(".ts-vars")).toBeNull();
  });

  it("shows null as a dash and clears the scene on destroy", () => {
    const el = document.createElement("div");
    const scene = createStructureScene(el);
    scene.render(frame({ vars: { best: null } }));
    expect(el.querySelector(".ts-vars dd")!.textContent).toBe("—");
    scene.destroy();
    expect(el.innerHTML).toBe("");
  });
});

describe("createStructureScene grids", () => {
  it("draws a grid's rows and columns with marks", () => {
    const el = document.createElement("div");
    const f = frame({ structs: { g: { kind: "grid", rows: [[1, 2, 3], [4, null, null]], marks: [[null, "active", null], [null, null, null]] } }, pointers: [] });
    createStructureScene(el).render(f);
    const rows = el.querySelectorAll(".ts-grid[data-id='g'] tbody tr");
    expect(rows).toHaveLength(2);
    expect([...rows[0]!.querySelectorAll("td")].map((c) => c.textContent)).toEqual(["1", "2", "3"]);
    expect(rows[1]!.querySelectorAll("td")[1]!.textContent).toBe("");
    expect(rows[0]!.querySelectorAll("td")[1]!.className).toBe("m-active");
    expect([...el.querySelectorAll(".ts-grid thead th")].map((c) => c.textContent)).toEqual(["", "0", "1", "2"]);
    expect([...el.querySelectorAll(".ts-grid tbody th")].map((c) => c.textContent)).toEqual(["0", "1"]);
  });
});

describe("createStructureScene maps", () => {
  it("draws a map as key and value rows", () => {
    const el = document.createElement("div");
    createStructureScene(el).render(frame({ structs: { counts: { kind: "map", entries: [["r", 2], ["a", 0]], marks: ["active", null] } }, pointers: [] }));
    const rows = el.querySelectorAll(".ts-map[data-id='counts'] tbody tr");
    expect([...rows].map((r) => [...r.children].map((c) => c.textContent))).toEqual([["r", "2"], ["a", "0"]]);
    expect(rows[0]!.className).toBe("m-active");
  });
  it("says an empty map is empty", () => {
    const el = document.createElement("div");
    createStructureScene(el).render(frame({ structs: { counts: { kind: "map", entries: [], marks: [] } }, pointers: [] }));
    expect(el.querySelector(".ts-map .ts-empty")!.textContent).toBe("empty");
  });
});

describe("createStructureScene long maps", () => {
  it("splits a map into columns of at most 8 rows, in order", () => {
    const el = document.createElement("div");
    const entries = Array.from({ length: 11 }, (_, i) => [String(i), i] as [string, number]);
    createStructureScene(el).render(frame({ structs: { seen: { kind: "map", entries, marks: entries.map(() => null) } }, pointers: [] }));
    const tables = el.querySelectorAll(".ts-map[data-id='seen'] table");
    expect([...tables].map((t) => t.querySelectorAll("tr").length)).toEqual([8, 3]);
    expect([...el.querySelectorAll(".ts-map td:first-child")].map((c) => c.textContent)).toEqual(entries.map(([k]) => k));
  });
});

describe("createStructureScene calls and trees", () => {
  it("draws the call stack newest on top, with return values", () => {
    const el = document.createElement("div");
    createStructureScene(el).render(frame({ structs: { calls: { kind: "calls", frames: [{ fn: "f", args: "3" }, { fn: "f", args: "2", ret: 1 }] } }, pointers: [] }));
    expect([...el.querySelectorAll(".ts-calls li")].map((li) => li.textContent)).toEqual(["f(2)= 1", "f(3)"]);
  });
  it("shows the newest 6 calls and counts the rest", () => {
    const el = document.createElement("div");
    const frames = Array.from({ length: 9 }, (_, i) => ({ fn: "f", args: String(9 - i) }));
    createStructureScene(el).render(frame({ structs: { calls: { kind: "calls", frames } }, pointers: [] }));
    const items = [...el.querySelectorAll(".ts-calls li")].map((li) => li.textContent);
    expect(items).toEqual(["f(1)", "f(2)", "f(3)", "f(4)", "f(5)", "f(6)", "3 more calls below"]);
  });
  it("draws a tree top down: one group per node, one line per parent link", () => {
    const el = document.createElement("div");
    createStructureScene(el).render(
      frame({
        structs: {
          calls: {
            kind: "tree",
            root: "a",
            nodes: [
              { id: "a", label: "f(2)", children: ["b", "c"], mark: null },
              { id: "b", label: "f(1)", sub: "= 1", children: [], mark: "done" },
              { id: "c", label: "f(0)", children: [], mark: "bad" },
            ],
          },
        },
        pointers: [],
      }),
    );
    const svg = el.querySelector(".ts-tree[data-id='calls'] svg")!;
    expect([...svg.querySelectorAll("g.ts-node")].map((g) => [g.getAttribute("class"), g.querySelector("text")!.textContent])).toEqual([
      ["ts-node", "f(2)"],
      ["ts-node m-done", "f(1)"],
      ["ts-node m-bad", "f(0)"],
    ]);
    expect(svg.querySelectorAll("line")).toHaveLength(2);
    expect(svg.querySelector("g.ts-node.m-done .ts-sub")!.textContent).toBe("= 1");
    // The parent sits midway over its two children.
    const x = (i: number) => Number(svg.querySelectorAll("g.ts-node")[i]!.getAttribute("data-x"));
    expect(x(0)).toBe((x(1) + x(2)) / 2);
  });
});
