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

const ipbits: BoardWidget = { kind: "custom", name: "ipbits" };
const addr = (prefixLen: number, v6 = 0) => ({ ipA: 192, ipB: 168, ipC: 1, ipD: 42, prefixLen, v6 });

describe("ipbits widget", () => {
  it("writes the address as 32 bits, network bits first", () => {
    const root = mount(ipbits, addr(24));
    const cells = [...root.querySelectorAll<HTMLElement>(".tx-ip-bits i")];
    expect(cells).toHaveLength(32);
    expect(cells.filter((c) => c.classList.contains("net"))).toHaveLength(24);
    expect(cells.slice(24).map((c) => c.textContent).join("")).toBe("00101010");
    expect(root.querySelector(".tx-ip-dec")!.textContent).toBe("192.168.1.42");
    expect(root.querySelector(".tx-ip-cap")!.textContent).toBe("mask 255.255.255.0 · network 192.168.1.0/24");
  });

  it("moves the split with the prefix, even inside a number", () => {
    expect(mount(ipbits, addr(26)).querySelector(".tx-ip-cap")!.textContent).toBe("mask 255.255.255.192 · network 192.168.1.0/26");
    const root = mount(ipbits, addr(20));
    expect(root.querySelector(".tx-ip-cap")!.textContent).toBe("mask 255.255.240.0 · network 192.168.0.0/20");
    expect([...root.querySelectorAll(".tx-ip-bits i.net")]).toHaveLength(20);
  });

  it("shows an IPv6 address as eight groups instead", () => {
    const root = mount(ipbits, addr(24, 1));
    expect(root.querySelector<HTMLElement>(".tx-ip-bits")!.hidden).toBe(true);
    expect(root.querySelector(".tx-ip-dec")!.textContent).toBe("2001:0db8:0000:0042:0000:8a2e:0370:7334");
    expect(root.querySelector(".tx-ip-cap")!.textContent).toBe("128 bits · network /64 · device 64 bits");
  });
});

const subnets: BoardWidget = { kind: "custom", name: "subnets" };
const split = (subPrefix: number, hostB = 100) => ({ subPrefix, hostA: 42, hostB });

describe("subnets widget", () => {
  it("splits the /24 into subnets and marks which one each host is in", () => {
    const root = mount(subnets, split(26));
    const segs = [...root.querySelectorAll<HTMLElement>(".tx-sn-seg")];
    expect(segs.map((s) => s.textContent)).toEqual([".0", ".64", ".128", ".192"]);
    expect(segs.map((s) => s.classList.contains("a"))).toEqual([true, false, false, false]);
    expect(segs.map((s) => s.classList.contains("b"))).toEqual([false, true, false, false]);
    expect(root.querySelector<HTMLElement>(".tx-sn-mark.b")!.style.left).toBe(`${(100.5 / 256) * 100}%`);
    expect([...root.querySelectorAll(".tx-sn-and")].map((l) => l.textContent)).toEqual([
      "A 192.168.1.42 AND 255.255.255.192 = 192.168.1.0",
      "B 192.168.1.100 AND 255.255.255.192 = 192.168.1.64",
    ]);
    expect(root.querySelector(".tx-sn-cap")!.textContent).toBe("different subnets: A sends it to the router");
  });

  it("one /24 is one subnet, so A sends straight to B", () => {
    const root = mount(subnets, split(24));
    expect(root.querySelectorAll(".tx-sn-seg")).toHaveLength(1);
    expect(root.querySelector(".tx-sn-cap")!.textContent).toBe("same subnet: A sends straight to B");
  });

  it("drops the labels when the subnets get too small to name", () => {
    const root = mount(subnets, split(30, 43));
    const segs = [...root.querySelectorAll<HTMLElement>(".tx-sn-seg")];
    expect(segs).toHaveLength(64);
    expect(segs.every((s) => s.textContent === "")).toBe(true);
    expect(root.querySelector(".tx-sn-cap")!.textContent).toBe("same subnet: A sends straight to B");
  });
});

const arp: BoardWidget = { kind: "custom", name: "arp" };
const shownText = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>(".tx-arp-line")].filter((l) => !l.hidden).map((l) => l.textContent);
const cache = (root: HTMLElement) => root.querySelector(".tx-arp-row")!.textContent;

describe("arp widget", () => {
  it("starts with nothing cached for the router", () => {
    const root = mount(arp, { arpStage: 0, cacheSec: 60 }, 2);
    expect(shownText(root)).toEqual([]);
    expect(cache(root)).toBe("192.168.1.1 → ?");
  });

  it("asks everyone, hears the router's answer, then caches it", () => {
    const root = mount(arp, { arpStage: 1, cacheSec: 60 }, 0.5);
    expect(shownText(root)).toEqual(["to ff:ff:ff:ff:ff:ff (everyone): who has 192.168.1.1? tell 192.168.1.42"]);
    expect(cache(root)).toBe("192.168.1.1 → ?");
    paintWidget(root, arp, { arpStage: 1, cacheSec: 60 }, 1.6);
    expect(shownText(root)[1]).toBe("to 02:1a:2b:3c:4d:5e: 192.168.1.1 is at 02:aa:bb:cc:dd:01");
    paintWidget(root, arp, { arpStage: 1, cacheSec: 60 }, 3);
    expect(cache(root)).toBe("192.168.1.1 → 02:aa:bb:cc:dd:01");
  });

  it("sends straight to the cached address while the entry lasts", () => {
    const root = mount(arp, { arpStage: 2, cacheSec: 60 }, 5.2);
    expect(shownText(root)).toEqual(["to 02:aa:bb:cc:dd:01 directly: no broadcast"]);
    expect(cache(root)).toBe("192.168.1.1 → 02:aa:bb:cc:dd:01 · 55 s left");
  });
});
