import type { Model } from "@tintelix/schema";

const fin = (v: number | undefined, d: number) => (v !== undefined && Number.isFinite(v) ? v : d);

/**
 * Design a chat app, with the numbers from Vintelix System Design 101, Chapter 127: about 100 billion
 * sends a day, 85% one-to-one and 15% to groups of 10 (9 deliveries each), a 5× peak, 200-byte message
 * rows dropped once delivered. The lesson's own: 500 million people online at once, polling every 4
 * seconds in the first design, 500,000 open connections per chat server, a heartbeat every 30 seconds.
 * Modes: 0 the ask, 1 polling, 2 persistent connections, 3 offline delivery, 4 groups, 5 presence.
 */
export const chatModel: Model = {
  defaults: {
    sendsPerDay: 100e9, groupPct: 15, groupSize: 10, peakFactor: 5, onlineUsers: 500e6, pollInterval: 4, connsPerServer: 500000,
    msgBytes: 200, heartbeatEvery: 30, mode: 0,
  },
  run(i) {
    const sendsPerDay = Math.max(0, fin(i.sendsPerDay, 100e9));
    const groupPct = Math.min(100, Math.max(0, fin(i.groupPct, 15)));
    const groupSize = Math.max(2, fin(i.groupSize, 10));
    const peakFactor = Math.max(1, fin(i.peakFactor, 5));
    const onlineUsers = Math.max(0, fin(i.onlineUsers, 500e6));
    const pollInterval = Math.min(60, Math.max(1, fin(i.pollInterval, 4)));
    const connsPerServer = Math.max(1, fin(i.connsPerServer, 500000));
    const msgBytes = Math.max(0, fin(i.msgBytes, 200));
    const heartbeatEvery = Math.max(1, fin(i.heartbeatEvery, 30));
    const mode = Math.min(5, Math.max(0, Math.round(fin(i.mode, 0))));

    const oneToOne = (sendsPerDay * (100 - groupPct)) / 100;
    const groupDeliveries = ((sendsPerDay * groupPct) / 100) * (groupSize - 1);
    const deliveriesPerDay = oneToOne + groupDeliveries;
    const deliveryRate = deliveriesPerDay / 86_400;
    const pollRate = onlineUsers / pollInterval;

    return {
      sendsPerDay, groupPct, groupSize, peakFactor, onlineUsers, pollInterval, connsPerServer, msgBytes, heartbeatEvery, mode,
      sendsB: sendsPerDay / 1e9,
      deliveriesB: deliveriesPerDay / 1e9,
      deliveryRateM: deliveryRate / 1e6,
      deliveryPeakM: (deliveryRate * peakFactor) / 1e6,
      groupDeliveryPct: deliveriesPerDay > 0 ? (groupDeliveries / deliveriesPerDay) * 100 : 0,
      groupOthers: groupSize - 1,
      storageTbDay: (sendsPerDay * msgBytes) / 1e12,
      onlineM: onlineUsers / 1e6,
      pollRateM: pollRate / 1e6,
      emptyPollPct: pollRate > 0 ? Math.max(0, (1 - deliveryRate / pollRate) * 100) : 0,
      /** The longest a message waits for the next poll. */
      pollWaitSec: pollInterval,
      chatServers: Math.ceil(onlineUsers / connsPerServer),
      heartbeatRateM: onlineUsers / heartbeatEvery / 1e6,
    };
  },
};
