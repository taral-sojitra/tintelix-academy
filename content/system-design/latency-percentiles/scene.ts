import type { SceneSpec } from "@tintelix/schema";

/**
 * Shoppers on the left, the product service in the middle, and the services a page calls on the
 * right (from step 4). Underneath, across the stage, the histogram every finished request drops into.
 */
export const latencyScene: SceneSpec = {
  kind: "latency",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 44, w: 984, h: 368 },
  nodes: {
    users: { x: 36, y: 70, w: 166, h: 74, kind: "users", label: "Shoppers", sub: "product page" },
    app: { x: 400, y: 60, w: 200, h: 96, kind: "app", label: "Product service", sub: "answers the page" },
    services: { x: 760, y: 52, w: 210, h: 120, kind: "services", label: "Services", sub: "price, stock, reviews…", hidden: true },
    histogram: { x: 36, y: 196, w: 934, h: 200, kind: "histogram", label: "Latency histogram", sub: "every finished request", hidden: true },
  },
  wires: {
    users_app: { from: [202, 107], to: [400, 107] },
    app_services: { from: [600, 108], to: [760, 112] },
  },
};
