import type { SceneSpec } from "@tintelix/schema";

/**
 * Searchers and the search service on the left; the places table bottom right (first searched by
 * latitude and longitude, later only for details); the geohash index with its map top right; a results
 * cache under the search service.
 */
export const nearbyScene: SceneSpec = {
  kind: "board",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 28, w: 984, h: 418 },
  nodes: {
    users: { x: 16, y: 170, w: 170, h: 84, kind: "users", label: "Searchers", sub: "\"coffee near me\"" },
    api: { x: 240, y: 170, w: 200, h: 84, kind: "app", label: "Search service", sub: "filter, rank, page" },
    db: { x: 500, y: 290, w: 240, h: 120, kind: "db", label: "Places", sub: "name, rating, lat, lon" },
    geo: { x: 480, y: 34, w: 360, h: 236, kind: "cache", label: "Geohash index", sub: "cell → place IDs", hidden: true },
    cache: { x: 240, y: 330, w: 200, h: 90, kind: "cache", label: "Results cache", sub: "by cell and query", hidden: true },
  },
  wires: {
    u_a: { from: [186, 212], to: [240, 212] },
    a_db: { from: [440, 230], to: [500, 340] },
    a_geo: { from: [440, 196], to: [480, 150] },
    a_c: { from: [340, 254], to: [340, 330], straight: true },
  },
  board: {
    legend: [["cyan", "search"], ["green", "results"], ["red", "too slow"]],
    flows: {
      latlon: { path: [{ wire: "u_a", dir: 1, at: "api" }, { wire: "a_db", dir: 1, at: "db" }], color: "cyan", back: "green", fail: { at: "db", share: "dbFailPct" } },
      geo: {
        path: [{ wire: "u_a", dir: 1, at: "api" }, { wire: "a_geo", dir: 1, at: "geo" }, { wire: "a_geo", dir: -1, at: "api" }, { wire: "a_db", dir: 1, at: "db" }],
        color: "cyan",
        back: "green",
      },
      cached: { path: [{ wire: "u_a", dir: 1, at: "api" }, { wire: "a_c", dir: 1, at: "cache" }], color: "cyan", back: "green" },
    },
    modes: [
      {
        flows: [],
        tiles: [
          { id: "a", label: "Places", icon: "target", hue: "violet", value: "{placesM} million", note: "shops, restaurants, clinics" },
          { id: "b", label: "Searches", icon: "activity", hue: "cyan", value: "{searchPeak}/s", note: "at peak; {searchRate}/s average" },
          { id: "c", label: "Radius", icon: "gauge", hue: "amber", value: "{radiusKm} km", note: "nearest and best first" },
        ],
      },
      {
        flows: [{ flow: "latlon", weight: 1 }],
        rate: 3,
        tiles: [
          { id: "a", label: "Rows per search", icon: "list", hue: "cyan", value: "{rowsPerQuery}", note: "a latitude band, a longitude band" },
          { id: "b", label: "One search", icon: "timer", hue: "violet", value: "{latlonMs}", note: "intersect, then measure" },
          { id: "c", label: "Database busy", icon: "db", hue: "amber", value: "{dbBusyPct}", note: "a quiet launch", mood: "good", moodIf: { output: "dbBusyPct", above: 100, mood: "bad" } },
        ],
      },
      {
        flows: [{ flow: "latlon", weight: 1 }],
        rate: 7,
        tiles: [
          { id: "a", label: "Searches now", icon: "activity", hue: "cyan", value: "{rate}/s", note: "full traffic" },
          { id: "b", label: "One search", icon: "timer", hue: "violet", value: "{latlonMs}", note: "{rowsPerQuery} rows each" },
          { id: "c", label: "Database busy", icon: "db", hue: "amber", value: "{dbBusyPct}", note: "{dbFailPct} too slow", mood: "good", moodIf: { output: "dbBusyPct", above: 100, mood: "bad" } },
        ],
      },
      {
        flows: [{ flow: "geo", weight: 1 }],
        rate: 7,
        tiles: [
          { id: "a", label: "Cells read", icon: "blocks", hue: "cyan", value: "{cellsRead}", note: "geohash length {geoLen}" },
          { id: "b", label: "Candidates", icon: "list", hue: "violet", value: "{candidates}", note: "{inCircle} really within {radiusKm} km" },
          { id: "c", label: "One search", icon: "timer", hue: "green", value: "{geoMs}", note: "read cells, check distances", mood: "good", moodIf: { output: "geoMs", above: 20, mood: "bad" } },
        ],
      },
      {
        flows: [{ flow: "geo", weight: 1 }],
        rate: 7,
        tiles: [
          { id: "a", label: "Index size", icon: "db", hue: "violet", value: "{indexGb} GB", note: "fits in memory" },
          { id: "b", label: "Search servers", icon: "server", hue: "cyan", value: "{searchServers}", note: "each with a full copy" },
          { id: "c", label: "One search", icon: "timer", hue: "green", value: "{geoMs}", note: "no disk on the way", mood: "good" },
        ],
      },
      {
        flows: [{ flow: "cached", weight: "cacheHitPct" }, { flow: "geo", weight: 40 }],
        rate: 7,
        tiles: [
          { id: "a", label: "From the cache", icon: "bolt", hue: "green", value: "{cacheHitPct}", note: "popular cells, popular queries", mood: "good" },
          { id: "b", label: "Search servers", icon: "server", hue: "cyan", value: "{searchServers}", note: "for the rest" },
          { id: "c", label: "Index", icon: "db", hue: "violet", value: "{indexGb} GB", note: "rebuilt as places change" },
        ],
      },
    ],
    widgets: {
      db: [
        { kind: "meter", output: "dbBusyPct", max: 100, text: "{dbBusyPct} busy" },
        { kind: "text", text: "Too slow: {dbFailPct}", when: { output: "dbFailPct", above: 0 } },
      ],
      geo: [{ kind: "custom", name: "geogrid" }],
    },
    states: [{ node: "db", cls: "tx-hot", when: { output: "dbBusyPct", above: 100 } }],
    subs: { users: "{searchPeak}/s peak" },
  },
};
