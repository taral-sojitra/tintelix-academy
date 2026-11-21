import type { SceneSpec } from "@tintelix/schema";

/**
 * Step 1: an office going out through a forward proxy to a download site. Steps 2–5: laptops and
 * phones coming in through a reverse proxy to a backend whose workers fill up.
 */
export const proxyScene: SceneSpec = {
  kind: "proxy",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 60, w: 984, h: 340 },
  nodes: {
    office: { x: 16, y: 170, w: 160, h: 80, kind: "users", label: "Office", sub: "staff laptops" },
    fproxy: { x: 310, y: 160, w: 190, h: 100, kind: "edge", label: "Forward proxy", sub: "acts for clients" },
    net: { x: 660, y: 160, w: 200, h: 100, kind: "origin", label: "Download site", sub: "sees one address" },
    fast: { x: 16, y: 110, w: 160, h: 74, kind: "users", label: "Laptops", sub: "fast networks", hidden: true },
    phones: { x: 16, y: 260, w: 160, h: 74, kind: "users", label: "Phones", sub: "slow networks", hidden: true },
    rproxy: { x: 280, y: 174, w: 190, h: 100, kind: "lb", label: "Reverse proxy", sub: "acts for servers", hidden: true },
    backend: { x: 560, y: 90, w: 300, h: 268, kind: "app", label: "Backend", sub: "a pool of workers", hidden: true },
  },
  wires: {
    o_fp: { from: [176, 210], to: [310, 210] },
    fp_net: { from: [500, 210], to: [660, 210] },
    f_rp: { from: [176, 147], to: [280, 214] },
    p_rp: { from: [176, 297], to: [280, 234], pace: 0.3, label: "slow network" },
    rp_be: { from: [470, 224], to: [560, 224] },
  },
};
