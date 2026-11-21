import type { SceneSpec } from "@tintelix/schema";

/**
 * Shoppers on the left. Steps 1–2: one big server whose cores fill up. From step 3: a load balancer
 * and a fleet of smaller servers in its place, with the model's curve of throughput against the
 * number of servers on the right.
 */
export const scalingScene: SceneSpec = {
  kind: "scale",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 50, w: 984, h: 362 },
  nodes: {
    users: { x: 16, y: 160, w: 150, h: 74, kind: "users", label: "Shoppers", sub: "every page view" },
    big: { x: 300, y: 80, w: 300, h: 252, kind: "app", label: "One big server", sub: "scale up" },
    lb: { x: 206, y: 160, w: 120, h: 74, kind: "lb", label: "Balancer", sub: "spreads load", hidden: true },
    fleet: { x: 366, y: 80, w: 290, h: 252, kind: "services", label: "Many servers", sub: "scale out", hidden: true },
    curve: { x: 690, y: 56, w: 290, h: 344, kind: "curve", label: "Throughput vs servers", sub: "from the model", hidden: true },
  },
  wires: {
    u_big: { from: [166, 197], to: [300, 197] },
    u_lb: { from: [166, 197], to: [206, 197] },
    lb_fleet: { from: [326, 197], to: [366, 197] },
  },
};
