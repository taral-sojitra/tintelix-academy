import type { Model } from "@tintelix/schema";

const fin = (v: number | undefined, d: number) => (v !== undefined && Number.isFinite(v) ? v : d);

/**
 * Design a photo feed, with the numbers from Vintelix System Design 101, Chapter 129: 500 million
 * people a day opening their feed 5 times; 0.5% of them posting; 80% photos at 5 MB and 20% video at
 * 25 MB; an account with 80 million followers; a fan-out tier sustaining 200,000 feed writes a second.
 * The lesson's own: peak twice the average; 200 accounts followed; a posts store answering a million
 * lookups a second; 300 followers on an ordinary account; 1% of peak at launch; a pull threshold of a
 * million followers, with 3 such accounts followed. Modes: 0 the ask, 1 pull at launch, 2 pull at
 * scale, 3 push, 4 a celebrity posts, 5 the hybrid.
 */
export const feedModel: Model = {
  defaults: {
    dau: 500e6, feedsEach: 5, postPct: 0.5, peakFactor: 2, follows: 200, dbLookupCapacity: 1e6, avgFollowers: 300,
    fanoutCapacity: 200000, celebFollowers: 80e6, threshold: 1e6, bigFollowed: 3, photoPct: 80, photoMb: 5, videoMb: 25, launchPct: 1, mode: 0,
  },
  run(i) {
    const dau = Math.max(0, fin(i.dau, 500e6));
    const feedsEach = Math.max(0, fin(i.feedsEach, 5));
    const postPct = Math.min(100, Math.max(0, fin(i.postPct, 0.5)));
    const peakFactor = Math.max(1, fin(i.peakFactor, 2));
    const follows = Math.max(0, fin(i.follows, 200));
    const dbLookupCapacity = Math.max(1, fin(i.dbLookupCapacity, 1e6));
    const avgFollowers = Math.max(0, fin(i.avgFollowers, 300));
    const fanoutCapacity = Math.max(1, fin(i.fanoutCapacity, 200000));
    const celebFollowers = Math.max(0, fin(i.celebFollowers, 80e6));
    const threshold = Math.max(1, fin(i.threshold, 1e6));
    const bigFollowed = Math.max(0, fin(i.bigFollowed, 3));
    const photoPct = Math.min(100, Math.max(0, fin(i.photoPct, 80)));
    const photoMb = Math.max(0, fin(i.photoMb, 5));
    const videoMb = Math.max(0, fin(i.videoMb, 25));
    const launchPct = Math.min(100, Math.max(0, fin(i.launchPct, 1)));
    const mode = Math.min(5, Math.max(0, Math.round(fin(i.mode, 0))));

    const feedsPerDay = dau * feedsEach;
    const postsPerDay = (dau * postPct) / 100;
    const feedRate = feedsPerDay / 86_400;
    const feedPeak = feedRate * peakFactor;
    const postRate = postsPerDay / 86_400;
    const mediaTbDay = (postsPerDay * ((photoPct / 100) * photoMb + (1 - photoPct / 100) * videoMb)) / 1e6;
    const pullLookups = mode === 1 ? (feedPeak * launchPct * follows) / 100 : mode === 2 ? feedPeak * follows : 0;
    const mergeRate = mode === 5 ? feedPeak * bigFollowed : 0;
    const dbBusyPct = ((pullLookups + mergeRate) / dbLookupCapacity) * 100;
    const fanWrites = postRate * avgFollowers;

    return {
      dau, feedsEach, postPct, peakFactor, follows, dbLookupCapacity, avgFollowers, fanoutCapacity, celebFollowers, threshold, bigFollowed,
      photoPct, photoMb, videoMb, launchPct, mode,
      dauM: dau / 1e6,
      feedRate,
      feedPeak,
      postRate,
      readWriteRatio: postsPerDay > 0 ? feedsPerDay / postsPerDay : 0,
      mediaPbYear: (mediaTbDay * 365) / 1000,
      pullLookups,
      dbBusyPct,
      dbFailPct: dbBusyPct > 100 ? (1 - 100 / dbBusyPct) * 100 : 0,
      fanWrites,
      fanBusyPct: mode >= 3 ? (fanWrites / fanoutCapacity) * 100 : 0,
      celebM: celebFollowers / 1e6,
      celebDrainSec: celebFollowers / fanoutCapacity,
      mergeRate,
      maxFanSec: threshold / fanoutCapacity,
      thresholdM: threshold / 1e6,
    };
  },
};
