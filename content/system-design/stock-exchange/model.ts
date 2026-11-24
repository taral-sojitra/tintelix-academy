import type { Model } from "@tintelix/schema";

const fin = (v: number | undefined, d: number) => (v !== undefined && Number.isFinite(v) ? v : d);

/**
 * Design a stock exchange, with the lesson's own numbers (general public knowledge, deliberately not a
 * textbook's): 400 million orders in a 6.5-hour session, 8× the average at the open; 3,000 stocks on 16
 * matching engines; 0.5% of the open's rate at launch; a database matching about 5,000 orders a second at
 * 2 ms each; 5 µs a match in memory; the busiest stock taking 5% of all orders; 100 bytes an order in the
 * journal; a quarter of orders trading; 2,000 market-data subscribers.
 * Modes: 0 the ask, 1 matching by database query at launch, 2 the same at the open, 3 in-memory order books,
 * 4 a sequencer and a journal, 5 market data.
 */
export const exchangeModel: Model = {
  defaults: {
    ordersPerDay: 400e6, sessionHours: 6.5, openFactor: 8, launchPct: 0.5, dbCap: 5_000, dbMatchMs: 2, matchUs: 5, hotSharePct: 5, engines: 16,
    symbols: 3_000, orderBytes: 100, fillPct: 25, subscribers: 2_000, mode: 0,
  },
  run(i) {
    const ordersPerDay = Math.max(0, fin(i.ordersPerDay, 400e6));
    const sessionHours = Math.max(0.5, fin(i.sessionHours, 6.5));
    const openFactor = Math.max(1, fin(i.openFactor, 8));
    const launchPct = Math.min(100, Math.max(0, fin(i.launchPct, 0.5)));
    const dbCap = Math.max(1, fin(i.dbCap, 5_000));
    const dbMatchMs = Math.max(0, fin(i.dbMatchMs, 2));
    const matchUs = Math.max(0.1, fin(i.matchUs, 5));
    const hotSharePct = Math.min(100, Math.max(0, fin(i.hotSharePct, 5)));
    const engines = Math.max(1, Math.round(fin(i.engines, 16)));
    const symbols = Math.max(1, fin(i.symbols, 3_000));
    const orderBytes = Math.max(0, fin(i.orderBytes, 100));
    const fillPct = Math.min(100, Math.max(0, fin(i.fillPct, 25)));
    const subscribers = Math.max(1, fin(i.subscribers, 2_000));
    const mode = Math.min(5, Math.max(0, Math.round(fin(i.mode, 0))));

    const avgRate = ordersPerDay / (sessionHours * 3600);
    const peakRate = avgRate * openFactor;
    const dbRate = mode === 1 ? (peakRate * launchPct) / 100 : mode === 2 ? peakRate : 0;
    const dbBusyPct = (dbRate / dbCap) * 100;
    /** One thread per stock: the busiest stock's share of the open, at matchUs each. */
    const hotRate = (peakRate * hotSharePct) / 100;
    const feedRate = peakRate * (1 + fillPct / 100);

    return {
      ordersPerDay, sessionHours, openFactor, launchPct, dbCap, dbMatchMs, matchUs, hotSharePct, engines, symbols, orderBytes, fillPct, subscribers,
      mode,
      ordersM: ordersPerDay / 1e6,
      avgRate,
      peakRate,
      dbRate,
      dbBusyPct,
      dbFailPct: dbBusyPct > 100 ? (1 - 100 / dbBusyPct) * 100 : 0,
      hotRate,
      hotBusyPct: (hotRate * matchUs) / 1e4,
      journalGb: (ordersPerDay * orderBytes) / 1e9,
      feedRate,
      unicastM: (feedRate * subscribers) / 1e6,
    };
  },
};
