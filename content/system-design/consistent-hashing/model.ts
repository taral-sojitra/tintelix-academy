import type { Model } from "@tintelix/schema";
import { shares } from "@tintelix/schema/ring";

/**
 * Adding a cache server (Vintelix System Design 101, §45.4–45.5). With hash mod N, going from N to
 * N + 1 servers moves N ÷ (N + 1) of the keys. On a hash ring the new server claims only the arcs in
 * front of its points, so it takes its own share: about 1 ÷ (N + 1). With one point per server the
 * arcs are uneven; virtual nodes (many points each) even them out. Shares are measured on this
 * lesson's fixed ring. Moved keys miss once and are fetched again from the database while the cache
 * warms: `elapsedSec` is the time since the step began, the server joins at `joinSec`, and the
 * misses last `warmSec`. Key count and timings are this lesson's own example.
 */
export const ringModel: Model = {
  defaults: { servers: 4, vnodes: 1, keys: 1_000_000, scheme: 0, joinSec: 2, warmSec: 5, elapsedSec: 600 },
  run(i) {
    const servers = Math.max(1, Math.min(8, Math.round(i.servers ?? 4)));
    const vnodes = Math.max(1, Math.min(200, Math.round(i.vnodes ?? 1)));
    const keys = Math.max(0, i.keys ?? 1_000_000);
    const ring = (i.scheme ?? 0) >= 0.5;
    const joinSec = Math.max(0, i.joinSec ?? 2);
    const warmSec = Math.max(0, i.warmSec ?? 5);
    const elapsedSec = Math.max(0, i.elapsedSec ?? 600);

    const after = shares(servers + 1, vnodes);
    const modMovedPct = (100 * servers) / (servers + 1);
    const ringMovedPct = 100 * (after[servers] ?? 0);
    const movedPct = ring ? ringMovedPct : modMovedPct;
    const joined = elapsedSec >= joinSec;
    const warming = joined && elapsedSec < joinSec + warmSec;
    return {
      servers,
      newServers: servers + 1,
      vnodes,
      keys,
      scheme: ring ? 1 : 0,
      elapsedSec,
      joinSec,
      modMovedPct,
      ringMovedPct,
      movedPct,
      movedKeys: Math.round((keys * movedPct) / 100),
      maxSharePct: 100 * Math.max(...after),
      fairPct: 100 / (servers + 1),
      joined: joined ? 1 : 0,
      missPct: warming ? movedPct : 0,
    };
  },
};
