import type { Model } from "@tintelix/schema";

const fin = (v: number | undefined, d: number) => (v !== undefined && Number.isFinite(v) ? v : d);

/**
 * How to approach a design problem (Vintelix System Design 101, Chapter 126: requirements, estimates,
 * API, data, design, deep dive, bottlenecks), worked on this lesson's own example: voting during a live
 * TV talent show. Assumptions, stated in the steps: 20 million viewers, half of them vote, all within a
 * 5-minute window, with the peak twice the average; 100 bytes a vote; one database taking about 5,000
 * writes a second; workers writing 100 votes per batch. Modes: 0 still (estimates), 1 every vote
 * written straight to the database, 2 a queue in front and batched writes, 3 the database down while
 * the queue holds votes. `phase` (1–8) and `phaseEnd` say which of the seven steps the lesson is on, for
 * the clock. `elapsedSec` is time since the step began.
 */
export const methodModel: Model = {
  defaults: {
    viewers: 20e6, votePct: 50, windowSec: 300, peakFactor: 2, voteBytes: 100, dbWriteCapacity: 5000, batchSize: 100,
    mode: 0, phase: 1, phaseEnd: 0, elapsedSec: 600,
  },
  run(i) {
    const viewers = Math.max(0, fin(i.viewers, 20e6));
    const votePct = Math.min(100, Math.max(0, fin(i.votePct, 50)));
    const windowSec = Math.max(1, fin(i.windowSec, 300));
    const peakFactor = Math.max(1, fin(i.peakFactor, 2));
    const voteBytes = Math.max(0, fin(i.voteBytes, 100));
    const dbWriteCapacity = Math.max(1, fin(i.dbWriteCapacity, 5000));
    const batchSize = Math.max(1, Math.round(fin(i.batchSize, 100)));
    const mode = Math.min(3, Math.max(0, Math.round(fin(i.mode, 0))));
    const phase = Math.min(8, Math.max(1, Math.round(fin(i.phase, 1))));
    const phaseEnd = Math.max(0, Math.round(fin(i.phaseEnd, 0)));
    const elapsedSec = Math.max(0, fin(i.elapsedSec, 600));

    const votes = (viewers * votePct) / 100;
    const avgVoteRate = votes / windowSec;
    const peakVoteRate = avgVoteRate * peakFactor;
    const dbDown = mode === 3 ? 1 : 0;
    const dbWriteRate = mode === 0 || dbDown ? 0 : mode === 1 ? peakVoteRate : peakVoteRate / batchSize;
    const dbBusyPct = (dbWriteRate / dbWriteCapacity) * 100;
    const overloadPct = dbBusyPct > 100 ? (1 - 100 / dbBusyPct) * 100 : 0;
    const dbFailPct = dbDown ? 100 : overloadPct;

    return {
      viewers, votePct, windowSec, peakFactor, voteBytes, dbWriteCapacity, batchSize, mode, phase, phaseEnd, elapsedSec,
      viewersM: viewers / 1e6,
      votesM: votes / 1e6,
      avgVoteRate,
      peakVoteRate,
      storageGb: (votes * voteBytes) / 1e9,
      dbWriteRate,
      dbBusyPct,
      dbFailPct,
      /** Writes failing because the database is overloaded (not down). */
      overloadPct,
      dbDown,
      /** Votes waiting in the queue while the database is down (it keeps them on disk). */
      queueBacklog: dbDown ? peakVoteRate * Math.min(elapsedSec, windowSec) : 0,
      /** Votes gone for good: only when the app writes straight to an overloaded database. */
      votesLostPct: mode === 1 ? overloadPct : 0,
    };
  },
};
