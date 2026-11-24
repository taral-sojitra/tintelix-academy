import type { Model } from "@tintelix/schema";

const fin = (v: number | undefined, d: number) => (v !== undefined && Number.isFinite(v) ? v : d);

/**
 * Design a distributed rate limiter. Per Vintelix System Design 101, Chapter 86.6, a limit counted
 * in-process on each instance multiplies by the number of instances, and the fix is a shared counter
 * (Redis INCR with an expiry, made atomic with a Lua script). Assumptions, stated in the steps: 600
 * requests a minute per key; 20 gateways, round robin; a normal key sends 5 a second, a greedy one 150;
 * 160,000 requests a second in all, each needing a counter check; one Redis node handling about 100,000
 * operations a second. Modes: 0 local counters, normal key; 1 local counters, greedy key; 2 one shared
 * counter store; 3 counters sharded by key; 4 a shard down, failing open.
 */
export const limiterModel: Model = {
  defaults: {
    limitPerMin: 600, servers: 20, normalRate: 5, abusiveRate: 150, totalRate: 160000, redisCapacity: 100000, redisShards: 1, mode: 0,
  },
  run(i) {
    const limitPerMin = Math.max(1, fin(i.limitPerMin, 600));
    const servers = Math.max(1, Math.round(fin(i.servers, 20)));
    const normalRate = Math.max(0, fin(i.normalRate, 5));
    const abusiveRate = Math.max(0, fin(i.abusiveRate, 150));
    const totalRate = Math.max(0, fin(i.totalRate, 160000));
    const redisCapacity = Math.max(1, fin(i.redisCapacity, 100000));
    const redisShards = Math.min(16, Math.max(1, Math.round(fin(i.redisShards, 1))));
    const mode = Math.min(4, Math.max(0, Math.round(fin(i.mode, 0))));

    const limitRate = limitPerMin / 60;
    const clientRate = mode === 0 ? normalRate : abusiveRate;
    const perServerSeen = clientRate / servers;
    const localCapRate = limitRate * servers;
    const shared = mode >= 2;
    const allowedRate = shared ? Math.min(clientRate, limitRate) : Math.min(clientRate, localCapRate);
    const blockedPct = clientRate > 0 ? (1 - allowedRate / clientRate) * 100 : 0;
    const checkRate = shared ? totalRate : 0;
    const shardsInUse = mode === 2 ? 1 : redisShards;

    return {
      limitPerMin, servers, normalRate, abusiveRate, totalRate, redisCapacity, redisShards, mode,
      limitRate,
      clientRate,
      perServerSeen,
      gatewaySeenPct: (perServerSeen / limitRate) * 100,
      localCapRate,
      allowedRate,
      blockedPct,
      allowedSharePct: 100 - blockedPct,
      overLimitX: allowedRate / limitRate,
      checkRate,
      redisBusyPct: (checkRate / (shardsInUse * redisCapacity)) * 100,
      shardDownPct: mode === 4 ? 100 : 0,
      uncheckedPct: mode === 4 ? 100 / redisShards : 0,
      sharedMode: shared ? 1 : 0,
    };
  },
};
