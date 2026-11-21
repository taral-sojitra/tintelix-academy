import type { SceneSpec } from "@tintelix/schema";

/**
 * Mumbai on the left, Virginia on the right, the ocean between. Not to scale: the long wires are
 * slowed (pace) so a trip across takes about ten times as long as a trip across town.
 */
export const cdnScene: SceneSpec = {
  kind: "cdn",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 52, w: 984, h: 360 },
  regions: [
    { id: "mumbai", label: "Mumbai", x: 16, y: 60, w: 384, h: 344 },
    { id: "virginia", label: "Virginia, USA", x: 690, y: 60, w: 294, h: 344 },
  ],
  nodes: {
    users: { x: 36, y: 262, w: 166, h: 74, kind: "users", label: "Users", sub: "Mumbai" },
    edge: { x: 222, y: 104, w: 174, h: 132, kind: "edge", label: "CDN edge", sub: "Mumbai", hidden: true },
    origin: { x: 732, y: 196, w: 220, h: 132, kind: "origin", label: "Origin", sub: "Virginia, USA" },
  },
  wires: {
    u_origin: { from: [202, 304], to: [732, 286], pace: 0.45, label: "13,000 km" },
    u_edge: { from: [202, 284], to: [222, 196] },
    edge_origin: { from: [396, 170], to: [732, 236], pace: 0.45, label: "13,000 km" },
  },
};
