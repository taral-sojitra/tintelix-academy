import type { Model } from "@tintelix/schema";

const fin = (v: number | undefined, d: number) => (v !== undefined && Number.isFinite(v) ? v : d);

/**
 * The TCP/IP model. A packet crosses `hops` routers on its way to the server, so `hops` + 1 links. Each
 * link gets a fresh Ethernet header; each router lowers the IP header's TTL (time to live) by one and
 * drops the packet when it reaches 0; TCP and HTTP are read only at the two ends. Hosts run all four
 * layers, routers only Internet and Link. Modes: 0 the layers, 1 a trip through a router, 2 counting hops.
 */
export const tcpIpModel: Model = {
  defaults: { hops: 12, ttl: 64, mode: 0 },
  run(i) {
    const hops = Math.min(255, Math.max(0, Math.round(fin(i.hops, 12))));
    const ttl = Math.min(255, Math.max(1, Math.round(fin(i.ttl, 64))));
    const mode = Math.min(2, Math.max(0, Math.round(fin(i.mode, 0))));
    const dropped = hops >= ttl;
    return {
      mode,
      hops,
      ttl,
      links: hops + 1,
      linkWrites: hops + 1,
      ttlLeft: Math.max(0, ttl - hops),
      droppedPct: dropped ? 100 : 0,
      endReads: 2,
      layerVisits: 2 * 4 + hops * 2,
    };
  },
};
