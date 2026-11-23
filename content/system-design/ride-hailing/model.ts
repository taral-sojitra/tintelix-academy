import type { Model } from "@tintelix/schema";

const fin = (v: number | undefined, d: number) => (v !== undefined && Number.isFinite(v) ? v : d);

/**
 * Design ride hailing, with the numbers from Vintelix System Design 101, Chapter 133: 5 million drivers
 * on shift pinging every 4 seconds at about 100 bytes; 20 million trips a day with 6 state changes each;
 * 1,000 match requests a second taking about 2 seconds each (Little's Law); the rider's cell and its six
 * neighbours (H3 hexagons). The lesson's own: a trips database taking 50,000 writes a second, 1% of
 * traffic at launch, about 6 free drivers per cell in a city. Modes: 0 the ask, 1 pings into the trips
 * database at launch, 2 the same at scale, 3 an in-memory driver index, 4 matching with atomic claims,
 * 5 hot spots and lost signal. In mode 4 the `clash` flow is a second rider racing for the same driver.
 */
export const rideModel: Model = {
  defaults: {
    drivers: 5e6, pingEvery: 4, pingBytes: 100, tripsPerDay: 20e6, writesPerTrip: 6, dbWriteCapacity: 50000, launchPct: 1,
    matchRate: 1000, matchTime: 2, driversPerCell: 6, cellsChecked: 7, mode: 0,
  },
  run(i) {
    const drivers = Math.max(0, fin(i.drivers, 5e6));
    const pingEvery = Math.max(1, fin(i.pingEvery, 4));
    const pingBytes = Math.max(0, fin(i.pingBytes, 100));
    const tripsPerDay = Math.max(0, fin(i.tripsPerDay, 20e6));
    const writesPerTrip = Math.max(0, fin(i.writesPerTrip, 6));
    const dbWriteCapacity = Math.max(1, fin(i.dbWriteCapacity, 50000));
    const launchPct = Math.min(100, Math.max(0, fin(i.launchPct, 1)));
    const matchRate = Math.max(0, fin(i.matchRate, 1000));
    const matchTime = Math.min(30, Math.max(0.5, fin(i.matchTime, 2)));
    const driversPerCell = Math.max(0, fin(i.driversPerCell, 6));
    const cellsChecked = Math.max(1, fin(i.cellsChecked, 7));
    const mode = Math.min(5, Math.max(0, Math.round(fin(i.mode, 0))));

    const pingRate = drivers / pingEvery;
    const tripWriteRate = (tripsPerDay * writesPerTrip) / 86_400;
    const pingsToDb = mode === 1 ? (pingRate * launchPct) / 100 : mode === 2 ? pingRate : 0;
    const dbWrites = pingsToDb + tripWriteRate;
    const dbBusyPct = mode === 0 ? 0 : (dbWrites / dbWriteCapacity) * 100;

    return {
      drivers, pingEvery, pingBytes, tripsPerDay, writesPerTrip, dbWriteCapacity, launchPct, matchRate, matchTime, driversPerCell, cellsChecked, mode,
      driversM: drivers / 1e6,
      tripsM: tripsPerDay / 1e6,
      pingRate,
      tripWriteRate,
      pingRatio: tripWriteRate > 0 ? pingRate / tripWriteRate : 0,
      pingMbps: (pingRate * pingBytes) / 1e6,
      pingTbDay: (pingRate * pingBytes * 86_400) / 1e12,
      dbWrites,
      dbBusyPct,
      dbFailPct: dbBusyPct > 100 ? (1 - 100 / dbBusyPct) * 100 : 0,
      candidates: driversPerCell * cellsChecked,
      /** Little's Law: matches being worked on at once. */
      inFlight: matchRate * matchTime,
      clashPct: mode === 4 ? 100 : 0,
    };
  },
};
