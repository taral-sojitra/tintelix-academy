import type { Model } from "@tintelix/schema";

const fin = (v: number | undefined, d: number) => (v !== undefined && Number.isFinite(v) ? v : d);

/**
 * Design an email service. From Vintelix System Design 101, Chapter 32: a campaign to 500,000 addresses
 * with 6% dead produces 30,000 hard bounces. The rest is the lesson's own (general public knowledge, and
 * deliberately not a textbook's numbers): a billion inboxes receiving 60 and sending 6 messages a day,
 * peaking at 2×; 60 KB a message; 15% carrying attachments of about 1 MB, half of them duplicates; a
 * single database taking 50,000 writes a second; 0.01% of users at launch; 20 TB per mailbox shard
 * taking 20,000 writes a second; 2 searches a person a day.
 * Modes: 0 the ask, 1 one database at launch, 2 one database at full size, 3 mailboxes sharded by user with
 * attachments in object storage, 4 per-mailbox search, 5 sending and reputation.
 */
export const emailModel: Model = {
  defaults: {
    users: 1e9, recvPerDay: 60, sentPerDay: 6, peakFactor: 2, avgKb: 60, attachPct: 15, attachMb: 1, attachDedupPct: 50,
    dbCap: 50_000, launchPct: 0.01, nodeTb: 20, shardWrites: 20_000, searchesPerDay: 2, campaignSize: 500_000, deadPct: 6, mode: 0,
  },
  run(i) {
    const users = Math.max(0, fin(i.users, 1e9));
    const recvPerDay = Math.max(0, fin(i.recvPerDay, 60));
    const sentPerDay = Math.max(0, fin(i.sentPerDay, 6));
    const peakFactor = Math.max(1, fin(i.peakFactor, 2));
    const avgKb = Math.max(0, fin(i.avgKb, 60));
    const attachPct = Math.min(100, Math.max(0, fin(i.attachPct, 15)));
    const attachMb = Math.max(0, fin(i.attachMb, 1));
    const attachDedupPct = Math.min(100, Math.max(0, fin(i.attachDedupPct, 50)));
    const dbCap = Math.max(1, fin(i.dbCap, 50_000));
    const launchPct = Math.min(100, Math.max(0, fin(i.launchPct, 0.01)));
    const nodeTb = Math.max(0.1, fin(i.nodeTb, 20));
    const shardWrites = Math.max(1, fin(i.shardWrites, 20_000));
    const searchesPerDay = Math.max(0, fin(i.searchesPerDay, 2));
    const campaignSize = Math.max(0, fin(i.campaignSize, 500_000));
    const deadPct = Math.min(100, Math.max(0, fin(i.deadPct, 6)));
    const mode = Math.min(5, Math.max(0, Math.round(fin(i.mode, 0))));

    const recvRate = (users * recvPerDay) / 86_400;
    const peakRecv = recvRate * peakFactor;
    const msgsYear = users * recvPerDay * 365;
    const bodiesPbYear = (msgsYear * avgKb) / 1e12;
    const attachPbYear = (((msgsYear * attachPct) / 100) * attachMb * (100 - attachDedupPct)) / 100 / 1e9;
    const storageNodes = Math.ceil((bodiesPbYear * 1000) / nodeTb);
    const dbWrites = mode === 1 ? (peakRecv * launchPct) / 100 : mode >= 2 ? peakRecv : 0;
    const writesPerShard = mode >= 3 && storageNodes > 0 ? peakRecv / storageNodes : 0;
    const dbBusyPct = mode >= 3 ? (writesPerShard / shardWrites) * 100 : (dbWrites / dbCap) * 100;

    return {
      users, recvPerDay, sentPerDay, peakFactor, avgKb, attachPct, attachMb, attachDedupPct, dbCap, launchPct, nodeTb, shardWrites,
      searchesPerDay, campaignSize, deadPct, mode,
      usersB: users / 1e9,
      recvRate,
      peakRecv,
      sendRate: (users * sentPerDay) / 86_400,
      bodiesPbYear,
      attachPbYear,
      totalPbYear: bodiesPbYear + attachPbYear,
      storageNodes,
      dbWrites,
      writesPerShard,
      dbBusyPct,
      dbFailPct: dbBusyPct > 100 ? (1 - 100 / dbBusyPct) * 100 : 0,
      searchRate: (users * searchesPerDay) / 86_400,
      hardBounces: (campaignSize * deadPct) / 100,
    };
  },
};
