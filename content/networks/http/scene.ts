import type { BoardFlow, SceneSpec } from "@tintelix/schema";

const lane = (n: number, color: BoardFlow["color"], extra: Partial<BoardFlow> = {}): BoardFlow => ({
  from: `b${n}`,
  path: [{ wire: `w${n}`, dir: 1, at: `s${n}` }],
  color,
  back: "green",
  small: n > 1,
  ...extra,
});

/**
 * HTTP and HTTPS: three lanes, each a browser and the same site. HTTP/1.1 sends one request at a time
 * on each of 6 connections; HTTP/2 sends many streams at once on one TCP connection; HTTP/3 does the
 * same over QUIC on UDP. Below, the page load in round trips for each.
 */
export const httpScene: SceneSpec = {
  kind: "board",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 26, w: 984, h: 426 },
  regions: [
    { id: "r1", label: "HTTP/1.1", x: 8, y: 28, w: 984, h: 84 },
    { id: "r2", label: "HTTP/2", x: 8, y: 118, w: 984, h: 84 },
    { id: "r3", label: "HTTP/3", x: 8, y: 208, w: 984, h: 84 },
  ],
  nodes: {
    b1: { x: 110, y: 44, w: 200, h: 56, kind: "users", label: "Browser", sub: "6 connections" },
    s1: { x: 760, y: 44, w: 210, h: 56, kind: "origin", label: "example.com", sub: "TCP + TLS" },
    b2: { x: 110, y: 134, w: 200, h: 56, kind: "users", label: "Browser", sub: "1 connection" },
    s2: { x: 760, y: 134, w: 210, h: 56, kind: "origin", label: "example.com", sub: "TCP + TLS" },
    b3: { x: 110, y: 224, w: 200, h: 56, kind: "users", label: "Browser", sub: "1 connection" },
    s3: { x: 760, y: 224, w: 210, h: 56, kind: "origin", label: "example.com", sub: "QUIC on UDP" },
    load: { x: 20, y: 298, w: 960, h: 152, kind: "curve", label: "Loading the page", sub: "{resources} files after the HTML" },
  },
  wires: {
    w1: { from: [310, 72], to: [760, 72], label: "one request at a time per connection" },
    w2: { from: [310, 162], to: [760, 162], label: "many streams at once" },
    w3: { from: [310, 252], to: [760, 252], label: "streams that don't block each other" },
  },
  board: {
    legend: [["cyan", "request"], ["violet", "another stream"], ["amber", "another stream"], ["green", "response"]],
    flows: {
      h1: lane(1, "cyan"),
      h2a: lane(2, "cyan"),
      h2b: lane(2, "violet"),
      h2c: lane(2, "amber"),
      h3a: lane(3, "cyan"),
      h3b: lane(3, "violet"),
      h3c: lane(3, "amber"),
    },
    modes: [0, 1, 2, 3, 4].map((m) => ({
      flows: [
        { flow: "h1", weight: 2 },
        ...["h2a", "h2b", "h2c"].map((flow) => ({ flow, weight: "h2On" })),
        ...["h3a", "h3b", "h3c"].map((flow) => ({ flow, weight: "h3On" })),
      ],
      rate: m < 2 ? 1 : m < 3 ? 6 : 9,
      tiles: [
        [
          { id: "a", label: "Files on the page", icon: "blocks", hue: "violet" as const, value: "{resources} + 1", note: "the HTML, then the rest" },
          { id: "b", label: "Each request", icon: "timer", hue: "amber" as const, value: "≥ {rttMs}", note: "at least a round trip" },
          { id: "c", label: "HTTP/1.1 load", icon: "timer", hue: "cyan" as const, value: "{h1Ms}", note: "{h1Rounds} rounds of 6" },
        ],
        [
          { id: "a", label: "Connections", icon: "shuffle", hue: "violet" as const, value: "{h1Conns}", note: "per site" },
          { id: "b", label: "Rounds of requests", icon: "list", hue: "amber" as const, value: "{h1Rounds}", note: "{resources} files ÷ 6" },
          { id: "c", label: "HTTP/1.1 load", icon: "timer", hue: "cyan" as const, value: "{h1Ms}", note: "" },
        ],
        [
          { id: "a", label: "Connections", icon: "shuffle", hue: "violet" as const, value: "1", note: "every file a stream" },
          { id: "b", label: "HTTP/2 load", icon: "timer", hue: "cyan" as const, value: "{h2Ms}", note: "vs {h1Ms}" },
          { id: "c", label: "Faster by", icon: "gauge", hue: "green" as const, value: "{h2SavedPct}", note: "than HTTP/1.1" },
        ],
        [
          { id: "a", label: "Setup", icon: "timer", hue: "amber" as const, value: "1 round trip", note: "QUIC + TLS together" },
          { id: "b", label: "HTTP/3 load", icon: "timer", hue: "cyan" as const, value: "{h3Ms}", note: "vs {h2Ms} on HTTP/2" },
          { id: "c", label: "Faster by", icon: "gauge", hue: "green" as const, value: "{h3SavedPct}", note: "than HTTP/1.1" },
        ],
        [
          { id: "a", label: "HTTP/1.1", icon: "timer", hue: "amber" as const, value: "{h1Ms}", note: "6 connections" },
          { id: "b", label: "HTTP/2", icon: "timer", hue: "violet" as const, value: "{h2Ms}", note: "1 connection" },
          { id: "c", label: "HTTP/3", icon: "timer", hue: "cyan" as const, value: "{h3Ms}", note: "over QUIC" },
        ],
      ][m]!,
    })),
    widgets: { load: [{ kind: "custom", name: "waterfall" }] },
    subs: { load: "{resources} files after the HTML" },
  },
};
