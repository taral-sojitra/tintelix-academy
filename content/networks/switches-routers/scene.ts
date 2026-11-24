import type { BoardFlow, SceneSpec } from "@tintelix/schema";

const hop = (wire: string, at: string, dir: 1 | -1 = 1) => ({ wire, dir, at });
const flow = (from: string, path: BoardFlow["path"], color: BoardFlow["color"], extra: Partial<BoardFlow> = {}): BoardFlow => ({ from, path, color, ...extra });
const seq = (...names: string[]) => names.map((f) => ({ flow: f, weight: 1 }));

/**
 * Switches vs routers: network A (10.0.1.0/24) on the left with three hosts on switch A, network B
 * (10.0.2.0/24) on the right with two hosts on switch B, and the router joining them. Below, switch
 * A's MAC table.
 */
export const switchScene: SceneSpec = {
  kind: "board",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 26, w: 984, h: 426 },
  regions: [
    { id: "netA", label: "Network A · 10.0.1.0/24", x: 8, y: 28, w: 458, h: 270 },
    { id: "netB", label: "Network B · 10.0.2.0/24", x: 534, y: 28, w: 458, h: 270 },
  ],
  nodes: {
    a1: { x: 20, y: 60, w: 160, h: 64, kind: "users", label: "A1 .11", sub: "port 1" },
    a2: { x: 20, y: 140, w: 160, h: 64, kind: "users", label: "A2 .12", sub: "port 2" },
    a3: { x: 20, y: 220, w: 160, h: 64, kind: "users", label: "A3 .13", sub: "port 3" },
    swA: { x: 236, y: 136, w: 170, h: 72, kind: "services", label: "Switch A", sub: "reads MACs" },
    router: { x: 430, y: 128, w: 140, h: 88, kind: "lb", label: "Router", sub: "reads IPs" },
    swB: { x: 598, y: 136, w: 170, h: 72, kind: "services", label: "Switch B", sub: "reads MACs" },
    b1: { x: 820, y: 96, w: 160, h: 64, kind: "users", label: "B1 .21", sub: "10.0.2.21" },
    b2: { x: 820, y: 186, w: 160, h: 64, kind: "users", label: "B2 .22", sub: "10.0.2.22" },
    table: { x: 20, y: 310, w: 960, h: 138, kind: "curve", label: "Switch A's MAC table", sub: "which port each address is on" },
  },
  wires: {
    a1_s: { from: [180, 92], to: [236, 160] },
    a2_s: { from: [180, 172], to: [236, 172] },
    a3_s: { from: [180, 252], to: [236, 184] },
    s_r: { from: [406, 172], to: [430, 172] },
    r_sb: { from: [570, 172], to: [598, 172] },
    sb_b1: { from: [768, 160], to: [820, 128] },
    sb_b2: { from: [768, 184], to: [820, 218] },
  },
  board: {
    legend: [["cyan", "frame"], ["amber", "flooded copy"], ["green", "reply"], ["violet", "to another network"]],
    flows: {
      toA2: flow("a1", [hop("a1_s", "swA"), hop("a2_s", "a2", -1)], "cyan"),
      floodA3: flow("a1", [hop("a1_s", "swA"), hop("a3_s", "a3", -1)], "amber", { float: { at: "a3", text: "not for me", color: "amber", chance: 1 } }),
      floodR: flow("a1", [hop("a1_s", "swA"), hop("s_r", "router")], "amber"),
      toA1: flow("a2", [hop("a2_s", "swA"), hop("a1_s", "a1", -1)], "green"),
      a3toA1: flow("a3", [hop("a3_s", "swA"), hop("a1_s", "a1", -1)], "cyan", { back: "green" }),
      a2toA3: flow("a2", [hop("a2_s", "swA"), hop("a3_s", "a3", -1)], "cyan", { back: "green" }),
      toB1: flow("a1", [hop("a1_s", "swA"), hop("s_r", "router"), hop("r_sb", "swB"), hop("sb_b1", "b1")], "violet", {
        back: "green",
        float: { at: "router", text: "TTL − 1, new frame", color: "violet", chance: 0.5 },
      }),
      b2toA2: flow("b2", [hop("sb_b2", "swB", -1), hop("r_sb", "router", -1), hop("s_r", "swA", -1), hop("a2_s", "a2", -1)], "violet", { back: "green" }),
    },
    modes: [
      {
        flows: [{ flow: "a3toA1", weight: 1 }, { flow: "a2toA3", weight: 1 }, { flow: "toB1", weight: 1 }],
        rate: 1.5,
        tiles: [
          { id: "a", label: "Networks", icon: "blocks", hue: "violet", value: "2", note: "10.0.1.0/24 and 10.0.2.0/24" },
          { id: "b", label: "Inside each", icon: "stack", hue: "cyan", value: "A switch", note: "layer 2, MAC addresses" },
          { id: "c", label: "Between them", icon: "shuffle", hue: "amber", value: "A router", note: "layer 3, IP addresses" },
        ],
      },
      {
        flows: seq("toA2", "floodA3", "floodR", "toA1", "toA2"),
        sequence: true,
        rate: 1.6,
        tiles: [
          { id: "a", label: "Learns from", icon: "target", hue: "cyan", value: "Source MACs", note: "of every frame" },
          { id: "b", label: "Unknown destination", icon: "users", hue: "amber", value: "Flood", note: "out of every port" },
          { id: "c", label: "Known destination", icon: "check", hue: "green", value: "One port", note: "only where it lives" },
        ],
      },
      {
        flows: [{ flow: "a3toA1", weight: 1 }, { flow: "a2toA3", weight: 1 }],
        rate: 2,
        tiles: [
          { id: "a", label: "Hub copies a frame", icon: "alert", hue: "amber", value: "{hubCopies} times", note: "to every other port", mood: "bad" },
          { id: "b", label: "Switch copies it", icon: "check", hue: "green", value: "{switchCopies} time", note: "to the right port", mood: "good" },
          { id: "c", label: "Hub copies wasted", icon: "gauge", hue: "violet", value: "{wastedPct}", note: "{devices} devices" },
        ],
      },
      {
        flows: [{ flow: "toB1", weight: 2 }, { flow: "b2toA2", weight: 1 }],
        rate: 1.5,
        tiles: [
          { id: "a", label: "A1 to B1", icon: "shuffle", hue: "violet", value: "Via the router", note: "the mask says: another network" },
          { id: "b", label: "Router hops", icon: "activity", hue: "cyan", value: "{routerHops}", note: "TTL down by {ttlDrop}" },
          { id: "c", label: "Ethernet header", icon: "spark", hue: "amber", value: "Rewritten", note: "new MACs for network B" },
        ],
      },
      {
        flows: [{ flow: "a3toA1", weight: 1 }, { flow: "a2toA3", weight: 1 }, { flow: "toB1", weight: 1 }, { flow: "b2toA2", weight: 1 }],
        rate: 2,
        tiles: [
          { id: "a", label: "Switch", icon: "stack", hue: "cyan", value: "Layer 2", note: "MACs, inside a network" },
          { id: "b", label: "Router", icon: "shuffle", hue: "violet", value: "Layer 3", note: "IPs, between networks" },
          { id: "c", label: "Broadcasts", icon: "alert", hue: "amber", value: "Stop at routers", note: "so they stay local" },
        ],
      },
    ],
    widgets: { table: [{ kind: "custom", name: "mactable" }] },
  },
};
