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
  it("stepclock widget marks the seven steps done, now and to do, with their minutes", () => {
    const w: BoardWidget = { kind: "custom", name: "stepclock" };
    const root = mount(w, { phase: 3, phaseEnd: 4 });
    const cls = [...root.querySelectorAll("[data-seg]")].map((s) => (s.classList.contains("done") ? "done" : s.classList.contains("now") ? "now" : "todo"));
    expect(cls).toEqual(["done", "done", "now", "now", "todo", "todo", "todo"]);
    expect(root.querySelector(".tx-calc-s")!.textContent).toBe("Minutes 10–20: API, data");
    paintWidget(root, w, { phase: 6, phaseEnd: 0 }, 0);
    expect(root.querySelector(".tx-calc-s")!.textContent).toBe("Minutes 30–40: deep dive");
    paintWidget(root, w, { phase: 8, phaseEnd: 0 }, 0);
    expect(root.querySelectorAll("[data-seg].done")).toHaveLength(7);
    expect(root.querySelector(".tx-calc-s")!.textContent).toBe("45 minutes: all seven steps done");
  });
  it("bitlayout widget splits 64 bits and builds the ID from time, machine and sequence", () => {
    const w: BoardWidget = { kind: "custom", name: "bitlayout" };
    const d = { machineBits: 10, seqBits: 12, sampleMs: 1000, sampleMachine: 37, perServerRate: 2000 };
    const root = mount(w, d, 0);
    expect(root.querySelector<HTMLElement>(".tx-idbits-bar")!.style.gridTemplateColumns).toBe("1fr 41fr 10fr 12fr");
    expect(root.querySelector("[data-bits-vals]")!.textContent).toBe("time 1,000 ms · machine 37 · sequence 0");
    expect(root.querySelector("[data-bits-id]")!.textContent).toBe("ID 4,194,455,552");
    paintWidget(root, w, d, 0.0005);
    expect(root.querySelector("[data-bits-id]")!.textContent).toBe("ID 4,194,455,553");
    paintWidget(root, w, { ...d, machineBits: 5, seqBits: 17 }, 0);
    expect(root.querySelector("[data-bits-vals]")!.textContent).toBe("machine 37 doesn't fit in 5 bits");
    expect(root.querySelector("[data-bits-id]")!.textContent).toBe("no valid ID");
  });
  it("quorum widget lights the W replicas written and the R replicas read, and says if they overlap", () => {
    const w: BoardWidget = { kind: "custom", name: "quorum" };
    const row = (root: HTMLElement, name: string) =>
      [...root.querySelectorAll(`[data-q="${name}"] i`)].map((c) => (c.classList.contains("down") ? "x" : c.classList.contains("on") ? "1" : "0")).join("");
    const root = mount(w, { replicas: 3, writeQuorum: 2, readQuorum: 2, downReplica: 0 });
    expect(row(root, "write")).toBe("110");
    expect(row(root, "read")).toBe("011");
    expect(root.querySelector(".tx-calc-s")!.textContent).toBe("W 2 + R 2 > N 3: every read meets the latest write");
    paintWidget(root, w, { replicas: 3, writeQuorum: 1, readQuorum: 1, downReplica: 0 }, 0);
    expect(row(root, "write")).toBe("100");
    expect(row(root, "read")).toBe("001");
    expect(root.querySelector(".tx-calc-s")!.textContent).toBe("W 1 + R 1 ≤ N 3: a read can miss the latest write");
    paintWidget(root, w, { replicas: 3, writeQuorum: 2, readQuorum: 2, downReplica: 2 }, 0);
    expect(row(root, "write")).toBe("1x1");
    paintWidget(root, w, { replicas: 3, writeQuorum: 3, readQuorum: 1, downReplica: 2 }, 0);
    expect(root.querySelector(".tx-calc-s")!.textContent).toBe("Only 2 of 3 replicas up: writes need 3");
  });
  it("frontier widget shows per-host queues and when each site may be fetched next", () => {
    const w: BoardWidget = { kind: "custom", name: "frontier" };
    const root = mount(w, { politeDelay: 1 }, 0);
    const rows = () => [...root.querySelectorAll(".tx-hq-row")].map((r) => [r.querySelector("em")!.textContent, r.querySelectorAll("i.on").length, r.querySelector("b")!.textContent]);
    expect(rows()).toEqual([
      ["news.example", 5, "ready"],
      ["blog.example", 2, "in 0.8 s"],
      ["shop.example", 3, "in 0.5 s"],
      ["wiki.example", 1, "in 0.3 s"],
    ]);
    paintWidget(root, w, { politeDelay: 1 }, 0.5);
    expect(rows()[0]![2]).toBe("in 0.5 s");
    expect(rows()[2]![2]).toBe("ready");
  });
  it("trie widget walks the typed prefix and shows the top five cached at that node", () => {
    const w: BoardWidget = { kind: "custom", name: "trie" };
    const root = mount(w, {}, 0);
    const typed = () => root.querySelector(".tx-trie-typed")!.textContent;
    const top = () => [...root.querySelectorAll(".tx-trie li")].map((li) => li.textContent);
    expect(typed()).toBe("c");
    expect(top()).toEqual(["cricket score", "chatgpt", "cheap flights", "cat videos", "calculator"]);
    paintWidget(root, w, {}, 1.7);
    expect(typed()).toBe("ca");
    expect(top()[0]).toBe("cat videos");
    paintWidget(root, w, {}, 3.3);
    expect(typed()).toBe("cat");
    expect(top()).toHaveLength(5);
    paintWidget(root, w, {}, 4.9);
    expect(typed()).toBe("c");
  });
  it("lanes widget plays a broadcast: each channel's progress and when it finishes", () => {
    const w: BoardWidget = { kind: "custom", name: "lanes" };
    const d = { pushCount: 10.5e6, emailCount: 3.75e6, smsCount: 750000, pushEff: 35000, emailEff: 12500, smsEff: 300 };
    const root = mount(w, d, 0);
    const lanes = () => [...root.querySelectorAll(".tx-chl-row")].map((r) => [r.querySelector("em")!.textContent, r.querySelector("b")!.textContent]);
    expect(root.querySelector(".tx-chl-t")!.textContent).toBe("T+0:00");
    expect(lanes()).toEqual([
      ["push", "0% · all by 5:00"],
      ["email", "0% · all by 5:00"],
      ["SMS", "0% · all by 41:40"],
    ]);
    paintWidget(root, w, d, 15);
    expect(root.querySelector(".tx-chl-t")!.textContent).toBe("T+5:00");
    expect(lanes()[0]![1]).toBe("100% · all by 5:00");
    expect(lanes()[2]![1]).toBe("12% · all by 41:40");
    expect(root.querySelector<HTMLElement>(".tx-chl-row:nth-child(3) .tx-chl-bar i")!.style.width).toBe("12%");
  });
});
