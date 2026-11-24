import type { SceneSpec } from "@tintelix/schema";

type Hop = [string, 1 | -1, string];
const path = (...hops: Hop[]) => hops.map(([wire, dir, at]) => ({ wire, dir, at }));

/**
 * Servers feed collectors into the metrics store along the top; dashboards read it from the right. One
 * series' history sits under the store; alerting and the person on call appear at the bottom left.
 */
export const metricsScene: SceneSpec = {
  kind: "board",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 28, w: 984, h: 418 },
  nodes: {
    hosts: { x: 16, y: 60, w: 150, h: 84, kind: "users", label: "Servers", sub: "60,000" },
    collect: { x: 210, y: 56, w: 200, h: 92, kind: "app", label: "Collectors", sub: "scrape every 15 s" },
    tsdb: { x: 470, y: 40, w: 290, h: 150, kind: "db", label: "Metrics store", sub: "time series" },
    dash: { x: 830, y: 60, w: 154, h: 84, kind: "users", label: "Dashboards", sub: "teams" },
    history: { x: 470, y: 236, w: 290, h: 150, kind: "curve", label: "One series", sub: "", hidden: true },
    alerts: { x: 210, y: 300, w: 200, h: 92, kind: "services", label: "Alerting", sub: "rules every 30 s", hidden: true },
    oncall: { x: 16, y: 304, w: 150, h: 84, kind: "users", label: "On call", sub: "paged", hidden: true },
  },
  wires: {
    h_c: { from: [166, 102], to: [210, 102] },
    c_t: { from: [410, 102], to: [470, 102] },
    d_t: { from: [830, 102], to: [760, 102] },
    a_t: { from: [410, 330], to: [520, 190] },
    a_o: { from: [210, 346], to: [166, 346] },
  },
  board: {
    legend: [["cyan", "samples, queries"], ["amber", "an alert"], ["green", "done"], ["red", "dropped"]],
    flows: {
      ingest: { from: "hosts", path: path(["h_c", 1, "collect"], ["c_t", 1, "tsdb"]), color: "cyan", small: true, fail: { at: "tsdb", share: "dbFailPct" } },
      query: { from: "dash", path: path(["d_t", 1, "tsdb"]), color: "cyan", back: "green", fail: { at: "tsdb", share: "dbFailPct" } },
      alert: { from: "alerts", path: path(["a_t", 1, "tsdb"], ["a_t", -1, "alerts"], ["a_o", 1, "oncall"]), color: "amber" },
    },
    modes: [
      {
        flows: [],
        tiles: [
          { id: "a", label: "Series", icon: "list", hue: "cyan", value: "{seriesM} million", note: "{hosts} servers × {perHost}" },
          { id: "b", label: "Samples", icon: "activity", hue: "violet", value: "{sampleRate}/s", note: "each series every {scrapeSec}" },
          { id: "c", label: "Raw data", icon: "db", hue: "amber", value: "{rawTbDay} TB/day", note: "{sampleBytes} bytes a sample" },
        ],
      },
      {
        flows: [{ flow: "ingest", weight: 3 }, { flow: "query", weight: 1 }],
        rate: 4,
        tiles: [
          { id: "a", label: "Samples now", icon: "activity", hue: "cyan", value: "{dbWrites}/s", note: "launch" },
          { id: "b", label: "Database busy", icon: "db", hue: "violet", value: "{dbBusyPct}", note: "{dbCap} writes a second", mood: "good", moodIf: { output: "dbBusyPct", above: 100, mood: "bad" } },
          { id: "c", label: "Stored as", icon: "sheet", hue: "amber", value: "rows", note: "{sampleBytes} bytes each" },
        ],
      },
      {
        flows: [{ flow: "ingest", weight: 3 }, { flow: "query", weight: 1 }],
        rate: 8,
        tiles: [
          { id: "a", label: "Samples now", icon: "activity", hue: "cyan", value: "{dbWrites}/s", note: "full size" },
          { id: "b", label: "Database busy", icon: "db", hue: "violet", value: "{dbBusyPct}", note: "{dbFailPct} dropped", mood: "good", moodIf: { output: "dbBusyPct", above: 100, mood: "bad" } },
          { id: "c", label: "A 30-day graph", icon: "alert", hue: "amber", value: "{rawPoints} points", note: "per series, every refresh", mood: "bad" },
        ],
      },
      {
        flows: [{ flow: "ingest", weight: 3 }, { flow: "query", weight: 1 }],
        rate: 8,
        tiles: [
          { id: "a", label: "Store nodes", icon: "blocks", hue: "cyan", value: "{nodes}", note: "series split by hash" },
          { id: "b", label: "Each node busy", icon: "db", hue: "green", value: "{dbBusyPct}", note: "appends in time order", mood: "good", moodIf: { output: "dbBusyPct", above: 100, mood: "bad" } },
          { id: "c", label: "On disk", icon: "sheet", hue: "violet", value: "{compGbDay} GB/day", note: "about {compBytes} bytes a sample" },
        ],
      },
      {
        flows: [{ flow: "ingest", weight: 3 }, { flow: "query", weight: 1 }],
        rate: 8,
        tiles: [
          { id: "a", label: "A 30-day graph", icon: "activity", hue: "green", value: "{rollupPoints} points", note: "hourly rollups", mood: "good" },
          { id: "b", label: "Two years kept", icon: "db", hue: "cyan", value: "{rollupTb} TB", note: "{rawTb2y} TB if all raw" },
          { id: "c", label: "Raw points kept", icon: "hourglass", hue: "violet", value: "{rawDays} days", note: "then 1 min, then 1 h" },
        ],
      },
      {
        flows: [{ flow: "ingest", weight: 3 }, { flow: "query", weight: 1 }, { flow: "alert", weight: 1 }],
        rate: 8,
        tiles: [
          { id: "a", label: "One bad label", icon: "alert", hue: "amber", value: "{badSeries}", note: "series from one metric", mood: "good", moodIf: { output: "badSeries", above: 100000, mood: "bad" } },
          { id: "b", label: "Its memory", icon: "server", hue: "violet", value: "{seriesMemMb} MB", note: "about {seriesKb} KB a series" },
          { id: "c", label: "Page when", icon: "bolt", hue: "green", value: "users feel it", note: "errors or p95, for 5 min", mood: "good" },
        ],
      },
    ],
    widgets: {
      tsdb: [
        { kind: "meter", output: "dbBusyPct", max: 100, text: "{dbBusyPct} busy" },
        { kind: "text", text: "Dropped: {dbFailPct}", when: { output: "dbFailPct", above: 0 } },
      ],
      history: [{ kind: "custom", name: "rollup" }],
    },
    states: [{ node: "tsdb", cls: "tx-hot", when: { output: "dbBusyPct", above: 100 } }],
  },
};
