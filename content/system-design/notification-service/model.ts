import type { Model } from "@tintelix/schema";

const fin = (v: number | undefined, d: number) => (v !== undefined && Number.isFinite(v) ? v : d);

/**
 * Design a notification service, with the numbers from Vintelix System Design 101, Chapter 138: 350
 * million triggering events a day (3× at peak); an incident notice to 15 million users within 5
 * minutes, 70% push, 25% email, 5% SMS; an SMS gateway contracted at 300 a second; dedup keys of about
 * 80 bytes per (event, user, channel); audience resolution at 2,000 users a second per partition, 32
 * partitions. The lesson's own model of one shared queue: SMS messages wait on the gateway, so the whole
 * queue drains no faster than the gateway's rate divided by SMS's share. Modes: 0 the ask, 1 everyday
 * traffic through one queue, 2 the broadcast through one queue, 3 a queue per channel, 4 plus the
 * dedup reservation, 5 audience resolution.
 */
export const notifyModel: Model = {
  defaults: {
    triggersPerDay: 350e6, peakFactor: 3, audience: 15e6, pushPct: 70, emailPct: 25, smsPct: 5, targetSec: 300, smsRate: 300,
    keyBytes: 80, partitions: 32, perPartitionRate: 2000, mode: 0,
  },
  run(i) {
    const triggersPerDay = Math.max(0, fin(i.triggersPerDay, 350e6));
    const peakFactor = Math.max(1, fin(i.peakFactor, 3));
    const audience = Math.max(0, fin(i.audience, 15e6));
    const pushPct = Math.min(100, Math.max(0, fin(i.pushPct, 70)));
    const emailPct = Math.min(100, Math.max(0, fin(i.emailPct, 25)));
    const smsPct = Math.min(100, Math.max(0.1, fin(i.smsPct, 5)));
    const targetSec = Math.max(1, fin(i.targetSec, 300));
    const smsRate = Math.max(1, fin(i.smsRate, 300));
    const keyBytes = Math.max(0, fin(i.keyBytes, 80));
    const partitions = Math.max(1, Math.round(fin(i.partitions, 32)));
    const perPartitionRate = Math.max(1, fin(i.perPartitionRate, 2000));
    const mode = Math.min(5, Math.max(0, Math.round(fin(i.mode, 0))));

    const pushCount = (audience * pushPct) / 100;
    const emailCount = (audience * emailPct) / 100;
    const smsCount = (audience * smsPct) / 100;
    const pushNeed = pushCount / targetSec;
    const emailNeed = emailCount / targetSec;
    const smsNeed = smsCount / targetSec;
    const shared = mode === 2;
    // One shared queue moves no faster than its slowest messages allow.
    const queueRate = shared ? Math.min(pushNeed + emailNeed + smsNeed, (smsRate * 100) / smsPct) : 0;
    const pushEff = shared ? (queueRate * pushPct) / 100 : pushNeed;
    const emailEff = shared ? (queueRate * emailPct) / 100 : emailNeed;
    const smsEff = Math.min(smsRate, smsNeed > 0 ? smsNeed : smsRate);
    const resolveRate = partitions * perPartitionRate;

    return {
      triggersPerDay, peakFactor, audience, pushPct, emailPct, smsPct, targetSec, smsRate, keyBytes, partitions, perPartitionRate, mode,
      triggerRate: triggersPerDay / 86_400,
      triggerPeak: (triggersPerDay / 86_400) * peakFactor,
      audienceM: audience / 1e6,
      pushCount,
      emailCount,
      smsCount,
      pushNeed,
      emailNeed,
      smsNeed,
      pushEff,
      emailEff,
      smsEff,
      smsDrainSec: smsCount / smsRate,
      smsAtTargetPct: smsCount > 0 ? Math.min(100, ((smsRate * targetSec) / smsCount) * 100) : 100,
      pushDoneSec: pushEff > 0 ? pushCount / pushEff : 0,
      /** In one shared queue, workers push SMS at the rate the target needs and the gateway refuses the excess. */
      smsRejectPct: shared && smsNeed > smsRate ? (1 - smsRate / smsNeed) * 100 : 0,
      keyStoreGb: (audience * keyBytes) / 1e9,
      dupDropPct: mode >= 4 ? 100 : 0,
      resolveRate,
      resolveSec: audience / resolveRate,
    };
  },
};
