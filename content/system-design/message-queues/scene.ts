import type { SceneSpec } from "@tintelix/schema";

/** Shop → (queue, from step 2) → workers; failing jobs go to a dead-letter queue in step 4. */
export const mqScene: SceneSpec = {
  kind: "mq",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 40, w: 984, h: 380 },
  nodes: {
    shop: { x: 16, y: 196, w: 170, h: 86, kind: "users", label: "Shop", sub: "order jobs" },
    queue: { x: 250, y: 176, w: 220, h: 126, kind: "services", label: "Queue", sub: "jobs wait here", hidden: true },
    workers: { x: 600, y: 120, w: 204, h: 238, kind: "app", label: "Workers", sub: "125 a second each" },
    dlq: { x: 826, y: 290, w: 166, h: 110, kind: "db", label: "Dead letters", sub: "for a person", hidden: true },
  },
  wires: {
    p_w: { from: [186, 239], to: [600, 239] },
    p_q: { from: [186, 239], to: [250, 239] },
    q_w: { from: [470, 239], to: [600, 239] },
    w_d: { from: [804, 300], to: [826, 345] },
  },
};
