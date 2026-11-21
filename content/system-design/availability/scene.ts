import type { SceneNode, SceneSpec } from "@tintelix/schema";

/** The services a checkout crosses, in order; the path uses as many as the step says. */
export const CHAIN_NAMES = ["Gateway", "Auth", "Catalog", "Pricing", "Stock", "Payments"];
const X0 = 160;
const W = 122;
const STEP = 134;
const Y = 120;
const H = 128;
const cx = (i: number) => X0 + i * STEP + W / 2;

const tiers: Record<string, SceneNode> = Object.fromEntries(
  CHAIN_NAMES.map((label, i) => [`t${i}`, { x: X0 + i * STEP, y: Y, w: W, h: H, kind: "app" as const, label, sub: "service" }]),
);
// Wires run centre to centre, under the boxes, so a request seems to pass through each service.
const wires = Object.fromEntries(
  CHAIN_NAMES.map((_, i) => [`w${i}`, { from: (i === 0 ? [136, Y + H / 2] : [cx(i - 1), Y + H / 2]) as [number, number], to: [cx(i), Y + H / 2] as [number, number] }]),
);

export const availabilityScene: SceneSpec = {
  kind: "chain",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 52, w: 984, h: 360 },
  nodes: {
    users: { x: 16, y: Y + 27, w: 120, h: 74, kind: "users", label: "Shoppers", sub: "checkout" },
    ...tiers,
    math: { x: X0, y: 272, w: 792, h: 128, kind: "curve", label: "The path's arithmetic", sub: "from the model" },
  },
  wires,
};
