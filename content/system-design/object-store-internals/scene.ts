import type { SceneSpec } from "@tintelix/schema";

type Hop = [string, 1 | -1, string];
const path = (...hops: Hop[]) => hops.map(([wire, dir, at]) => ({ wire, dir, at }));

/**
 * Apps on the left reach the front door, which writes to and reads from the storage nodes in the middle.
 * The metadata store sits above (key → where the pieces are); the repair service sits to the right.
 */
export const objectStoreScene: SceneSpec = {
  kind: "board",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 28, w: 984, h: 418 },
  nodes: {
    apps: { x: 16, y: 190, w: 150, h: 90, kind: "users", label: "Apps", sub: "PUT, GET" },
    api: { x: 210, y: 190, w: 180, h: 90, kind: "app", label: "Front door", sub: "auth, routing" },
    meta: { x: 450, y: 34, w: 300, h: 100, kind: "db", label: "Metadata", sub: "key → where the pieces are", hidden: true },
    store: { x: 450, y: 166, w: 390, h: 176, kind: "services", label: "Storage nodes", sub: "disks across racks" },
    repair: { x: 860, y: 196, w: 124, h: 110, kind: "services", label: "Repair", sub: "pieces", hidden: true },
  },
  wires: {
    c_a: { from: [166, 235], to: [210, 235] },
    a_s: { from: [390, 250], to: [450, 250] },
    a_m: { from: [300, 190], to: [450, 84] },
    r_s: { from: [860, 252], to: [840, 252] },
  },
  board: {
    legend: [["cyan", "a PUT or GET"], ["amber", "a repair"], ["green", "done"], ["red", "object lost"]],
    flows: {
      put: { from: "apps", path: path(["c_a", 1, "api"], ["a_s", 1, "store"]), color: "cyan", back: "green" },
      get: { from: "apps", path: path(["c_a", 1, "api"], ["a_s", 1, "store"]), color: "cyan", back: "green", fail: { at: "store", share: "lostPct" } },
      indexed: { from: "apps", path: path(["c_a", 1, "api"], ["a_m", 1, "meta"], ["a_m", -1, "api"], ["a_s", 1, "store"]), color: "cyan", back: "green" },
      repair: { from: "repair", path: path(["r_s", 1, "store"]), color: "amber", small: true },
    },
    modes: [
      {
        flows: [],
        tiles: [
          { id: "a", label: "Objects", icon: "blocks", hue: "cyan", value: "{objectsT} trillion", note: "{avgKb} KB on average" },
          { id: "b", label: "Data", icon: "db", hue: "violet", value: "{rawPb} PB", note: "before any copies" },
          { id: "c", label: "Disks die", icon: "alert", hue: "amber", value: "every day", note: "{afrPct} of disks a year" },
        ],
      },
      {
        flows: [{ flow: "put", weight: 1 }, { flow: "get", weight: 2 }],
        rate: 4,
        tiles: [
          { id: "a", label: "Objects so far", icon: "blocks", hue: "cyan", value: "{launchObjectsB} billion", note: "launch" },
          { id: "b", label: "Copies", icon: "sheet", hue: "violet", value: "1", note: "a file on one disk" },
          { id: "c", label: "Disk failures", icon: "hourglass", hue: "amber", value: "none yet", note: "give it a year" },
        ],
      },
      {
        flows: [{ flow: "put", weight: 1 }, { flow: "get", weight: 2 }],
        rate: 7,
        tiles: [
          { id: "a", label: "Disks", icon: "db", hue: "cyan", value: "{disks}", note: "{storedPb} PB, one copy" },
          { id: "b", label: "Disks dying", icon: "alert", hue: "amber", value: "{failuresPerDay}/day", note: "{objectsPerDiskM} million objects each", mood: "bad" },
          { id: "c", label: "Objects lost", icon: "alert", hue: "violet", value: "{lostPct}", note: "after one year", mood: "bad" },
        ],
      },
      {
        flows: [{ flow: "put", weight: 1 }, { flow: "get", weight: 2 }, { flow: "repair", weight: 1 }],
        rate: 7,
        tiles: [
          { id: "a", label: "On disk", icon: "db", hue: "amber", value: "{storedPb} PB", note: "3 × {rawPb} PB" },
          { id: "b", label: "Survives", icon: "check", hue: "green", value: "{tolerance} failures", note: "per object, before repair", mood: "good" },
          { id: "c", label: "Disks dying", icon: "alert", hue: "cyan", value: "{failuresPerDay}/day", note: "re-copied from survivors" },
        ],
      },
      {
        flows: [{ flow: "put", weight: 1 }, { flow: "get", weight: 2 }, { flow: "repair", weight: 1 }],
        rate: 7,
        tiles: [
          { id: "a", label: "On disk", icon: "db", hue: "green", value: "{storedPb} PB", note: "{overheadX}×, {savedPb} PB saved", mood: "good" },
          { id: "b", label: "Survives", icon: "check", hue: "green", value: "{tolerance} failures", note: "any {dataPieces} pieces rebuild it", mood: "good" },
          { id: "c", label: "Rebuilding a piece", icon: "wrench", hue: "amber", value: "{dataPieces} reads", note: "repair costs bandwidth" },
        ],
      },
      {
        flows: [{ flow: "indexed", weight: 3 }, { flow: "repair", weight: 1 }],
        rate: 7,
        tiles: [
          { id: "a", label: "Metadata", icon: "list", hue: "cyan", value: "{metaTb} TB", note: "{metaBytes} bytes an object" },
          { id: "b", label: "Metadata shards", icon: "blocks", hue: "violet", value: "{metaShards}", note: "split by key hash" },
          { id: "c", label: "Files on disk", icon: "sheet", hue: "green", value: "{packedFilesM} million", note: "small objects packed", mood: "good" },
        ],
      },
    ],
    widgets: {
      store: [
        { kind: "custom", name: "erasure" },
        { kind: "text", text: "{storedPb} PB on {disks} disks" },
        { kind: "text", text: "Lost after a year: {lostPct}", when: { output: "lostPct", above: 0 } },
      ],
    },
    states: [{ node: "store", cls: "tx-hot", when: { output: "lostPct", above: 0 } }],
  },
};
