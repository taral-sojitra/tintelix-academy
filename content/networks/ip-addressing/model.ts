import type { Model } from "@tintelix/schema";

const fin = (v: number | undefined, d: number) => (v !== undefined && Number.isFinite(v) ? v : d);

/** The private ranges: 10.0.0.0/8, 172.16.0.0/12 and 192.168.0.0/16. */
const PRIVATE = 2 ** 24 + 2 ** 20 + 2 ** 16;
/** People in the world, in billions (UN estimate for the mid-2020s). */
const PEOPLE_B = 8.2;

/**
 * IP addressing. The laptop's address is 192.168.1.42; `prefixLen` splits its 32 bits into a network part
 * and a host part. A network of /n has 2^(32−n) addresses, two of which (the network itself and the
 * broadcast) can't go to a device. Modes: 0 the address, 1 its bits, 2 network size, 3 public vs private,
 * 4 IPv6.
 */
export const ipModel: Model = {
  defaults: { prefixLen: 24, mode: 0 },
  run(i) {
    const prefixLen = Math.min(30, Math.max(8, Math.round(fin(i.prefixLen, 24))));
    const mode = Math.min(4, Math.max(0, Math.round(fin(i.mode, 0))));
    const hostBits = 32 - prefixLen;
    const addresses = 2 ** hostBits;
    const v6Total = 2 ** 128;
    const ipv6Exp = Math.floor(Math.log10(v6Total));
    return {
      mode,
      prefixLen,
      networkBits: prefixLen,
      hostBits,
      addresses,
      hosts: addresses - 2,
      ipv4B: 2 ** 32 / 1e9,
      v4PerPerson: 2 ** 32 / (PEOPLE_B * 1e9),
      privateAddrs: PRIVATE,
      privateM: PRIVATE / 1e6,
      ipv6Mant: v6Total / 10 ** ipv6Exp,
      ipv6Exp,
      v6PerPersonExp: Math.floor(Math.log10(v6Total / (PEOPLE_B * 1e9))),
      ipA: 192,
      ipB: 168,
      ipC: 1,
      ipD: 42,
      v6: mode === 4 ? 1 : 0,
    };
  },
};
