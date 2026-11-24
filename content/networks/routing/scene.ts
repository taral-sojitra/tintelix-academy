import type { SceneSpec } from "@tintelix/schema";

const START = [{ wire: "r1_r2", dir: 1 as const, at: "r2" }];

/**
 * Routing: your home router R1 hands everything to the ISP's R2, which picks a next hop from its table:
 * R3 towards the rest of the internet, R4 for 198.51.100.0/24, R5 for its upper half. Below, R2's table
 * and traceroute's view of the chosen path.
 */
export const routingScene: SceneSpec = {
  kind: "board",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 26, w: 984, h: 426 },
  nodes: {
    r1: { x: 20, y: 108, w: 160, h: 56, kind: "lb", label: "R1", sub: "home router" },
    r2: { x: 230, y: 108, w: 150, h: 56, kind: "lb", label: "R2", sub: "your ISP" },
    r3: { x: 450, y: 34, w: 150, h: 56, kind: "lb", label: "R3", sub: "backbone" },
    r6: { x: 650, y: 34, w: 130, h: 56, kind: "lb", label: "R6", sub: "far away" },
    srvX: { x: 820, y: 34, w: 160, h: 56, kind: "origin", label: "Server", sub: "203.0.113.9" },
    r4: { x: 450, y: 108, w: 150, h: 56, kind: "lb", label: "R4", sub: "100.0/24" },
    srvA: { x: 820, y: 108, w: 160, h: 56, kind: "origin", label: "Server", sub: "…100.42" },
    r5: { x: 450, y: 182, w: 150, h: 56, kind: "lb", label: "R5", sub: "100.128/25" },
    srvB: { x: 820, y: 182, w: 160, h: 56, kind: "origin", label: "Server", sub: "…100.200" },
    table: { x: 20, y: 252, w: 470, h: 198, kind: "curve", label: "R2's routing table", sub: "longest match wins" },
    trace: { x: 510, y: 252, w: 470, h: 198, kind: "curve", label: "traceroute", sub: "TTL 1, 2, 3…" },
  },
  wires: {
    r1_r2: { from: [180, 136], to: [230, 136] },
    r2_r3: { from: [380, 124], to: [450, 62] },
    r2_r4: { from: [380, 136], to: [450, 136] },
    r2_r5: { from: [380, 148], to: [450, 210] },
    r3_r6: { from: [600, 62], to: [650, 62] },
    r6_x: { from: [780, 62], to: [820, 62] },
    r4_a: { from: [600, 136], to: [820, 136] },
    r5_b: { from: [600, 210], to: [820, 210] },
  },
  board: {
    legend: [["cyan", "packet"], ["green", "reply"]],
    flows: {
      viaR3: {
        from: "r1",
        path: [...START, { wire: "r2_r3", dir: 1, at: "r3" }, { wire: "r3_r6", dir: 1, at: "r6" }, { wire: "r6_x", dir: 1, at: "srvX" }],
        color: "cyan",
        back: "green",
        float: { at: "r2", text: "only /0 matches", color: "amber", chance: 0.4 },
      },
      viaR4: {
        from: "r1",
        path: [...START, { wire: "r2_r4", dir: 1, at: "r4" }, { wire: "r4_a", dir: 1, at: "srvA" }],
        color: "cyan",
        back: "green",
        float: { at: "r2", text: "/24 wins", color: "green", chance: 0.4 },
      },
      viaR5: {
        from: "r1",
        path: [...START, { wire: "r2_r5", dir: 1, at: "r5" }, { wire: "r5_b", dir: 1, at: "srvB" }],
        color: "cyan",
        back: "green",
        float: { at: "r2", text: "/25 wins", color: "green", chance: 0.4 },
      },
    },
    modes: [0, 1, 2, 3, 4].map((m) => ({
      flows: [{ flow: "viaR3", weight: "toR3Pct" }, { flow: "viaR4", weight: "toR4Pct" }, { flow: "viaR5", weight: "toR5Pct" }],
      rate: 1.2,
      tiles: [
        [
          { id: "a", label: "Networks crossed", icon: "shuffle", hue: "violet" as const, value: "Several", note: "each run by someone else" },
          { id: "b", label: "Knows the whole path", icon: "alert", hue: "amber" as const, value: "Nobody", note: "not even your ISP" },
          { id: "c", label: "Each router knows", icon: "target", hue: "cyan" as const, value: "The next hop", note: "like a road sign" },
        ],
        [
          { id: "a", label: "Routes that match", icon: "list", hue: "violet" as const, value: "{matchCount}", note: "of 3 in R2's table" },
          { id: "b", label: "Longest wins", icon: "target", hue: "green" as const, value: "/{chosenPrefix}", note: "the most specific" },
          { id: "c", label: "Trip", icon: "timer", hue: "cyan" as const, value: "{totalMs}", note: "{traceHops} hops" },
        ],
        [
          { id: "a", label: "Hops", icon: "activity", hue: "violet" as const, value: "{traceHops}", note: "each looks up its own table" },
          { id: "b", label: "Planned ahead", icon: "alert", hue: "amber" as const, value: "Nothing", note: "decided one hop at a time" },
          { id: "c", label: "Tables built by", icon: "shuffle", hue: "cyan" as const, value: "Neighbours", note: "routers telling routers" },
        ],
        [
          { id: "a", label: "Destination", icon: "target", hue: "violet" as const, value: "203.0.113.9", note: "not in any specific route" },
          { id: "b", label: "Route used", icon: "shuffle", hue: "amber" as const, value: "/0", note: "the default: everything else" },
          { id: "c", label: "Trip", icon: "timer", hue: "cyan" as const, value: "{totalMs}", note: "{traceHops} hops" },
        ],
        [
          { id: "a", label: "Hops found", icon: "activity", hue: "violet" as const, value: "{traceHops}", note: "one per TTL" },
          { id: "b", label: "Farthest", icon: "timer", hue: "cyan" as const, value: "{totalMs}", note: "the server itself" },
          { id: "c", label: "The trick", icon: "bulb", hue: "amber" as const, value: "TTL 1, 2, 3…", note: "each router that drops it answers" },
        ],
      ][m]!,
    })),
    widgets: { table: [{ kind: "custom", name: "routetable" }], trace: [{ kind: "custom", name: "traceroute" }] },
  },
};
