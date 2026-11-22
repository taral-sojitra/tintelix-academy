import type { Model } from "@tintelix/schema";

const fin = (v: number | undefined, d: number) => (v !== undefined && Number.isFinite(v) ? v : d);
const TIME_BITS = 41;
const MS_PER_YEAR = 1000 * 3600 * 24 * 365.25;

/**
 * Design a unique ID generator. Assumptions, stated in the steps: 50 app servers, each needing up to
 * 2,000 IDs a second at peak (2 at launch); one counter database answering about 5,000 a second. The
 * 64-bit layout is the publicly documented Snowflake one: 41 bits of milliseconds since a chosen start,
 * then machine bits and sequence bits sharing the last 22 (10 and 12 by default). Clock skew from Vintelix
 * System Design 101, Chapter 77: NTP corrections can step a clock backwards by a few milliseconds.
 * Modes: 0 one counter at launch, 1 one counter at full traffic, 2 random UUIDs, 3 time · machine ·
 * sequence, 4 a clock that jumps back. `elapsedSec` is time since the step began.
 */
export const idsModel: Model = {
  defaults: {
    servers: 50, launchServers: 2, perServerRate: 2000, counterCapacity: 5000, machineBits: 10, clockStepMs: 5,
    sampleMachine: 37, mode: 0, elapsedSec: 600,
  },
  run(i) {
    const servers = Math.max(1, Math.round(fin(i.servers, 50)));
    const launchServers = Math.max(1, Math.round(fin(i.launchServers, 2)));
    const perServerRate = Math.max(0, fin(i.perServerRate, 2000));
    const counterCapacity = Math.max(1, fin(i.counterCapacity, 5000));
    const machineBits = Math.min(20, Math.max(1, Math.round(fin(i.machineBits, 10))));
    const clockStepMs = Math.max(0, fin(i.clockStepMs, 5));
    const sampleMachine = Math.max(0, Math.round(fin(i.sampleMachine, 37)));
    const mode = Math.min(4, Math.max(0, Math.round(fin(i.mode, 0))));
    const elapsedSec = Math.max(0, fin(i.elapsedSec, 600));

    const activeServers = mode === 0 ? launchServers : servers;
    const idRate = activeServers * perServerRate;
    const counterBusyPct = mode <= 1 ? (idRate / counterCapacity) * 100 : 0;
    const counterFailPct = counterBusyPct > 100 ? (1 - 100 / counterBusyPct) * 100 : 0;
    const seqBits = 22 - machineBits;
    const machines = 2 ** machineBits;
    const idsPerMilli = 2 ** seqBits;
    const perMachineRate = idsPerMilli * 1000;
    const clockBackMs = mode === 4 ? clockStepMs : 0;

    return {
      servers, launchServers, perServerRate, counterCapacity, machineBits, clockStepMs, sampleMachine, mode, elapsedSec,
      activeServers,
      fullIdRate: servers * perServerRate,
      idRate,
      counterBusyPct,
      counterFailPct,
      idBits: mode === 2 ? 128 : 64,
      timeOrdered: mode === 2 ? 0 : 1,
      isUuid: mode === 2 ? 1 : 0,
      seqBits,
      machines,
      idsPerMilli,
      perMachineRate,
      headroomX: perServerRate > 0 ? perMachineRate / perServerRate : 0,
      timeYears: 2 ** TIME_BITS / MS_PER_YEAR,
      fitsMachines: machines >= servers ? 1 : 0,
      /** Milliseconds since the IDs' start date, about three years in, for the bit-layout picture. */
      sampleMs: Math.round(3 * MS_PER_YEAR),
      clockBackMs,
      /** IDs each server holds back while its clock catches up. */
      heldIds: (clockBackMs * perServerRate) / 1000,
      /** How many of the drawn requests show the wait (visual share only). */
      waitDrawPct: mode === 4 ? 20 : 0,
    };
  },
};
