import type { SceneSpec } from "@tintelix/schema";

/**
 * Shoppers and a coordinator on the left; the replicas that hold one cart's key stacked on the right
 * (A, then B and C once the lesson copies it, then D, the next node on the ring, for hinted handoff).
 * The quorum picture sits top right and the cart's versions bottom left.
 */
export const kvScene: SceneSpec = {
  kind: "board",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 28, w: 984, h: 418 },
  nodes: {
    users: { x: 24, y: 190, w: 170, h: 84, kind: "users", label: "Shoppers", sub: "updating carts" },
    coord: { x: 250, y: 190, w: 200, h: 84, kind: "app", label: "Coordinator", sub: "any node can be one" },
    nodeA: { x: 540, y: 36, w: 200, h: 84, kind: "db", label: "Node A", sub: "replica 1" },
    nodeB: { x: 540, y: 140, w: 200, h: 84, kind: "db", label: "Node B", sub: "replica 2", hidden: true },
    nodeC: { x: 540, y: 244, w: 200, h: 84, kind: "db", label: "Node C", sub: "replica 3", hidden: true },
    nodeD: { x: 540, y: 348, w: 200, h: 84, kind: "db", label: "Node D", sub: "next on the ring", hidden: true },
    quorum: { x: 770, y: 36, w: 214, h: 190, kind: "curve", label: "Quorum", sub: "", hidden: true },
    vc: { x: 16, y: 290, w: 500, h: 150, kind: "curve", label: "One cart, two writers", sub: "", hidden: true },
  },
  wires: {
    u_c: { from: [194, 232], to: [250, 232] },
    c_a: { from: [450, 214], to: [540, 78] },
    c_b: { from: [450, 226], to: [540, 182] },
    c_cc: { from: [450, 238], to: [540, 286] },
    c_d: { from: [450, 252], to: [540, 390] },
  },
  board: {
    legend: [["cyan", "read or write"], ["green", "answered"], ["red", "failed"], ["amber", "hinted write"]],
    flows: {
      toA: { path: [{ wire: "u_c", dir: 1, at: "coord" }, { wire: "c_a", dir: 1, at: "nodeA" }], color: "cyan", back: "green", fail: { at: "nodeA", share: "aDownPct" } },
      toB: { path: [{ wire: "u_c", dir: 1, at: "coord" }, { wire: "c_b", dir: 1, at: "nodeB" }], color: "cyan", back: "green", fail: { at: "nodeB", share: "bDownPct" } },
      toC: { path: [{ wire: "u_c", dir: 1, at: "coord" }, { wire: "c_cc", dir: 1, at: "nodeC" }], color: "cyan", back: "green" },
      toD: {
        path: [{ wire: "u_c", dir: 1, at: "coord" }, { wire: "c_d", dir: 1, at: "nodeD" }],
        color: "amber",
        back: "green",
        float: { at: "nodeD", text: "hint: belongs to B", color: "amber", chance: 0.2 },
      },
    },
    modes: [
      {
        flows: [{ flow: "toA", weight: 1 }],
        rate: 4,
        tiles: [
          { id: "a", label: "Data", icon: "db", hue: "violet", value: "{dataTb} TB", note: "carts and sessions" },
          { id: "b", label: "Traffic", icon: "activity", hue: "cyan", value: "{trafficRate}/s", note: "{writeRate} of them writes" },
          { id: "c", label: "Copies of a key", icon: "blocks", hue: "amber", value: "1", note: "{nodesSingle} nodes, {sliceTb} TB each" },
        ],
      },
      {
        flows: [{ flow: "toA", weight: 1 }],
        rate: 4,
        tiles: [
          { id: "a", label: "Node A", icon: "alert", hue: "amber", value: "down", note: "no other copy", mood: "bad" },
          { id: "b", label: "Keys out of reach", icon: "db", hue: "violet", value: "{downKeysPct}", note: "can't be read or written", mood: "bad" },
          { id: "c", label: "Copies of a key", icon: "blocks", hue: "amber", value: "1", note: "nowhere else to go", mood: "bad" },
        ],
      },
      {
        flows: [{ flow: "toA", weight: 1 }, { flow: "toB", weight: 1 }, { flow: "toC", weight: 1 }],
        rate: 6,
        tiles: [
          { id: "a", label: "Write waits", icon: "spark", hue: "green", value: "{writeLatencyMs}", note: "W = {writeQuorum} of N = {replicas}" },
          { id: "b", label: "Read waits", icon: "target", hue: "violet", value: "{readLatencyMs}", note: "R = {readQuorum}" },
          { id: "c", label: "Stale reads", icon: "clock", hue: "amber", value: "{staleReadPct}", note: "right after a write", mood: "good", moodIf: { output: "staleReadPct", above: 0, mood: "bad" } },
        ],
      },
      {
        flows: [{ flow: "toA", weight: 1 }, { flow: "toB", weight: 0.5 }, { flow: "toC", weight: 1 }, { flow: "toD", weight: 1 }],
        rate: 6,
        tiles: [
          { id: "a", label: "Node B", icon: "alert", hue: "amber", value: "down", note: "its writes go to D", mood: "bad" },
          { id: "b", label: "Writes accepted", icon: "check", hue: "green", value: "{writeOkPct}", note: "W = {writeQuorum} still reachable", mood: "good", moodIf: { output: "writeOkPct", below: 100, mood: "bad" } },
          { id: "c", label: "Hints on node D", icon: "stack", hue: "violet", value: "{hintsHeld}", note: "handed back when B returns" },
        ],
      },
      {
        flows: [{ flow: "toA", weight: 1 }, { flow: "toB", weight: 1 }, { flow: "toC", weight: 1 }],
        rate: 5,
        tiles: [
          { id: "a", label: "Versions of the cart", icon: "blocks", hue: "violet", value: "{siblings}", note: "concurrent writes kept as siblings" },
          { id: "b", label: "Items lost", icon: "check", hue: "green", value: "none", note: "the app merges the siblings", mood: "good" },
          { id: "c", label: "Copies of a key", icon: "db", hue: "cyan", value: "{replicas}", note: "{nodes} nodes in the ring" },
        ],
      },
    ],
    widgets: {
      nodeA: [{ kind: "text", text: "Down: no other copy", when: { output: "aDownPct", above: 0 } }],
      nodeB: [{ kind: "text", text: "Down: its writes go to D", when: { output: "bDownPct", above: 0 } }],
      quorum: [{ kind: "custom", name: "quorum" }],
      vc: [
        {
          kind: "log",
          lines: [
            { text: "v1 [A:1] · socks" },
            { text: "split: A writes [A:2] · socks, shoes", when: { output: "vcPhase", above: 0.5 } },
            { text: "split: C writes [A:1, C:1] · socks, hat", when: { output: "vcPhase", above: 0.5 } },
            { text: "read: neither clock is newer → 2 siblings", when: { output: "vcPhase", above: 1.5 } },
            { text: "app merges: [A:2, C:1] · socks, shoes, hat", when: { output: "vcPhase", above: 2.5 } },
          ],
        },
      ],
    },
    states: [
      { node: "nodeA", cls: "tx-down", when: { output: "aDownPct", above: 0 } },
      { node: "nodeB", cls: "tx-down", when: { output: "bDownPct", above: 0 } },
    ],
  },
};
