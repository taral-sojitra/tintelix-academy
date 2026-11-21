import type { Model } from "@tintelix/schema";

const fin = (v: number | undefined, d: number) => (v !== undefined && Number.isFinite(v) ? v : d);

/**
 * Design a URL shortener. Every number is this lesson's own assumption, stated in its steps: 30 million
 * new links a day, read 40 times for each one made, kept 5 years at 400 bytes each; codes of 7
 * characters from 0-9, a-z and A-Z (62 symbols); one database that can answer 5,000 reads a second; a
 * cache that answers 90% of reads. Modes: 0 launch (100 reads a second), 1 full traffic on one
 * database, 2 a cache in front, 3 short codes from an id counter. `elapsedSec` is time since the step
 * began.
 */
export const urlModel: Model = {
  defaults: {
    newPerDay: 30e6, readRatio: 40, years: 5, recordBytes: 400, codeLength: 7, dbReadCapacity: 5000,
    cacheHitPct: 90, launchReadRate: 100, repeatPct: 30, mode: 0, elapsedSec: 600,
  },
  run(i) {
    const newPerDay = Math.max(0, fin(i.newPerDay, 30e6));
    const readRatio = Math.max(0, fin(i.readRatio, 40));
    const years = Math.max(0, fin(i.years, 5));
    const recordBytes = Math.max(0, fin(i.recordBytes, 400));
    const codeLength = Math.min(12, Math.max(1, Math.round(fin(i.codeLength, 7))));
    const dbReadCapacity = Math.max(1, fin(i.dbReadCapacity, 5000));
    const cacheHitPct = Math.min(100, Math.max(0, fin(i.cacheHitPct, 90)));
    const launchReadRate = Math.max(0, fin(i.launchReadRate, 100));
    const repeatPct = Math.min(100, Math.max(0, fin(i.repeatPct, 30)));
    const mode = Math.min(3, Math.max(0, Math.round(fin(i.mode, 0))));
    const elapsedSec = Math.max(0, fin(i.elapsedSec, 600));

    const writeRate = newPerDay / 86_400;
    const readRate = writeRate * readRatio;
    const links = newPerDay * 365 * years;
    const codeSpace = 62 ** codeLength;

    const cached = mode >= 2;
    const cacheReadRate = cached ? (readRate * cacheHitPct) / 100 : 0;
    const dbReadRate = mode === 0 ? launchReadRate : readRate - cacheReadRate;
    const dbBusyPct = (dbReadRate / dbReadCapacity) * 100;
    const dbFailPct = dbBusyPct > 100 ? (1 - 100 / dbBusyPct) * 100 : 0;

    return {
      newPerDay, readRatio, years, recordBytes, codeLength, dbReadCapacity, cacheHitPct, launchReadRate, repeatPct, mode, elapsedSec,
      writeRate,
      readRate,
      linksB: links / 1e9,
      storageTb: (links * recordBytes) / 1e12,
      codeSpaceT: codeSpace / 1e12,
      codesUsedPct: Math.min(100, (links / codeSpace) * 100),
      /** Clicks arriving now: the launch trickle in mode 0, full traffic after. */
      clickRate: mode === 0 ? launchReadRate : readRate,
      cacheMissPct: 100 - cacheHitPct,
      cacheReadRate,
      dbReadRate,
      dbBusyPct,
      dbFailPct,
      servedPct: 100 - dbFailPct,
      /** The id the counter is handing out a year in: the next link's number. */
      idStart: newPerDay * 365,
      repeatReadRate: (readRate * repeatPct) / 100,
    };
  },
};
