import type { Model } from "@tintelix/schema";

const fin = (v: number | undefined, d: number) => (v !== undefined && Number.isFinite(v) ? v : d);

/** Ports a NAT can hand out on one public address: 1024 to 65535. */
const NAT_PORTS = 65536 - 1024;
/** Ports a carrier-grade NAT gives each home on a shared address. */
const PORTS_PER_HOME = 2000;

/**
 * NAT. `devices` at home each keep `connsPerDevice` connections open; every one is an entry in the
 * router's table and a port on its public address. An ISP's carrier-grade NAT gives each home a block of
 * ports on an address it shares with other homes. Modes: 0 the problem, 1 out, 2 back, 3 in unasked,
 * 4 at ISP scale.
 */
export const natModel: Model = {
  defaults: { devices: 20, connsPerDevice: 40, mode: 0 },
  run(i) {
    const devices = Math.min(500, Math.max(1, Math.round(fin(i.devices, 20))));
    const connsPerDevice = Math.min(1000, Math.max(1, Math.round(fin(i.connsPerDevice, 40))));
    const mode = Math.min(4, Math.max(0, Math.round(fin(i.mode, 0))));
    const natEntries = devices * connsPerDevice;
    return {
      mode,
      natStage: mode,
      devices,
      connsPerDevice,
      natEntries,
      natPorts: NAT_PORTS,
      portsUsedPct: Math.min(100, (natEntries / NAT_PORTS) * 100),
      maxDevices: NAT_PORTS / connsPerDevice,
      portsPerHome: PORTS_PER_HOME,
      homesPerIp: Math.floor(NAT_PORTS / PORTS_PER_HOME),
      homePortsUsedPct: Math.min(100, (natEntries / PORTS_PER_HOME) * 100),
      blockedPct: 100,
    };
  },
};
