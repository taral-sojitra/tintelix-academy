import type { SceneSpec } from "@tintelix/schema";

type Hop = [string, 1 | -1, string];
const path = (...hops: Hop[]) => hops.map(([wire, dir, at]) => ({ wire, dir, at }));

/**
 * Phones on the left. Along the top, map tiles: first a renderer drawing each on request, later a CDN in the
 * same place with a tile store behind it. Along the bottom, routing over the road graph, fed by live traffic.
 */
export const mapsScene: SceneSpec = {
  kind: "board",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 28, w: 984, h: 418 },
  nodes: {
    phones: { x: 16, y: 190, w: 150, h: 90, kind: "users", label: "Phones", sub: "map open" },
    renderer: { x: 230, y: 34, w: 230, h: 150, kind: "app", label: "Tile renderer", sub: "draws on request" },
    cdn: { x: 230, y: 34, w: 230, h: 150, kind: "edge", label: "CDN", sub: "tiles near you", hidden: true },
    store: { x: 540, y: 44, w: 230, h: 120, kind: "origin", label: "Tile store", sub: "zoom/x/y files", hidden: true },
    traffic: { x: 230, y: 204, w: 230, h: 80, kind: "services", label: "Live traffic", sub: "speeds by road", hidden: true },
    route: { x: 230, y: 320, w: 230, h: 96, kind: "app", label: "Routing", sub: "fastest path", hidden: true },
    graph: { x: 540, y: 206, w: 444, h: 230, kind: "services", label: "Road graph", sub: "intersections and roads", hidden: true },
  },
  wires: {
    p_t: { from: [166, 220], to: [230, 120] },
    c_s: { from: [460, 104], to: [540, 104] },
    p_x: { from: [166, 244], to: [230, 244] },
    x_g: { from: [460, 244], to: [540, 262] },
    p_r: { from: [166, 268], to: [230, 362] },
    r_g: { from: [460, 368], to: [540, 368] },
  },
  board: {
    legend: [["cyan", "tile, route or ping"], ["green", "answered"], ["red", "too slow"]],
    flows: {
      tileDraw: { from: "phones", path: path(["p_t", 1, "renderer"]), color: "cyan", small: true, back: "green", fail: { at: "renderer", share: "renderFailPct" } },
      tileHit: { from: "phones", path: path(["p_t", 1, "cdn"]), color: "cyan", small: true, back: "green" },
      tileMiss: { from: "phones", path: path(["p_t", 1, "cdn"], ["c_s", 1, "store"]), color: "cyan", small: true, back: "green" },
      routeSlow: { from: "phones", path: path(["p_r", 1, "route"], ["r_g", 1, "graph"]), color: "cyan", back: "green", fail: { at: "graph", share: "routeFailPct" } },
      routeFast: {
        from: "phones",
        path: path(["p_r", 1, "route"], ["r_g", 1, "graph"]),
        color: "cyan",
        back: "green",
        float: { at: "graph", text: "route in 0.5 ms", color: "green", chance: 0.12 },
      },
      ping: { from: "phones", path: path(["p_x", 1, "traffic"], ["x_g", 1, "graph"]), color: "cyan", small: true },
    },
    modes: [
      {
        flows: [],
        tiles: [
          { id: "a", label: "Tile requests", icon: "activity", hue: "cyan", value: "{tileRate}/s", note: "{mapUsersM} million maps open" },
          { id: "b", label: "Route requests", icon: "target", hue: "violet", value: "{routeRate}/s", note: "fastest way, with traffic" },
          { id: "c", label: "Tile traffic", icon: "gauge", hue: "amber", value: "{tileGBs} GB/s", note: "{tileKb} KB a tile" },
        ],
      },
      {
        flows: [{ flow: "tileDraw", weight: 1 }],
        rate: 4,
        tiles: [
          { id: "a", label: "Tiles drawn", icon: "activity", hue: "cyan", value: "{renderRate}/s", note: "launch traffic" },
          { id: "b", label: "Renderers busy", icon: "server", hue: "violet", value: "{renderBusyPct}", note: "{renderCapacity} tiles a second", mood: "good", moodIf: { output: "renderBusyPct", above: 100, mood: "bad" } },
          { id: "c", label: "Same tile asked", icon: "replay", hue: "amber", value: "redrawn", note: "every single time" },
        ],
      },
      {
        flows: [{ flow: "tileDraw", weight: 1 }],
        rate: 8,
        tiles: [
          { id: "a", label: "Tiles drawn", icon: "activity", hue: "cyan", value: "{renderRate}/s", note: "the busiest hour" },
          { id: "b", label: "Renderers busy", icon: "server", hue: "violet", value: "{renderBusyPct}", note: "{renderFailPct} of tiles fail", mood: "good", moodIf: { output: "renderBusyPct", above: 100, mood: "bad" } },
          { id: "c", label: "The map changes", icon: "hourglass", hue: "amber", value: "slowly", note: "same tiles, over and over" },
        ],
      },
      {
        flows: [{ flow: "tileHit", weight: "cdnHitPct" }, { flow: "tileMiss", weight: "cdnMissPct" }],
        rate: 8,
        tiles: [
          { id: "a", label: "From the CDN", icon: "edge", hue: "green", value: "{cdnHitPct}", note: "near each phone", mood: "good" },
          { id: "b", label: "Store reads", icon: "db", hue: "cyan", value: "{originRate}/s", note: "only the misses" },
          { id: "c", label: "Tiles at zoom 16", icon: "blocks", hue: "violet", value: "{tilesB} billion", note: "{tileKm} km across each" },
        ],
      },
      {
        flows: [{ flow: "tileHit", weight: 4 }, { flow: "routeSlow", weight: 3 }],
        rate: 7,
        tiles: [
          { id: "a", label: "Searched per route", icon: "target", hue: "cyan", value: "{naiveExplored}", note: "{tripKm} km trip, every road" },
          { id: "b", label: "Cores needed", icon: "server", hue: "violet", value: "{coresNaive}", note: "{naiveMs} a route" },
          { id: "c", label: "Routing busy", icon: "alert", hue: "amber", value: "{routeBusyPct}", note: "{routeFailPct} of routes fail", mood: "good", moodIf: { output: "routeBusyPct", above: 100, mood: "bad" } },
        ],
      },
      {
        flows: [{ flow: "tileHit", weight: 4 }, { flow: "routeFast", weight: 3 }, { flow: "ping", weight: 3 }],
        rate: 8,
        tiles: [
          { id: "a", label: "Searched per route", icon: "target", hue: "green", value: "{hierExplored}", note: "{exploredRatio}× fewer", mood: "good" },
          { id: "b", label: "Cores needed", icon: "server", hue: "violet", value: "{coresHier}", note: "{hierMs} a route", mood: "good" },
          { id: "c", label: "Traffic pings", icon: "activity", hue: "cyan", value: "{pingRate}/s", note: "{navigatingM} million navigating" },
        ],
      },
    ],
    widgets: {
      renderer: [
        { kind: "meter", output: "renderBusyPct", max: 100, text: "{renderBusyPct} busy" },
        { kind: "text", text: "Too slow: {renderFailPct}", when: { output: "renderFailPct", above: 0 } },
      ],
      cdn: [
        { kind: "meter", output: "cdnHitPct", max: 100, text: "{cdnHitPct} served here" },
      ],
      store: [{ kind: "text", text: "up to {storageTb} TB, drawn ahead" }],
      graph: [
        { kind: "custom", name: "roadgraph" },
        { kind: "meter", output: "routeBusyPct", max: 100, text: "{routeBusyPct} busy" },
      ],
    },
    states: [
      { node: "renderer", cls: "tx-hot", when: { output: "renderBusyPct", above: 100 } },
      { node: "graph", cls: "tx-hot", when: { output: "routeBusyPct", above: 100 } },
    ],
  },
};
