import type { Model } from "@tintelix/schema";

/**
 * From users to servers and storage, the worked example in Vintelix System Design 101, Chapter 95:
 * 10 million monthly users, 20% of them on a given day, 40 requests each, is 80 million requests a
 * day or about 926 a second on average; a 3× busiest hour makes it about 2,780; one core saturates
 * near 200 a second, and at a 60% utilization target that needs 24 cores, not the 14 a flat-out
 * division suggests; 5% monthly growth compounds to about 1.8× in a year. The storage figures (2
 * records of 1 KB per daily user per day, 3 copies) are this lesson's own assumptions.
 */
const SECONDS_PER_DAY = 86400;

export const estimationModel: Model = {
  defaults: {
    mau: 10000000,
    dauPct: 20,
    reqPerUser: 40,
    peakRatio: 3,
    perCore: 200,
    targetUtilPct: 60,
    writesPerUser: 2,
    recordKb: 1,
    replicas: 3,
    growthPct: 5,
    months: 12,
  },
  run(i) {
    const mau = Math.max(0, i.mau ?? 10000000);
    const dauPct = Math.max(0, i.dauPct ?? 20);
    const reqPerUser = Math.max(0, i.reqPerUser ?? 40);
    const peakRatio = Math.max(1, i.peakRatio ?? 3);
    const perCore = Math.max(1, i.perCore ?? 200);
    const targetUtilPct = Math.min(100, Math.max(1, i.targetUtilPct ?? 60));
    const writesPerUser = Math.max(0, i.writesPerUser ?? 2);
    const recordKb = Math.max(0, i.recordKb ?? 1);
    const replicas = Math.max(1, Math.round(i.replicas ?? 3));
    const growthPct = Math.max(0, i.growthPct ?? 5);
    const months = Math.max(0, Math.round(i.months ?? 12));

    const dau = (mau * dauPct) / 100;
    const perDay = dau * reqPerUser;
    const avgRps = perDay / SECONDS_PER_DAY;
    const peakRps = avgRps * peakRatio;
    const perCoreAtTarget = (perCore * targetUtilPct) / 100;
    const growthFactor = Math.pow(1 + growthPct / 100, months);
    const futurePeakRps = peakRps * growthFactor;
    // 1 KB = 1,000 bytes here: estimates use powers of ten.
    const storagePerDayGb = (dau * writesPerUser * recordKb) / 1e6;
    const storageYearTb = (storagePerDayGb * 365) / 1000;
    return {
      mau,
      dauPct,
      reqPerUser,
      peakRatio,
      perCore,
      targetUtilPct,
      writesPerUser,
      recordKb,
      replicas,
      growthPct,
      months,
      dau,
      perDay,
      avgRps,
      peakRps,
      perCoreAtTarget,
      coresNaive: Math.ceil(peakRps / perCore - 1e-9),
      cores: Math.ceil(peakRps / perCoreAtTarget - 1e-9),
      storagePerDayGb,
      storageYearTb,
      storageTotalTb: storageYearTb * replicas,
      growthFactor,
      // Adding the months up instead of compounding them, for comparison.
      simpleGrowth: 1 + (growthPct * months) / 100,
      futurePeakRps,
      futureCores: Math.ceil(futurePeakRps / perCoreAtTarget - 1e-9),
    };
  },
};
