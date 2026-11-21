import type { Model } from "@tintelix/schema";

/**
 * A balancer round-robins traffic over a fleet and probes each server every interval; a server that
 * misses `threshold` checks in a row leaves rotation, so detection takes interval × threshold
 * (Vintelix System Design 101, §27.4). Each server answers its check in time up to `capRps`; past
 * that it misses checks too. Near that limit, ejecting one stalled server pushes the survivors over
 * it, they are ejected one round later, and the fleet empties: §27.4's cascading ejection. An
 * ejection cap (Envoy's max_ejection_percent) stops the second round. `elapsedSec` is the time since
 * the fault, so the stage can play the story; its default is long after everything settles. The
 * fleet, traffic and limit are this lesson's own example.
 */
export const healthModel: Model = {
  defaults: { servers: 10, rps: 800, capRps: 110, intervalSec: 5, threshold: 2, timeoutMs: 500, checks: 1, fault: 0, maxEjectPct: 100, elapsedSec: 600 },
  run(i) {
    const servers = Math.max(2, Math.round(i.servers ?? 10));
    const rps = Math.max(0, i.rps ?? 800);
    const capRps = Math.max(1, i.capRps ?? 110);
    const intervalSec = Math.max(0.1, i.intervalSec ?? 5);
    const threshold = Math.max(1, Math.round(i.threshold ?? 2));
    const timeoutMs = Math.max(0, i.timeoutMs ?? 500);
    const checks = (i.checks ?? 1) >= 0.5;
    const stalled = (i.fault ?? 0) >= 0.5;
    const maxEjectPct = Math.max(0, Math.min(100, i.maxEjectPct ?? 100));
    const elapsedSec = Math.max(0, i.elapsedSec ?? 600);

    const perServer = rps / servers;
    const detectSec = intervalSec * threshold;
    const cascadeSec = 2 * detectSec;
    const afterOneLoad = rps / (servers - 1);
    const maxEjected = Math.floor((servers * maxEjectPct) / 100 + 1e-9);

    // Round 1: the faulty server is ejected. Round 2: if its share pushed the survivors past their
    // limit, they all miss checks, and as many leave as the cap allows.
    let ejected = 0;
    if (checks && maxEjected >= 1 && elapsedSec >= detectSec) ejected = 1;
    if (ejected === 1 && afterOneLoad > capRps && elapsedSec >= cascadeSec) ejected = Math.min(servers, maxEjected);
    const inRotation = servers - ejected;
    const faultyIn = ejected === 0;
    const healthyIn = inRotation - (faultyIn ? 1 : 0);
    const loadEach = inRotation > 0 ? rps / inRotation : 0;
    const served = healthyIn * Math.min(loadEach, capRps);
    const servedPct = rps > 0 ? (100 * served) / rps : 100;
    const settleSec = checks ? (afterOneLoad > capRps ? cascadeSec : detectSec) : 0;

    return {
      servers,
      rps,
      capRps,
      intervalSec,
      threshold,
      timeoutMs,
      checks: checks ? 1 : 0,
      fault: stalled ? 1 : 0,
      maxEjectPct,
      elapsedSec,
      clockSec: Math.min(elapsedSec, settleSec),
      perServer,
      detectSec,
      cascadeSec,
      lostBefore: perServer * detectSec,
      afterOneLoad,
      survivors: servers - 1,
      maxEjected,
      ejected,
      inRotation,
      loadEach,
      servedPct,
      failedPct: 100 - servedPct,
      failedPerSec: rps - served,
    };
  },
};
