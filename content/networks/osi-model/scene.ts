import type { BoardFlow, SceneSpec } from "@tintelix/schema";

/** The seven layers, top to bottom: number, name and the protocols that live there. */
const LAYERS: [number, string, string][] = [
  [7, "Application", "HTTP, DNS"],
  [6, "Presentation", "TLS"],
  [5, "Session", "sessions"],
  [4, "Transport", "TCP, UDP"],
  [3, "Network", "IP"],
  [2, "Data link", "Ethernet, Wi-Fi"],
  [1, "Physical", "bits"],
];
const TOP = 70;
const ROW = 48;
const H = 40;
/** The middle of layer n's box, top to bottom. */
const midY = (n: number) => TOP + (7 - n) * ROW + H / 2;
/** The rails the message rides: down beside the sender's stack, up beside the receiver's. */
const SEND_X = 252;
const RECV_X = 748;

const stack = (prefix: "s" | "r", x: number): SceneSpec["nodes"] =>
  Object.fromEntries(
    LAYERS.map(([n, name, sub]) => [`${prefix}${n}`, { x, y: TOP + (7 - n) * ROW, w: 220, h: H, kind: "services" as const, label: `${n} ${name}`, sub, slim: true }]),
  );

const wires: SceneSpec["wires"] = { cable: { from: [SEND_X, midY(1)], to: [RECV_X, midY(1)], straight: true, label: "cable, fibre or radio" } };
for (let n = 7; n > 1; n--) wires[`d${n}${n - 1}`] = { from: [SEND_X, midY(n)], to: [SEND_X, midY(n - 1)], straight: true };
for (let n = 1; n < 7; n++) wires[`u${n}${n + 1}`] = { from: [RECV_X, midY(n)], to: [RECV_X, midY(n + 1)], straight: true };

const DOWN: BoardFlow["path"] = [6, 5, 4, 3, 2, 1].map((n) => ({ wire: `d${n + 1}${n}`, dir: 1 as const, at: `s${n}` }));
const TRIP: BoardFlow["path"] = [...DOWN, { wire: "cable", dir: 1, at: "r1" }, ...[2, 3, 4, 5, 6, 7].map((n) => ({ wire: `u${n - 1}${n}`, dir: 1 as const, at: `r${n}` }))];

/**
 * The OSI model: the sender's seven layers on the left, the receiver's on the right, and the cable
 * between their physical layers. A message rides down the sender's stack, across, and up the
 * receiver's; the box in the middle shows what each layer sees of it.
 */
export const osiScene: SceneSpec = {
  kind: "board",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 28, w: 984, h: 418 },
  regions: [
    { id: "laptop", label: "Your laptop", x: 8, y: 34, w: 262, h: 380 },
    { id: "server", label: "The server", x: 730, y: 34, w: 262, h: 380 },
  ],
  nodes: {
    ...stack("s", 20),
    ...stack("r", 760),
    frame: { x: 292, y: 56, w: 416, h: 232, kind: "curve", label: "What each layer sees", sub: "one segment of the message" },
  },
  wires,
  board: {
    legend: [["cyan", "your message"], ["amber", "header added"], ["green", "header removed"]],
    flows: {
      down: {
        from: "s7",
        path: DOWN,
        color: "cyan",
        floats: [
          { at: "s4", text: "+ TCP header", color: "amber", chance: 1 },
          { at: "s3", text: "+ IP header", color: "amber", chance: 1 },
          { at: "s2", text: "+ Ethernet header", color: "amber", chance: 1 },
        ],
      },
      trip: { from: "s7", path: TRIP, color: "cyan", float: { at: "r1", text: "bits arrive", color: "cyan", chance: 1 } },
      tripUp: {
        from: "s7",
        path: TRIP,
        color: "cyan",
        floats: [
          { at: "r2", text: "− Ethernet header", color: "green", chance: 1 },
          { at: "r3", text: "− IP header", color: "green", chance: 1 },
          { at: "r4", text: "− TCP header", color: "green", chance: 1 },
        ],
      },
      tripNamed: {
        from: "s7",
        path: TRIP,
        color: "cyan",
        floats: [
          { at: "s4", text: "TCP", color: "amber", chance: 1 },
          { at: "s3", text: "IP", color: "amber", chance: 1 },
          { at: "s2", text: "Ethernet", color: "amber", chance: 1 },
          { at: "r7", text: "HTTP", color: "green", chance: 1 },
        ],
      },
      tripPlain: { from: "s7", path: TRIP, color: "cyan" },
    },
    modes: [
      {
        flows: [],
        tiles: [
          { id: "a", label: "Layers", icon: "stack", hue: "violet", value: "7", note: "each does one job" },
          { id: "b", label: "Your message", icon: "spark", hue: "cyan", value: "{payloadBytes} bytes", note: "an HTTP request" },
          { id: "c", label: "Rule", icon: "list", hue: "green", value: "Talk only to neighbours", note: "the layer above and below" },
        ],
      },
      {
        flows: [{ flow: "down", weight: 1 }],
        rate: 0.6,
        tiles: [
          { id: "a", label: "Headers added", icon: "stack", hue: "amber", value: "3", note: "TCP, IP, Ethernet" },
          { id: "b", label: "Largest segment", icon: "blocks", hue: "cyan", value: "{mss} bytes", note: "MTU {mtu} less 40" },
          { id: "c", label: "First frame", icon: "spark", hue: "violet", value: "{frameBytes} bytes", note: "{headerPerSeg} of them headers" },
        ],
      },
      {
        flows: [{ flow: "trip", weight: 1 }],
        rate: 0.5,
        tiles: [
          { id: "a", label: "Frames", icon: "blocks", hue: "cyan", value: "{segments}", note: "one per segment" },
          { id: "b", label: "On the wire", icon: "activity", hue: "violet", value: "{wireBytes} bytes", note: "{payloadBytes} of them yours" },
          { id: "c", label: "Physical layer", icon: "bolt", hue: "amber", value: "Bits", note: "voltage, light or radio" },
        ],
      },
      {
        flows: [{ flow: "tripUp", weight: 1 }],
        rate: 0.5,
        tiles: [
          { id: "a", label: "Headers removed", icon: "stack", hue: "green", value: "3", note: "in reverse order" },
          { id: "b", label: "Each layer reads", icon: "target", hue: "violet", value: "Its own header", note: "written by its peer" },
          { id: "c", label: "Delivered", icon: "check", hue: "cyan", value: "{payloadBytes} bytes", note: "the message, rebuilt" },
        ],
      },
      {
        flows: [{ flow: "tripNamed", weight: 1 }],
        rate: 0.5,
        tiles: [
          { id: "a", label: "Layer 7", icon: "spark", hue: "green", value: "HTTP", note: "what you asked for" },
          { id: "b", label: "Layer 4", icon: "shuffle", hue: "cyan", value: "TCP", note: "reliable, in order" },
          { id: "c", label: "Layer 3", icon: "target", hue: "violet", value: "IP", note: "addresses, routing" },
        ],
      },
      {
        flows: [{ flow: "tripPlain", weight: 1 }],
        rate: 1,
        tiles: [
          { id: "a", label: "Segments", icon: "blocks", hue: "cyan", value: "{segments}", note: "up to {mss} bytes each" },
          { id: "b", label: "Header bytes", icon: "stack", hue: "amber", value: "{headerBytes}", note: "{headerPerSeg} per segment" },
          { id: "c", label: "Overhead", icon: "gauge", hue: "violet", value: "{overheadPct}", note: "of {wireBytes} bytes sent" },
        ],
      },
    ],
    widgets: { frame: [{ kind: "custom", name: "headers" }] },
  },
};
