import type { Model } from "@tintelix/schema";

const fin = (v: number | undefined, d: number) => (v !== undefined && Number.isFinite(v) ? v : d);

/**
 * Design a distributed message queue. Ideas from Vintelix System Design 101, Chapter 62 (an append-only
 * log in partitions, ordering only within a partition, offsets per group, commit after processing,
 * retention so groups can replay); the numbers are the lesson's own: 2 million messages a second of 1 KB;
 * a broker writing 500 MB a second to disk; 0.5% of peak at launch; 24 brokers; 3 copies of every
 * partition; 7 days kept; 400 partitions; a consumer handling 5,000 messages a second.
 * Modes: 0 the ask, 1 one broker at launch, 2 one broker at full size, 3 a partitioned log, 4 three copies
 * with a leader per partition, 5 consumer groups and offsets.
 */
export const mqModel: Model = {
  defaults: {
    msgRate: 2e6, msgKb: 1, brokerMBs: 500, launchPct: 0.5, brokers: 24, rf: 3, retentionDays: 7, partitions: 400, consumers: 400,
    perConsumer: 5_000, mode: 0,
  },
  run(i) {
    const msgRate = Math.max(0, fin(i.msgRate, 2e6));
    const msgKb = Math.max(0, fin(i.msgKb, 1));
    const brokerMBs = Math.max(1, fin(i.brokerMBs, 500));
    const launchPct = Math.min(100, Math.max(0, fin(i.launchPct, 0.5)));
    const brokers = Math.max(1, Math.round(fin(i.brokers, 24)));
    const rf = Math.min(7, Math.max(1, Math.round(fin(i.rf, 3))));
    const retentionDays = Math.max(0, fin(i.retentionDays, 7));
    const partitions = Math.max(1, Math.round(fin(i.partitions, 400)));
    const consumers = Math.max(1, Math.round(fin(i.consumers, 400)));
    const perConsumer = Math.max(1, fin(i.perConsumer, 5_000));
    const mode = Math.min(5, Math.max(0, Math.round(fin(i.mode, 0))));

    const ingressMBs = (msgRate * msgKb) / 1000;
    const copies = mode >= 4 ? rf : 1;
    const diskMBs = mode === 1 ? (ingressMBs * launchPct) / 100 : mode === 0 ? 0 : ingressMBs * copies;
    const brokerBusyPct = mode >= 3 ? (diskMBs / (brokers * brokerMBs)) * 100 : (diskMBs / brokerMBs) * 100;
    const activeConsumers = Math.min(consumers, partitions);
    const consumeRate = activeConsumers * perConsumer;

    return {
      msgRate, msgKb, brokerMBs, launchPct, brokers, rf, retentionDays, partitions, consumers, perConsumer, mode,
      ingressGBs: ingressMBs / 1000,
      launchRate: (msgRate * launchPct) / 100,
      brokerBusyPct,
      brokerFailPct: brokerBusyPct > 100 ? (1 - 100 / brokerBusyPct) * 100 : 0,
      retainedPb: (ingressMBs * 86_400 * retentionDays * copies) / 1e9,
      activeConsumers,
      idleConsumers: Math.max(0, consumers - partitions),
      consumeRate,
      lagGrowth: Math.max(0, msgRate - consumeRate),
      groups: mode >= 5 ? 2 : 1,
    };
  },
};
