import type { Model } from "@tintelix/schema";

const fin = (v: number | undefined, d: number) => (v !== undefined && Number.isFinite(v) ? v : d);

/** What the MAC table shows in each mode: 0 empty, 1 learning, 2 full, 3 full with a frame for elsewhere. */
const STAGE = [0, 1, 2, 3, 3];

/**
 * Switches vs routers. A hub repeats every frame out of all its other ports; a switch that has learned
 * where the destination is sends it out of one. With `devices` on the network, every hub copy but the one
 * the destination needed is wasted. Crossing to the other network costs one router hop. Modes: 0 two
 * networks, 1 learning, 2 one port, 3 through the router, 4 layers 2 and 3.
 */
export const switchModel: Model = {
  defaults: { devices: 24, mode: 0 },
  run(i) {
    const devices = Math.min(256, Math.max(2, Math.round(fin(i.devices, 24))));
    const mode = Math.min(STAGE.length - 1, Math.max(0, Math.round(fin(i.mode, 0))));
    const hubCopies = devices - 1;
    return {
      mode,
      macStage: STAGE[mode]!,
      devices,
      hubCopies,
      switchCopies: 1,
      wastedPct: ((hubCopies - 1) / hubCopies) * 100,
      routerHops: 1,
      ttlDrop: 1,
    };
  },
};
