import type { Model } from "@tintelix/schema";

const fin = (v: number | undefined, d: number) => (v !== undefined && Number.isFinite(v) ? v : d);

/**
 * Design ad click aggregation. Ideas from Vintelix System Design 101, Chapters 68 and 140 (event time
 * against arrival time, tumbling windows closed by a watermark that trails the latest event by a slack,
 * late data silently dropped by default, exact counts for billing); the numbers are the lesson's own and
 * deliberately not a textbook's: 8 billion clicks a day peaking at 3×; 5 million ads, 600,000 of them
 * clicked in a given minute; a database taking 50,000 writes a second; 1% of peak at launch; 0.5% of clicks
 * retried by phones; 2% of clicks from phones that went offline (delays averaging 2 minutes), the rest
 * delayed about 2 s on average; a 30 s watermark slack.
 * Modes: 0 the ask, 1 a counter per ad at launch, 2 the same at peak, 3 aggregating per ad per minute by
 * event time, 4 watermarks and late clicks, 5 exactly once.
 */
export const clicksModel: Model = {
  defaults: {
    clicksPerDay: 8e9, peakFactor: 3, ads: 5e6, adsPerMin: 600_000, dbCap: 50_000, launchPct: 1, dupPct: 0.5, offlinePct: 2,
    offlineMeanSec: 120, onlineMeanSec: 2, slackSec: 30, mode: 0,
  },
  run(i) {
    const clicksPerDay = Math.max(0, fin(i.clicksPerDay, 8e9));
    const peakFactor = Math.max(1, fin(i.peakFactor, 3));
    const ads = Math.max(0, fin(i.ads, 5e6));
    const adsPerMin = Math.max(0, fin(i.adsPerMin, 600_000));
    const dbCap = Math.max(1, fin(i.dbCap, 50_000));
    const launchPct = Math.min(100, Math.max(0, fin(i.launchPct, 1)));
    const dupPct = Math.min(100, Math.max(0, fin(i.dupPct, 0.5)));
    const offlinePct = Math.min(100, Math.max(0, fin(i.offlinePct, 2)));
    const offlineMeanSec = Math.max(0.1, fin(i.offlineMeanSec, 120));
    const onlineMeanSec = Math.max(0.1, fin(i.onlineMeanSec, 2));
    const slackSec = Math.max(0, fin(i.slackSec, 30));
    const mode = Math.min(5, Math.max(0, Math.round(fin(i.mode, 0))));

    const avgRate = clicksPerDay / 86_400;
    const peakRate = avgRate * peakFactor;
    const dbWrites = mode === 1 ? (peakRate * launchPct) / 100 : mode === 2 ? peakRate : mode >= 3 ? adsPerMin / 60 : 0;
    const dbBusyPct = (dbWrites / dbCap) * 100;
    /** Share of clicks arriving more than the slack after the latest click seen: delays are exponential. */
    const latePct = (100 - offlinePct) * Math.exp(-slackSec / onlineMeanSec) + offlinePct * Math.exp(-slackSec / offlineMeanSec);
    const dupsM = (clicksPerDay * dupPct) / 100 / 1e6;

    return {
      clicksPerDay, peakFactor, ads, adsPerMin, dbCap, launchPct, dupPct, offlinePct, offlineMeanSec, onlineMeanSec, slackSec, mode,
      clicksB: clicksPerDay / 1e9,
      adsM: ads / 1e6,
      avgRate,
      peakRate,
      dbWrites,
      dbBusyPct,
      dbFailPct: dbBusyPct > 100 ? (1 - 100 / dbBusyPct) * 100 : 0,
      dupsM,
      dupsLeft: mode >= 5 ? 0 : dupsM,
      latePct,
      lateM: (clicksPerDay * latePct) / 100 / 1e6,
      /** Red in the late-clicks step only. */
      lateShownPct: mode === 4 ? latePct : 0,
    };
  },
};
