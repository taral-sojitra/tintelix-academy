import type { SceneSpec } from "@tintelix/schema";

/**
 * Shoppers on the left; the product service in the middle, with its line of waiting requests and
 * its workers; on the right, the model's curve of response time against how busy the workers are.
 */
export const queueScene: SceneSpec = {
  kind: "queue",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 44, w: 984, h: 372 },
  nodes: {
    users: { x: 36, y: 120, w: 166, h: 74, kind: "users", label: "Shoppers", sub: "product page" },
    app: { x: 300, y: 92, w: 320, h: 150, kind: "app", label: "Product service", sub: "workers take from one line" },
    curve: { x: 680, y: 56, w: 290, h: 340, kind: "curve", label: "Response vs busy", sub: "from the model" },
  },
  wires: {
    users_app: { from: [202, 157], to: [300, 157] },
  },
};
