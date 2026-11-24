import type { Model } from "@tintelix/schema";

const fin = (v: number | undefined, d: number) => (v !== undefined && Number.isFinite(v) ? v : d);

/** What the ARP widget shows in each mode: 0 nothing known, 1 the exchange, 2 sending from the cache. */
const STAGE = [0, 1, 2, 1];

/**
 * MAC addresses and ARP. `devices` share one home network; the laptop sends 600 packets a minute to the
 * router. Each ARP question is a broadcast every other device must read, plus one answer. With no cache
 * every packet would need a question; with one, a question every `cacheSec` seconds. Modes: 0 the
 * problem, 1 the exchange, 2 the cache, 3 the cost.
 */
export const arpModel: Model = {
  defaults: { devices: 20, cacheSec: 60, packetsPerMin: 600, mode: 0 },
  run(i) {
    const devices = Math.min(1000, Math.max(2, Math.round(fin(i.devices, 20))));
    const cacheSec = Math.min(3600, Math.max(5, Math.round(fin(i.cacheSec, 60))));
    const packetsPerMin = Math.max(0, fin(i.packetsPerMin, 600));
    const mode = Math.min(STAGE.length - 1, Math.max(0, Math.round(fin(i.mode, 0))));
    const askedDevices = devices - 1;
    const noiseNoCache = packetsPerMin * askedDevices;
    const noiseCached = (60 / cacheSec) * askedDevices;
    return {
      mode,
      arpStage: STAGE[mode]!,
      devices,
      cacheSec,
      packetsPerMin,
      askedDevices,
      framesPerArp: askedDevices + 1,
      noiseNoCache,
      noiseCached,
      savedPct: noiseNoCache > 0 ? (1 - noiseCached / noiseNoCache) * 100 : 0,
    };
  },
};
