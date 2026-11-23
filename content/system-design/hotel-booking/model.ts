import type { Model } from "@tintelix/schema";

const fin = (v: number | undefined, d: number) => (v !== undefined && Number.isFinite(v) ? v : d);

/**
 * Design hotel booking, with the numbers from Vintelix System Design 101, Chapter 134: 50,000 properties
 * of 80 rooms; 20 million searches a day, 2% of them becoming bookings; peaks at 4×; overbooking to 105%
 * as a pricing choice. The lesson's own: 2 in 1,000 bookings at peak race another for the same room and
 * nights; 10-minute holds, half of which end in a booking; 95% of searches served from an availability
 * cache.
 * Modes: 0 the ask, 1 check then insert at launch, 2 the same when bookings race, 3 the database refuses
 * overlaps, 4 holds and idempotency keys, 5 searching from a cache.
 */
export const hotelModel: Model = {
  defaults: {
    properties: 50_000, roomsPer: 80, searchesPerDay: 20e6, conversion: 2, peakFactor: 4, racePerThousand: 2, holdMin: 10, checkoutPct: 50,
    searchCacheHit: 95, overbookPct: 105, mode: 0,
  },
  run(i) {
    const properties = Math.max(0, fin(i.properties, 50_000));
    const roomsPer = Math.max(0, fin(i.roomsPer, 80));
    const searchesPerDay = Math.max(0, fin(i.searchesPerDay, 20e6));
    const conversion = Math.min(100, Math.max(0.01, fin(i.conversion, 2)));
    const peakFactor = Math.max(1, fin(i.peakFactor, 4));
    const racePerThousand = Math.max(0, fin(i.racePerThousand, 2));
    const holdMin = Math.max(0, fin(i.holdMin, 10));
    const checkoutPct = Math.min(100, Math.max(1, fin(i.checkoutPct, 50)));
    const searchCacheHit = Math.min(100, Math.max(0, fin(i.searchCacheHit, 95)));
    const overbookPct = Math.max(100, fin(i.overbookPct, 105));
    const mode = Math.min(5, Math.max(0, Math.round(fin(i.mode, 0))));

    const rooms = properties * roomsPer;
    const bookingsPerDay = (searchesPerDay * conversion) / 100;
    const bookAvg = bookingsPerDay / 86_400;
    const searchAvg = searchesPerDay / 86_400;
    const bookPeak = bookAvg * peakFactor;
    const holdsPeak = bookPeak / (checkoutPct / 100);
    const heldRooms = holdsPeak * holdMin * 60;

    return {
      properties, roomsPer, searchesPerDay, conversion, peakFactor, racePerThousand, holdMin, checkoutPct, searchCacheHit, overbookPct, mode,
      rooms,
      roomsM: rooms / 1e6,
      bookingsPerDay,
      bookAvg,
      searchAvg,
      bookPeak,
      searchPeak: searchAvg * peakFactor,
      doubleBookings: mode === 2 ? (bookingsPerDay * racePerThousand) / 1000 : 0,
      /** Of two racing guests, one ends up double-booked when nothing refuses the second insert. */
      racePct: mode === 2 ? 50 : 0,
      holdsPeak,
      heldRooms,
      heldPct: rooms > 0 ? (heldRooms / rooms) * 100 : 0,
      searchDbReads: mode === 5 ? (searchAvg * peakFactor * (100 - searchCacheHit)) / 100 : searchAvg * peakFactor,
      locked: mode >= 3 ? 1 : 0,
    };
  },
};
