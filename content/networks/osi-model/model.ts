import type { Model } from "@tintelix/schema";

const fin = (v: number | undefined, d: number) => (v !== undefined && Number.isFinite(v) ? v : d);

/** Header bytes each layer adds to every segment: TCP 20, IP 20, Ethernet 14 plus a 4-byte check at the end. */
const TCP = 20;
const IP = 20;
const LINK = 18;

/** What the headers widget shows in each mode: 0 the data alone, 1 wrapping, 2 the whole frame, 3 unwrapping. */
const WRAP = [0, 1, 2, 3, 2, 2];

/**
 * The OSI model. One HTTP message of `payloadBytes` goes down the sender's stack; transport cuts it into
 * segments of at most the MSS (the MTU, 1,500 bytes on Ethernet, less the 20-byte IP and 20-byte TCP
 * headers), and every segment carries 58 bytes of headers on the wire. Modes: 0 the layers, 1 going down,
 * 2 across the wire, 3 going up, 4 where the protocols sit, 5 what the headers cost.
 */
export const osiModel: Model = {
  defaults: { payloadBytes: 3000, mtu: 1500, mode: 0 },
  run(i) {
    const payloadBytes = Math.min(1e7, Math.max(1, Math.round(fin(i.payloadBytes, 3000))));
    const mtu = Math.min(9000, Math.max(576, Math.round(fin(i.mtu, 1500))));
    const mode = Math.min(WRAP.length - 1, Math.max(0, Math.round(fin(i.mode, 0))));

    const mss = mtu - IP - TCP;
    const segments = Math.ceil(payloadBytes / mss);
    const headerPerSeg = TCP + IP + LINK;
    const headerBytes = segments * headerPerSeg;
    const wireBytes = payloadBytes + headerBytes;
    const firstSegBytes = Math.min(payloadBytes, mss);

    return {
      mode,
      wrap: WRAP[mode]!,
      payloadBytes,
      mtu,
      mss,
      segments,
      tcpBytes: TCP,
      ipBytes: IP,
      linkBytes: LINK,
      headerPerSeg,
      headerBytes,
      wireBytes,
      firstSegBytes,
      frameBytes: firstSegBytes + headerPerSeg,
      overheadPct: (headerBytes / wireBytes) * 100,
    };
  },
};
