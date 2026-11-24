import type { Model } from "@tintelix/schema";

const fin = (v: number | undefined, d: number) => (v !== undefined && Number.isFinite(v) ? v : d);

/** Round trips in ms: café to the site directly, VPN server to the site, VPN server to the office app. */
const DIRECT = 30;
const VPN_TO_SITE = 30;
const VPN_TO_APP = 2;
/** A WireGuard tunnel over IPv4 adds an outer IP header (20), UDP (8) and its own header and tag (32). */
const OVERHEAD = 20 + 8 + 32;
const MTU = 1500;

/**
 * Proxies and VPNs. The VPN server is `toVpnMs` away from the café. A full tunnel sends web traffic there
 * first and on to the site; office traffic goes there anyway. Every tunneled packet carries 60 more bytes.
 * Modes (and the tunnel widget's stage): 0 plain, 1 VPN to the office, 2 full tunnel, 3 split, 4 proxy.
 */
export const vpnModel: Model = {
  defaults: { toVpnMs: 40, mode: 0 },
  run(i) {
    const toVpnMs = Math.min(500, Math.max(1, fin(i.toVpnMs, 40)));
    const mode = Math.min(4, Math.max(0, Math.round(fin(i.mode, 0))));
    const vpnMs = toVpnMs + VPN_TO_SITE;
    return {
      mode,
      tunStage: mode,
      toVpnMs,
      directMs: DIRECT,
      vpnMs,
      extraMs: vpnMs - DIRECT,
      officeMs: toVpnMs + VPN_TO_APP,
      overheadBytes: OVERHEAD,
      innerMtu: MTU - OVERHEAD,
      overheadPct: (OVERHEAD / MTU) * 100,
      blockedPct: 100,
    };
  },
};
