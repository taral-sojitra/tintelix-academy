import type { Model } from "@tintelix/schema";

const fin = (v: number | undefined, d: number) => (v !== undefined && Number.isFinite(v) ? v : d);

/**
 * Design a digital wallet, with the lesson's own numbers (general public knowledge, deliberately not a
 * textbook's): 300 million wallets; 50,000 transfers a second at peak, a third of that on average; 0.5% of
 * peak at launch; one database taking 5,000 transfers a second; 20 shards of 10,000 balance updates a
 * second each; two events per transfer of about 200 bytes.
 * Modes: 0 the ask, 1 one database at launch, 2 one database at peak, 3 shards and cross-shard transfers,
 * 4 the event log, 5 exactly once, read views and audit.
 */
export const walletModel: Model = {
  defaults: {
    wallets: 300e6, peakTransfers: 50_000, peakFactor: 3, launchPct: 0.5, dbCap: 5_000, shards: 20, shardOps: 10_000, eventsPerTransfer: 2,
    eventBytes: 200, mode: 0,
  },
  run(i) {
    const wallets = Math.max(0, fin(i.wallets, 300e6));
    const peakTransfers = Math.max(0, fin(i.peakTransfers, 50_000));
    const peakFactor = Math.max(1, fin(i.peakFactor, 3));
    const launchPct = Math.min(100, Math.max(0, fin(i.launchPct, 0.5)));
    const dbCap = Math.max(1, fin(i.dbCap, 5_000));
    const shards = Math.min(256, Math.max(1, Math.round(fin(i.shards, 20))));
    const shardOps = Math.max(1, fin(i.shardOps, 10_000));
    const eventsPerTransfer = Math.max(1, fin(i.eventsPerTransfer, 2));
    const eventBytes = Math.max(0, fin(i.eventBytes, 200));
    const mode = Math.min(5, Math.max(0, Math.round(fin(i.mode, 0))));

    const dbTransfers = mode === 1 ? (peakTransfers * launchPct) / 100 : mode === 2 ? peakTransfers : 0;
    const dbBusyPct = (dbTransfers / dbCap) * 100;
    /** Each transfer is a debit on one wallet and a credit on another. */
    const shardBusyPct = mode >= 3 ? ((peakTransfers * 2) / (shards * shardOps)) * 100 : 0;
    const eventsPerDay = (peakTransfers / peakFactor) * 86_400 * eventsPerTransfer;

    return {
      wallets, peakTransfers, peakFactor, launchPct, dbCap, shards, shardOps, eventsPerTransfer, eventBytes, mode,
      walletsM: wallets / 1e6,
      dbTransfers,
      dbBusyPct,
      dbFailPct: dbBusyPct > 100 ? (1 - 100 / dbBusyPct) * 100 : 0,
      shardBusyPct,
      shardFailPct: shardBusyPct > 100 ? (1 - 100 / shardBusyPct) * 100 : 0,
      crossShardPct: (1 - 1 / shards) * 100,
      eventsB: eventsPerDay / 1e9,
      logGbDay: (eventsPerDay * eventBytes) / 1e9,
    };
  },
};
