import type { SceneSpec } from "@tintelix/schema";

type Hop = [string, 1 | -1, string];
const path = (...hops: Hop[]) => hops.map(([wire, dir, at]) => ({ wire, dir, at }));

/**
 * Players report results through the game servers (top) and look up ranks through the leaderboard API
 * (bottom). The scores database sits bottom right; the sorted set appears top right.
 */
export const leaderboardScene: SceneSpec = {
  kind: "board",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 28, w: 984, h: 418 },
  nodes: {
    players: { x: 16, y: 190, w: 150, h: 84, kind: "users", label: "Players", sub: "10 million" },
    game: { x: 220, y: 56, w: 190, h: 92, kind: "app", label: "Game servers", sub: "report results" },
    api: { x: 220, y: 320, w: 190, h: 92, kind: "app", label: "Leaderboard API", sub: "top 100, my rank" },
    board: { x: 530, y: 30, w: 320, h: 266, kind: "cache", label: "Sorted set", sub: "players by score", hidden: true },
    db: { x: 480, y: 300, w: 240, h: 126, kind: "db", label: "Scores database", sub: "the source of truth" },
  },
  wires: {
    p_g: { from: [166, 210], to: [220, 120] },
    p_a: { from: [166, 254], to: [220, 350] },
    g_b: { from: [410, 100], to: [530, 100] },
    g_d: { from: [410, 130], to: [500, 300] },
    a_d: { from: [410, 370], to: [480, 370] },
    a_b: { from: [410, 334], to: [600, 296] },
  },
  board: {
    legend: [["cyan", "a score or a rank check"], ["green", "answered"], ["red", "too slow"]],
    flows: {
      writeDb: { from: "players", path: path(["p_g", 1, "game"], ["g_d", 1, "db"]), color: "cyan", small: true, back: "green" },
      rankDb: { from: "players", path: path(["p_a", 1, "api"], ["a_d", 1, "db"]), color: "cyan", back: "green", fail: { at: "db", share: "dbFailPct" } },
      writeBoth: {
        from: "players",
        path: path(["p_g", 1, "game"], ["g_d", 1, "db"], ["g_d", -1, "game"], ["g_b", 1, "board"]),
        color: "cyan",
        small: true,
        back: "green",
      },
      rankBoard: { from: "players", path: path(["p_a", 1, "api"], ["a_b", 1, "board"]), color: "cyan", back: "green", fail: { at: "board", share: "boardFailPct" } },
    },
    modes: [
      {
        flows: [],
        tiles: [
          { id: "a", label: "Players", icon: "users", hue: "cyan", value: "{playersM} million", note: "this season" },
          { id: "b", label: "Score updates", icon: "activity", hue: "violet", value: "{updatesPeak}/s", note: "at peak" },
          { id: "c", label: "Rank checks", icon: "target", hue: "amber", value: "{readsPeak}/s", note: "top 100, my place" },
        ],
      },
      {
        flows: [{ flow: "writeDb", weight: 1 }, { flow: "rankDb", weight: 2 }],
        rate: 4,
        tiles: [
          { id: "a", label: "Players so far", icon: "users", hue: "cyan", value: "{livePlayers}", note: "launch" },
          { id: "b", label: "Database busy", icon: "db", hue: "violet", value: "{dbBusyPct}", note: "rank checks", mood: "good", moodIf: { output: "dbBusyPct", above: 100, mood: "bad" } },
          { id: "c", label: "My rank", icon: "list", hue: "amber", value: "{rankMs}", note: "count the higher scores" },
        ],
      },
      {
        flows: [{ flow: "writeDb", weight: 1 }, { flow: "rankDb", weight: 2 }],
        rate: 8,
        tiles: [
          { id: "a", label: "Players", icon: "users", hue: "cyan", value: "{livePlayers}", note: "full size" },
          { id: "b", label: "Database busy", icon: "db", hue: "violet", value: "{dbBusyPct}", note: "{dbFailPct} of checks fail", mood: "good", moodIf: { output: "dbBusyPct", above: 100, mood: "bad" } },
          { id: "c", label: "One rank check", icon: "hourglass", hue: "amber", value: "{rankMs}", note: "counts {halfM} million rows", mood: "bad" },
        ],
      },
      {
        flows: [{ flow: "writeBoth", weight: 1 }, { flow: "rankBoard", weight: 2 }],
        rate: 8,
        tiles: [
          { id: "a", label: "Rank lookup", icon: "bolt", hue: "green", value: "{logSteps} steps", note: "a skip list: O(log n)", mood: "good" },
          { id: "b", label: "Sorted set busy", icon: "server", hue: "violet", value: "{boardBusyPct}", note: "{redisOps} operations a second", mood: "good", moodIf: { output: "boardBusyPct", above: 100, mood: "bad" } },
          { id: "c", label: "Memory", icon: "db", hue: "cyan", value: "{memGb} GB", note: "about {bytesPerEntry} bytes a player" },
        ],
      },
      {
        flows: [{ flow: "writeBoth", weight: 1 }, { flow: "rankBoard", weight: 2 }],
        rate: 8,
        tiles: [
          { id: "a", label: "Ties", icon: "clock", hue: "cyan", value: "first there wins", note: "time folded into the score" },
          { id: "b", label: "Around you", icon: "list", hue: "violet", value: "5 up, 5 down", note: "a rank, then a range" },
          { id: "c", label: "After a restart", icon: "replay", hue: "green", value: "rebuilt", note: "from the scores database", mood: "good" },
        ],
      },
      {
        flows: [{ flow: "writeBoth", weight: 1 }, { flow: "rankBoard", weight: 2 }],
        rate: 8,
        tiles: [
          { id: "a", label: "One board", icon: "users", hue: "cyan", value: "{playersM} million", note: "players on it" },
          { id: "b", label: "Shards", icon: "blocks", hue: "violet", value: "{boardShards}", note: "split by score range" },
          { id: "c", label: "Each shard busy", icon: "server", hue: "green", value: "{boardBusyPct}", note: "{memGb} GB in all", mood: "good", moodIf: { output: "boardBusyPct", above: 100, mood: "bad" } },
        ],
      },
    ],
    widgets: {
      db: [
        { kind: "meter", output: "dbBusyPct", max: 100, text: "{dbBusyPct} busy with ranks" },
        { kind: "text", text: "Too slow: {dbFailPct}", when: { output: "dbFailPct", above: 0 } },
      ],
      board: [
        { kind: "custom", name: "sortedset" },
        { kind: "meter", output: "boardBusyPct", max: 100, text: "{boardBusyPct} busy" },
      ],
    },
    states: [
      { node: "db", cls: "tx-hot", when: { output: "dbBusyPct", above: 100 } },
      { node: "board", cls: "tx-hot", when: { output: "boardBusyPct", above: 100 } },
    ],
  },
};
