import type { Model } from "@tintelix/schema";

/**
 * A Bloom filter in front of a database (Vintelix System Design 101, Chapter 59). The filter is sized
 * for `designKeys` at `bitsPerKey` and uses the best number of hashes for that, k = round(bits × ln 2).
 * A lookup for a missing key is rejected unless all k bits happen to be set: the false-positive rate
 * is (1 − e^(−k·n/m))^k for n keys in m bits. It never rejects a key that is there. About 10 bits a
 * key gives about 1%, 20 bits about 0.01% (§59.3); keys outgrowing a fixed filter push the rate up.
 * Traffic, the share of lookups for missing keys and the 20 bytes a key are this lesson's own example.
 */
export const bloomModel: Model = {
  defaults: { lookups: 10000, absentPct: 80, designKeys: 100_000_000, keys: 100_000_000, bitsPerKey: 10, filter: 0, keyBytes: 20 },
  run(i) {
    const lookups = Math.max(0, i.lookups ?? 10000);
    const absent = Math.max(0, Math.min(100, i.absentPct ?? 80)) / 100;
    const designKeys = Math.max(1, i.designKeys ?? 100_000_000);
    const keys = Math.max(1, i.keys ?? designKeys);
    const bitsPerKey = Math.max(1, i.bitsPerKey ?? 10);
    const filter = (i.filter ?? 0) >= 0.5;
    const keyBytes = Math.max(1, i.keyBytes ?? 20);

    const m = designKeys * bitsPerKey;
    const hashes = Math.max(1, Math.round(bitsPerKey * Math.LN2));
    const fp = Math.pow(1 - Math.exp((-hashes * keys) / m), hashes);
    const presentRps = lookups * (1 - absent);
    const absentRps = lookups * absent;
    const withFilter = presentRps + absentRps * fp;
    const diskReads = filter ? withFilter : lookups;
    return {
      lookups,
      absentPct: absent * 100,
      keys,
      designKeys,
      bitsPerKey,
      hashes,
      filter: filter ? 1 : 0,
      actualBits: m / keys,
      fpPct: 100 * fp,
      presentRps,
      absentRps,
      rejectedRps: filter ? absentRps * (1 - fp) : 0,
      falsePosRps: filter ? absentRps * fp : 0,
      diskReads,
      savedPct: 100 * (1 - diskReads / Math.max(1, lookups)),
      filterMb: m / 8 / 1e6,
      keysMb: (keys * keyBytes) / 1e6,
    };
  },
};
