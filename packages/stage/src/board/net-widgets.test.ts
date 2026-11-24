// @vitest-environment jsdom
import type { BoardWidget } from "@tintelix/schema";
import { paintWidget, widgetHtml } from "./widgets";

function mount(w: BoardWidget, d: Record<string, number>, clock = 0): HTMLElement {
  const host = document.createElement("div");
  host.innerHTML = widgetHtml(w, "k");
  const root = host.querySelector<HTMLElement>('[data-w="k"]')!;
  paintWidget(root, w, d, clock);
  return root;
}

const headers: BoardWidget = { kind: "custom", name: "headers" };
const outputs = (wrap: number) => ({ wrap, payloadBytes: 3000, firstSegBytes: 1460, frameBytes: 1518, headerPerSeg: 58 });
const rows = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>(".tx-env-row")].filter((r) => !r.hidden).map((r) => r.querySelector("em")!.textContent);
const caption = (root: HTMLElement) => root.querySelector(".tx-env-cap")!.textContent;

describe("headers widget", () => {
  it("shows the app's message alone before any layer has touched it", () => {
    const root = mount(headers, outputs(0), 3);
    expect(rows(root)).toEqual(["message"]);
    expect(caption(root)).toBe("the app's message: 3,000 bytes");
  });

  it("wraps the message one layer at a time on the way down", () => {
    const root = mount(headers, outputs(1), 0.5);
    expect(rows(root)).toEqual(["message"]);
    expect(caption(root)).toBe("the app hands down 3,000 bytes");
    paintWidget(root, headers, outputs(1), 2.5);
    expect(rows(root)).toEqual(["message", "segment", "packet"]);
    expect(root.querySelector(".tx-env-row.new em")!.textContent).toBe("packet");
    expect(caption(root)).toBe("network adds an IP header: 20 bytes");
    paintWidget(root, headers, outputs(1), 4);
    const frame = [...root.querySelectorAll<HTMLElement>(".tx-env-row")][3]!;
    expect([...frame.querySelectorAll("span:not(.gap)")].map((s) => s.textContent)).toEqual(["Eth 14", "IP 20", "TCP 20", "data 1,460", "FCS 4"]);
    expect(caption(root)).toBe("data link adds Ethernet: 14 bytes in front, 4 at the end");
  });

  it("strips the headers from the frame up on the way up", () => {
    const root = mount(headers, outputs(3), 0.5);
    expect(rows(root)).toEqual(["frame"]);
    expect(caption(root)).toBe("a frame arrives: 1,518 bytes");
    paintWidget(root, headers, outputs(3), 4);
    expect(rows(root)).toEqual(["message", "segment", "packet", "frame"]);
    expect(caption(root)).toBe("transport strips TCP: the app gets 3,000 bytes");
  });

  it("shows every layer's view of one frame", () => {
    const root = mount(headers, outputs(2), 1);
    expect(rows(root)).toHaveLength(4);
    expect(root.querySelector(".tx-env-row.new")).toBeNull();
    expect(caption(root)).toBe("one frame: 1,518 bytes, 58 of them headers");
  });
});
