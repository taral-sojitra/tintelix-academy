import type { Model } from "@tintelix/schema";

const fin = (v: number | undefined, d: number) => (v !== undefined && Number.isFinite(v) ? v : d);

/**
 * Design orders and inventory, with the numbers from Vintelix System Design 101, Chapters 135 and 137:
 * 2 million items in 20 warehouses (40 million stock rows of about 100 bytes); 10 million stock reads and
 * 200,000 stock writes a day; a flash sale of 5,000 units where 500,000 shoppers load the page and 50,000
 * try to buy within 60 s; the order saga (reserve, authorize, confirm, with compensations). The lesson's
 * own: checking stock, then charging for about 2 s, then subtracting; one row taking about 500 guarded
 * updates a second; 10 sub-counters; 150,000 orders a day with 3% of payments declined.
 * Modes: 0 the ask, 1 check, pay, subtract on a normal day, 2 the same in a flash sale, 3 the guarded
 * update, 4 split hot counters, 5 the order saga.
 */
export const ordersModel: Model = {
  defaults: {
    skus: 2e6, warehouses: 20, bytesPerRow: 100, readsPerDay: 10e6, writesPerDay: 200_000, stock: 5_000, pageLoads: 500_000, buyers: 50_000,
    windowSec: 60, payGapSec: 2, rowCap: 500, subCounters: 10, ordersPerDay: 150_000, declinePct: 3, mode: 0,
  },
  run(i) {
    const skus = Math.max(0, fin(i.skus, 2e6));
    const warehouses = Math.max(0, fin(i.warehouses, 20));
    const bytesPerRow = Math.max(0, fin(i.bytesPerRow, 100));
    const readsPerDay = Math.max(0, fin(i.readsPerDay, 10e6));
    const writesPerDay = Math.max(0, fin(i.writesPerDay, 200_000));
    const stock = Math.max(1, fin(i.stock, 5_000));
    const pageLoads = Math.max(0, fin(i.pageLoads, 500_000));
    const buyers = Math.max(0, fin(i.buyers, 50_000));
    const windowSec = Math.max(1, fin(i.windowSec, 60));
    const payGapSec = Math.max(0, fin(i.payGapSec, 2));
    const rowCap = Math.max(1, fin(i.rowCap, 500));
    const subCounters = Math.min(100, Math.max(1, Math.round(fin(i.subCounters, 10))));
    const ordersPerDay = Math.max(0, fin(i.ordersPerDay, 150_000));
    const declinePct = Math.min(100, Math.max(0, fin(i.declinePct, 3)));
    const mode = Math.min(5, Math.max(0, Math.round(fin(i.mode, 0))));

    const flashWrites = buyers / windowSec;
    /** Check, pay, then subtract: every attempt that checked before stock ran out still subtracts. */
    const oversold = mode === 2 ? Math.min(Math.max(0, buyers - stock), flashWrites * payGapSec) : 0;
    const counters = mode >= 4 ? subCounters : 1;
    const hotBusyPct = mode >= 3 ? (flashWrites / (counters * rowCap)) * 100 : 0;
    const hotFailPct = hotBusyPct > 100 ? (1 - 100 / hotBusyPct) * 100 : 0;

    return {
      skus, warehouses, bytesPerRow, readsPerDay, writesPerDay, stock, pageLoads, buyers, windowSec, payGapSec, rowCap, subCounters, ordersPerDay,
      declinePct, mode,
      rowsM: (skus * warehouses) / 1e6,
      storageGb: (skus * warehouses * bytesPerRow) / 1e9,
      readAvg: readsPerDay / 86_400,
      writeAvg: writesPerDay / 86_400,
      flashReads: pageLoads / windowSec,
      flashWrites,
      oversold,
      soldOut: mode >= 3 ? Math.max(0, buyers - stock) : 0,
      hotBusyPct,
      /** Red on the board: oversold units in the flash sale, or checkouts timing out on the hot row. */
      failPct: mode === 2 ? (oversold / (stock + oversold)) * 100 : hotFailPct,
      counters,
      declinesPerDay: (ordersPerDay * declinePct) / 100,
    };
  },
};
