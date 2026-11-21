import type { SceneSpec } from "@tintelix/schema";

/** App → (index, from step 2) → the orders table, drawn as a grid of pages. */
export const indexScene: SceneSpec = {
  kind: "index",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 32, w: 984, h: 396 },
  nodes: {
    app: { x: 16, y: 196, w: 164, h: 86, kind: "app", label: "Shop app", sub: "runs a query" },
    tree: { x: 210, y: 40, w: 300, h: 380, kind: "services", label: "Index", sub: "B+ tree on customer_id", hidden: true },
    table: { x: 540, y: 40, w: 440, h: 380, kind: "db", label: "orders table", sub: "rows stored in pages" },
  },
  wires: {
    a_t: { from: [180, 239], to: [540, 239] },
    a_x: { from: [180, 239], to: [210, 239] },
    x_t: { from: [510, 239], to: [540, 239] },
  },
};
