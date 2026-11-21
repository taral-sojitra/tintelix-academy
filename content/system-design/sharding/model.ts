import type { Model } from "@tintelix/schema";

export const MAX_SHARDS = 6;

/**
 * Writes split across shards (Vintelix System Design 101, Chapter 45). One primary takes them all.
 * Range sharding on a growing order id sends every new write to the shard owning the top of the
 * range (§45.2); hash sharding spreads keys evenly, but a range query then has to ask every shard.
 * Hashing evens out keys, not traffic: a hot key's share lands on one shard (§45.3) unless the key is
 * salted into `split` sub-keys on different shards. Each shard serves up to `nodeCap` writes a
 * second; the rest fail or queue. Traffic, capacity and the hot share are this lesson's own example.
 */
export const shardModel: Model = {
  defaults: { writes: 20000, nodeCap: 5000, shards: 5, scheme: 0, hotPct: 0, split: 1 },
  run(i) {
    const writes = Math.max(0, i.writes ?? 20000);
    const nodeCap = Math.max(1, i.nodeCap ?? 5000);
    const scheme = Math.max(0, Math.min(2, Math.round(i.scheme ?? 0)));
    const shards = scheme === 0 ? 1 : Math.max(1, Math.min(MAX_SHARDS, Math.round(i.shards ?? 5)));
    const hot = Math.max(0, Math.min(100, i.hotPct ?? 0)) / 100;
    const split = Math.max(1, Math.round(i.split ?? 1));

    const loads = Array.from({ length: MAX_SHARDS }, () => 0);
    if (scheme === 0) loads[0] = writes;
    else if (scheme === 1) loads[shards - 1] = writes;
    else {
      const spread = Math.min(split, shards);
      for (let k = 0; k < shards; k++) loads[k] = ((1 - hot) * writes) / shards + (k < spread ? (hot * writes) / spread : 0);
    }
    const used = loads.slice(0, shards);
    const hottestLoad = Math.max(...used);
    const served = used.reduce((s, l) => s + Math.min(l, nodeCap), 0);
    const out: Record<string, number> = {
      writes,
      nodeCap,
      shards,
      scheme,
      hotPct: hot * 100,
      split,
      needShards: Math.ceil(writes / nodeCap),
      hottestLoad,
      hottestPct: (100 * hottestLoad) / nodeCap,
      servedPct: writes > 0 ? (100 * served) / writes : 100,
      queryShards: scheme === 2 ? shards : 1,
      evenLoad: writes / shards,
    };
    loads.forEach((l, k) => (out[`load${k}`] = l));
    return out;
  },
};
