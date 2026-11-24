import type { SceneSpec } from "@tintelix/schema";

/**
 * Bandwidth and throughput: a file server in London sending to a laptop in Mumbai down a 100 Mbit/s
 * pipe. Lost packets turn red (drawn 20 times as often as they happen, so they can be seen). Below, the
 * pipe's width against what actually arrives.
 */
export const bandwidthScene: SceneSpec = {
  kind: "board",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 36, w: 984, h: 412 },
  nodes: {
    server: { x: 20, y: 70, w: 200, h: 84, kind: "origin", label: "File server", sub: "London" },
    net: { x: 400, y: 70, w: 200, h: 84, kind: "edge", label: "The path", sub: "loses {lossPct}" },
    laptop: { x: 780, y: 70, w: 200, h: 84, kind: "users", label: "Laptop, Mumbai", sub: "100 Mbit/s plan" },
    pipe: { x: 20, y: 190, w: 960, h: 256, kind: "curve", label: "The pipe and what arrives", sub: "one TCP connection" },
  },
  wires: {
    s_n: { from: [220, 112], to: [400, 112] },
    n_l: { from: [600, 112], to: [780, 112] },
  },
  board: {
    legend: [["cyan", "data"], ["green", "ACK"], ["red", "lost (drawn 20× as often)"]],
    flows: {
      data: {
        from: "server",
        path: [{ wire: "s_n", dir: 1, at: "net" }, { wire: "n_l", dir: 1, at: "laptop" }],
        color: "cyan",
        back: "green",
        small: true,
        fail: { at: "net", share: "lostShownPct" },
      },
    },
    modes: [0, 1, 2, 3, 4].map((m) => ({
      flows: [{ flow: "data", weight: 1 }],
      rate: 5,
      tiles: [
        [
          { id: "a", label: "Plan", icon: "gauge", hue: "violet" as const, value: "{bandwidthMbps} Mbit/s", note: "what you pay for" },
          { id: "b", label: "100 MB should take", icon: "timer", hue: "cyan" as const, value: "{idealSec}", note: "at full speed" },
          { id: "c", label: "It takes", icon: "alert", hue: "amber" as const, value: "{actualSec}", note: "from London", mood: "bad" as const },
        ],
        [
          { id: "a", label: "Bandwidth", icon: "gauge", hue: "violet" as const, value: "{bandwidthMbps} Mbit/s", note: "how wide the pipe is" },
          { id: "b", label: "Throughput", icon: "activity", hue: "cyan" as const, value: "{throughputMbps} Mbit/s", note: "what actually arrives" },
          { id: "c", label: "Latency", icon: "timer", hue: "amber" as const, value: "{rttMs}", note: "how long each bit takes" },
        ],
        [
          { id: "a", label: "In flight to fill it", icon: "blocks", hue: "violet" as const, value: "{bdpKB} KB", note: "bandwidth × round trip" },
          { id: "b", label: "Round trip", icon: "timer", hue: "amber" as const, value: "{rttMs}", note: "before an ACK returns" },
          { id: "c", label: "TCP starts with", icon: "spark", hue: "cyan" as const, value: "About 14 KB", note: "and doubles each round trip" },
        ],
        [
          { id: "a", label: "Loss", icon: "alert", hue: "amber" as const, value: "{lossPct}", note: "read as congestion" },
          { id: "b", label: "TCP allows", icon: "activity", hue: "cyan" as const, value: "{lossLimitMbps} Mbit/s", note: "at {rttMs} and {lossPct} loss" },
          { id: "c", label: "Pipe used", icon: "gauge", hue: "violet" as const, value: "{utilPct}", note: "of {bandwidthMbps} Mbit/s", mood: "good" as const, moodIf: { output: "utilPct", below: 50, mood: "bad" as const } },
        ],
        [
          { id: "a", label: "Throughput", icon: "activity", hue: "cyan" as const, value: "{throughputMbps} Mbit/s", note: "of {bandwidthMbps}" },
          { id: "b", label: "100 MB takes", icon: "timer", hue: "green" as const, value: "{actualSec}", note: "best case {idealSec}" },
          { id: "c", label: "Pipe used", icon: "gauge", hue: "violet" as const, value: "{utilPct}", note: "closer and cleaner helps", mood: "good" as const, moodIf: { output: "utilPct", below: 50, mood: "bad" as const } },
        ],
      ][m]!,
    })),
    widgets: { pipe: [{ kind: "custom", name: "pipe" }] },
    subs: { net: "loses {lossPct}", laptop: "{bandwidthMbps} Mbit/s plan" },
  },
};
