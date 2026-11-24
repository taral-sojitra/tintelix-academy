import type { SceneSpec } from "@tintelix/schema";

type Hop = [string, 1 | -1, string];
const path = (...hops: Hop[]) => hops.map(([wire, dir, at]) => ({ wire, dir, at }));

/**
 * Producers write to the brokers top left; the topic's partitions show underneath; follower copies sit to
 * the right of the brokers. Two consumer groups read from the right: billing at the top, analytics below.
 */
export const mqScene: SceneSpec = {
  kind: "board",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 28, w: 984, h: 418 },
  nodes: {
    producers: { x: 16, y: 40, w: 150, h: 84, kind: "users", label: "Producers", sub: "apps writing" },
    broker: { x: 220, y: 40, w: 300, h: 120, kind: "services", label: "Brokers", sub: "the topic" },
    followers: { x: 580, y: 100, w: 170, h: 84, kind: "services", label: "Copies", sub: "followers", hidden: true },
    parts: { x: 220, y: 234, w: 390, h: 206, kind: "curve", label: "Topic: orders", sub: "", hidden: true },
    billing: { x: 830, y: 34, w: 154, h: 84, kind: "users", label: "Billing", sub: "group A" },
    analytics: { x: 830, y: 330, w: 154, h: 84, kind: "users", label: "Analytics", sub: "group B", hidden: true },
  },
  wires: {
    p_b: { from: [166, 82], to: [220, 82] },
    b_f: { from: [520, 140], to: [580, 140] },
    c_b: { from: [830, 70], to: [520, 70] },
    a_b: { from: [830, 372], to: [470, 160] },
  },
  board: {
    legend: [["cyan", "a message"], ["green", "stored or read"], ["red", "refused"]],
    flows: {
      produce: { from: "producers", path: path(["p_b", 1, "broker"]), color: "cyan", back: "green", fail: { at: "broker", share: "brokerFailPct" } },
      replicate: { from: "producers", path: path(["p_b", 1, "broker"], ["b_f", 1, "followers"]), color: "cyan", back: "green" },
      readA: { from: "billing", path: path(["c_b", 1, "broker"]), color: "cyan", back: "green", fail: { at: "broker", share: "brokerFailPct" } },
      readB: { from: "analytics", path: path(["a_b", 1, "broker"]), color: "cyan", back: "green" },
    },
    modes: [
      {
        flows: [],
        tiles: [
          { id: "a", label: "Messages in", icon: "activity", hue: "cyan", value: "{msgRate}/s", note: "{msgKb} KB each" },
          { id: "b", label: "Into the system", icon: "gauge", hue: "violet", value: "{ingressGBs} GB/s", note: "at peak" },
          { id: "c", label: "Readers", icon: "users", hue: "amber", value: "several teams", note: "each wants everything" },
        ],
      },
      {
        flows: [{ flow: "produce", weight: 2 }, { flow: "readA", weight: 1 }],
        rate: 4,
        tiles: [
          { id: "a", label: "Messages now", icon: "activity", hue: "cyan", value: "{launchRate}/s", note: "launch" },
          { id: "b", label: "Broker busy", icon: "server", hue: "violet", value: "{brokerBusyPct}", note: "its disk takes {brokerMBs} MB/s", mood: "good", moodIf: { output: "brokerBusyPct", above: 100, mood: "bad" } },
          { id: "c", label: "Read once", icon: "sheet", hue: "amber", value: "then deleted", note: "one team gets it" },
        ],
      },
      {
        flows: [{ flow: "produce", weight: 2 }, { flow: "readA", weight: 1 }],
        rate: 8,
        tiles: [
          { id: "a", label: "Messages now", icon: "activity", hue: "cyan", value: "{msgRate}/s", note: "full size" },
          { id: "b", label: "Broker busy", icon: "server", hue: "violet", value: "{brokerBusyPct}", note: "{brokerFailPct} refused", mood: "good", moodIf: { output: "brokerBusyPct", above: 100, mood: "bad" } },
          { id: "c", label: "A second team", icon: "alert", hue: "amber", value: "gets nothing", note: "deleted on read", mood: "bad" },
        ],
      },
      {
        flows: [{ flow: "produce", weight: 2 }, { flow: "readA", weight: 1 }],
        rate: 8,
        tiles: [
          { id: "a", label: "Partitions", icon: "blocks", hue: "cyan", value: "{partitions}", note: "across {brokers} brokers" },
          { id: "b", label: "Brokers busy", icon: "server", hue: "green", value: "{brokerBusyPct}", note: "appends only", mood: "good", moodIf: { output: "brokerBusyPct", above: 100, mood: "bad" } },
          { id: "c", label: "Kept", icon: "hourglass", hue: "violet", value: "{retentionDays} days", note: "{retainedPb} PB, read or not" },
        ],
      },
      {
        flows: [{ flow: "replicate", weight: 2 }, { flow: "readA", weight: 1 }],
        rate: 8,
        tiles: [
          { id: "a", label: "Copies", icon: "sheet", hue: "cyan", value: "{rf}", note: "a leader and followers" },
          { id: "b", label: "Brokers busy", icon: "server", hue: "green", value: "{brokerBusyPct}", note: "every write ×{rf}", mood: "good", moodIf: { output: "brokerBusyPct", above: 100, mood: "bad" } },
          { id: "c", label: "Kept", icon: "hourglass", hue: "violet", value: "{retainedPb} PB", note: "all copies, {retentionDays} days" },
        ],
      },
      {
        flows: [{ flow: "replicate", weight: 2 }, { flow: "readA", weight: 1 }, { flow: "readB", weight: 1 }],
        rate: 8,
        tiles: [
          { id: "a", label: "Consumers busy", icon: "users", hue: "cyan", value: "{activeConsumers}", note: "{idleConsumers} idle" },
          { id: "b", label: "Read rate", icon: "activity", hue: "green", value: "{consumeRate}/s", note: "{lagGrowth}/s falling behind", mood: "good", moodIf: { output: "lagGrowth", above: 0, mood: "bad" } },
          { id: "c", label: "Groups", icon: "list", hue: "violet", value: "{groups}", note: "each with its own offsets" },
        ],
      },
    ],
    widgets: {
      broker: [
        { kind: "meter", output: "brokerBusyPct", max: 100, text: "{brokerBusyPct} busy" },
        { kind: "text", text: "Refused: {brokerFailPct}", when: { output: "brokerFailPct", above: 0 } },
      ],
      parts: [{ kind: "custom", name: "partitions" }],
    },
    states: [{ node: "broker", cls: "tx-hot", when: { output: "brokerBusyPct", above: 100 } }],
  },
};
