import type { SceneSpec } from "@tintelix/schema";

/** One big timeline: leaders, replica 1 (near Asha) and replica 2 (near Ben), 0 to 400 ms. */
export const timelineScene: SceneSpec = {
  kind: "timeline",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 30, w: 984, h: 410 },
  nodes: {
    tl: { x: 16, y: 36, w: 968, h: 400, kind: "curve", label: "One timeline", sub: "the same writes and reads under each model" },
  },
  wires: {},
};
