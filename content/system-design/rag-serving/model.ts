import type { Model } from "@tintelix/schema";

const fin = (v: number | undefined, d: number) => (v !== undefined && Number.isFinite(v) ? v : d);

/**
 * Design a RAG and model-serving system, with the numbers from Vintelix System Design 101, Chapter 141:
 * 2 million documents, 3 passages each; 1,536-number vectors of 4 bytes; 50,000 questions an hour at peak;
 * 3 s a generation; about 20 generations at once on a batching GPU, 1 without batching; re-embedding at
 * 200 documents a second, a 500,000-document migration. The lesson's own: 1% of peak at launch; top 5
 * passages; about 2,000 vectors compared by the nearest-neighbour index; retrieval in about 5 ms; 20% of
 * questions answered from a cache.
 * Modes: 0 the ask, 1 retrieve then generate at launch (one GPU, one request at a time), 2 the same at peak,
 * 3 batching, 4 keeping the index fresh, 5 gateway, cache and permissions.
 */
export const ragModel: Model = {
  defaults: {
    docs: 2e6, chunksPerDoc: 3, dims: 1536, bytesPerDim: 4, queriesPerHour: 50_000, genSec: 3, perGpu: 20, launchPct: 1, topK: 5,
    annVisited: 2_000, retrievalMs: 5, embedRate: 200, changedDocs: 500_000, cacheHit: 20, mode: 0,
  },
  run(i) {
    const docs = Math.max(0, fin(i.docs, 2e6));
    const chunksPerDoc = Math.max(0, fin(i.chunksPerDoc, 3));
    const dims = Math.max(1, fin(i.dims, 1536));
    const bytesPerDim = Math.max(0, fin(i.bytesPerDim, 4));
    const queriesPerHour = Math.max(0, fin(i.queriesPerHour, 50_000));
    const genSec = Math.max(0.1, fin(i.genSec, 3));
    const perGpu = Math.max(1, Math.round(fin(i.perGpu, 20)));
    const launchPct = Math.min(100, Math.max(0, fin(i.launchPct, 1)));
    const topK = Math.max(1, Math.round(fin(i.topK, 5)));
    const annVisited = Math.max(1, fin(i.annVisited, 2_000));
    const retrievalMs = Math.max(0, fin(i.retrievalMs, 5));
    const embedRate = Math.max(1, fin(i.embedRate, 200));
    const changedDocs = Math.max(0, fin(i.changedDocs, 500_000));
    const cacheHit = Math.min(100, Math.max(0, fin(i.cacheHit, 20)));
    const mode = Math.min(5, Math.max(0, Math.round(fin(i.mode, 0))));

    const chunks = docs * chunksPerDoc;
    const qps = queriesPerHour / 3600;
    /** Little's Law: generations in progress at once. */
    const inFlight = qps * genSec;
    const cacheHitPct = mode === 5 ? cacheHit : 0;
    const gpuDemand = mode === 1 ? (inFlight * launchPct) / 100 : (inFlight * (100 - cacheHitPct)) / 100;
    const batched = mode >= 3;
    const gpusNeeded = Math.max(1, Math.ceil(inFlight / perGpu));
    const slots = batched ? gpusNeeded * perGpu : 1;
    const gpuBusyPct = mode === 0 ? 0 : (gpuDemand / slots) * 100;

    return {
      docs, chunksPerDoc, dims, bytesPerDim, queriesPerHour, genSec, perGpu, launchPct, topK, annVisited, retrievalMs, embedRate, changedDocs,
      cacheHit, mode,
      docsM: docs / 1e6,
      chunks,
      chunksM: chunks / 1e6,
      vectorGb: (chunks * dims * bytesPerDim) / 1e9,
      qps,
      inFlight,
      unbatchedGpus: Math.ceil(inFlight),
      gpusNeeded,
      gpuBusyPct,
      gpuFailPct: gpuBusyPct > 100 ? (1 - 100 / gpuBusyPct) * 100 : 0,
      staleSec: changedDocs / embedRate,
      cacheHitPct,
      cacheMissPct: 100 - cacheHitPct,
    };
  },
};
