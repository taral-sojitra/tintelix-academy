import type { SceneSpec } from "@tintelix/schema";

/**
 * Users on the left, app servers in the middle, the database to the right, with the cache above it and
 * the code maker under the app once the lesson adds them. Writes (amber) are drawn 1 in 6 so they show
 * up; in the model there is one for every 40 reads.
 */
export const urlScene: SceneSpec = {
  kind: "board",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 28, w: 984, h: 418 },
  nodes: {
    users: { x: 24, y: 196, w: 182, h: 84, kind: "users", label: "Users", sub: "clicking links" },
    app: { x: 300, y: 196, w: 170, h: 84, kind: "app", label: "App servers", sub: "redirect" },
    cache: { x: 630, y: 46, w: 230, h: 100, kind: "cache", label: "Cache", sub: "hot codes in memory", hidden: true },
    db: { x: 630, y: 280, w: 250, h: 130, kind: "db", label: "Database", sub: "code → long URL" },
    ids: { x: 270, y: 326, w: 230, h: 118, kind: "services", label: "Code maker", sub: "counter → base 62", hidden: true },
    api: { x: 540, y: 34, w: 444, h: 232, kind: "curve", label: "API and data", sub: "", hidden: true },
  },
  wires: {
    u_a: { from: [206, 238], to: [300, 238] },
    a_c: { from: [470, 222], to: [630, 96] },
    a_d: { from: [470, 254], to: [630, 345] },
    a_i: { from: [385, 280], to: [385, 326], straight: true },
  },
  board: {
    legend: [["cyan", "click"], ["amber", "new link (1 in 6 shown)"], ["green", "answered"], ["red", "failed"]],
    flows: {
      read: { path: [{ wire: "u_a", dir: 1, at: "app" }, { wire: "a_d", dir: 1, at: "db" }], color: "cyan", back: "green", fail: { at: "db", share: "dbFailPct" } },
      readHit: {
        path: [{ wire: "u_a", dir: 1, at: "app" }, { wire: "a_c", dir: 1, at: "cache" }],
        color: "cyan",
        back: "green",
        float: { at: "cache", text: "hit", color: "green", chance: 0.12 },
      },
      readMiss: {
        path: [{ wire: "u_a", dir: 1, at: "app" }, { wire: "a_c", dir: 1, at: "cache" }, { wire: "a_c", dir: -1, at: "app" }, { wire: "a_d", dir: 1, at: "db" }],
        color: "cyan",
        back: "green",
        fail: { at: "db", share: "dbFailPct" },
      },
      writeDirect: { path: [{ wire: "u_a", dir: 1, at: "app" }, { wire: "a_d", dir: 1, at: "db" }], color: "amber", back: "green" },
      write: {
        path: [{ wire: "u_a", dir: 1, at: "app" }, { wire: "a_i", dir: 1, at: "ids" }, { wire: "a_i", dir: -1, at: "app" }, { wire: "a_d", dir: 1, at: "db" }],
        color: "amber",
        back: "green",
      },
    },
    modes: [
      {
        flows: [{ flow: "read", weight: 5 }, { flow: "writeDirect", weight: 1 }],
        rate: 1.5,
        tiles: [
          { id: "a", label: "New links", icon: "spark", hue: "amber", value: "{writeRate}/s", note: "30 million a day" },
          { id: "b", label: "Clicks at full size", icon: "activity", hue: "cyan", value: "{readRate}/s", note: "{readRatio} per link" },
          { id: "c", label: "Database busy", icon: "db", hue: "violet", value: "{dbBusyPct}", note: "{clickRate} clicks a second now", mood: "good" },
        ],
      },
      {
        flows: [{ flow: "read", weight: 5 }, { flow: "writeDirect", weight: 1 }],
        rate: 6,
        tiles: [
          { id: "a", label: "Clicks", icon: "activity", hue: "cyan", value: "{readRate}/s", note: "all of them reach the database" },
          { id: "b", label: "Database busy", icon: "db", hue: "violet", value: "{dbBusyPct}", note: "it answers about 5,000 a second", mood: "good", moodIf: { output: "dbBusyPct", above: 100, mood: "bad" } },
          { id: "c", label: "Clicks that fail", icon: "alert", hue: "amber", value: "{dbFailPct}", note: "{servedPct} answered", mood: "", moodIf: { output: "dbFailPct", above: 0, mood: "bad" } },
        ],
      },
      {
        flows: [{ flow: "readHit", weight: "cacheHitPct" }, { flow: "readMiss", weight: "cacheMissPct" }, { flow: "writeDirect", weight: 20 }],
        rate: 6,
        tiles: [
          { id: "a", label: "Cache answers", icon: "bolt", hue: "green", value: "{cacheReadRate}/s", note: "{cacheHitPct} of clicks" },
          { id: "b", label: "Database busy", icon: "db", hue: "violet", value: "{dbBusyPct}", note: "{dbReadRate} reads a second", mood: "good", moodIf: { output: "dbBusyPct", above: 100, mood: "bad" } },
          { id: "c", label: "Clicks answered", icon: "check", hue: "cyan", value: "{servedPct}", note: "", mood: "good", moodIf: { output: "dbFailPct", above: 0, mood: "bad" } },
        ],
      },
      {
        flows: [{ flow: "readHit", weight: "cacheHitPct" }, { flow: "readMiss", weight: "cacheMissPct" }, { flow: "write", weight: 20 }],
        rate: 6,
        tiles: [
          { id: "a", label: "Code length", icon: "blocks", hue: "violet", value: "{codeLength} characters", note: "{codeSpaceB} billion possible codes" },
          { id: "b", label: "Used in 5 years", icon: "hourglass", hue: "amber", value: "{codesUsedPct}", note: "{linksB} billion links", mood: "good", moodIf: { output: "codesUsedPct", above: 50, mood: "bad" } },
          { id: "c", label: "Database busy", icon: "db", hue: "cyan", value: "{dbBusyPct}", note: "{dbReadRate} reads a second", mood: "good", moodIf: { output: "dbBusyPct", above: 100, mood: "bad" } },
        ],
      },
    ],
    widgets: {
      db: [
        { kind: "meter", output: "dbBusyPct", max: 100, text: "{dbBusyPct} busy · {dbReadRate} reads/s" },
        { kind: "text", text: "Too busy: {dbFailPct} of reads fail", when: { output: "dbFailPct", above: 0 } },
      ],
      cache: [{ kind: "meter", output: "cacheHitPct", max: 100, text: "answers {cacheHitPct} of clicks" }],
      ids: [{ kind: "custom", name: "base62" }],
      api: [
        {
          kind: "log",
          lines: [
            { text: "POST /links · long URL → 201 + short code" },
            { text: "GET /aZ3k9Qb → 302, Location: the long URL" },
            { text: "links: code · long URL · created · expires" },
            { text: "{linksB} billion rows, {storageTb} TB in 5 years" },
          ],
        },
      ],
    },
    states: [{ node: "db", cls: "tx-hot", when: { output: "dbBusyPct", above: 100 } }],
    subs: { users: "{clickRate} clicks/s" },
  },
};
