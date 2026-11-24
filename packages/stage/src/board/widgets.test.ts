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
  it("presence widget shows who is online and how long ago the others were seen", () => {
    const w: BoardWidget = { kind: "custom", name: "presence" };
    const root = mount(w, {}, 0);
    const rows = () => [...root.querySelectorAll(".tx-pres-row")].map((r) => [r.querySelector("em")!.textContent, r.classList.contains("on"), r.querySelector("b")!.textContent]);
    expect(rows()).toEqual([
      ["Ravi", true, "online"],
      ["Meera", true, "online"],
      ["Dev", false, "last seen 3 min ago"],
      ["Kiran", false, "last seen 1 h ago"],
    ]);
    paintWidget(root, w, {}, 120);
    expect(rows()[2]![2]).toBe("last seen 5 min ago");
  });
  it("geogrid widget draws the cells at this length, the block read, and the search circle", () => {
    const w: BoardWidget = { kind: "custom", name: "geogrid" };
    const d = { geoLen: 6, radiusKm: 2, cellW: 1.22, cellH: 0.61, cellsX: 5, cellsY: 8 };
    const root = mount(w, d, 0);
    const map = root.querySelector<HTMLElement>(".tx-geo-map")!;
    expect(map.style.backgroundSize).toBe("22.9px 11.4px");
    const read = root.querySelector<HTMLElement>(".tx-geo-read")!;
    expect(read.style.width).toBe("114.4px");
    expect(read.style.height).toBe("91.5px");
    expect(root.querySelector<HTMLElement>(".tx-geo-ring")!.style.width).toBe("75px");
    expect(root.querySelector(".tx-calc-s")!.textContent).toBe("length 6: 5 × 8 = 40 cells read");
    paintWidget(root, w, { ...d, geoLen: 4, cellW: 39.1, cellH: 19.5, cellsX: 3, cellsY: 3 }, 0);
    expect(read.style.width).toBe("150px");
  });
  it("funnel widget narrows millions of passages to a few the model reads, stage by stage", () => {
    const w: BoardWidget = { kind: "custom", name: "funnel" };
    const d = { chunks: 6e6, annVisited: 2000, topK: 5 };
    const root = mount(w, d, 0);
    const rows = () => [...root.querySelectorAll(".tx-fun-row")];
    const lit = () => rows().filter((r) => r.classList.contains("on")).length;
    expect(rows().map((r) => r.querySelector("em")!.textContent)).toEqual(["passages", "compared", "in the prompt", "answer"]);
    expect(rows().map((r) => r.querySelector("b")!.textContent)).toEqual(["6,000,000", "2,000", "5", "1"]);
    const widths = rows().map((r) => parseFloat(r.querySelector<HTMLElement>("span i")!.style.width));
    expect(widths[0]).toBe(100);
    expect(widths[1]! > widths[2]! && widths[2]! > widths[3]!).toBe(true);
    expect(lit()).toBe(0);
    paintWidget(root, w, d, 1.5);
    expect(lit()).toBe(2);
    paintWidget(root, w, d, 3.2);
    expect(lit()).toBe(4);
    expect(root.querySelector(".tx-fun-cap")!.textContent).toBe("the model reads 5 passages, not 6,000,000");
  });

  it("sortedset widget keeps the board in score order as your score climbs past others", () => {
    const w: BoardWidget = { kind: "custom", name: "sortedset" };
    const d = { logSteps: 23.25 };
    const root = mount(w, d, 0);
    const rows = () => [...root.querySelectorAll(".tx-zs-row")].map((r) => [r.querySelector("b")!.textContent, r.querySelector("em")!.textContent, r.querySelector("span")!.textContent, r.classList.contains("me")]);
    expect(rows()).toEqual([
      ["#1,203", "Asha", "9,820", false],
      ["#1,204", "Ken", "9,705", false],
      ["#1,205", "Lola", "9,650", false],
      ["#1,206", "Omar", "9,580", false],
      ["#1,207", "Priya", "9,555", false],
      ["#1,208", "you", "9,540", true],
    ]);
    expect(root.querySelector(".tx-zs-cap")!.textContent).toBe("your rank found in 23 steps");
    paintWidget(root, w, d, 3.5);
    expect(rows()[2]).toEqual(["#1,205", "you", "9,690", true]);
    expect(rows()[3]![1]).toBe("Lola");
    paintWidget(root, w, d, 5.2);
    expect(rows()[5]![1]).toBe("you");
  });

  it("watermark widget closes minute windows once the watermark passes, and sends a too-late click aside", () => {
    const w: BoardWidget = { kind: "custom", name: "watermark" };
    const d = { slackSec: 30 };
    const root = mount(w, d, 0);
    const dots = () => [...root.querySelectorAll<HTMLElement>(".tx-wm-axis i")].filter((i) => !i.hidden);
    const wins = () => [...root.querySelectorAll(".tx-wm-win")].map((x) => [x.querySelector("em")!.textContent, x.querySelector("b")!.textContent, x.classList.contains("closed")]);
    const caption = () => root.querySelector(".tx-wm-cap")!.textContent;
    expect(dots()).toHaveLength(0);
    expect(wins()).toEqual([["12:00", "open", false], ["12:01", "open", false], ["12:02", "open", false]]);
    expect(root.querySelector<HTMLElement>(".tx-wm-line")!.style.left).toBe("0%");
    paintWidget(root, w, d, 5);
    expect(dots()).toHaveLength(8);
    expect(wins()[0]).toEqual(["12:00", "5", true]);
    expect(wins()[1]![2]).toBe(false);
    expect(root.querySelector<HTMLElement>(".tx-wm-line")!.style.left).toBe("34.4%");
    expect(caption()).toBe("watermark = latest click − 30 s");
    paintWidget(root, w, d, 6.5);
    expect(root.querySelectorAll(".tx-wm-axis i.late")).toHaveLength(1);
    expect(wins()[0]![1]).toBe("5");
    expect(caption()).toBe("1 too late → correction path");
    paintWidget(root, w, { slackSec: 120 }, 6.5);
    expect(root.querySelectorAll(".tx-wm-axis i.late")).toHaveLength(0);
    expect(wins()[0]).toEqual(["12:00", "open", false]);
  });

  it("rollup widget keeps recent points raw and averages older ones into 1-minute and 1-hour points", () => {
    const w: BoardWidget = { kind: "custom", name: "rollup" };
    const root = mount(w, { rollups: 0 }, 0);
    const bars = () => [...root.querySelectorAll<HTMLElement>(".tx-rup-bars i")];
    const h = (n: number) => bars()[n]!.style.height;
    expect(bars()).toHaveLength(24);
    expect(root.querySelectorAll(".tx-rup-bars i.hr, .tx-rup-bars i.mn")).toHaveLength(0);
    expect(h(0)).not.toBe(h(1));
    expect(root.querySelector(".tx-rup-cap")!.textContent).toBe("every 15 s point, kept forever");
    paintWidget(root, w, { rollups: 1 }, 0);
    expect(root.querySelectorAll(".tx-rup-bars i.hr")).toHaveLength(12);
    expect(root.querySelectorAll(".tx-rup-bars i.mn")).toHaveLength(8);
    expect(new Set([h(0), h(1), h(2), h(3)]).size).toBe(1);
    expect(h(12)).toBe(h(13));
    expect(new Set([h(20), h(21), h(22), h(23)]).size).toBe(4);
    expect(root.querySelector(".tx-rup-cap")!.textContent).toBe("old: 1 h · then 1 min · recent: 15 s");
  });

  it("partitions widget appends to four logs and shows each group's committed offset", () => {
    const w: BoardWidget = { kind: "custom", name: "partitions" };
    const root = mount(w, { groups: 2 }, 0);
    const row = (r: number) => root.querySelectorAll<HTMLElement>(".tx-pt-row")[r]!;
    const cells = (r: number) => [...row(r).querySelectorAll("i")];
    const written = (r: number) => cells(r).filter((c) => c.classList.contains("on")).length;
    const at = (r: number, cls: string) => cells(r).findIndex((c) => c.classList.contains(cls));
    expect(root.querySelectorAll(".tx-pt-row")).toHaveLength(4);
    expect(cells(0)).toHaveLength(14);
    expect(row(0).querySelector("em")!.textContent).toBe("P0");
    expect(written(0)).toBe(4);
    expect(at(0, "ga")).toBe(2);
    expect(at(0, "gb")).toBe(0);
    paintWidget(root, w, { groups: 2 }, 3);
    expect(written(0)).toBe(10);
    expect(at(0, "ga")).toBe(8);
    expect(at(0, "gb")).toBe(3);
    expect(root.querySelector(".tx-pt-cap")!.textContent).toBe("● billing · ● analytics, replaying");
    paintWidget(root, w, { groups: 1 }, 3);
    expect(at(0, "gb")).toBe(-1);
    expect(root.querySelector(".tx-pt-cap")!.textContent).toBe("a reader's committed offset ●");
  });

  it("erasure widget loses disks one by one: one copy is gone, three copies keep one, 10 + 4 keeps ten", () => {
    const w: BoardWidget = { kind: "custom", name: "erasure" };
    const ec = { pieces: 14, dataPieces: 10, tolerance: 4, erasure: 1 };
    const root = mount(w, ec, 0);
    const shown = () => [...root.querySelectorAll<HTMLElement>(".tx-ec-disks i")].filter((c) => !c.hidden);
    const dead = () => shown().filter((c) => c.classList.contains("dead")).length;
    const caption = () => root.querySelector(".tx-ec-cap")!.textContent;
    expect(shown()).toHaveLength(14);
    expect(shown().filter((c) => c.classList.contains("par"))).toHaveLength(4);
    expect(root.querySelectorAll(".tx-ec-disks i.par")).toHaveLength(4);
    expect(dead()).toBe(0);
    expect(caption()).toBe("10 data + 4 parity, on 14 disks");
    paintWidget(root, w, ec, 4.5);
    expect(dead()).toBe(4);
    expect(caption()).toBe("10 of 14 left · any 10 rebuild it");
    const copies = { pieces: 3, dataPieces: 1, tolerance: 2, erasure: 0 };
    paintWidget(root, w, copies, 2.5);
    expect(shown()).toHaveLength(3);
    expect(dead()).toBe(2);
    expect(caption()).toBe("1 of 3 copies left · copying again");
    const one = { pieces: 1, dataPieces: 1, tolerance: 0, erasure: 0 };
    paintWidget(root, w, one, 0.5);
    expect(caption()).toBe("1 copy, on 1 disk");
    paintWidget(root, w, one, 1.5);
    expect(dead()).toBe(1);
    expect(caption()).toBe("the only copy is gone");
    expect(root.classList.contains("lost")).toBe(true);
  });

  it("blocksync widget shows an insert resending the rest of the file with fixed chunks, and two chunks with content-defined ones", () => {
    const w: BoardWidget = { kind: "custom", name: "blocksync" };
    const root = mount(w, { contentDefined: 0 }, 0);
    const changed = (row: number) => root.querySelectorAll(`.tx-bs-row:nth-of-type(${row + 1}) i.chg`).length;
    const rows = () => [...root.querySelectorAll(".tx-bs-row")].map((r) => [r.querySelector("em")!.textContent, r.querySelector("b")!.textContent, r.classList.contains("on")]);
    expect(root.querySelectorAll(".tx-bs-row i")).toHaveLength(24);
    expect(changed(0) + changed(1)).toBe(0);
    expect(rows()).toEqual([["fixed", "", true], ["by content", "", false]]);
    paintWidget(root, w, { contentDefined: 0 }, 1.5);
    expect(changed(0)).toBe(9);
    expect(changed(1)).toBe(2);
    expect(rows()).toEqual([["fixed", "9 of 12 resent", true], ["by content", "2 of 12 resent", false]]);
    paintWidget(root, w, { contentDefined: 1 }, 1.5);
    expect(rows().map((r) => r[2])).toEqual([false, true]);
    paintWidget(root, w, { contentDefined: 1 }, 3.2);
    expect(changed(0) + changed(1)).toBe(0);
  });

  it("transcode widget encodes every segment at every quality in parallel, then says when it can play", () => {
    const w: BoardWidget = { kind: "custom", name: "transcode" };
    const d = { segments: 900, parallelSec: 38 };
    const root = mount(w, d, 0);
    const done = () => root.querySelectorAll(".tx-tc-row i.done").length;
    const caption = () => root.querySelector(".tx-tc-cap")!.textContent;
    expect([...root.querySelectorAll(".tx-tc-row em")].map((e) => e.textContent)).toEqual(["240p", "720p", "1080p", "4K"]);
    expect(root.querySelectorAll(".tx-tc-row i")).toHaveLength(48);
    expect(done()).toBe(0);
    expect(caption()).toBe("900 segments, all encoding at once");
    paintWidget(root, w, d, 1);
    expect(done()).toBe(16);
    paintWidget(root, w, d, 3);
    expect(done()).toBe(48);
    expect(root.classList.contains("ready")).toBe(true);
    expect(caption()).toBe("ready to play in 38 s");
    paintWidget(root, w, d, 4.1);
    expect(done()).toBe(0);
  });

  it("roadgraph widget grows a search circle from home, or follows shortcuts once they exist", () => {
    const w: BoardWidget = { kind: "custom", name: "roadgraph" };
    const slow = { shortcuts: 0, explored: 628319 };
    const root = mount(w, slow, 0);
    const lit = () => root.querySelectorAll(".tx-rg-map i.lit").length;
    const caption = () => root.querySelector(".tx-rg-cap")!.textContent;
    expect(root.querySelectorAll(".tx-rg-map i")).toHaveLength(70);
    expect(root.querySelector(".tx-rg-map i.start")).not.toBeNull();
    expect(root.querySelector(".tx-rg-map i.goal")).not.toBeNull();
    expect(lit()).toBe(1);
    expect(caption()).toBe("every road · 628,319 searched");
    paintWidget(root, w, slow, 3);
    expect(lit()).toBe(66);
    expect(caption()).toBe("every road · 628,319 searched · found");
    const fast = { shortcuts: 1, explored: 1000 };
    paintWidget(root, w, fast, 3);
    expect(lit()).toBe(15);
    expect(root.classList.contains("fast")).toBe(true);
    expect(caption()).toBe("shortcuts · 1,000 searched · found");
    paintWidget(root, w, fast, 4.2);
    expect(lit()).toBe(3);
    expect(caption()).toBe("shortcuts · 1,000 searched");
  });

  it("dispatch widget ranks nearby drivers, claims the best, and shows a second rider losing the race", () => {
    const w: BoardWidget = { kind: "custom", name: "dispatch" };
    const d = { candidates: 42, cellsChecked: 7, clashPct: 0 };
    const root = mount(w, d, 0);
    const rows = () => [...root.querySelectorAll(".tx-disp-row")].map((r) => [r.querySelector("b")!.textContent, r.className.replace("tx-disp-row", "").trim()]);
    const caption = () => root.querySelector(".tx-disp-cap")!.textContent;
    expect([...root.querySelectorAll(".tx-disp-row em")].map((e) => e.textContent)).toEqual(["#37 · 2 min", "#51 · 3 min", "#8 · 5 min"]);
    expect(caption()).toBe("rider 12: 42 free in 7 cells");
    expect(rows()).toEqual([["free", ""], ["free", ""], ["free", ""]]);
    paintWidget(root, w, d, 1.6);
    expect(rows()[0]).toEqual(["claiming", "try"]);
    paintWidget(root, w, d, 3.1);
    expect(rows()[0]).toEqual(["claimed · rider 12", "mine"]);
    paintWidget(root, w, d, 4.6);
    expect(caption()).toBe("offered to 37 · 10 s to accept");
    paintWidget(root, w, d, 6.1);
    expect(caption()).toBe("37 accepted · trip on");
    expect(rows()[1]).toEqual(["free", ""]);
    const race = { ...d, clashPct: 100 };
    paintWidget(root, w, race, 4.6);
    expect(caption()).toBe("rider 13 claims 37 too · fails");
    expect(rows()[0]).toEqual(["claimed · rider 12", "mine clash"]);
    paintWidget(root, w, race, 6.1);
    expect(caption()).toBe("rider 13 takes 51 instead");
    expect(rows()[1]).toEqual(["claimed · rider 13", "mine"]);
    paintWidget(root, w, race, 7.6);
    expect(rows()[0]).toEqual(["free", ""]);
  });

  it("pubsub widget shows one person's channel, its subscribers, and who each update reaches", () => {
    const w: BoardWidget = { kind: "custom", name: "pubsub" };
    const root = mount(w, { updateEvery: 20, radiusKm: 5 }, 0);
    const rows = () => [...root.querySelectorAll(".tx-ps-row")].map((r) => [r.querySelector("em")!.textContent, r.querySelector("b")!.textContent, r.className.replace("tx-ps-row", "").trim()]);
    expect(root.querySelector(".tx-ps-head")!.textContent).toBe("your channel · update #1");
    expect(rows()).toEqual([
      ["Meera", "1.2 km · sent", "near"],
      ["Dev", "3.8 km · sent", "near"],
      ["Kiran", "12 km · too far", "far"],
      ["Ravi", "not sharing", "off"],
    ]);
    paintWidget(root, w, { updateEvery: 20, radiusKm: 5 }, 2.1);
    expect(root.querySelector(".tx-ps-head")!.textContent).toBe("your channel · update #2");
    paintWidget(root, w, { updateEvery: 20, radiusKm: 2 }, 0);
    expect(rows()[1]!.slice(1)).toEqual(["3.8 km · too far", "far"]);
  });
});
