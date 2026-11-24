import type { Model } from "@tintelix/schema";

const fin = (v: number | undefined, d: number) => (v !== undefined && Number.isFinite(v) ? v : d);

/**
 * Subnetting and CIDR. The block is 192.168.1.0/24; host A is .42 and host B is .`hostB`. Cutting it into
 * subnets of /`subPrefix` borrows bits from the host part. A host ANDs both addresses with its mask: the
 * same result means the same subnet (send directly), a different one means send to the router. CIDR:
 * `needHosts` devices get the smallest block that fits, against the old classes (/8, /16, /24).
 * Modes: 0 one block, 1 split, 2 the mask test, 3 CIDR.
 */
export const subnetModel: Model = {
  defaults: { subPrefix: 26, hostB: 100, needHosts: 2000, mode: 0 },
  run(i) {
    const mode = Math.min(3, Math.max(0, Math.round(fin(i.mode, 0))));
    const chosen = Math.min(30, Math.max(24, Math.round(fin(i.subPrefix, 26))));
    const subPrefix = mode === 0 ? 24 : chosen;
    const hostA = 42;
    const hostB = Math.min(254, Math.max(1, Math.round(fin(i.hostB, 100))));
    const needHosts = Math.min(16_000_000, Math.max(2, Math.round(fin(i.needHosts, 2000))));

    const subnetSize = 2 ** (32 - subPrefix);
    const aNet = Math.floor(hostA / subnetSize) * subnetSize;
    const bNet = Math.floor(hostB / subnetSize) * subnetSize;
    const same = aNet === bNet;

    const cidrPrefix = 32 - Math.ceil(Math.log2(needHosts + 2));
    const cidrSize = 2 ** (32 - cidrPrefix);
    const classPrefix = needHosts <= 254 ? 24 : needHosts <= 65_534 ? 16 : 8;
    const classSize = 2 ** (32 - classPrefix);

    return {
      mode,
      subPrefix,
      borrowed: subPrefix - 24,
      subnets: 256 / subnetSize,
      subnetSize,
      usable: subnetSize - 2,
      hostA,
      hostB,
      aNet,
      bNet,
      samePct: same ? 100 : 0,
      diffPct: same ? 0 : 100,
      routerHops: same ? 0 : 1,
      needHosts,
      cidrPrefix,
      cidrSize,
      cidrWastePct: ((cidrSize - needHosts) / cidrSize) * 100,
      classPrefix,
      classSize,
      classWastePct: ((classSize - needHosts) / classSize) * 100,
    };
  },
};
