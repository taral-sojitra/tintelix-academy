import type { BoardFlow, SceneSpec } from "@tintelix/schema";

const TOP = 70;
const ROW = 48;
const H = 40;
/** The top of OSI layer n's row; TCP/IP boxes span the rows of the OSI layers they merge. */
const rowY = (n: number) => TOP + (7 - n) * ROW;
const span = (hi: number, lo: number) => ({ y: rowY(hi), h: rowY(lo) + H - rowY(hi) });
const mid = (hi: number, lo: number) => rowY(hi) + (rowY(lo) + H - rowY(hi)) / 2;

/** TCP/IP's four layers: id, name, protocols, and the OSI layers each covers. */
const FOUR: [string, string, string, number, number][] = [
  ["app", "Application", "HTTP, DNS", 7, 5],
  ["tr", "Transport", "TCP, UDP", 4, 4],
  ["net", "Internet", "IP", 3, 3],
  ["link", "Link", "Ethernet, Wi-Fi", 2, 1],
];
const OSI: [number, string][] = [[7, "Application"], [6, "Presentation"], [5, "Session"], [4, "Transport"], [3, "Network"], [2, "Data link"], [1, "Physical"]];

const host = (prefix: string, x: number): SceneSpec["nodes"] =>
  Object.fromEntries(FOUR.map(([id, name, sub, hi, lo]) => [`${prefix}${id}`, { x, ...span(hi, lo), w: 200, kind: "services" as const, label: name, sub, slim: true }]));

const SEND_X = 412;
const ROUTER_IN = 466;
const ROUTER_OUT = 654;
const RECV_X = 766;
const Y = { app: mid(7, 5), tr: mid(4, 4), net: mid(3, 3), link: mid(2, 1) };

const wires: SceneSpec["wires"] = {
  s_at: { from: [SEND_X, Y.app], to: [SEND_X, Y.tr], straight: true },
  s_tn: { from: [SEND_X, Y.tr], to: [SEND_X, Y.net], straight: true },
  s_nl: { from: [SEND_X, Y.net], to: [SEND_X, Y.link], straight: true },
  cable1: { from: [SEND_X, Y.link], to: [ROUTER_IN, Y.link], straight: true },
  g_up: { from: [ROUTER_IN, Y.link], to: [ROUTER_IN, Y.net], straight: true },
  g_over: { from: [ROUTER_IN, Y.net], to: [ROUTER_OUT, Y.net], straight: true },
  g_down: { from: [ROUTER_OUT, Y.net], to: [ROUTER_OUT, Y.link], straight: true },
  cable2: { from: [ROUTER_OUT, Y.link], to: [RECV_X, Y.link], straight: true },
  r_ln: { from: [RECV_X, Y.link], to: [RECV_X, Y.net], straight: true },
  r_nt: { from: [RECV_X, Y.net], to: [RECV_X, Y.tr], straight: true },
  r_ta: { from: [RECV_X, Y.tr], to: [RECV_X, Y.app], straight: true },
};

const TRIP: BoardFlow["path"] = [
  { wire: "s_at", dir: 1, at: "str" },
  { wire: "s_tn", dir: 1, at: "snet" },
  { wire: "s_nl", dir: 1, at: "slink" },
  { wire: "cable1", dir: 1, at: "glink" },
  { wire: "g_up", dir: 1, at: "gnet" },
  { wire: "g_over", dir: 1, at: "gnet" },
  { wire: "g_down", dir: 1, at: "glink" },
  { wire: "cable2", dir: 1, at: "rlink" },
  { wire: "r_ln", dir: 1, at: "rnet" },
  { wire: "r_nt", dir: 1, at: "rtr" },
  { wire: "r_ta", dir: 1, at: "rapp" },
];

/**
 * The TCP/IP model: OSI's seven layers as a reference on the far left, then your laptop's four layers,
 * a router that runs only the bottom two, and the server's four. Each TCP/IP box spans the OSI rows it
 * merges. A packet rides down the laptop, up into the router's Internet layer and back down, then up
 * the server.
 */
export const tcpIpScene: SceneSpec = {
  kind: "board",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 28, w: 984, h: 418 },
  regions: [
    { id: "osi", label: "OSI", x: 8, y: 34, w: 180, h: 380 },
    { id: "laptop", label: "Your laptop", x: 196, y: 34, w: 232, h: 380 },
    { id: "router", label: "A router", x: 450, y: 226, w: 220, h: 188 },
    { id: "server", label: "The server", x: 752, y: 34, w: 240, h: 380 },
  ],
  nodes: {
    ...Object.fromEntries(OSI.map(([n, name]) => [`o${n}`, { x: 20, y: rowY(n), w: 156, h: H, kind: "services" as const, label: `${n} ${name}`, sub: "", slim: true }])),
    ...host("s", 208),
    gnet: { x: 478, y: rowY(3), w: 164, h: H, kind: "services", label: "Internet", sub: "IP", slim: true },
    glink: { x: 478, ...span(2, 1), w: 164, kind: "services", label: "Link", sub: "Ethernet", slim: true },
    ...host("r", 780),
    tally: { x: 444, y: 46, w: 300, h: 172, kind: "curve", label: "Per trip", sub: "who reads what" },
  },
  wires,
  board: {
    legend: [["cyan", "your packet"], ["amber", "changed on the way"], ["green", "read at the end"], ["red", "dropped"]],
    flows: {
      trip: {
        from: "sapp",
        path: TRIP,
        color: "cyan",
        fail: { at: "gnet", share: "droppedPct" },
        floats: [
          { at: "gnet", text: "TTL − 1", color: "amber", chance: 0.5 },
          { at: "rlink", text: "new Ethernet header", color: "amber", chance: 1 },
          { at: "rapp", text: "HTTP read", color: "green", chance: 1 },
        ],
      },
    },
    modes: [
      {
        flows: [],
        tiles: [
          { id: "a", label: "TCP/IP layers", icon: "stack", hue: "cyan", value: "4", note: "what the internet runs" },
          { id: "b", label: "OSI layers", icon: "stack", hue: "violet", value: "7", note: "a model for talking" },
          { id: "c", label: "Merged", icon: "blocks", hue: "amber", value: "5–7 and 1–2", note: "into Application and Link" },
        ],
      },
      {
        flows: [{ flow: "trip", weight: 1 }],
        rate: 0.5,
        tiles: [
          { id: "a", label: "Router runs", icon: "stack", hue: "violet", value: "2 layers", note: "Internet and Link" },
          { id: "b", label: "Ethernet headers", icon: "spark", hue: "amber", value: "{linkWrites}", note: "a new one per link" },
          { id: "c", label: "TCP and HTTP read", icon: "check", hue: "green", value: "{endReads} times", note: "only at the two ends" },
        ],
      },
      {
        flows: [{ flow: "trip", weight: 1 }],
        rate: 0.5,
        tiles: [
          { id: "a", label: "Routers", icon: "shuffle", hue: "violet", value: "{hops}", note: "{links} links" },
          { id: "b", label: "TTL left", icon: "timer", hue: "amber", value: "{ttlLeft}", note: "starts at {ttl}", mood: "good", moodIf: { output: "droppedPct", above: 0, mood: "bad" } },
          { id: "c", label: "Layer visits", icon: "stack", hue: "cyan", value: "{layerVisits}", note: "4 at each end, 2 per router" },
        ],
      },
    ],
    widgets: {
      tally: [
        {
          kind: "log",
          lines: [
            { text: "Ethernet: new on each of {links} links" },
            { text: "IP: TTL − 1 at each router" },
            { text: "TCP, HTTP: read at the ends only" },
            { text: "TTL hit 0: packet dropped", when: { output: "droppedPct", above: 0 } },
          ],
        },
      ],
    },
  },
};
