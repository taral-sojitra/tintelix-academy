import type { Model } from "@tintelix/schema";

const fin = (v: number | undefined, d: number) => (v !== undefined && Number.isFinite(v) ? v : d);

/** What the ladder widget draws in each mode: 0 nothing, 1 the handshake, 2 with a request, 3 the close. */
const LADDER = [0, 1, 2, 3, 2];

/**
 * The three-way handshake. One round trip (`rttMs`) for SYN and SYN-ACK; the request rides with the ACK,
 * so the reply's first byte comes back after two. `requests` made one after another each pay the extra
 * round trip on a new connection; on one reused connection only the first does. Modes: 0 the problem,
 * 1 the handshake, 2 with data, 3 the close, 4 reuse.
 */
export const handshakeModel: Model = {
  defaults: { rttMs: 80, requests: 10, mode: 0 },
  run(i) {
    const rttMs = Math.min(1000, Math.max(1, fin(i.rttMs, 80)));
    const requests = Math.min(1000, Math.max(1, Math.round(fin(i.requests, 10))));
    const mode = Math.min(LADDER.length - 1, Math.max(0, Math.round(fin(i.mode, 0))));
    const newEachMs = requests * 2 * rttMs;
    const reusedMs = rttMs + requests * rttMs;
    return {
      mode,
      ladderStage: LADDER[mode]!,
      rttMs,
      oneWayMs: rttMs / 2,
      handshakeMs: rttMs,
      firstByteMs: 2 * rttMs,
      requests,
      newEachMs,
      reusedMs,
      savedMs: newEachMs - reusedMs,
      savedPct: ((newEachMs - reusedMs) / newEachMs) * 100,
    };
  },
};
