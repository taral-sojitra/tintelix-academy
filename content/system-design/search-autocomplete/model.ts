import type { Model } from "@tintelix/schema";

const fin = (v: number | undefined, d: number) => (v !== undefined && Number.isFinite(v) ? v : d);

/**
 * Design search autocomplete (general public knowledge: a trie with the top completions cached at each
 * node, rebuilt offline from search logs, cached in the browser). Assumptions, stated in the steps:
 * 50 million people a day, 8 searches each, about 6 suggestion requests per search (one per pause in
 * typing), peak twice the average; 100 million distinct past queries; a database scanning about 5
 * million rows a second on each of 64 cores; queries average 12 characters, about a quarter of trie
 * nodes are not shared, 64 bytes a node; a trie server answers 50,000 lookups a second; the browser
 * answers 30% of requests from its cache. Modes: 0 the ask, 1 a SQL prefix query at launch, 2 the same
 * at full traffic, 3 a trie in memory, 4 plus the offline builder, 5 plus the browser cache.
 */
export const suggestModel: Model = {
  defaults: {
    dailyUsers: 50e6, searchesEach: 8, requestsPerSearch: 6, peakFactor: 2, distinctQueries: 100e6, scanRate: 5e6, dbCores: 64,
    prefixLen: 2, launchSharePct: 1, avgQueryLen: 12, nodeSharePct: 25, bytesPerNode: 64, serverLookupRate: 50000, browserCachePct: 30, mode: 0,
  },
  run(i) {
    const dailyUsers = Math.max(0, fin(i.dailyUsers, 50e6));
    const searchesEach = Math.max(0, fin(i.searchesEach, 8));
    const requestsPerSearch = Math.max(0, fin(i.requestsPerSearch, 6));
    const peakFactor = Math.max(1, fin(i.peakFactor, 2));
    const distinctQueries = Math.max(0, fin(i.distinctQueries, 100e6));
    const scanRate = Math.max(1, fin(i.scanRate, 5e6));
    const dbCores = Math.max(1, fin(i.dbCores, 64));
    const prefixLen = Math.min(6, Math.max(1, Math.round(fin(i.prefixLen, 2))));
    const launchSharePct = Math.min(100, Math.max(0, fin(i.launchSharePct, 1)));
    const avgQueryLen = Math.max(0, fin(i.avgQueryLen, 12));
    const nodeSharePct = Math.min(100, Math.max(0, fin(i.nodeSharePct, 25)));
    const bytesPerNode = Math.max(0, fin(i.bytesPerNode, 64));
    const serverLookupRate = Math.max(1, fin(i.serverLookupRate, 50000));
    const browserCachePct = Math.min(100, Math.max(0, fin(i.browserCachePct, 30)));
    const mode = Math.min(5, Math.max(0, Math.round(fin(i.mode, 0))));

    const suggestRate = (dailyUsers * searchesEach * requestsPerSearch) / 86_400;
    const suggestPeak = suggestRate * peakFactor;
    const rate = mode === 1 ? (suggestPeak * launchSharePct) / 100 : suggestPeak;
    const matchRows = distinctQueries / 26 ** prefixLen;
    const queryMs = (matchRows / scanRate) * 1000;
    const usesDb = mode === 1 || mode === 2;
    const dbBusyPct = usesDb ? ((rate * queryMs) / (dbCores * 1000)) * 100 : 0;
    const browserHitPct = mode === 5 ? browserCachePct : 0;

    return {
      dailyUsers, searchesEach, requestsPerSearch, peakFactor, distinctQueries, scanRate, dbCores, prefixLen, launchSharePct,
      avgQueryLen, nodeSharePct, bytesPerNode, serverLookupRate, browserCachePct, mode,
      dailyUsersM: dailyUsers / 1e6,
      distinctM: distinctQueries / 1e6,
      suggestRate,
      suggestPeak,
      rate,
      matchRows,
      queryMs,
      dbBusyPct,
      dbFailPct: dbBusyPct > 100 ? (1 - 100 / dbBusyPct) * 100 : 0,
      trieGb: (distinctQueries * avgQueryLen * (nodeSharePct / 100) * bytesPerNode) / 1e9,
      /** Enough servers for the peak, plus one spare. */
      trieServers: Math.ceil(suggestPeak / serverLookupRate) + 1,
      browserHitPct,
      browserMissPct: 100 - browserHitPct,
      serverRate: (suggestPeak * (100 - browserHitPct)) / 100,
    };
  },
};
