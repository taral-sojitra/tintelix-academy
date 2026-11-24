import type { SceneSpec } from "@tintelix/schema";

type Hop = [string, 1 | -1, string];
const path = (...hops: Hop[]) => hops.map(([wire, dir, at]) => ({ wire, dir, at }));

/**
 * The laptop saves through the sync service into storage along the top; file versions (lists of chunk
 * hashes) sit top right. The phone hears about changes from the change feed at the bottom. The chunk
 * panel in the middle right shows what an edit resends.
 */
export const syncScene: SceneSpec = {
  kind: "board",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 28, w: 984, h: 418 },
  nodes: {
    laptop: { x: 16, y: 60, w: 160, h: 84, kind: "users", label: "Laptop", sub: "saves a file" },
    phone: { x: 16, y: 330, w: 160, h: 84, kind: "users", label: "Phone", sub: "same folder" },
    sync: { x: 230, y: 50, w: 240, h: 120, kind: "app", label: "Sync service", sub: "laptop → cloud" },
    storage: { x: 540, y: 40, w: 200, h: 110, kind: "origin", label: "Storage", sub: "the file bytes" },
    versions: { x: 770, y: 40, w: 214, h: 150, kind: "db", label: "File versions", sub: "lists of chunk hashes", hidden: true },
    feed: { x: 230, y: 330, w: 240, h: 90, kind: "services", label: "Change feed", sub: "since your cursor", hidden: true },
    chunks: { x: 540, y: 230, w: 444, h: 124, kind: "curve", label: "One edit, two ways to cut", sub: "", hidden: true },
  },
  wires: {
    l_s: { from: [176, 102], to: [230, 102] },
    s_st: { from: [470, 95], to: [540, 95] },
    s_v: { from: [470, 150], to: [770, 170] },
    s_f: { from: [350, 170], to: [350, 330] },
    p_f: { from: [176, 372], to: [230, 372] },
  },
  board: {
    legend: [["cyan", "a save"], ["violet", "a change notice"], ["green", "stored"], ["red", "failed or a conflict"]],
    flows: {
      whole: { from: "laptop", path: path(["l_s", 1, "sync"], ["s_st", 1, "storage"]), color: "cyan", back: "green", fail: { at: "sync", share: "uploadFailPct" } },
      chunks: {
        from: "laptop",
        path: path(["l_s", 1, "sync"], ["s_st", 1, "storage"], ["s_st", -1, "sync"], ["s_v", 1, "versions"]),
        color: "cyan",
        back: "green",
        fail: { at: "sync", share: "uploadFailPct" },
      },
      notify: { from: "laptop", path: path(["l_s", 1, "sync"], ["s_f", 1, "feed"], ["p_f", -1, "phone"]), color: "violet", small: true },
      offline: {
        from: "phone",
        path: path(["p_f", 1, "feed"], ["s_f", -1, "sync"], ["s_v", 1, "versions"]),
        color: "cyan",
        back: "green",
        fail: { at: "versions", share: "conflictPct" },
        float: { at: "versions", text: "phone's edit synced", color: "green", chance: 0.1 },
      },
    },
    modes: [
      {
        flows: [],
        tiles: [
          { id: "a", label: "Devices syncing", icon: "users", hue: "cyan", value: "{devicesM} million", note: "{accountsM} million accounts" },
          { id: "b", label: "Changes at peak", icon: "activity", hue: "violet", value: "{peakRate}/s", note: "saves, renames, deletes" },
          { id: "c", label: "Stored", icon: "db", hue: "amber", value: "{storagePb} PB", note: "{storageGbPer} GB an account" },
        ],
      },
      {
        flows: [{ flow: "whole", weight: 1 }],
        rate: 4,
        tiles: [
          { id: "a", label: "Uploads now", icon: "activity", hue: "cyan", value: "{ingressGBs} GB/s", note: "whole files, launch" },
          { id: "b", label: "Upload tier busy", icon: "server", hue: "violet", value: "{uploadBusyPct}", note: "takes {uploadCapGBs} GB/s", mood: "good", moodIf: { output: "uploadBusyPct", above: 100, mood: "bad" } },
          { id: "c", label: "Small edit", icon: "sheet", hue: "amber", value: "whole file", note: "{fileMb} MB every save" },
        ],
      },
      {
        flows: [{ flow: "whole", weight: 1 }],
        rate: 8,
        tiles: [
          { id: "a", label: "Uploads now", icon: "activity", hue: "cyan", value: "{ingressGBs} GB/s", note: "whole files, peak" },
          { id: "b", label: "Upload tier busy", icon: "server", hue: "violet", value: "{uploadBusyPct}", note: "{uploadFailPct} of saves fail", mood: "good", moodIf: { output: "uploadBusyPct", above: 100, mood: "bad" } },
          { id: "c", label: "Offline edits", icon: "alert", hue: "amber", value: "overwritten", note: "the last upload wins", mood: "bad" },
        ],
      },
      {
        flows: [{ flow: "chunks", weight: 1 }],
        rate: 8,
        tiles: [
          { id: "a", label: "Sent per edit", icon: "activity", hue: "cyan", value: "{fixedMovedMb} MB", note: "everything after the edit" },
          { id: "b", label: "Upload tier busy", icon: "server", hue: "violet", value: "{uploadBusyPct}", note: "{uploadFailPct} of saves fail", mood: "good", moodIf: { output: "uploadBusyPct", above: 100, mood: "bad" } },
          { id: "c", label: "Chunks", icon: "blocks", hue: "amber", value: "{chunkMb} MB, fixed", note: "an insert shifts the rest" },
        ],
      },
      {
        flows: [{ flow: "chunks", weight: 3 }, { flow: "notify", weight: 2 }],
        rate: 8,
        tiles: [
          { id: "a", label: "Sent per edit", icon: "activity", hue: "green", value: "{sentMb} MB", note: "{changedChunks} chunks, minus duplicates", mood: "good" },
          { id: "b", label: "Upload tier busy", icon: "server", hue: "violet", value: "{uploadBusyPct}", note: "{ingressGBs} GB/s at peak", mood: "good", moodIf: { output: "uploadBusyPct", above: 100, mood: "bad" } },
          { id: "c", label: "Already stored", icon: "check", hue: "cyan", value: "{dedupPct}", note: "skipped by hash" },
        ],
      },
      {
        flows: [{ flow: "chunks", weight: 2 }, { flow: "notify", weight: 1 }, { flow: "offline", weight: 2 }],
        rate: 8,
        tiles: [
          { id: "a", label: "Conflicts", icon: "shuffle", hue: "green", value: "keep both", note: "nothing silently lost", mood: "good" },
          { id: "b", label: "Late edits that clash", icon: "alert", hue: "amber", value: "{conflictPct}", note: "base version moved on" },
          { id: "c", label: "10,000 photos", icon: "list", hue: "cyan", value: "batched", note: "one notice, not 10,000" },
        ],
      },
    ],
    widgets: {
      sync: [
        { kind: "meter", output: "uploadBusyPct", max: 100, text: "{uploadBusyPct} busy" },
        { kind: "text", text: "Failed: {uploadFailPct}", when: { output: "uploadFailPct", above: 0 } },
      ],
      versions: [
        {
          kind: "log",
          lines: [
            { text: "report.xlsx v8 · laptop" },
            { text: "phone v8, base v7: 409", when: { output: "conflictPct", above: 0 } },
            { text: "→ report (phone).xlsx", when: { output: "conflictPct", above: 0 } },
          ],
        },
      ],
      chunks: [{ kind: "custom", name: "blocksync" }],
    },
    states: [{ node: "sync", cls: "tx-hot", when: { output: "uploadBusyPct", above: 100 } }],
  },
};
