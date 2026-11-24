import type { SceneSpec } from "@tintelix/schema";

/**
 * Typists on the left (the browser cache in front of them once the lesson adds it), suggest servers in
 * the middle, and on the right first the queries table, then the in-memory trie; the offline pipeline
 * that rebuilds the trie runs along the bottom.
 */
export const suggestScene: SceneSpec = {
  kind: "board",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 28, w: 984, h: 418 },
  nodes: {
    users: { x: 24, y: 170, w: 170, h: 84, kind: "users", label: "Typists", sub: "a request per pause" },
    edge: { x: 240, y: 170, w: 180, h: 84, kind: "edge", label: "Browser cache", sub: "recent prefixes", hidden: true },
    api: { x: 470, y: 170, w: 190, h: 84, kind: "app", label: "Suggest servers", sub: "filter, answer" },
    db: { x: 720, y: 164, w: 260, h: 124, kind: "db", label: "Queries table", sub: "query, count" },
    trie: { x: 710, y: 36, w: 274, h: 236, kind: "cache", label: "Trie in memory", sub: "top 5 at every node", hidden: true },
    logs: { x: 470, y: 330, w: 190, h: 84, kind: "services", label: "Search logs", sub: "what people chose", hidden: true },
    builder: { x: 720, y: 330, w: 264, h: 84, kind: "app", label: "Trie builder", sub: "weekly, plus hourly trends", hidden: true },
  },
  wires: {
    u_a: { from: [194, 212], to: [470, 212] },
    u_b: { from: [194, 212], to: [240, 212] },
    b_a: { from: [420, 212], to: [470, 212] },
    a_d: { from: [660, 212], to: [720, 222] },
    a_t: { from: [660, 200], to: [710, 154] },
    a_l: { from: [565, 254], to: [565, 330], straight: true },
    l_b: { from: [660, 372], to: [720, 372] },
    b_t: { from: [850, 330], to: [850, 272], straight: true },
  },
  board: {
    legend: [["cyan", "keystroke request"], ["green", "suggestions"], ["red", "too slow"], ["violet", "logged search"], ["amber", "new trie"]],
    flows: {
      askDb: { path: [{ wire: "u_a", dir: 1, at: "api" }, { wire: "a_d", dir: 1, at: "db" }], color: "cyan", back: "green", fail: { at: "db", share: "dbFailPct" } },
      askTrie: { path: [{ wire: "u_a", dir: 1, at: "api" }, { wire: "a_t", dir: 1, at: "trie" }], color: "cyan", back: "green" },
      browserHit: { path: [{ wire: "u_b", dir: 1, at: "edge" }], color: "cyan", back: "green", float: { at: "edge", text: "cached in the browser", color: "green", chance: 0.06 } },
      viaBrowser: {
        path: [{ wire: "u_b", dir: 1, at: "edge" }, { wire: "b_a", dir: 1, at: "api" }, { wire: "a_t", dir: 1, at: "trie" }],
        color: "cyan",
        back: "green",
      },
      logIt: { from: "api", path: [{ wire: "a_l", dir: 1, at: "logs" }, { wire: "l_b", dir: 1, at: "builder" }], color: "violet", small: true },
      swap: { from: "builder", path: [{ wire: "b_t", dir: 1, at: "trie" }], color: "amber", float: { at: "trie", text: "new trie swapped in", color: "amber", chance: 0.4 } },
    },
    modes: [
      {
        flows: [],
        tiles: [
          { id: "a", label: "People a day", icon: "users", hue: "violet", value: "{dailyUsersM} million", note: "8 searches each" },
          { id: "b", label: "Suggestion requests", icon: "activity", hue: "cyan", value: "{suggestPeak}/s", note: "at peak; {suggestRate}/s on average" },
          { id: "c", label: "Answer within", icon: "timer", hue: "amber", value: "100 ms", note: "or it lags behind the typing" },
        ],
      },
      {
        flows: [{ flow: "askDb", weight: 1 }],
        rate: 3,
        tiles: [
          { id: "a", label: "One query takes", icon: "timer", hue: "cyan", value: "{queryMs}", note: "{prefixLen}-letter prefix, sort, top 5" },
          { id: "b", label: "Requests now", icon: "activity", hue: "violet", value: "{rate}/s", note: "a quiet launch" },
          { id: "c", label: "Database busy", icon: "db", hue: "amber", value: "{dbBusyPct}", note: "on 64 cores", mood: "good", moodIf: { output: "dbBusyPct", above: 100, mood: "bad" } },
        ],
      },
      {
        flows: [{ flow: "askDb", weight: 1 }],
        rate: 7,
        tiles: [
          { id: "a", label: "One query takes", icon: "timer", hue: "cyan", value: "{queryMs}", note: "{prefixLen}-letter prefix" },
          { id: "b", label: "Requests now", icon: "activity", hue: "violet", value: "{rate}/s", note: "full traffic" },
          { id: "c", label: "Database busy", icon: "db", hue: "amber", value: "{dbBusyPct}", note: "{dbFailPct} answer too late", mood: "good", moodIf: { output: "dbBusyPct", above: 100, mood: "bad" } },
        ],
      },
      {
        flows: [{ flow: "askTrie", weight: 1 }],
        rate: 7,
        tiles: [
          { id: "a", label: "One lookup", icon: "bolt", hue: "green", value: "under 1 ms", note: "walk the prefix, read the top 5", mood: "good" },
          { id: "b", label: "Trie size", icon: "db", hue: "violet", value: "{trieGb} GB", note: "{distinctM} million past queries" },
          { id: "c", label: "Trie servers", icon: "server", hue: "cyan", value: "{trieServers}", note: "copies, for load and a spare" },
        ],
      },
      {
        flows: [{ flow: "askTrie", weight: 10 }, { flow: "logIt", weight: 3 }, { flow: "swap", weight: 0.3 }],
        rate: 7,
        tiles: [
          { id: "a", label: "Counts from", icon: "list", hue: "violet", value: "the logs", note: "the last week of searches" },
          { id: "b", label: "Rebuilt", icon: "hourglass", hue: "amber", value: "weekly", note: "plus an hourly pass for trends" },
          { id: "c", label: "Serving while it builds", icon: "check", hue: "green", value: "yes", note: "the new trie is swapped in", mood: "good" },
        ],
      },
      {
        flows: [{ flow: "browserHit", weight: "browserHitPct" }, { flow: "viaBrowser", weight: "browserMissPct" }, { flow: "logIt", weight: 20 }],
        rate: 7,
        tiles: [
          { id: "a", label: "From the browser", icon: "edge", hue: "green", value: "{browserHitPct}", note: "the same prefix, typed again", mood: "good" },
          { id: "b", label: "Reaching servers", icon: "activity", hue: "cyan", value: "{serverRate}/s", note: "of {suggestPeak}/s typed" },
          { id: "c", label: "Trie servers", icon: "server", hue: "violet", value: "{trieServers}", note: "with room to spare" },
        ],
      },
    ],
    widgets: {
      db: [
        { kind: "meter", output: "dbBusyPct", max: 100, text: "{dbBusyPct} busy" },
        { kind: "text", text: "Too slow: {dbFailPct} late", when: { output: "dbFailPct", above: 0 } },
      ],
      trie: [{ kind: "custom", name: "trie" }],
    },
    states: [{ node: "db", cls: "tx-hot", when: { output: "dbBusyPct", above: 100 } }],
    subs: { users: "{suggestPeak}/s peak" },
  },
};
