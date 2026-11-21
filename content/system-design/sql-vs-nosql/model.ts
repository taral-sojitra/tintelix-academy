import type { Model } from "@tintelix/schema";

/**
 * One online shop's orders stored two ways (Vintelix System Design 101, Chapters 35 and 40).
 * Relational: orders, order_items and products, each fact once, so showing an order joins three
 * tables (one order row, one row per item, one product row per item). Document: the order with its
 * items embedded, read in one go. Embedding copies shared facts: a seller's display name lives in
 * each of their listings, so a rename rewrites every one (§40.3: 20,000 listings at 2,000 writes a
 * second take ten seconds) where the relational schema updates one row. A flexible schema accepts
 * writes a NOT NULL column would reject. `elapsedSec` is the time since the rename began, so the
 * stage can play it. The order size, catalogue, traffic and bug rate are this lesson's own example.
 */
export const dataModel: Model = {
  defaults: { items: 3, listings: 20000, writeRate: 2000, ordersPerDay: 10000, badPct: 5, elapsedSec: 600 },
  run(i) {
    const items = Math.max(1, Math.round(i.items ?? 3));
    const listings = Math.max(0, Math.round(i.listings ?? 20000));
    const writeRate = Math.max(1, i.writeRate ?? 2000);
    const ordersPerDay = Math.max(0, i.ordersPerDay ?? 10000);
    const badPct = Math.max(0, Math.min(100, i.badPct ?? 5));
    const elapsedSec = Math.max(0, i.elapsedSec ?? 600);
    const renameSec = listings / writeRate;
    const renameDonePct = renameSec > 0 ? Math.min(100, (100 * elapsedSec) / renameSec) : 100;
    return {
      items,
      listings,
      writeRate,
      ordersPerDay,
      badPct,
      elapsedSec,
      sqlTables: 3,
      joins: 2,
      sqlRows: 1 + 2 * items,
      docReads: 1,
      sqlRenameRows: 1,
      renameDocs: listings,
      renameSec,
      renameDonePct,
      docsLeft: Math.round(listings * (1 - renameDonePct / 100)),
      badPerDay: (ordersPerDay * badPct) / 100,
    };
  },
};
