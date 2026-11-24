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

const dhcp: BoardWidget = { kind: "custom", name: "dhcp" };
const msgs = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>(".tx-dhcp-msg")].filter((l) => !l.hidden).map((l) => l.textContent);
const settings = (root: HTMLElement) => [...root.querySelectorAll(".tx-dhcp-set b")].map((b) => b.textContent);

describe("dhcp widget", () => {
  it("starts with no settings at all", () => {
    const root = mount(dhcp, { dhcpStage: 0, leaseHours: 4 }, 3);
    expect(msgs(root)).toEqual([]);
    expect(settings(root)).toEqual(["—", "—", "—", "—", "—"]);
  });

  it("plays discover, offer, request, acknowledge, then fills in the settings", () => {
    const root = mount(dhcp, { dhcpStage: 1, leaseHours: 4 }, 0.5);
    expect(msgs(root)).toEqual(["DISCOVER → everyone: is there a DHCP server?"]);
    paintWidget(root, dhcp, { dhcpStage: 1, leaseHours: 4 }, 2.6);
    expect(msgs(root)).toEqual([
      "DISCOVER → everyone: is there a DHCP server?",
      "OFFER → phone: you can have 192.168.1.101",
      "REQUEST → everyone: I'll take 192.168.1.101",
    ]);
    expect(settings(root)[0]).toBe("—");
    paintWidget(root, dhcp, { dhcpStage: 1, leaseHours: 4 }, 5);
    expect(msgs(root)[3]).toBe("ACK → phone: it's yours for 4 h");
    expect(settings(root)).toEqual(["192.168.1.101", "255.255.255.0", "192.168.1.1", "192.168.1.1", "4 h"]);
  });

  it("once settled, shows when the phone will renew", () => {
    const root = mount(dhcp, { dhcpStage: 2, leaseHours: 4 }, 1);
    expect(msgs(root)).toEqual(["at 2 h: REQUEST → server: may I keep 192.168.1.101?"]);
    expect(settings(root)[4]).toBe("4 h");
  });
});

const order: BoardWidget = { kind: "custom", name: "order" };
const lane = (root: HTMLElement, n: number) => [...root.querySelectorAll<HTMLElement>(".tx-ord-row")[n]!.querySelectorAll("i")].map((c) => c.className);
const ordCap = (root: HTMLElement) => root.querySelector(".tx-ord-cap")!.textContent;

describe("order widget", () => {
  it("delivers 1–3 in both lanes, then loses 4", () => {
    const root = mount(order, { stallMs: 120 }, 0.5);
    expect(lane(root, 0)).toEqual(["ok", "ok", "ok", "", "", "", "", ""]);
    expect(lane(root, 1)).toEqual(["ok", "ok", "ok", "", "", "", "", ""]);
    expect(ordCap(root)).toBe("1–3 arrive in both");
    paintWidget(root, order, { stallMs: 120 }, 1.5);
    expect(lane(root, 0)[3]).toBe("lost");
    expect(ordCap(root)).toBe("4 is lost on the way");
  });

  it("TCP holds 5–8 back while UDP hands them over at once", () => {
    const root = mount(order, { stallMs: 120 }, 2.5);
    expect(lane(root, 0)).toEqual(["ok", "ok", "ok", "lost", "wait", "wait", "wait", "wait"]);
    expect(lane(root, 1)).toEqual(["ok", "ok", "ok", "lost", "ok", "ok", "ok", "ok"]);
    expect(ordCap(root)).toBe("TCP holds 5–8 until 4 comes; UDP hands them over now");
  });

  it("TCP gets 4 again and delivers everything in order; UDP never does", () => {
    const root = mount(order, { stallMs: 120 }, 4.2);
    expect(lane(root, 0)).toEqual(["ok", "ok", "ok", "resent", "ok", "ok", "ok", "ok"]);
    expect(lane(root, 1)[3]).toBe("lost");
    expect(ordCap(root)).toBe("4 resent 120 ms later: TCP delivers 4–8 in order");
  });
});

const ladder: BoardWidget = { kind: "custom", name: "ladder" };
const ladRows = (root: HTMLElement) =>
  [...root.querySelectorAll<HTMLElement>(".tx-lad-row")].filter((r) => !r.hidden).map((r) => [r.querySelector("em")!.textContent, r.querySelector("span")!.textContent, r.classList.contains("l") ? "←" : "→"]);
const ladCap = (root: HTMLElement) => root.querySelector(".tx-lad-cap")!.textContent;

describe("ladder widget", () => {
  it("is empty before any connection", () => {
    const root = mount(ladder, { ladderStage: 0, rttMs: 80 }, 3);
    expect(ladRows(root)).toEqual([]);
    expect(ladCap(root)).toBe("no connection yet");
  });

  it("draws SYN, SYN-ACK and ACK at half-round-trip times", () => {
    const root = mount(ladder, { ladderStage: 1, rttMs: 80 }, 0.5);
    expect(ladRows(root)).toEqual([["0 ms", "SYN seq=1000", "→"]]);
    paintWidget(root, ladder, { ladderStage: 1, rttMs: 80 }, 3);
    expect(ladRows(root)).toEqual([
      ["0 ms", "SYN seq=1000", "→"],
      ["40 ms", "SYN-ACK seq=5000 ack=1001", "←"],
      ["80 ms", "ACK ack=5001", "→"],
    ]);
    expect(ladCap(root)).toBe("connected after 80 ms: one round trip");
  });

  it("sends the request with the ACK; the reply lands after two round trips", () => {
    const root = mount(ladder, { ladderStage: 2, rttMs: 100 }, 4);
    expect(ladRows(root).slice(2)).toEqual([
      ["100 ms", "ACK + GET /", "→"],
      ["200 ms", "200 OK, the page", "←"],
    ]);
    expect(ladCap(root)).toBe("first byte of the page at 200 ms: two round trips");
  });

  it("closes with a FIN and an ACK from each side", () => {
    const root = mount(ladder, { ladderStage: 3, rttMs: 80 }, 4);
    expect(ladRows(root).map((r) => r[1])).toEqual(["FIN", "ACK", "FIN", "ACK"]);
    expect(ladCap(root)).toBe("closed: each side sent a FIN and got an ACK");
  });
});

const sockets: BoardWidget = { kind: "custom", name: "sockets" };
const sockRows = (root: HTMLElement) =>
  [...root.querySelectorAll<HTMLElement>(".tx-sock-row")].filter((r) => !r.hidden).map((r) => [...r.querySelectorAll("span")].map((c) => c.textContent));
const sockCap = (root: HTMLElement) => root.querySelector(".tx-sock-cap")!.textContent;

describe("sockets widget", () => {
  it("lists the three listening programs before any connection", () => {
    const root = mount(sockets, { sockStage: 0 });
    expect(sockRows(root)).toEqual([
      ["LISTEN", "*:443", "", "web server"],
      ["LISTEN", "*:22", "", "SSH"],
      ["LISTEN", "*:5432", "", "database"],
    ]);
    expect(sockCap(root)).toBe("3 programs listening, one port each");
  });

  it("tells five connections to one address apart by their ends", () => {
    const root = mount(sockets, { sockStage: 1 });
    const rows = sockRows(root);
    expect(rows).toHaveLength(5);
    expect(rows[0]).toEqual(["TCP", "203.0.113.5:443", "198.51.100.7:51000", "web server"]);
    expect(rows[1]).toEqual(["TCP", "203.0.113.5:443", "198.51.100.7:51001", "web server"]);
    const picked = [...root.querySelectorAll<HTMLElement>(".tx-sock-row.pick")].map((r) => r.querySelector("span:nth-child(3)")!.textContent);
    expect(picked).toEqual(["198.51.100.7:51000", "198.51.100.7:51001"]);
    expect(sockCap(root)).toBe("5 connections, 1 address: told apart by protocol and both ends' IP and port");
  });

  it("gives the app server a fresh source port for every new connection", () => {
    const root = mount(sockets, { sockStage: 2 }, 0);
    const port = () => root.querySelector(".tx-sock-row.pick span:nth-child(3)")!.textContent;
    expect(port()).toBe("198.51.100.30:40000");
    paintWidget(root, sockets, { sockStage: 2 }, 2);
    expect(port()).toBe("198.51.100.30:40010");
    expect(sockCap(root)).toBe("each new connection from the app server takes a fresh source port");
  });
});

const dnswalk: BoardWidget = { kind: "custom", name: "dnswalk" };
const dnsOut = (stage: number) => ({ dnsStage: stage, resolverMs: 20, rootMs: 30, tldMs: 40, authMs: 80, coldMs: 170, ttlSec: 300 });
const dnsRows = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>(".tx-dns-row")].filter((r) => !r.hidden).map((r) => [r.querySelector("em")!.textContent, r.querySelector("span")!.textContent]);
const dnsCache = (root: HTMLElement) => root.querySelector(".tx-dns-cache span")!.textContent;

describe("dnswalk widget", () => {
  it("knows nothing before the first lookup", () => {
    const root = mount(dnswalk, dnsOut(0), 3);
    expect(dnsRows(root)).toEqual([]);
    expect(dnsCache(root)).toBe("empty");
  });

  it("walks root, .com and example.com's server one at a time, then caches", () => {
    const root = mount(dnswalk, dnsOut(1), 1.5);
    expect(dnsRows(root)).toEqual([
      ["laptop", "where is www.example.com?"],
      ["root", "don't know; ask the .com servers · 30 ms"],
    ]);
    paintWidget(root, dnswalk, dnsOut(1), 5.5);
    expect(dnsRows(root).slice(2)).toEqual([
      [".com", "don't know; ask ns1.example.com · 40 ms"],
      ["ns1.example.com", "203.0.113.80, keep it 300 s · 80 ms"],
      ["resolver", "203.0.113.80 after 170 ms"],
    ]);
    expect(dnsCache(root)).toBe("www.example.com → 203.0.113.80 · 300 s");
  });

  it("answers from the cache, counting the TTL down", () => {
    const root = mount(dnswalk, dnsOut(2), 12.4);
    expect(dnsRows(root)).toEqual([["resolver", "203.0.113.80 from its cache · 20 ms"]]);
    expect(dnsCache(root)).toBe("www.example.com → 203.0.113.80 · 288 s left");
  });
});

const waterfall: BoardWidget = { kind: "custom", name: "waterfall" };
const wfOut = (h2On: number, h3On: number) => ({ h1Setup: 2, h1Html: 1, h1Res: 7, h2Setup: 2, h2Html: 1, h2Res: 1, h3Setup: 1, h3Html: 1, h3Res: 1, rttMs: 80, h2On, h3On });
const wfRows = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>(".tx-wf-row")].filter((r) => !r.hidden);

describe("waterfall widget", () => {
  it("shows HTTP/1.1 alone first, scaled so its bar fills the width", () => {
    const root = mount(waterfall, wfOut(0, 0));
    const rows = wfRows(root);
    expect(rows.map((r) => r.querySelector("em")!.textContent)).toEqual(["HTTP/1.1"]);
    expect(rows[0]!.querySelector("b")!.textContent).toBe("800 ms");
    expect([...rows[0]!.querySelectorAll<HTMLElement>(".tx-wf-bar i")].map((i) => i.style.width)).toEqual(["20%", "10%", "70%"]);
  });

  it("adds HTTP/2 and HTTP/3 on the same scale", () => {
    const rows = wfRows(mount(waterfall, wfOut(100, 100)));
    expect(rows.map((r) => [r.querySelector("em")!.textContent, r.querySelector("b")!.textContent])).toEqual([
      ["HTTP/1.1", "800 ms"],
      ["HTTP/2", "320 ms"],
      ["HTTP/3", "240 ms"],
    ]);
    expect(rows[2]!.querySelector<HTMLElement>(".tx-wf-bar i")!.style.width).toBe("10%");
  });
});

const mactable: BoardWidget = { kind: "custom", name: "mactable" };
const macRows = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>(".tx-mac-row")].filter((r) => !r.hidden).map((r) => [r.querySelector("em")!.textContent, r.querySelector("span")!.textContent]);
const macNow = (root: HTMLElement) => root.querySelector(".tx-mac-now")!.textContent;

describe("mactable widget", () => {
  it("starts with an empty table", () => {
    const root = mount(mactable, { macStage: 0 });
    expect(macRows(root)).toEqual([]);
    expect(macNow(root)).toBe("table empty: the switch knows nobody yet");
  });

  it("learns from each frame's source and floods until it knows the destination", () => {
    const root = mount(mactable, { macStage: 1 }, 0.5);
    expect(macRows(root)).toEqual([["A1", "port 1"]]);
    expect(macNow(root)).toBe("A1 → A2: learn A1 is on port 1; A2 unknown, so flood every port");
    paintWidget(root, mactable, { macStage: 1 }, 2);
    expect(macRows(root)).toEqual([["A1", "port 1"], ["A2", "port 2"]]);
    expect(macNow(root)).toBe("A2 → A1: learn A2 is on port 2; A1 known, so port 1 only");
    paintWidget(root, mactable, { macStage: 1 }, 3.4);
    expect(macNow(root)).toBe("A1 → A2: A2 known, so port 2 only");
  });

  it("once full, sends every frame out of one port, and off-network ones to the router", () => {
    const full = mount(mactable, { macStage: 2 });
    expect(macRows(full)).toEqual([["A1", "port 1"], ["A2", "port 2"], ["A3", "port 3"], ["router", "port 4"]]);
    expect(macNow(full)).toBe("every frame goes out of one port");
    expect(macNow(mount(mactable, { macStage: 3 }))).toBe("A1 → B1: another network, so the frame goes to the router's MAC, port 4");
  });
});

const routetable: BoardWidget = { kind: "custom", name: "routetable" };
const rtRows = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>(".tx-rt-row")].map((r) => [r.querySelector("em")!.textContent, r.querySelector("span")!.textContent, r.className.replace("tx-rt-row", "").trim()]);
const rtCap = (root: HTMLElement) => root.querySelector(".tx-rt-cap")!.textContent;

describe("routetable widget", () => {
  it("matches .200 against all three routes and picks the /25", () => {
    const root = mount(routetable, { destOutside: 0, destD: 200 });
    expect(rtRows(root)).toEqual([
      ["0.0.0.0/0", "→ R3", "match"],
      ["198.51.100.0/24", "→ R4", "match"],
      ["198.51.100.128/25", "→ R5", "match pick"],
    ]);
    expect(rtCap(root)).toBe("198.51.100.200: 3 routes match, /25 is longest → R5");
  });

  it("matches .42 against two and picks the /24", () => {
    const root = mount(routetable, { destOutside: 0, destD: 42 });
    expect(rtRows(root).map((r) => r[2])).toEqual(["match", "match pick", ""]);
    expect(rtCap(root)).toBe("198.51.100.42: 2 routes match, /24 is longest → R4");
  });

  it("falls back to the default route for anywhere else", () => {
    const root = mount(routetable, { destOutside: 1, destD: 42 });
    expect(rtRows(root).map((r) => r[2])).toEqual(["match pick", "", ""]);
    expect(rtCap(root)).toBe("203.0.113.9: only the default matches → R3");
  });
});

const traceroute: BoardWidget = { kind: "custom", name: "traceroute" };
const trLines = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>(".tx-tr-row")].filter((r) => !r.hidden).map((r) => r.textContent);

describe("traceroute widget", () => {
  const hops = { routeIdx: 2, traceHops: 4, trace1Ms: 1, trace2Ms: 8, trace3Ms: 26, trace4Ms: 27, trace5Ms: 0 };
  it("reveals one more hop per TTL", () => {
    const root = mount(traceroute, hops, 0.5);
    expect(trLines(root)).toEqual(["TTL 1R1 home router1 ms"]);
    paintWidget(root, traceroute, hops, 4.5);
    expect(trLines(root)).toEqual(["TTL 1R1 home router1 ms", "TTL 2R2 ISP8 ms", "TTL 3R526 ms", "TTL 4198.51.100.20027 ms"]);
  });

  it("names the far path's routers for the default route", () => {
    const root = mount(traceroute, { routeIdx: 0, traceHops: 5, trace1Ms: 1, trace2Ms: 8, trace3Ms: 22, trace4Ms: 118, trace5Ms: 121 }, 6);
    expect(trLines(root).slice(2)).toEqual(["TTL 3R3 backbone22 ms", "TTL 4R6 far away118 ms", "TTL 5203.0.113.9121 ms"]);
  });
});
