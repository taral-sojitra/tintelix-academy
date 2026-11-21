import type { SceneSpec } from "@tintelix/schema";

/**
 * Shoppers → balancer → three servers, each with its own line; on the right, the model's lookup time
 * under every policy at the current traffic.
 */
const SX = 470;
const SW = 250;
const SH = 104;
const SY = [50, 176, 302];
export const lbScene: SceneSpec = {
  kind: "balance",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 40, w: 984, h: 376 },
  nodes: {
    users: { x: 16, y: 190, w: 140, h: 74, kind: "users", label: "Shoppers", sub: "page views" },
    lb: { x: 190, y: 181, w: 184, h: 92, kind: "lb", label: "Balancer", sub: "picks a server" },
    s0: { x: SX, y: SY[0]!, w: SW, h: SH, kind: "app", label: "Server A", sub: "product service" },
    s1: { x: SX, y: SY[1]!, w: SW, h: SH, kind: "app", label: "Server B", sub: "product service" },
    s2: { x: SX, y: SY[2]!, w: SW, h: SH, kind: "app", label: "Server C", sub: "product service" },
    compare: { x: 750, y: 50, w: 230, h: 356, kind: "curve", label: "Lookups take", sub: "each policy, modelled" },
  },
  wires: {
    u_lb: { from: [156, 227], to: [190, 227] },
    lb_s0: { from: [374, 227], to: [SX, SY[0]! + SH / 2] },
    lb_s1: { from: [374, 227], to: [SX, SY[1]! + SH / 2] },
    lb_s2: { from: [374, 227], to: [SX, SY[2]! + SH / 2] },
  },
};
