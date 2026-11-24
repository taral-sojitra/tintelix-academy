import type { SceneSpec } from "@tintelix/schema";

type Hop = [string, 1 | -1, string];
const path = (...hops: Hop[]) => hops.map(([wire, dir, at]) => ({ wire, dir, at }));

/**
 * Viewers click ads through the click API. First it updates counters in the database directly (the
 * diagonal); later clicks flow through the click log and the aggregators, which write one row per ad
 * per minute. Billing appears last, recounting from the raw log.
 */
export const clicksScene: SceneSpec = {
  kind: "board",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 28, w: 984, h: 418 },
  nodes: {
    viewers: { x: 16, y: 56, w: 150, h: 84, kind: "users", label: "Viewers", sub: "click ads" },
    api: { x: 200, y: 52, w: 170, h: 92, kind: "app", label: "Click API", sub: "accepts, 202" },
    log: { x: 410, y: 52, w: 170, h: 92, kind: "services", label: "Click log", sub: "partitioned", hidden: true },
    agg: { x: 620, y: 34, w: 364, h: 210, kind: "services", label: "Aggregators", sub: "per ad, per minute", hidden: true },
    counts: { x: 620, y: 300, w: 220, h: 120, kind: "db", label: "Ad counts", sub: "dashboards read here" },
    billing: { x: 870, y: 300, w: 114, h: 120, kind: "users", label: "Billing", sub: "nightly", hidden: true },
  },
  wires: {
    v_a: { from: [166, 98], to: [200, 98] },
    a_db: { from: [370, 144], to: [620, 350] },
    a_l: { from: [370, 98], to: [410, 98] },
    l_g: { from: [580, 98], to: [620, 98] },
    g_db: { from: [730, 244], to: [730, 300] },
    b_db: { from: [870, 360], to: [840, 360] },
  },
  board: {
    legend: [["cyan", "a click"], ["green", "counted"], ["red", "too slow or too late"]],
    flows: {
      direct: {
        from: "viewers",
        path: path(["v_a", 1, "api"], ["a_db", 1, "counts"]),
        color: "cyan",
        back: "green",
        fail: { at: "counts", share: "dbFailPct" },
        float: { at: "counts", text: "a retry, counted twice", color: "amber", chance: 0.06 },
      },
      stream: {
        from: "viewers",
        path: path(["v_a", 1, "api"], ["a_l", 1, "log"], ["l_g", 1, "agg"], ["g_db", 1, "counts"]),
        color: "cyan",
        back: "green",
        fail: { at: "agg", share: "lateShownPct" },
      },
      exact: {
        from: "viewers",
        path: path(["v_a", 1, "api"], ["a_l", 1, "log"], ["l_g", 1, "agg"], ["g_db", 1, "counts"]),
        color: "cyan",
        back: "green",
        float: { at: "agg", text: "seen click ID: dropped", color: "green", chance: 0.06 },
      },
      recount: { from: "billing", path: path(["b_db", 1, "counts"]), color: "violet", small: true },
    },
    modes: [
      {
        flows: [],
        tiles: [
          { id: "a", label: "Clicks a day", icon: "target", hue: "cyan", value: "{clicksB} billion", note: "{avgRate}/s on average" },
          { id: "b", label: "At peak", icon: "activity", hue: "violet", value: "{peakRate}/s", note: "{peakFactor}× the average" },
          { id: "c", label: "Ads", icon: "list", hue: "amber", value: "{adsM} million", note: "counted per minute" },
        ],
      },
      {
        flows: [{ flow: "direct", weight: 1 }],
        rate: 4,
        tiles: [
          { id: "a", label: "Writes now", icon: "activity", hue: "cyan", value: "{dbWrites}/s", note: "one per click, launch" },
          { id: "b", label: "Database busy", icon: "db", hue: "violet", value: "{dbBusyPct}", note: "{dbCap} writes a second", mood: "good", moodIf: { output: "dbBusyPct", above: 100, mood: "bad" } },
          { id: "c", label: "Retried clicks", icon: "replay", hue: "amber", value: "counted again", note: "nothing checks the click ID" },
        ],
      },
      {
        flows: [{ flow: "direct", weight: 1 }],
        rate: 8,
        tiles: [
          { id: "a", label: "Writes now", icon: "activity", hue: "cyan", value: "{dbWrites}/s", note: "one per click, peak" },
          { id: "b", label: "Database busy", icon: "db", hue: "violet", value: "{dbBusyPct}", note: "{dbFailPct} of clicks lost", mood: "good", moodIf: { output: "dbBusyPct", above: 100, mood: "bad" } },
          { id: "c", label: "Counted twice", icon: "alert", hue: "amber", value: "{dupsM} million", note: "a day: {dupPct} retried", mood: "bad" },
        ],
      },
      {
        flows: [{ flow: "stream", weight: 1 }],
        rate: 8,
        tiles: [
          { id: "a", label: "Rows written", icon: "activity", hue: "green", value: "{dbWrites}/s", note: "one per ad per minute", mood: "good" },
          { id: "b", label: "Database busy", icon: "db", hue: "violet", value: "{dbBusyPct}", note: "{adsPerMin} ads a minute", mood: "good", moodIf: { output: "dbBusyPct", above: 100, mood: "bad" } },
          { id: "c", label: "Counted by", icon: "clock", hue: "cyan", value: "click time", note: "not arrival time" },
        ],
      },
      {
        flows: [{ flow: "stream", weight: 1 }],
        rate: 8,
        tiles: [
          { id: "a", label: "Too late", icon: "alert", hue: "amber", value: "{latePct}", note: "behind the watermark" },
          { id: "b", label: "Results wait", icon: "hourglass", hue: "violet", value: "{slackSec}", note: "behind the latest click" },
          { id: "c", label: "Late clicks", icon: "list", hue: "cyan", value: "{lateM} million", note: "a day, to a correction path" },
        ],
      },
      {
        flows: [{ flow: "exact", weight: 3 }, { flow: "recount", weight: 1 }],
        rate: 8,
        tiles: [
          { id: "a", label: "Counted twice", icon: "check", hue: "green", value: "{dupsLeft}", note: "click IDs deduplicated", mood: "good" },
          { id: "b", label: "After a crash", icon: "replay", hue: "green", value: "same counts", note: "state and offsets saved together", mood: "good" },
          { id: "c", label: "Billing", icon: "sheet", hue: "violet", value: "recounted", note: "nightly, from the raw log" },
        ],
      },
    ],
    widgets: {
      counts: [
        { kind: "meter", output: "dbBusyPct", max: 100, text: "{dbBusyPct} busy" },
        { kind: "text", text: "Lost: {dbFailPct}", when: { output: "dbFailPct", above: 0 } },
      ],
      agg: [{ kind: "custom", name: "watermark" }],
    },
    states: [{ node: "counts", cls: "tx-hot", when: { output: "dbBusyPct", above: 100 } }],
  },
};
