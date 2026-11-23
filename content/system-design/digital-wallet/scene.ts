import type { SceneSpec } from "@tintelix/schema";

type Hop = [string, 1 | -1, string];
const path = (...hops: Hop[]) => hops.map(([wire, dir, at]) => ({ wire, dir, at }));

/**
 * Wallet users send money through the transfer service. Balances sit top middle; the event log appears
 * underneath and feeds the balances and, later, a read view on the right.
 */
export const walletScene: SceneSpec = {
  kind: "board",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 28, w: 984, h: 418 },
  nodes: {
    users: { x: 16, y: 190, w: 150, h: 84, kind: "users", label: "Users", sub: "send money" },
    api: { x: 210, y: 180, w: 190, h: 104, kind: "app", label: "Transfer service", sub: "transfer IDs" },
    db: { x: 470, y: 40, w: 270, h: 140, kind: "db", label: "Balances", sub: "by wallet" },
    log: { x: 470, y: 236, w: 300, h: 190, kind: "services", label: "Event log", sub: "every transfer, in order", hidden: true },
    view: { x: 810, y: 300, w: 174, h: 110, kind: "cache", label: "Balance view", sub: "from the log", hidden: true },
  },
  wires: {
    u_a: { from: [166, 232], to: [210, 232] },
    a_d: { from: [400, 200], to: [520, 180] },
    a_l: { from: [400, 266], to: [470, 300] },
    l_d: { from: [640, 236], to: [640, 180] },
    l_v: { from: [770, 355], to: [810, 355] },
  },
  board: {
    legend: [["cyan", "a transfer"], ["violet", "events applied"], ["green", "done"], ["red", "too slow"]],
    flows: {
      direct: { from: "users", path: path(["u_a", 1, "api"], ["a_d", 1, "db"]), color: "cyan", back: "green", fail: { at: "db", share: "dbFailPct" } },
      saga: {
        from: "users",
        path: path(["u_a", 1, "api"], ["a_d", 1, "db"]),
        color: "cyan",
        back: "green",
        fail: { at: "db", share: "shardFailPct" },
        float: { at: "db", text: "reserve → credit → settle", color: "green", chance: 0.08 },
      },
      append: { from: "users", path: path(["u_a", 1, "api"], ["a_l", 1, "log"]), color: "cyan", back: "green" },
      project: { from: "log", path: path(["l_d", 1, "db"]), color: "violet", small: true },
      viewFeed: { from: "log", path: path(["l_v", 1, "view"]), color: "violet", small: true },
      retry: {
        from: "users",
        path: path(["u_a", 1, "api"]),
        color: "cyan",
        back: "green",
        float: { at: "api", text: "transfer ID seen: skipped", color: "green", chance: 0.3 },
      },
    },
    modes: [
      {
        flows: [],
        tiles: [
          { id: "a", label: "Wallets", icon: "users", hue: "cyan", value: "{walletsM} million", note: "balances in rupees" },
          { id: "b", label: "Transfers", icon: "activity", hue: "violet", value: "{peakTransfers}/s", note: "at peak" },
          { id: "c", label: "Money made or lost", icon: "target", hue: "amber", value: "never", note: "every rupee accounted for" },
        ],
      },
      {
        flows: [{ flow: "direct", weight: 1 }],
        rate: 4,
        tiles: [
          { id: "a", label: "Transfers now", icon: "activity", hue: "cyan", value: "{dbTransfers}/s", note: "launch" },
          { id: "b", label: "Database busy", icon: "db", hue: "violet", value: "{dbBusyPct}", note: "{dbCap} transfers a second", mood: "good", moodIf: { output: "dbBusyPct", above: 100, mood: "bad" } },
          { id: "c", label: "A transfer", icon: "check", hue: "green", value: "one transaction", note: "debit and credit together" },
        ],
      },
      {
        flows: [{ flow: "direct", weight: 1 }],
        rate: 8,
        tiles: [
          { id: "a", label: "Transfers now", icon: "activity", hue: "cyan", value: "{dbTransfers}/s", note: "peak" },
          { id: "b", label: "Database busy", icon: "db", hue: "violet", value: "{dbBusyPct}", note: "{dbFailPct} of transfers fail", mood: "good", moodIf: { output: "dbBusyPct", above: 100, mood: "bad" } },
          { id: "c", label: "One machine", icon: "alert", hue: "amber", value: "the ceiling", note: "and the single point of loss", mood: "bad" },
        ],
      },
      {
        flows: [{ flow: "saga", weight: 1 }],
        rate: 8,
        tiles: [
          { id: "a", label: "Shards", icon: "blocks", hue: "cyan", value: "{shards}", note: "wallets split by ID" },
          { id: "b", label: "Each shard busy", icon: "db", hue: "green", value: "{shardBusyPct}", note: "a debit here, a credit there", mood: "good", moodIf: { output: "shardBusyPct", above: 100, mood: "bad" } },
          { id: "c", label: "Cross-shard", icon: "shuffle", hue: "violet", value: "{crossShardPct}", note: "reserve, credit, settle" },
        ],
      },
      {
        flows: [{ flow: "append", weight: 2 }, { flow: "project", weight: 2 }],
        rate: 8,
        tiles: [
          { id: "a", label: "Events a day", icon: "list", hue: "violet", value: "{eventsB} billion", note: "{logGbDay} GB of log" },
          { id: "b", label: "Any balance", icon: "replay", hue: "green", value: "rebuilt", note: "snapshot plus recent events", mood: "good" },
          { id: "c", label: "A bug found", icon: "wrench", hue: "cyan", value: "replayed", note: "fix the code, recompute" },
        ],
      },
      {
        flows: [{ flow: "append", weight: 2 }, { flow: "project", weight: 1 }, { flow: "viewFeed", weight: 1 }, { flow: "retry", weight: 1 }],
        rate: 8,
        tiles: [
          { id: "a", label: "Retries", icon: "check", hue: "green", value: "no double moves", note: "transfer IDs", mood: "good" },
          { id: "b", label: "Balance reads", icon: "bolt", hue: "cyan", value: "from a view", note: "built from the log" },
          { id: "c", label: "Audit", icon: "sheet", hue: "violet", value: "adds up", note: "money in minus money out" },
        ],
      },
    ],
    widgets: {
      db: [
        { kind: "text", text: "One database: {dbBusyPct} busy", when: { output: "dbBusyPct", above: 0 } },
        { kind: "text", text: "{shards} shards, each {shardBusyPct} busy", when: { output: "shardBusyPct", above: 0 } },
      ],
      log: [{ kind: "custom", name: "eventlog" }],
    },
    states: [{ node: "db", cls: "tx-hot", when: { output: "dbBusyPct", above: 100 } }],
  },
};
