import type { SceneSpec } from "@tintelix/schema";

/** Phone app → (gateway, from step 2) → six services drawn as rows. */
const SX = 580;
const SW = 360;
const SH = 54;
export const SERVICE_NAMES = ["Users", "Orders", "Payments", "Search", "Catalog", "Reviews"];
const SY = SERVICE_NAMES.map((_, k) => 28 + k * 68);

export const gatewayScene: SceneSpec = {
  kind: "gateway",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 20, w: 984, h: 412 },
  nodes: {
    phone: { x: 16, y: 196, w: 172, h: 86, kind: "users", label: "Phone app", sub: "the home screen" },
    gateway: { x: 288, y: 166, w: 196, h: 146, kind: "lb", label: "API gateway", sub: "one front door", hidden: true },
    ...Object.fromEntries(SERVICE_NAMES.map((name, k) => [`s${k}`, { x: SX, y: SY[k]!, w: SW, h: SH, kind: "app" as const, label: name, sub: "service" }])),
  },
  wires: {
    p_g: { from: [188, 239], to: [288, 239] },
    ...Object.fromEntries(SY.map((y, k) => [`p_s${k}`, { from: [188, 239] as [number, number], to: [SX, y + SH / 2] as [number, number] }])),
    ...Object.fromEntries(SY.map((y, k) => [`g_s${k}`, { from: [484, 239] as [number, number], to: [SX, y + SH / 2] as [number, number] }])),
  },
};
