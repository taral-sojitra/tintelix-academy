import type { SceneSpec } from "@tintelix/schema";

/** App → (Bloom filter, from step 2) → database. */
export const bloomScene: SceneSpec = {
  kind: "bloom",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 30, w: 984, h: 400 },
  nodes: {
    app: { x: 16, y: 196, w: 160, h: 86, kind: "app", label: "Shop API", sub: "looks up a key" },
    filter: { x: 230, y: 40, w: 390, h: 380, kind: "services", label: "Bloom filter", sub: "a bit array and a few hashes", hidden: true },
    db: { x: 680, y: 172, w: 300, h: 130, kind: "db", label: "Database", sub: "a disk read per lookup" },
  },
  wires: {
    a_d: { from: [176, 239], to: [680, 237] },
    a_f: { from: [176, 239], to: [230, 239] },
    f_d: { from: [620, 239], to: [680, 237] },
  },
};
