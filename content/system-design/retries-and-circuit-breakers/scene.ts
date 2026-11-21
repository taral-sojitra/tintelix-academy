import type { SceneSpec } from "@tintelix/schema";

/** Shoppers → order service → pricing (a breaker joins in step 4); step 1 shows the timeout budget. */
export const retryScene: SceneSpec = {
  kind: "retry",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 30, w: 984, h: 420 },
  nodes: {
    users: { x: 16, y: 196, w: 160, h: 86, kind: "users", label: "Shoppers", sub: "checking out" },
    order: { x: 220, y: 186, w: 180, h: 106, kind: "app", label: "Order service", sub: "calls pricing" },
    breaker: { x: 422, y: 190, w: 202, h: 98, kind: "lb", label: "Circuit breaker", sub: "watches failures", hidden: true },
    pricing: { x: 646, y: 120, w: 324, h: 176, kind: "app", label: "Pricing", sub: "50 connections" },
    budget: { x: 220, y: 298, w: 760, h: 150, kind: "curve", label: "Timeout budget", sub: "each timeout fits inside its caller's" },
  },
  wires: {
    u_b: { from: [176, 239], to: [220, 239] },
    b_c: { from: [400, 239], to: [646, 210] },
    b_k: { from: [400, 239], to: [422, 239] },
    k_c: { from: [624, 239], to: [646, 210] },
  },
};
