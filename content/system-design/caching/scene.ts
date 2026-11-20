import type { SceneSpec } from "@tintelix/schema";

/** Geometry from the Caching prototype, in world units. */
export const cachingScene: SceneSpec = {
  world: { w: 920, h: 540 },
  bounds: { x: 8, y: 62, w: 896, h: 422 },
  nodes: {
    users: { x: 14, y: 244, w: 166, h: 74, kind: "users", label: "Users", sub: "flash sale" },
    lb: { x: 222, y: 244, w: 164, h: 74, kind: "lb", label: "Load bal.", sub: "round robin" },
    a0: { x: 446, y: 112, w: 150, h: 68, kind: "app", label: "app-1", sub: "" },
    a1: { x: 446, y: 247, w: 150, h: 68, kind: "app", label: "app-2", sub: "" },
    a2: { x: 446, y: 382, w: 150, h: 68, kind: "app", label: "app-3", sub: "" },
    cache: { x: 682, y: 70, w: 214, h: 142, kind: "cache", label: "Cache", sub: "Redis · 64 GB", hidden: true },
    db: { x: 682, y: 346, w: 214, h: 132, kind: "db", label: "Database", sub: "Postgres primary" },
  },
  wires: {
    u_lb: { from: [180, 281], to: [222, 281] },
    lb_a0: { from: [386, 281], to: [446, 146] },
    lb_a1: { from: [386, 281], to: [446, 281] },
    lb_a2: { from: [386, 281], to: [446, 416] },
    a0_c: { from: [596, 140], to: [682, 112] },
    a1_c: { from: [596, 275], to: [682, 141] },
    a2_c: { from: [596, 410], to: [682, 170] },
    a0_d: { from: [596, 154], to: [682, 384] },
    a1_d: { from: [596, 289], to: [682, 412] },
    a2_d: { from: [596, 424], to: [682, 440] },
  },
};
