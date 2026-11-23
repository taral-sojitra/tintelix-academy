import type { SceneSpec } from "@tintelix/schema";

type Hop = [string, 1 | -1, string];
const path = (...hops: Hop[]) => hops.map(([wire, dir, at]) => ({ wire, dir, at }));

/**
 * Brokers send orders through the gateway. At first a database matches them; later the matching engine
 * takes its place, fed by the sequencer (top) that also writes the journal, and market data goes out to
 * subscribers on the right.
 */
export const exchangeScene: SceneSpec = {
  kind: "board",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 28, w: 984, h: 418 },
  nodes: {
    brokers: { x: 16, y: 192, w: 150, h: 84, kind: "users", label: "Brokers", sub: "orders in" },
    gateway: { x: 200, y: 186, w: 160, h: 96, kind: "app", label: "Gateway", sub: "checks, risk" },
    db: { x: 420, y: 180, w: 260, h: 130, kind: "db", label: "Orders database", sub: "match by query" },
    seq: { x: 420, y: 34, w: 200, h: 90, kind: "services", label: "Sequencer", sub: "numbers each order", hidden: true },
    journal: { x: 660, y: 34, w: 180, h: 90, kind: "db", label: "Journal", sub: "in order", hidden: true },
    engine: { x: 420, y: 160, w: 300, h: 262, kind: "services", label: "Matching engine", sub: "one thread a stock", hidden: true },
    feed: { x: 770, y: 330, w: 214, h: 92, kind: "services", label: "Market data", sub: "multicast", hidden: true },
    subs: { x: 844, y: 160, w: 140, h: 84, kind: "users", label: "Firms", sub: "listening", hidden: true },
  },
  wires: {
    b_g: { from: [166, 234], to: [200, 234] },
    g_x: { from: [360, 250], to: [420, 250] },
    g_s: { from: [320, 186], to: [440, 124] },
    s_e: { from: [520, 124], to: [520, 160] },
    s_j: { from: [620, 80], to: [660, 80] },
    e_f: { from: [720, 376], to: [770, 376] },
    f_u: { from: [900, 330], to: [920, 244] },
  },
  board: {
    legend: [["cyan", "an order"], ["violet", "journal or market data"], ["green", "matched"], ["red", "too slow"]],
    flows: {
      dbMatch: { from: "brokers", path: path(["b_g", 1, "gateway"], ["g_x", 1, "db"]), color: "cyan", back: "green", fail: { at: "db", share: "dbFailPct" } },
      memMatch: {
        from: "brokers",
        path: path(["b_g", 1, "gateway"], ["g_x", 1, "engine"]),
        color: "cyan",
        back: "green",
        float: { at: "engine", text: "matched in 5 µs", color: "green", chance: 0.08 },
      },
      seqMatch: { from: "brokers", path: path(["b_g", 1, "gateway"], ["g_s", 1, "seq"], ["s_e", 1, "engine"]), color: "cyan", back: "green" },
      journal: { from: "seq", path: path(["s_j", 1, "journal"]), color: "violet", small: true },
      feed: { from: "engine", path: path(["e_f", 1, "feed"], ["f_u", 1, "subs"]), color: "violet", small: true },
    },
    modes: [
      {
        flows: [],
        tiles: [
          { id: "a", label: "Orders a day", icon: "list", hue: "cyan", value: "{ordersM} million", note: "in a {sessionHours}-hour session" },
          { id: "b", label: "At the open", icon: "bolt", hue: "violet", value: "{peakRate}/s", note: "{openFactor}× the average" },
          { id: "c", label: "Stocks", icon: "blocks", hue: "amber", value: "{symbols}", note: "each its own order book" },
        ],
      },
      {
        flows: [{ flow: "dbMatch", weight: 1 }],
        rate: 4,
        tiles: [
          { id: "a", label: "Orders now", icon: "activity", hue: "cyan", value: "{dbRate}/s", note: "launch" },
          { id: "b", label: "Database busy", icon: "db", hue: "violet", value: "{dbBusyPct}", note: "{dbCap} matches a second", mood: "good", moodIf: { output: "dbBusyPct", above: 100, mood: "bad" } },
          { id: "c", label: "One match", icon: "hourglass", hue: "amber", value: "{dbMatchMs}", note: "a query per order" },
        ],
      },
      {
        flows: [{ flow: "dbMatch", weight: 1 }],
        rate: 8,
        tiles: [
          { id: "a", label: "Orders now", icon: "activity", hue: "cyan", value: "{dbRate}/s", note: "the open" },
          { id: "b", label: "Database busy", icon: "db", hue: "violet", value: "{dbBusyPct}", note: "{dbFailPct} of orders stall", mood: "good", moodIf: { output: "dbBusyPct", above: 100, mood: "bad" } },
          { id: "c", label: "Fairness", icon: "alert", hue: "amber", value: "lost", note: "whose query lands first?", mood: "bad" },
        ],
      },
      {
        flows: [{ flow: "memMatch", weight: 1 }],
        rate: 8,
        tiles: [
          { id: "a", label: "One match", icon: "bolt", hue: "green", value: "{matchUs} µs", note: "in memory, one thread", mood: "good" },
          { id: "b", label: "Busiest stock", icon: "gauge", hue: "cyan", value: "{hotBusyPct}", note: "{hotSharePct} of all orders" },
          { id: "c", label: "Engines", icon: "server", hue: "violet", value: "{engines}", note: "stocks shared between them" },
        ],
      },
      {
        flows: [{ flow: "seqMatch", weight: 3 }, { flow: "journal", weight: 2 }],
        rate: 8,
        tiles: [
          { id: "a", label: "Sequence", icon: "list", hue: "cyan", value: "every order", note: "one number, one order" },
          { id: "b", label: "Journal", icon: "db", hue: "violet", value: "{journalGb} GB/day", note: "written before matching" },
          { id: "c", label: "Failover", icon: "replay", hue: "green", value: "replay", note: "a standby follows the journal", mood: "good" },
        ],
      },
      {
        flows: [{ flow: "seqMatch", weight: 3 }, { flow: "journal", weight: 1 }, { flow: "feed", weight: 2 }],
        rate: 8,
        tiles: [
          { id: "a", label: "Market data", icon: "activity", hue: "violet", value: "{feedRate}/s", note: "trades and book changes" },
          { id: "b", label: "Multicast", icon: "edge", hue: "green", value: "sent once", note: "to {subscribers} firms", mood: "good" },
          { id: "c", label: "One by one", icon: "alert", hue: "amber", value: "{unicastM} million/s", note: "if sent to each firm" },
        ],
      },
    ],
    widgets: {
      db: [
        { kind: "meter", output: "dbBusyPct", max: 100, text: "{dbBusyPct} busy" },
        { kind: "text", text: "Stalled: {dbFailPct}", when: { output: "dbFailPct", above: 0 } },
      ],
      engine: [{ kind: "custom", name: "orderbook" }],
    },
    states: [{ node: "db", cls: "tx-hot", when: { output: "dbBusyPct", above: 100 } }],
  },
};
