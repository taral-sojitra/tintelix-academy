import type { SceneSpec } from "@tintelix/schema";

type Hop = [string, 1 | -1, string];
const path = (...hops: Hop[]) => hops.map(([wire, dir, at]) => ({ wire, dir, at }));

/**
 * People ask the query service, which searches the vector index (top middle) and then asks the model
 * servers (bottom middle). The documents and the embedder that keeps the index fresh appear on the right.
 */
export const ragScene: SceneSpec = {
  kind: "board",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 28, w: 984, h: 418 },
  nodes: {
    people: { x: 16, y: 60, w: 150, h: 84, kind: "users", label: "People", sub: "asking" },
    api: { x: 200, y: 56, w: 180, h: 96, kind: "app", label: "Query service", sub: "find, then ask" },
    index: { x: 430, y: 34, w: 320, h: 196, kind: "cache", label: "Vector index", sub: "passages by meaning" },
    gpu: { x: 430, y: 286, w: 260, h: 130, kind: "services", label: "Model servers", sub: "GPUs" },
    embed: { x: 800, y: 60, w: 184, h: 100, kind: "services", label: "Embedder", sub: "chunk, embed", hidden: true },
    docs: { x: 800, y: 300, w: 184, h: 110, kind: "db", label: "Documents", sub: "the source", hidden: true },
  },
  wires: {
    u_a: { from: [166, 102], to: [200, 102] },
    a_i: { from: [380, 102], to: [430, 102] },
    a_g: { from: [380, 140], to: [480, 286] },
    d_e: { from: [892, 300], to: [892, 160] },
    e_i: { from: [800, 110], to: [750, 110] },
  },
  board: {
    legend: [["cyan", "a question"], ["violet", "a changed document"], ["green", "answered"], ["red", "waiting too long"]],
    flows: {
      ask: {
        from: "people",
        path: path(["u_a", 1, "api"], ["a_i", 1, "index"], ["a_i", -1, "api"], ["a_g", 1, "gpu"]),
        color: "cyan",
        back: "green",
        fail: { at: "gpu", share: "gpuFailPct" },
        float: { at: "gpu", text: "answer + 5 sources", color: "green", chance: 0.1 },
      },
      cached: { from: "people", path: path(["u_a", 1, "api"]), color: "cyan", back: "green" },
      ingest: { from: "docs", path: path(["d_e", 1, "embed"], ["e_i", 1, "index"]), color: "violet", small: true },
    },
    modes: [
      {
        flows: [],
        tiles: [
          { id: "a", label: "Documents", icon: "sheet", hue: "cyan", value: "{docsM} million", note: "{chunksM} million passages" },
          { id: "b", label: "Questions", icon: "activity", hue: "violet", value: "{qps}/s", note: "{queriesPerHour} an hour at peak" },
          { id: "c", label: "Vectors", icon: "db", hue: "amber", value: "{vectorGb} GB", note: "{dims} numbers each" },
        ],
      },
      {
        flows: [{ flow: "ask", weight: 1 }],
        rate: 3,
        tiles: [
          { id: "a", label: "Retrieval", icon: "bolt", hue: "green", value: "{retrievalMs}", note: "top {topK} of {chunksM} million", mood: "good" },
          { id: "b", label: "GPU busy", icon: "server", hue: "violet", value: "{gpuBusyPct}", note: "one GPU, one answer at a time", mood: "good", moodIf: { output: "gpuBusyPct", above: 100, mood: "bad" } },
          { id: "c", label: "Answers", icon: "check", hue: "cyan", value: "cite sources", note: "from your documents" },
        ],
      },
      {
        flows: [{ flow: "ask", weight: 1 }],
        rate: 8,
        tiles: [
          { id: "a", label: "Answers in progress", icon: "activity", hue: "cyan", value: "{inFlight}", note: "{qps}/s × {genSec} each" },
          { id: "b", label: "GPU busy", icon: "server", hue: "violet", value: "{gpuBusyPct}", note: "{gpuFailPct} wait too long", mood: "good", moodIf: { output: "gpuBusyPct", above: 100, mood: "bad" } },
          { id: "c", label: "One answer per GPU", icon: "alert", hue: "amber", value: "{unbatchedGpus} GPUs", note: "to keep up at peak", mood: "bad" },
        ],
      },
      {
        flows: [{ flow: "ask", weight: 1 }],
        rate: 8,
        tiles: [
          { id: "a", label: "GPUs", icon: "server", hue: "green", value: "{gpusNeeded}", note: "{perGpu} answers each, batched", mood: "good" },
          { id: "b", label: "GPU busy", icon: "gauge", hue: "violet", value: "{gpuBusyPct}", note: "{inFlight} answers in progress", mood: "good", moodIf: { output: "gpuBusyPct", above: 100, mood: "bad" } },
          { id: "c", label: "Batch wait", icon: "hourglass", hue: "amber", value: "tens of ms", note: "against {genSec} to answer" },
        ],
      },
      {
        flows: [{ flow: "ask", weight: 2 }, { flow: "ingest", weight: 2 }],
        rate: 8,
        tiles: [
          { id: "a", label: "Re-embedding", icon: "replay", hue: "violet", value: "{embedRate}/s", note: "fed by change capture" },
          { id: "b", label: "A bulk edit", icon: "alert", hue: "amber", value: "{staleSec} stale", note: "{changedDocs} documents" },
          { id: "c", label: "Deletes", icon: "check", hue: "cyan", value: "tombstones", note: "vectors removed too" },
        ],
      },
      {
        flows: [{ flow: "ask", weight: "cacheMissPct" }, { flow: "cached", weight: "cacheHitPct" }, { flow: "ingest", weight: 20 }],
        rate: 8,
        tiles: [
          { id: "a", label: "From the cache", icon: "bolt", hue: "green", value: "{cacheHitPct}", note: "repeated questions", mood: "good" },
          { id: "b", label: "GPU busy", icon: "server", hue: "violet", value: "{gpuBusyPct}", note: "on {gpusNeeded} GPUs", mood: "good", moodIf: { output: "gpuBusyPct", above: 100, mood: "bad" } },
          { id: "c", label: "Retrieval", icon: "users", hue: "cyan", value: "yours only", note: "filtered by permission" },
        ],
      },
    ],
    widgets: {
      index: [{ kind: "custom", name: "funnel" }],
      gpu: [
        { kind: "meter", output: "gpuBusyPct", max: 100, text: "{gpuBusyPct} busy" },
        { kind: "text", text: "Waiting too long: {gpuFailPct}", when: { output: "gpuFailPct", above: 0 } },
      ],
    },
    states: [{ node: "gpu", cls: "tx-hot", when: { output: "gpuBusyPct", above: 100 } }],
  },
};
