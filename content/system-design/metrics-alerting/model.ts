import type { Model } from "@tintelix/schema";

const fin = (v: number | undefined, d: number) => (v !== undefined && Number.isFinite(v) ? v : d);

/**
 * Design metrics monitoring and alerting. From Vintelix System Design 101, Chapters 33 and 101: a metric is a
 * name plus every combination of label values; 5 methods × 10 statuses × 50 routes is 2,500 series, and a raw
 * path carrying 500,000 user IDs makes about 25 million. The rest is the lesson's own (and deliberately not a
 * textbook's): 60,000 servers × 200 series, scraped every 15 s; 16 bytes a raw sample, about 1.5 compressed;
 * one database taking 200,000 samples a second; 5% of servers at launch; 8 store nodes; raw points for 15
 * days, 1-minute rollups for 90 days, 1-hour rollups for 2 years, 6 bytes a rollup point; 2 KB of memory a
 * series.
 * Modes: 0 the ask, 1 rows in one database at launch, 2 the same at full size, 3 a sharded, compressed
 * time-series store, 4 rollups, 5 cardinality and alerting.
 */
export const metricsModel: Model = {
  defaults: {
    hosts: 60_000, perHost: 200, scrapeSec: 15, sampleBytes: 16, compBytes: 1.5, dbCap: 200_000, launchPct: 5, nodes: 8,
    rawDays: 15, minuteDays: 90, hourDays: 730, rollupBytes: 6, methods: 5, statuses: 10, routes: 50, userIds: 500_000, seriesKb: 2,
    mode: 0,
  },
  run(i) {
    const hosts = Math.max(0, fin(i.hosts, 60_000));
    const perHost = Math.max(0, fin(i.perHost, 200));
    const scrapeSec = Math.max(1, fin(i.scrapeSec, 15));
    const sampleBytes = Math.max(0, fin(i.sampleBytes, 16));
    const compBytes = Math.max(0, fin(i.compBytes, 1.5));
    const dbCap = Math.max(1, fin(i.dbCap, 200_000));
    const launchPct = Math.min(100, Math.max(0, fin(i.launchPct, 5)));
    const nodes = Math.max(1, Math.round(fin(i.nodes, 8)));
    const rawDays = Math.max(0, fin(i.rawDays, 15));
    const minuteDays = Math.max(0, fin(i.minuteDays, 90));
    const hourDays = Math.max(0, fin(i.hourDays, 730));
    const rollupBytes = Math.max(0, fin(i.rollupBytes, 6));
    const methods = Math.max(1, fin(i.methods, 5));
    const statuses = Math.max(1, fin(i.statuses, 10));
    const routes = Math.max(1, fin(i.routes, 50));
    const userIds = Math.max(0, fin(i.userIds, 500_000));
    const seriesKb = Math.max(0, fin(i.seriesKb, 2));
    const mode = Math.min(5, Math.max(0, Math.round(fin(i.mode, 0))));

    const series = hosts * perHost;
    const sampleRate = series / scrapeSec;
    const pointsPerDay = 86_400 / scrapeSec;
    const compGbDay = (sampleRate * 86_400 * compBytes) / 1e9;
    const dbWrites = mode === 1 ? (sampleRate * launchPct) / 100 : mode >= 2 ? sampleRate : 0;
    const dbBusyPct = mode >= 3 ? (dbWrites / nodes / dbCap) * 100 : (dbWrites / dbCap) * 100;
    const goodSeries = methods * statuses * routes;
    /** A raw path label carries the user ID instead of the route pattern. */
    const badSeries = userIds > 0 ? Math.max(goodSeries, userIds * methods * statuses) : goodSeries;

    return {
      hosts, perHost, scrapeSec, sampleBytes, compBytes, dbCap, launchPct, nodes, rawDays, minuteDays, hourDays, rollupBytes, methods,
      statuses, routes, userIds, seriesKb, mode,
      seriesM: series / 1e6,
      sampleRate,
      rawTbDay: (sampleRate * 86_400 * sampleBytes) / 1e12,
      compGbDay,
      dbWrites,
      dbBusyPct,
      dbFailPct: dbBusyPct > 100 ? (1 - 100 / dbBusyPct) * 100 : 0,
      rawPoints: 30 * pointsPerDay,
      rollupPoints: 30 * 24,
      rollupTb: (rawDays * compGbDay) / 1000 + (series * (1440 * minuteDays + 24 * hourDays) * rollupBytes) / 1e12,
      rawTb2y: (compGbDay * hourDays) / 1000,
      rollups: mode >= 4 ? 1 : 0,
      goodSeries,
      badSeries,
      seriesMemMb: (badSeries * seriesKb) / 1000,
    };
  },
};
