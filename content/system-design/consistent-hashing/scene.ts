import type { SceneSpec } from "@tintelix/schema";

/** App → a panel of cache servers (a key grid for hash mod N, a ring for consistent hashing) → database on a miss. */
export const ringScene: SceneSpec = {
  kind: "ring",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 22, w: 984, h: 414 },
  nodes: {
    app: { x: 16, y: 196, w: 160, h: 86, kind: "app", label: "Shop app", sub: "reads products" },
    cache: { x: 220, y: 26, w: 480, h: 410, kind: "cache", label: "Cache servers", sub: "who holds each key?" },
    db: { x: 744, y: 300, w: 240, h: 104, kind: "db", label: "Database", sub: "refetches missing keys" },
  },
  wires: {
    a_c: { from: [176, 239], to: [220, 239] },
    c_d: { from: [700, 300], to: [744, 352] },
  },
};
