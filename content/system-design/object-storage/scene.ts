import type { SceneSpec } from "@tintelix/schema";

/** Phones → app servers → object storage, or phones → storage directly with a signed URL. */
export const uploadScene: SceneSpec = {
  kind: "upload",
  world: { w: 1000, h: 470 },
  bounds: { x: 8, y: 30, w: 984, h: 400 },
  nodes: {
    phones: { x: 16, y: 196, w: 184, h: 86, kind: "users", label: "Phones", sub: "uploading photos" },
    app: { x: 260, y: 40, w: 300, h: 160, kind: "app", label: "App servers", sub: "needed for the load" },
    store: { x: 660, y: 170, w: 320, h: 200, kind: "origin", label: "Object storage", sub: "bucket: photos/" },
  },
  wires: {
    p_a: { from: [200, 230], to: [260, 120] },
    a_s: { from: [560, 120], to: [660, 236] },
    p_s: { from: [200, 254], to: [660, 330] },
  },
};
