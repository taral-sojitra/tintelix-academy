import type { SceneSpec } from "@tintelix/schema";

/** App → shard router → up to six shards, each a compact row with its key range and load. */
const SX = 420;
const SW = 340;
const SH = 58;
export const SHARD_Y = [34, 100, 166, 232, 298, 364];
const R_OUT: [number, number] = [368, 239];

export const shardScene: SceneSpec = {
  kind: "shard",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 26, w: 984, h: 404 },
  nodes: {
    app: { x: 16, y: 196, w: 160, h: 86, kind: "app", label: "Shop app", sub: "writes orders" },
    router: { x: 202, y: 190, w: 166, h: 98, kind: "lb", label: "Shard router", sub: "picks a shard" },
    ...Object.fromEntries(SHARD_Y.map((y, k) => [`s${k}`, { x: SX, y, w: SW, h: SH, kind: "db" as const, label: `Shard ${k + 1}`, sub: "orders" }])),
  },
  wires: {
    a_r: { from: [176, 239], to: [202, 239] },
    ...Object.fromEntries(SHARD_Y.map((y, k) => [`r_s${k}`, { from: R_OUT, to: [SX, y + SH / 2] as [number, number] }])),
  },
};
