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
