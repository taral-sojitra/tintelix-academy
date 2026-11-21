import type { SceneSpec } from "@tintelix/schema";

/**
 * Users → balancer → a fleet of ten servers drawn as rows, each with its check status; on the right,
 * a log of what happened since the fault.
 */
export const FLEET = { x: 420, y: 44, w: 340, h: 362, rowTop: 54, rowH: 30 };
const LB_OUT: [number, number] = [356, 227];
const servers = Array.from({ length: 10 }, (_, k) => `s${k}`);

export const healthScene: SceneSpec = {
  kind: "health",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 36, w: 984, h: 380 },
  nodes: {
    users: { x: 16, y: 190, w: 156, h: 74, kind: "users", label: "Users", sub: "web traffic" },
    lb: { x: 200, y: 181, w: 156, h: 92, kind: "lb", label: "Balancer", sub: "round robin" },
    fleet: { x: FLEET.x, y: FLEET.y, w: FLEET.w, h: FLEET.h, kind: "app", label: "Fleet", sub: "ten servers" },
    log: { x: 790, y: 44, w: 196, h: 362, kind: "curve", label: "What happened", sub: "since the fault" },
  },
  wires: {
    u_lb: { from: [172, 227], to: [200, 227] },
    ...Object.fromEntries(servers.map((s, k) => [`lb_${s}`, { from: LB_OUT, to: [FLEET.x, FLEET.y + FLEET.rowTop + k * FLEET.rowH + 13] as [number, number] }])),
  },
};
