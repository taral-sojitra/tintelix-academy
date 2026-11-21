import type { Model } from "@tintelix/schema";

/**
 * Single-leader replication (Vintelix System Design 101, Chapter 44): the primary takes every write
 * and streams changes to read replicas, so reads spread and writes don't (§44.2). Asynchronous
 * replicas lag (§44.6, §94.3's 90 ms); a page that reads back the user's write within `windowMs`
 * lands inside the lag lag ÷ window of the time (read-backs spread evenly over the window), unless
 * read-your-own-write reads go to the primary. A crash loses the writes the replicas hadn't received
 * (writes a second × lag), and writes fail until a replica is promoted; synchronous replication loses
 * none but adds the replica's round trip to every write (§44.3: 2 ms commit + 60 ms = 62 ms).
 * `elapsedSec` is time since the crash. Traffic, capacity and the failover time are this lesson's own.
 */
export const replModel: Model = {
  defaults: { replicas: 2, readRps: 9000, writeRps: 1000, nodeCap: 5000, lagMs: 90, windowMs: 200, readBack: 0, crash: 0, sync: 0, failoverSec: 10, commitMs: 2, rttMs: 60, elapsedSec: 600 },
  run(i) {
    const replicas = Math.max(1, Math.round(i.replicas ?? 2));
    const readRps = Math.max(0, i.readRps ?? 9000);
    const writeRps = Math.max(0, i.writeRps ?? 1000);
    const nodeCap = Math.max(1, i.nodeCap ?? 5000);
    const lagMs = Math.max(0, i.lagMs ?? 90);
    const windowMs = Math.max(1, i.windowMs ?? 200);
    const readBack = (i.readBack ?? 0) >= 0.5;
    const crash = (i.crash ?? 0) >= 0.5;
    const sync = (i.sync ?? 0) >= 0.5;
    const failoverSec = Math.max(0, i.failoverSec ?? 10);
    const commitMs = Math.max(0, i.commitMs ?? 2);
    const rttMs = Math.max(0, i.rttMs ?? 60);
    const elapsedSec = Math.max(0, i.elapsedSec ?? 600);

    // Every write is read back once by the page that made it.
    const readBackRps = Math.min(writeRps, readRps);
    const onPrimary = readBack ? readBackRps : 0;
    // Once a replica is promoted it takes writes, and the rest share its reads.
    const promoted = crash && elapsedSec >= failoverSec;
    const readers = Math.max(1, replicas - (promoted ? 1 : 0));
    const perReplicaReads = (readRps - onPrimary) / readers;
    const staleBackPct = readBack ? 0 : Math.min(100, (100 * lagMs) / windowMs);
    return {
      replicas,
      readRps,
      writeRps,
      nodeCap,
      lagMs,
      windowMs,
      failoverSec,
      commitMs,
      rttMs,
      elapsedSec,
      readBack: readBack ? 1 : 0,
      crash: crash ? 1 : 0,
      perReplicaReads,
      replicaBusyPct: (100 * perReplicaReads) / nodeCap,
      primaryBusyPct: (100 * (writeRps + onPrimary)) / nodeCap,
      maxReadRps: replicas * nodeCap,
      readers,
      readBackRps,
      staleBackPct,
      staleBackRps: (readBackRps * staleBackPct) / 100,
      lostWrites: crash && !sync ? (writeRps * lagMs) / 1000 : 0,
      writesDownPct: crash && elapsedSec < failoverSec ? 100 : 0,
      syncWriteMs: commitMs + rttMs,
      writeMs: sync ? commitMs + rttMs : commitMs,
    };
  },
};
