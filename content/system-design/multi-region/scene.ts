import type { SceneSpec } from "@tintelix/schema";

/**
 * Users in India and the USA at the top, global routing between them, and a region under each: app
 * servers above a database. Not to scale: the ocean link is slowed (pace) like the CDN lesson's.
 */
export const regionScene: SceneSpec = {
  kind: "region",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 28, w: 984, h: 418 },
  regions: [
    { id: "mumbai", label: "Mumbai", x: 16, y: 142, w: 444, h: 200 },
    { id: "virginia", label: "Virginia, USA", x: 540, y: 142, w: 444, h: 200 },
  ],
  nodes: {
    usersA: { x: 30, y: 36, w: 160, h: 90, kind: "users", label: "Users", sub: "India" },
    route: { x: 410, y: 32, w: 180, h: 98, kind: "lb", label: "Global routing", sub: "DNS" },
    usersB: { x: 810, y: 36, w: 160, h: 90, kind: "users", label: "Users", sub: "USA" },
    appA: { x: 150, y: 162, w: 180, h: 68, kind: "app", label: "App servers", sub: "serving" },
    dbA: { x: 150, y: 246, w: 180, h: 88, kind: "db", label: "Database", sub: "primary" },
    appB: { x: 670, y: 162, w: 180, h: 68, kind: "app", label: "App servers", sub: "idle" },
    dbB: { x: 670, y: 246, w: 180, h: 88, kind: "db", label: "Database", sub: "standby" },
    panel: { x: 16, y: 350, w: 770, h: 94, kind: "curve", label: "Replication", sub: "" },
  },
  wires: {
    uA_r: { from: [190, 81], to: [410, 81] },
    uB_r: { from: [810, 81], to: [590, 81] },
    r_aA: { from: [430, 130], to: [330, 196] },
    r_aB: { from: [570, 130], to: [670, 196] },
    aA_dA: { from: [240, 230], to: [240, 246] },
    aB_dB: { from: [760, 230], to: [760, 246] },
    dA_dB: { from: [330, 290], to: [670, 290], pace: 0.45, label: "13,000 km" },
  },
};
