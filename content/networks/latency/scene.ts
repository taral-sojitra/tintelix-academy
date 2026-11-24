import type { SceneSpec } from "@tintelix/schema";

const between = (stage: number) => ({ output: "mode", above: stage - 0.5, below: stage + 0.5 });

/**
 * Latency: a laptop in Mumbai, its first router, a long undersea cable (packets visibly slow on it),
 * the far router and a server in London. Below, the round trip's parts and the round trips a page load
 * pays.
 */
export const latencyScene: SceneSpec = {
  kind: "board",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 30, w: 984, h: 420 },
  nodes: {
    laptop: { x: 20, y: 70, w: 170, h: 76, kind: "users", label: "Laptop", sub: "Mumbai" },
    r1: { x: 230, y: 70, w: 130, h: 76, kind: "lb", label: "Routers", sub: "in India" },
    r2: { x: 640, y: 70, w: 130, h: 76, kind: "lb", label: "Routers", sub: "in Europe" },
    server: { x: 810, y: 70, w: 170, h: 76, kind: "origin", label: "Server", sub: "London" },
    budget: { x: 20, y: 186, w: 460, h: 262, kind: "curve", label: "One round trip", sub: "and what it's made of" },
    trips: { x: 500, y: 186, w: 480, h: 262, kind: "curve", label: "Loading the page", sub: "round trip by round trip" },
  },
  wires: {
    l_r1: { from: [190, 108], to: [230, 108] },
    cable: { from: [360, 108], to: [640, 108], pace: 0.35, label: "undersea fibre" },
    r2_s: { from: [770, 108], to: [810, 108] },
  },
  board: {
    legend: [["cyan", "request"], ["green", "reply"]],
    flows: {
      trip: {
        from: "laptop",
        path: [{ wire: "l_r1", dir: 1, at: "r1" }, { wire: "cable", dir: 1, at: "r2" }, { wire: "r2_s", dir: 1, at: "server" }],
        color: "cyan",
        back: "green",
      },
    },
    modes: [0, 1, 2, 3, 4].map((m) => ({
      flows: [{ flow: "trip", weight: 1 }],
      rate: 1.2,
      tiles: [
        [
          { id: "a", label: "Page load", icon: "timer", hue: "amber" as const, value: "{pageMs}", note: "London from Mumbai" },
          { id: "b", label: "Round trip", icon: "activity", hue: "cyan" as const, value: "{rttMs}", note: "there and back" },
          { id: "c", label: "Bandwidth used", icon: "gauge", hue: "violet" as const, value: "Hardly any", note: "it's mostly waiting" },
        ],
        [
          { id: "a", label: "One way", icon: "timer", hue: "cyan" as const, value: "{oneWayMs}", note: "{distanceKm} km at 200 km/ms" },
          { id: "b", label: "Round trip, at best", icon: "activity", hue: "violet" as const, value: "{propRttMs}", note: "no faster, ever" },
          { id: "c", label: "In a vacuum", icon: "bolt", hue: "amber" as const, value: "{vacuumOneWayMs}", note: "one way; glass is slower" },
        ],
        [
          { id: "a", label: "Router hops", icon: "shuffle", hue: "violet" as const, value: "{hopMs}", note: "{hops} each way" },
          { id: "b", label: "Queues", icon: "list", hue: "amber" as const, value: "{queueMs}", note: "waiting behind others" },
          { id: "c", label: "Distance's share", icon: "gauge", hue: "cyan" as const, value: "{propPct}", note: "of {rttMs}" },
        ],
        [
          { id: "a", label: "Round trips first", icon: "list", hue: "violet" as const, value: "{roundsFirst}", note: "DNS, TCP, TLS, request" },
          { id: "b", label: "First byte", icon: "timer", hue: "amber" as const, value: "{firstByteMs}", note: "before anything shows" },
          { id: "c", label: "Whole page", icon: "timer", hue: "cyan" as const, value: "{pageMs}", note: "{roundsPage} round trips" },
        ],
        [
          { id: "a", label: "Edge server", icon: "target", hue: "green" as const, value: "{edgeKm} km", note: "a CDN copy nearby" },
          { id: "b", label: "Its round trip", icon: "activity", hue: "cyan" as const, value: "{edgeRttMs}", note: "vs {rttMs}", mood: "good" as const },
          { id: "c", label: "Page from the edge", icon: "timer", hue: "violet" as const, value: "{edgePageMs}", note: "vs {pageMs}", mood: "good" as const },
        ],
      ][m]!,
    })),
    subs: { budget: "{rttMs} there and back", trips: "{roundsPage} round trips, {pageMs}" },
    widgets: {
      budget: [
        {
          kind: "bars",
          rows: [
            { label: "distance", output: "propRttMs", max: 300 },
            { label: "router hops", output: "hopMs", max: 300 },
            { label: "queues", output: "queueMs", max: 300 },
          ],
        },
        { kind: "text", text: "{propRttMs} distance + {hopMs} hops + {queueMs} queues = {rttMs}" },
      ],
      trips: [
        {
          kind: "log",
          lines: [
            { text: "1 · DNS lookup: {rttMs}" },
            { text: "2 · TCP handshake: {rttMs}" },
            { text: "3 · TLS handshake: {rttMs}" },
            { text: "4 · the request, first byte back: {rttMs}" },
            { text: "5–6 · the page's other files: {rttMs} each" },
            { text: "first byte {firstByteMs}, page {pageMs}", when: { output: "mode", below: 3.5 } },
            { text: "from an edge {edgeKm} km away: {edgePageMs}", when: between(4) },
          ],
        },
      ],
    },
  },
};
