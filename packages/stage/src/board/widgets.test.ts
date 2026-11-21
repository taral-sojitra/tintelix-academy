// @vitest-environment jsdom
import type { BoardWidget } from "@tintelix/schema";
import { toBase62 } from "./base62";
import { CUSTOM, paintWidget, widgetHtml } from "./widgets";

function mount(w: BoardWidget, d: Record<string, number>, clock = 0): HTMLElement {
  const host = document.createElement("div");
  host.innerHTML = widgetHtml(w, "k");
  const root = host.querySelector<HTMLElement>('[data-w="k"]')!;
  paintWidget(root, w, d, clock);
  return root;
}

describe("toBase62", () => {
  it("encodes with 0-9a-zA-Z, zero-padded", () => {
    expect(toBase62(0, 7)).toBe("0000000");
    expect(toBase62(61, 1)).toBe("Z");
    expect(toBase62(62, 2)).toBe("10");
    expect(toBase62(3521614606207, 7)).toBe("ZZZZZZZ");
  });
});

describe("board widgets", () => {
  it("meter widget fills to output/max", () => {
    const w: BoardWidget = { kind: "meter", output: "busy", max: 5000, text: "{busy} a second" };
    const root = mount(w, { busy: 2500 });
    expect(root.querySelector<HTMLElement>(".tx-meter i")!.style.width).toBe("50%");
    expect(root.textContent).toContain("2,500 a second");
    expect(mount(w, { busy: 9000 }).querySelector<HTMLElement>(".tx-meter i")!.style.width).toBe("100%");
  });
  it("text widget fills outputs and hides when its condition is false", () => {
    const w: BoardWidget = { kind: "text", text: "Busy {busyPct}", when: { output: "busyPct", above: 100 } };
    const shown = mount(w, { busyPct: 278 });
    expect(shown.hidden).toBe(false);
    expect(shown.textContent).toBe("Busy 278%");
    expect(mount(w, { busyPct: 28 }).hidden).toBe(true);
  });
  it("cells widget lights the output's count of cells", () => {
    const root = mount({ kind: "cells", output: "used", total: 10 }, { used: 9 });
    expect(root.querySelectorAll("i")).toHaveLength(10);
    expect(root.querySelectorAll("i.on")).toHaveLength(9);
  });
  it("log widget shows only lines whose condition holds", () => {
    const w: BoardWidget = { kind: "log", lines: [{ text: "always" }, { text: "only hot", when: { output: "hot", above: 0 } }] };
    const cold = mount(w, { hot: 0 });
    expect([...cold.querySelectorAll("li")].filter((li) => !li.hidden).map((li) => li.textContent)).toEqual(["always"]);
    const hot = mount(w, { hot: 1 });
    expect([...hot.querySelectorAll("li")].filter((li) => !li.hidden)).toHaveLength(2);
  });
  it("base62 widget shows the id and its code, advancing with the clock", () => {
    const d = { idStart: 61_999_999_999, writeRate: 347, codeLength: 7 };
    const w: BoardWidget = { kind: "custom", name: "base62" };
    expect(CUSTOM.base62).toBeDefined();
    const root = mount(w, d, 0);
    expect(root.textContent).toContain(`#61,999,999,999 → ${toBase62(61_999_999_999, 7)}`);
    expect(root.textContent).toContain("7 characters");
    paintWidget(root, w, d, 2);
    expect(root.textContent).toContain(`#62,000,000,693 → ${toBase62(62_000_000_693, 7)}`);
  });
  it("base62 widget says when the number no longer fits the code length", () => {
    const root = mount({ kind: "custom", name: "base62" }, { idStart: 10_950_000_000, writeRate: 347, codeLength: 5 }, 0);
    expect(root.textContent).toContain("#10,950,000,000 → needs 6 characters");
    expect(root.textContent).toContain("5 characters: out of codes");
  });
});
