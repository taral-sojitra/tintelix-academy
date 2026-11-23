import type { Model } from "@tintelix/schema";

const fin = (v: number | undefined, d: number) => (v !== undefined && Number.isFinite(v) ? v : d);
const DAY = 86_400;

/**
 * Design a search engine, with the numbers from Vintelix System Design 101, Chapter 139: 2 billion
 * documents of about 2 KB, 80 million new or changed a day (3× at peak), 200 million searches a day; an
 * index roughly the size of the source text; a generous 5 million documents a second for a full scan;
 * Elasticsearch's default 1-second refresh. The lesson's own assumptions: a first design on a million
 * documents; 0.2 TB of index per shard; 30 ms for a fanned-out query; 1 s through the indexing
 * pipeline; a trending term taking 30% of peak queries, 80% of them answered from a results cache.
 * Modes: 0 the ask (no traffic); 1 LIKE scan, small corpus; 2 LIKE scan, full corpus; 3 inverted index;
 * 4 plus the indexing pipeline; 5 a trending term.
 */
export const searchModel: Model = {
  defaults: {
    docs: 2e9, smallDocs: 1e6, docKb: 2, newPerDay: 80e6, searchesPerDay: 200e6, peakFactor: 3, scanRate: 5e6, shardTb: 0.2,
    refreshSec: 1, pipelineDelay: 1, hotSharePct: 30, hotCachePct: 80, mode: 0,
  },
  run(i) {
    const docs = Math.max(0, fin(i.docs, 2e9));
    const smallDocs = Math.max(0, fin(i.smallDocs, 1e6));
    const docKb = Math.max(0, fin(i.docKb, 2));
    const newPerDay = Math.max(0, fin(i.newPerDay, 80e6));
    const searchesPerDay = Math.max(0, fin(i.searchesPerDay, 200e6));
    const peakFactor = Math.max(1, fin(i.peakFactor, 3));
    const scanRate = Math.max(1, fin(i.scanRate, 5e6));
    const shardTb = Math.max(0.01, fin(i.shardTb, 0.2));
    const refreshSec = Math.min(60, Math.max(0.1, fin(i.refreshSec, 1)));
    const pipelineDelay = Math.max(0, fin(i.pipelineDelay, 1));
    const hotSharePct = Math.min(100, Math.max(0, fin(i.hotSharePct, 30)));
    const hotCachePct = Math.min(100, Math.max(0, fin(i.hotCachePct, 80)));
    const mode = Math.min(5, Math.max(0, Math.round(fin(i.mode, 0))));

    const sourceTb = (docs * docKb * 1000) / 1e12;
    const indexTb = sourceTb;
    const shards = Math.max(1, Math.ceil(indexTb / shardTb));
    const queryRate = searchesPerDay / DAY;
    const queryPeak = queryRate * peakFactor;
    const scanSec = (mode === 1 ? smallDocs : docs) / scanRate;
    const hotQueryRate = (queryPeak * hotSharePct) / 100;
    const cacheHitPct = mode === 5 ? hotCachePct : 0;

    return {
      docs, smallDocs, docKb, newPerDay, searchesPerDay, peakFactor, scanRate, shardTb, refreshSec, pipelineDelay, hotSharePct, hotCachePct, mode,
      docsB: docs / 1e9,
      smallDocsM: smallDocs / 1e6,
      indexRate: newPerDay / DAY,
      indexPeak: (newPerDay / DAY) * peakFactor,
      queryRate,
      queryPeak,
      sourceTb,
      indexTb,
      totalTb: sourceTb + indexTb,
      scanSec,
      scanMs: scanSec * 1000,
      /** Queries that time out: anything over 10 seconds. */
      scanFailPct: (mode === 1 || mode === 2) && scanSec > 10 ? 100 : 0,
      shards,
      queryMs: 30,
      lagSec: refreshSec + pipelineDelay,
      segmentsPerMin: shards * (60 / refreshSec),
      hotQueryRate,
      hotToShards: (hotQueryRate * (100 - hotCachePct)) / 100,
      cacheHitPct,
      cacheMissPct: 100 - cacheHitPct,
    };
  },
};
