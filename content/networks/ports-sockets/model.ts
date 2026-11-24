import type { Model } from "@tintelix/schema";

const fin = (v: number | undefined, d: number) => (v !== undefined && Number.isFinite(v) ? v : d);

/** Linux's default range of client (ephemeral) ports: 32768 to 60999. */
const EPHEMERAL = 60999 - 32768 + 1;
/** What the socket table shows in each mode: 0 listening, 1 connections, 2 a client running through ports. */
const SOCK = [0, 0, 1, 2];

/**
 * Ports and sockets. Ports are 16 bits. An app server opens `connsPerSec` new connections a second to one
 * database address and port, each from a fresh client port; a closed connection holds its port for
 * `timeWaitSec` (TIME_WAIT). Ports held = rate × hold time; past the ephemeral range, new connections
 * fail. Modes: 0 the problem, 1 ports, 2 sockets, 3 running out.
 */
export const portsModel: Model = {
  defaults: { connsPerSec: 200, timeWaitSec: 60, mode: 0 },
  run(i) {
    const connsPerSec = Math.max(0, fin(i.connsPerSec, 200));
    const timeWaitSec = Math.min(600, Math.max(1, fin(i.timeWaitSec, 60)));
    const mode = Math.min(SOCK.length - 1, Math.max(0, Math.round(fin(i.mode, 0))));
    const portsInUse = connsPerSec * timeWaitSec;
    return {
      mode,
      sockStage: SOCK[mode]!,
      totalPorts: 2 ** 16,
      wellKnown: 1024,
      ephemeralPorts: EPHEMERAL,
      connsPerSec,
      timeWaitSec,
      portsInUse,
      portsUsedPct: Math.min(100, (portsInUse / EPHEMERAL) * 100),
      maxRate: EPHEMERAL / timeWaitSec,
      failPct: portsInUse > EPHEMERAL ? (1 - EPHEMERAL / portsInUse) * 100 : 0,
    };
  },
};
