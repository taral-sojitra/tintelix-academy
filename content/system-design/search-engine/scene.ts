import type { SceneSpec } from "@tintelix/schema";

/**
 * Searchers and query servers on the left (the results cache above them, authors below); the index
 * shards and the document store in the middle column; the indexers and the inverted-index picture on
 * the right.
 */
export const searchScene: SceneSpec = {
  kind: "board",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 28, w: 984, h: 418 },
  nodes: {
    users: { x: 24, y: 150, w: 180, h: 84, kind: "users", label: "Searchers", sub: "typing queries" },
    writers: { x: 24, y: 300, w: 180, h: 84, kind: "users", label: "Authors", sub: "adding documents", hidden: true },
    cache: { x: 270, y: 30, w: 200, h: 90, kind: "cache", label: "Results cache", sub: "hot queries", hidden: true },
    api: { x: 270, y: 150, w: 200, h: 84, kind: "app", label: "Query servers", sub: "fan out, merge" },
    shards: { x: 520, y: 140, w: 210, h: 100, kind: "db", label: "Index shards", sub: "term → documents", hidden: true },
    db: { x: 520, y: 300, w: 210, h: 90, kind: "db", label: "Document store", sub: "the full text" },
    indexers: { x: 790, y: 300, w: 194, h: 90, kind: "app", label: "Indexers", sub: "tokenize, append", hidden: true },
    index: { x: 790, y: 30, w: 194, h: 236, kind: "curve", label: "Inverted index", sub: "", hidden: true },
  },
  wires: {
    u_a: { from: [204, 192], to: [270, 192] },
    a_c: { from: [370, 150], to: [370, 120], straight: true },
    a_s: { from: [470, 186], to: [520, 190] },
    a_d: { from: [470, 212], to: [520, 345] },
    w_d: { from: [204, 342], to: [520, 345] },
    d_i: { from: [730, 345], to: [790, 345] },
    i_s: { from: [804, 300], to: [690, 240] },
  },
  board: {
    legend: [["cyan", "query"], ["green", "results"], ["red", "timed out"], ["amber", "new document"], ["violet", "indexing"]],
    flows: {
      scan: { path: [{ wire: "u_a", dir: 1, at: "api" }, { wire: "a_d", dir: 1, at: "db" }], color: "cyan", back: "green", fail: { at: "db", share: "scanFailPct" } },
      query: { path: [{ wire: "u_a", dir: 1, at: "api" }, { wire: "a_s", dir: 1, at: "shards" }], color: "cyan", back: "green" },
      hotHit: {
        path: [{ wire: "u_a", dir: 1, at: "api" }, { wire: "a_c", dir: 1, at: "cache" }],
        color: "cyan",
        back: "green",
        float: { at: "cache", text: "trending: cached", color: "green", chance: 0.08 },
      },
      write: { from: "writers", path: [{ wire: "w_d", dir: 1, at: "db" }], color: "amber", back: "green", float: { at: "db", text: "202 queued", color: "amber", chance: 0.1 } },
      index: { from: "db", path: [{ wire: "d_i", dir: 1, at: "indexers" }, { wire: "i_s", dir: 1, at: "shards" }], color: "violet", small: true },
    },
    modes: [
      {
        flows: [],
        tiles: [
          { id: "a", label: "Documents", icon: "learn", hue: "violet", value: "{docsB} billion", note: "about 2 KB each" },
          { id: "b", label: "Searches", icon: "activity", hue: "cyan", value: "{queryRate}/s", note: "{queryPeak}/s at peak" },
          { id: "c", label: "New or changed", icon: "spark", hue: "amber", value: "{indexRate}/s", note: "{indexPeak}/s at peak" },
        ],
      },
      {
        flows: [{ flow: "scan", weight: 1 }],
        rate: 3,
        tiles: [
          { id: "a", label: "Documents", icon: "learn", hue: "violet", value: "{smallDocsM} million", note: "a small start" },
          { id: "b", label: "One query takes", icon: "timer", hue: "cyan", value: "{scanMs}", note: "LIKE '%term%' reads every row", mood: "good" },
          { id: "c", label: "Index used", icon: "blocks", hue: "amber", value: "none", note: "a wildcard defeats a B-tree" },
        ],
      },
      {
        flows: [{ flow: "scan", weight: 1 }],
        rate: 5,
        tiles: [
          { id: "a", label: "Documents", icon: "learn", hue: "violet", value: "{docsB} billion", note: "the real corpus" },
          { id: "b", label: "One query takes", icon: "timer", hue: "amber", value: "{scanSec}", note: "at 5 million rows a second", mood: "bad" },
          { id: "c", label: "Queries at peak", icon: "activity", hue: "cyan", value: "{queryPeak}/s", note: "all of them time out", mood: "bad" },
        ],
      },
      {
        flows: [{ flow: "query", weight: 1 }],
        rate: 6,
        tiles: [
          { id: "a", label: "One query takes", icon: "timer", hue: "green", value: "{queryMs}", note: "lookups and an intersection", mood: "good" },
          { id: "b", label: "Index shards", icon: "db", hue: "violet", value: "{shards}", note: "{indexTb} TB of index, split by document" },
          { id: "c", label: "Queries at peak", icon: "activity", hue: "cyan", value: "{queryPeak}/s", note: "each fans out to every shard" },
        ],
      },
      {
        flows: [{ flow: "query", weight: 3 }, { flow: "write", weight: 1 }, { flow: "index", weight: 1 }],
        rate: 7,
        tiles: [
          { id: "a", label: "Searchable after", icon: "hourglass", hue: "amber", value: "{lagSec}", note: "refresh {refreshSec} + pipeline" },
          { id: "b", label: "Indexed", icon: "spark", hue: "violet", value: "{indexRate}/s", note: "{indexPeak}/s at peak" },
          { id: "c", label: "Segments a minute", icon: "blocks", hue: "cyan", value: "{segmentsPerMin}", note: "each later merged in" },
        ],
      },
      {
        flows: [{ flow: "hotHit", weight: "cacheHitPct" }, { flow: "query", weight: "cacheMissPct" }, { flow: "write", weight: 10 }, { flow: "index", weight: 10 }],
        rate: 7,
        tiles: [
          { id: "a", label: "One trending term", icon: "activity", hue: "amber", value: "{hotQueryRate}/s", note: "a big event, one query" },
          { id: "b", label: "From the cache", icon: "bolt", hue: "green", value: "{cacheHitPct}", note: "top results, short TTL", mood: "good" },
          { id: "c", label: "Still to the shards", icon: "db", hue: "violet", value: "{hotToShards}/s", note: "for that term" },
        ],
      },
    ],
    widgets: {
      db: [{ kind: "text", text: "Reads every row: {scanSec}", when: { output: "scanFailPct", above: 0 } }],
      index: [
        {
          kind: "log",
          lines: [
            { text: "1 cheap flights to goa" },
            { text: "2 goa beach hotels" },
            { text: "3 cheap hotels near airport" },
            { text: "cheap → 1, 3" },
            { text: "hotels → 2, 3" },
            { text: "cheap ∩ hotels → 3" },
          ],
        },
      ],
    },
    states: [{ node: "db", cls: "tx-hot", when: { output: "scanFailPct", above: 0 } }],
    subs: { users: "{queryPeak}/s at peak", shards: "{shards} shards", writers: "{indexRate} documents/s" },
  },
};
