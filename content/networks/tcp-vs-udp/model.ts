import type { Model } from "@tintelix/schema";

const fin = (v: number | undefined, d: number) => (v !== undefined && Number.isFinite(v) ? v : d);

/** A voice call sends one packet every 20 ms of audio. */
const CALL_PPS = 50;

/**
 * TCP vs UDP. The network loses `lossPct` of packets (none in mode 0, while the lesson sets the scene).
 * TCP notices a loss and resends in about 1.5 round trips, holding everything behind it; UDP leaves a
 * 20 ms gap. For a call carried over TCP, each loss pauses playback for the stall, so the share of time
 * frozen is losses a second × stall. Modes: 0 two promises, 1 loss, 2 the cost.
 */
export const tcpUdpModel: Model = {
  defaults: { lossPct: 2, rttMs: 80, mode: 0 },
  run(i) {
    const mode = Math.min(2, Math.max(0, Math.round(fin(i.mode, 0))));
    const chosen = Math.min(30, Math.max(0, fin(i.lossPct, 2)));
    const lossPct = mode === 0 ? 0 : chosen;
    const rttMs = Math.min(1000, Math.max(1, fin(i.rttMs, 80)));
    const stallMs = 1.5 * rttMs;
    const lostPerSec = (CALL_PPS * lossPct) / 100;
    return {
      mode,
      lossPct,
      rttMs,
      stallMs,
      tcpDeliveredPct: 100,
      udpDeliveredPct: 100 - lossPct,
      resendPct: lossPct,
      tcpFrozenPct: Math.min(100, (lostPerSec * stallMs) / 10),
      udpGapPct: lossPct,
      tcpHeader: 20,
      udpHeader: 8,
    };
  },
};
