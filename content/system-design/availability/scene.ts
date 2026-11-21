import type { SceneNode, SceneSpec } from "@tintelix/schema";

/** The services a checkout crosses, in order; the path uses as many as the step says. */
export const CHAIN_NAMES = ["Gateway", "Auth", "Catalog", "Pricing", "Stock", "Payments"];
const X0 = 166;
const W = 120;
const STEP = 138;
const Y = 120;
const H = 128;
const cx = (i: number) => X0 + i * STEP + W / 2;

const tiers: Record<string, SceneNode> = Object.fromEntries(
  CHAIN_NAMES.map((label, i) => [`t${i}`, { x: X0 + i * STEP, y: Y, w: W, h: H, kind: "app" as const, label, sub: "service" }]),
);
// Wires run centre to centre under the boxes (requests are drawn beneath them), so a request
// disappears into each service and shows in the gaps between them.
const wires = Object.fromEntries(
  CHAIN_NAMES.map((_, i) => [`w${i}`, { from: (i === 0 ? [152, Y + H / 2] : [cx(i - 1), Y + H / 2]) as [number, number], to: [cx(i), Y + H / 2] as [number, number] }]),
);

export const availabilityScene: SceneSpec = {
  kind: "chain",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 52, w: 984, h: 360 },
  nodes: {
    users: { x: 16, y: Y + 27, w: 136, h: 74, kind: "users", label: "Shoppers", sub: "checkout" },
    ...tiers,
    math: { x: X0, y: 272, w: 5 * STEP + W, h: 128, kind: "curve", label: "The path's arithmetic", sub: "from the model" },
  },
  wires,
};
