import type { Model } from "@tintelix/schema";

const fin = (v: number | undefined, d: number) => (v !== undefined && Number.isFinite(v) ? v : d);

/** Round trips in ms: laptop to resolver, and resolver to the root, .com and example.com's servers. */
const RESOLVER = 20;
const ROOT = 30;
const TLD = 40;
const AUTH = 80;
/** What the DNS widget shows in each mode: 0 nothing, 1 the walk, 2 answers from the cache. */
const STAGE = [0, 1, 2, 2];

/**
 * DNS. A cold lookup walks root, .com and the site's own name server; the resolver usually has the root
 * and .com answers cached already, so a usual miss is just the last leg. The site's answer lives `ttlSec`
 * seconds, so with `lookupsPerHour` the resolver misses about once per TTL. Modes: 0 the problem, 1 the
 * walk, 2 the cache, 3 the TTL trade-off.
 */
export const dnsModel: Model = {
  defaults: { ttlSec: 300, lookupsPerHour: 1000, mode: 0 },
  run(i) {
    const ttlSec = Math.min(86_400, Math.max(1, fin(i.ttlSec, 300)));
    const lookupsPerHour = Math.max(1, fin(i.lookupsPerHour, 1000));
    const mode = Math.min(STAGE.length - 1, Math.max(0, Math.round(fin(i.mode, 0))));
    const coldMs = RESOLVER + ROOT + TLD + AUTH;
    const warmMs = RESOLVER + AUTH;
    const missesPerHour = Math.min(lookupsPerHour, 3600 / ttlSec);
    const missPct = (missesPerHour / lookupsPerHour) * 100;
    const hitPct = 100 - missPct;
    return {
      mode,
      dnsStage: STAGE[mode]!,
      resolverMs: RESOLVER,
      rootMs: ROOT,
      tldMs: TLD,
      authMs: AUTH,
      coldMs,
      warmMs,
      cachedMs: RESOLVER,
      ttlSec,
      lookupsPerHour,
      missesPerHour,
      hitPct,
      missPct,
      avgMs: (hitPct * RESOLVER + missPct * warmMs) / 100,
      changeMin: ttlSec / 60,
    };
  },
};
