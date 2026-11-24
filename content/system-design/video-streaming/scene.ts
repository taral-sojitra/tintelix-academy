import type { SceneSpec } from "@tintelix/schema";

type Hop = [string, 1 | -1, string];
const path = (...hops: Hop[]) => hops.map(([wire, dir, at]) => ({ wire, dir, at }));

/**
 * New titles enter at the top left and go through the encoders into the video store on the right. Viewers
 * sit at the bottom left: first streaming straight from the store, later from a CDN inside their providers.
 */
export const videoScene: SceneSpec = {
  kind: "board",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 28, w: 984, h: 418 },
  nodes: {
    uploads: { x: 16, y: 40, w: 160, h: 84, kind: "users", label: "New titles", sub: "a master file", hidden: true },
    viewers: { x: 16, y: 300, w: 160, h: 84, kind: "users", label: "Viewers", sub: "every network" },
    workers: { x: 230, y: 34, w: 330, h: 176, kind: "services", label: "Encoders", sub: "a queue feeds the pool", hidden: true },
    cdn: { x: 300, y: 300, w: 260, h: 120, kind: "edge", label: "CDN in providers", sub: "titles pushed ahead", hidden: true },
    store: { x: 690, y: 150, w: 280, h: 130, kind: "origin", label: "Video store", sub: "segments, every quality" },
  },
  wires: {
    u_w: { from: [176, 82], to: [230, 82] },
    w_s: { from: [560, 122], to: [690, 190] },
    v_s: { from: [176, 322], to: [690, 232] },
    v_c: { from: [176, 352], to: [300, 352] },
    c_s: { from: [560, 352], to: [690, 262] },
  },
  board: {
    legend: [["cyan", "a segment asked for"], ["violet", "a new title"], ["green", "delivered"], ["red", "stalled"]],
    flows: {
      upload: { from: "uploads", path: path(["u_w", 1, "workers"], ["w_s", 1, "store"]), color: "violet", back: "green" },
      direct: { from: "viewers", path: path(["v_s", 1, "store"]), color: "cyan", back: "green", fail: { at: "store", share: "originFailPct" } },
      edgeHit: { from: "viewers", path: path(["v_c", 1, "cdn"]), color: "cyan", small: true, back: "green" },
      edgeMiss: {
        from: "viewers",
        path: path(["v_c", 1, "cdn"], ["c_s", 1, "store"]),
        color: "cyan",
        back: "green",
        fail: { at: "store", share: "originFailPct" },
      },
    },
    modes: [
      {
        flows: [],
        tiles: [
          { id: "a", label: "Streams at peak", icon: "play", hue: "cyan", value: "{streamsM} million", note: "{mbps} Mbps each, on average" },
          { id: "b", label: "Peak traffic", icon: "activity", hue: "violet", value: "{peakTbps} Tbps", note: "every second of the peak" },
          { id: "c", label: "Library", icon: "db", hue: "amber", value: "{libraryPb} PB", note: "{libraryHours} hours, every quality" },
        ],
      },
      {
        flows: [{ flow: "direct", weight: 1 }],
        rate: 4,
        tiles: [
          { id: "a", label: "Streams now", icon: "play", hue: "cyan", value: "{launchStreams}", note: "launch traffic" },
          { id: "b", label: "Store busy", icon: "db", hue: "violet", value: "{originBusyPct}", note: "it can send {originCapTbps} Tbps", mood: "good", moodIf: { output: "originBusyPct", above: 100, mood: "bad" } },
          { id: "c", label: "Quality", icon: "sheet", hue: "amber", value: "one file", note: "as it was uploaded" },
        ],
      },
      {
        flows: [{ flow: "direct", weight: 1 }],
        rate: 8,
        tiles: [
          { id: "a", label: "Peak traffic", icon: "activity", hue: "cyan", value: "{originTbps} Tbps", note: "all from one place" },
          { id: "b", label: "Store busy", icon: "db", hue: "violet", value: "{originBusyPct}", note: "{originFailPct} of segments stall", mood: "good", moodIf: { output: "originBusyPct", above: 100, mood: "bad" } },
          { id: "c", label: "Slow networks", icon: "alert", hue: "amber", value: "stall too", note: "one quality for everyone", mood: "bad" },
        ],
      },
      {
        flows: [{ flow: "upload", weight: 2 }, { flow: "direct", weight: 3 }],
        rate: 6,
        tiles: [
          { id: "a", label: "Qualities", icon: "blocks", hue: "violet", value: "{renditions}", note: "240p up to 4K" },
          { id: "b", label: "Ready to play", icon: "timer", hue: "green", value: "{parallelSec}", note: "{segments} segments at once", mood: "good" },
          { id: "c", label: "On one machine", icon: "hourglass", hue: "amber", value: "{serialMin} min", note: "start to end" },
        ],
      },
      {
        flows: [{ flow: "edgeHit", weight: "liveHitPct" }, { flow: "edgeMiss", weight: "edgeMissPct" }],
        rate: 8,
        tiles: [
          { id: "a", label: "Served at the edge", icon: "edge", hue: "green", value: "{liveHitPct}", note: "pushed there overnight", mood: "good", moodIf: { output: "liveHitPct", below: 90, mood: "bad" } },
          { id: "b", label: "Origin traffic", icon: "activity", hue: "cyan", value: "{originTbps} Tbps", note: "only the misses" },
          { id: "c", label: "Store busy", icon: "db", hue: "violet", value: "{originBusyPct}", note: "it can send {originCapTbps} Tbps", mood: "good", moodIf: { output: "originBusyPct", above: 100, mood: "bad" } },
        ],
      },
      {
        flows: [{ flow: "edgeHit", weight: "liveHitPct" }, { flow: "edgeMiss", weight: "edgeMissPct" }],
        rate: 8,
        tiles: [
          { id: "a", label: "Served at the edge", icon: "edge", hue: "amber", value: "{liveHitPct}", note: "no copies of the new title", mood: "bad" },
          { id: "b", label: "Origin traffic", icon: "activity", hue: "cyan", value: "{originTbps} Tbps", note: "{newTitlePct} start the new title" },
          { id: "c", label: "Store busy", icon: "db", hue: "violet", value: "{originBusyPct}", note: "{originFailPct} of segments stall", mood: "good", moodIf: { output: "originBusyPct", above: 100, mood: "bad" } },
        ],
      },
    ],
    widgets: {
      workers: [{ kind: "custom", name: "transcode" }],
      cdn: [{ kind: "meter", output: "liveHitPct", max: 100, text: "{liveHitPct} served here" }],
      store: [
        { kind: "meter", output: "originBusyPct", max: 100, text: "{originBusyPct} busy" },
        { kind: "text", text: "Stalled: {originFailPct}", when: { output: "originFailPct", above: 0 } },
      ],
    },
    states: [{ node: "store", cls: "tx-hot", when: { output: "originBusyPct", above: 100 } }],
  },
};
