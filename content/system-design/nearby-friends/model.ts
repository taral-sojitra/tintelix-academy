import type { Model } from "@tintelix/schema";

const fin = (v: number | undefined, d: number) => (v !== undefined && Number.isFinite(v) ? v : d);

/**
 * Design nearby friends (general public knowledge: WebSocket servers, a pub/sub channel per person that
 * friends subscribe to, a distance filter, a location cache with an expiry, channels sharded across
 * pub/sub nodes). Assumptions, stated in the steps and deliberately unlike the well-known textbook
 * example: 40 million people sharing at peak, an update every 20 seconds, 150 friends of whom 20% are
 * sharing at the moment, a 5 km radius that 10% of them fall inside, a database answering a million reads
 * a second, 0.1% of peak at launch, a pub/sub node moving a million messages a second, 64 bytes per
 * location. Modes: 0 the ask, 1 polling at launch, 2 polling at peak, 3 pub/sub, 4 sharded channels,
 * 5 weak spots.
 */
export const friendsModel: Model = {
  defaults: {
    sharers: 40e6, updateEvery: 20, friendsEach: 150, activeFriendPct: 20, radiusKm: 5, nearPct: 10, dbCapacity: 1e6, launchPct: 0.1,
    nodeRate: 1e6, locBytes: 64, mode: 0,
  },
  run(i) {
    const sharers = Math.max(0, fin(i.sharers, 40e6));
    const updateEvery = Math.min(300, Math.max(1, fin(i.updateEvery, 20)));
    const friendsEach = Math.max(0, fin(i.friendsEach, 150));
    const activeFriendPct = Math.min(100, Math.max(0, fin(i.activeFriendPct, 20)));
    const radiusKm = Math.max(0.1, fin(i.radiusKm, 5));
    const nearPct = Math.min(100, Math.max(0, fin(i.nearPct, 10)));
    const dbCapacity = Math.max(1, fin(i.dbCapacity, 1e6));
    const launchPct = Math.min(100, Math.max(0, fin(i.launchPct, 0.1)));
    const nodeRate = Math.max(1, fin(i.nodeRate, 1e6));
    const locBytes = Math.max(0, fin(i.locBytes, 64));
    const mode = Math.min(5, Math.max(0, Math.round(fin(i.mode, 0))));

    const updateRate = sharers / updateEvery;
    const activeFriends = (friendsEach * activeFriendPct) / 100;
    const polling = mode === 1 || mode === 2;
    const dbReads = polling ? (updateRate * (mode === 1 ? launchPct / 100 : 1)) * friendsEach : 0;
    const dbBusyPct = (dbReads / dbCapacity) * 100;
    const fanout = updateRate * activeFriends;

    return {
      sharers, updateEvery, friendsEach, activeFriendPct, radiusKm, nearPct, dbCapacity, launchPct, nodeRate, locBytes, mode,
      sharersM: sharers / 1e6,
      updateRateM: updateRate / 1e6,
      activeFriends,
      dbReads,
      dbBusyPct,
      dbFailPct: dbBusyPct > 100 ? (1 - 100 / dbBusyPct) * 100 : 0,
      fanoutM: fanout / 1e6,
      forwardedM: (fanout * nearPct) / 100 / 1e6,
      farPct: 100 - nearPct,
      pubsubNodes: Math.ceil(fanout / nodeRate),
      cacheGb: (sharers * locBytes) / 1e9,
    };
  },
};
