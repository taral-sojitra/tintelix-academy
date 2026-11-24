import type { Model } from "@tintelix/schema";

const fin = (v: number | undefined, d: number) => (v !== undefined && Number.isFinite(v) ? v : d);
/** How long each replica takes to answer, in ms; the third is slow (a busy disk), as one often is. */
const REPLICA_MS = [4, 6, 40, 9, 12];

function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return r;
}

/**
 * Design a key-value store (the leaderless, Dynamo-style design). Assumptions, stated in the steps:
 * 10 TB of data, 2 TB usable per node; 100,000 reads and 20,000 writes a second; each key on N = 3 nodes;
 * replicas answering in 4, 6 and 40 ms. Vector clocks and siblings as in Vintelix System Design 101,
 * Chapter 77 (Dynamo, Riak; Cassandra uses last-write-wins instead). Modes: 0 one copy per key, 1 that
 * node down, 2 three copies with quorums W and R, 3 a replica down with hinted handoff, 4 concurrent
 * writes and vector clocks. `elapsedSec` is time since the step began.
 */
export const kvModel: Model = {
  defaults: {
    dataTb: 10, nodeTb: 2, readRate: 100000, writeRate: 20000, replicas: 3, writeQuorum: 2, readQuorum: 2, mode: 0, elapsedSec: 600,
  },
  run(i) {
    const dataTb = Math.max(0, fin(i.dataTb, 10));
    const nodeTb = Math.max(0.1, fin(i.nodeTb, 2));
    const readRate = Math.max(0, fin(i.readRate, 100000));
    const writeRate = Math.max(0, fin(i.writeRate, 20000));
    const replicas = Math.min(5, Math.max(1, Math.round(fin(i.replicas, 3))));
    const writeQuorum = Math.min(replicas, Math.max(1, Math.round(fin(i.writeQuorum, 2))));
    const readQuorum = Math.min(replicas, Math.max(1, Math.round(fin(i.readQuorum, 2))));
    const mode = Math.min(4, Math.max(0, Math.round(fin(i.mode, 0))));
    const elapsedSec = Math.max(0, fin(i.elapsedSec, 600));

    const nodesSingle = Math.max(1, Math.ceil(dataTb / nodeTb));
    const nodes = Math.max(replicas, Math.ceil((dataTb * replicas) / nodeTb));
    const lat = REPLICA_MS.slice(0, replicas).sort((a, b) => a - b);
    const staleReadPct = (choose(replicas - writeQuorum, readQuorum) / choose(replicas, readQuorum)) * 100;
    const bDown = mode === 3;
    const hintRate = (writeRate * replicas) / nodes;
    const vcPhase = mode !== 4 ? 3 : elapsedSec < 2 ? 0 : elapsedSec < 5 ? 1 : elapsedSec < 8 ? 2 : 3;

    return {
      dataTb, nodeTb, readRate, writeRate, replicas, writeQuorum, readQuorum, mode, elapsedSec,
      nodesSingle,
      sliceTb: dataTb / nodesSingle,
      nodes,
      trafficRate: readRate + writeRate,
      downKeysPct: 100 / nodesSingle,
      aDownPct: mode === 1 ? 100 : 0,
      bDownPct: bDown ? 100 : 0,
      writeLatencyMs: lat[writeQuorum - 1]!,
      readLatencyMs: lat[readQuorum - 1]!,
      staleReadPct,
      quorumOk: writeQuorum + readQuorum > replicas ? 1 : 0,
      writeOkPct: bDown ? (replicas - 1 >= writeQuorum ? 100 : 0) : 100,
      /** Replica slot that is down, for the quorum picture (0 = none, 2 = node B). */
      downReplica: bDown ? 2 : 0,
      hintRate,
      hintsHeld: bDown ? hintRate * Math.min(elapsedSec, 600) : 0,
      vcPhase,
      siblings: vcPhase === 2 ? 2 : 1,
    };
  },
};
