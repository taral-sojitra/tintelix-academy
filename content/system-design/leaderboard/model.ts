import type { Model } from "@tintelix/schema";

const fin = (v: number | undefined, d: number) => (v !== undefined && Number.isFinite(v) ? v : d);

/**
 * Design a real-time leaderboard. From Vintelix System Design 101, Chapter 55: a sorted set kept by the
 * server (ZADD, ZRANGE) is what a live leaderboard needs. The rest is the lesson's own and deliberately not
 * a textbook's numbers: 10 million players this season, 20 matches and 30 rank checks a player a day,
 * peaking at 5×; 0.1% of players at launch; a SQL rank as a count of higher scores, scanning half the
 * index at 10 million entries a second per core on 32 cores; a sorted-set instance doing 100,000
 * operations a second, kept under 60%; about 100 bytes a player.
 * Modes: 0 the ask, 1 a scores table at launch, 2 the same at full size, 3 a sorted set, 4 ties,
 * neighbours and rebuilding, 5 bigger boards split by score.
 */
export const leaderboardModel: Model = {
  defaults: {
    players: 10e6, matchesPerDay: 20, checksPerDay: 30, peakFactor: 5, launchPct: 0.1, dbCores: 32, scanPerSec: 10e6, redisOps: 100_000,
    targetPct: 60, bytesPerEntry: 100, mode: 0,
  },
  run(i) {
    const players = Math.max(1, fin(i.players, 10e6));
    const matchesPerDay = Math.max(0, fin(i.matchesPerDay, 20));
    const checksPerDay = Math.max(0, fin(i.checksPerDay, 30));
    const peakFactor = Math.max(1, fin(i.peakFactor, 5));
    const launchPct = Math.min(100, Math.max(0, fin(i.launchPct, 0.1)));
    const dbCores = Math.max(1, fin(i.dbCores, 32));
    const scanPerSec = Math.max(1, fin(i.scanPerSec, 10e6));
    const redisOps = Math.max(1, fin(i.redisOps, 100_000));
    const targetPct = Math.min(100, Math.max(1, fin(i.targetPct, 60)));
    const bytesPerEntry = Math.max(0, fin(i.bytesPerEntry, 100));
    const mode = Math.min(5, Math.max(0, Math.round(fin(i.mode, 0))));

    const livePlayers = mode === 1 ? (players * launchPct) / 100 : players;
    const updatesPeak = ((livePlayers * matchesPerDay) / 86_400) * peakFactor;
    const readsPeak = ((livePlayers * checksPerDay) / 86_400) * peakFactor;
    /** SQL: my rank is how many scores beat mine; on average that scans half the score index. */
    const rankMs = (livePlayers / 2 / scanPerSec) * 1000;
    const dbCapacity = (dbCores * 1000) / Math.max(rankMs, 1e-6);
    const dbBusyPct = mode === 1 || mode === 2 ? (readsPeak / dbCapacity) * 100 : 0;
    const ops = updatesPeak + readsPeak;
    const boardShards = mode === 5 ? Math.max(1, Math.ceil(ops / ((redisOps * targetPct) / 100))) : 1;
    const boardBusyPct = mode >= 3 ? (ops / (boardShards * redisOps)) * 100 : 0;

    return {
      players, matchesPerDay, checksPerDay, peakFactor, launchPct, dbCores, scanPerSec, redisOps, targetPct, bytesPerEntry, mode,
      playersM: players / 1e6,
      livePlayers,
      halfM: livePlayers / 2 / 1e6,
      updatesPeak,
      readsPeak,
      rankMs,
      dbBusyPct,
      dbFailPct: dbBusyPct > 100 ? (1 - 100 / dbBusyPct) * 100 : 0,
      logSteps: Math.log2(players),
      boardShards,
      boardBusyPct,
      boardFailPct: boardBusyPct > 100 ? (1 - 100 / boardBusyPct) * 100 : 0,
      memGb: (players * bytesPerEntry) / 1e9,
    };
  },
};
