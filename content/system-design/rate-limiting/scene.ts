import type { SceneSpec } from "@tintelix/schema";

/** Normal users and one flooding client → rate limiter → the API. */
export const limitScene: SceneSpec = {
  kind: "limit",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 40, w: 984, h: 390 },
  nodes: {
    users: { x: 16, y: 80, w: 180, h: 90, kind: "users", label: "Normal users", sub: "behaving well" },
    flooder: { x: 16, y: 300, w: 180, h: 90, kind: "users", label: "One client", sub: "a buggy script" },
    limiter: { x: 300, y: 150, w: 270, h: 180, kind: "lb", label: "Rate limiter", sub: "a token bucket per client" },
    api: { x: 680, y: 170, w: 290, h: 140, kind: "app", label: "API", sub: "a fixed capacity" },
  },
  wires: {
    n_l: { from: [196, 125], to: [300, 220] },
    f_l: { from: [196, 345], to: [300, 260] },
    l_a: { from: [570, 240], to: [680, 240] },
  },
};
