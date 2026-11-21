import type { Model } from "@tintelix/schema";

/**
 * A table of orders stored in pages (Vintelix System Design 101, Chapters 36 and 42). A full scan
 * reads every page. A B+ tree with about `fanout` keys per page reaches any row in ⌈log_fanout(rows)⌉
 * levels (§42.2: a billion rows is rarely more than four or five levels), plus one read for the row.
 * A range descends once, walks the linked leaves, and fetches each matching row unless the index
 * covers the query (§42.3, §42.5). Each index costs `treeUs` per insert, so inserts a second =
 * 1,000,000 ÷ (treeUs × trees): §42.7's 20,000 → 10,000 → 6,700 → 4,000. Page read time, table size
 * and the range are this lesson's own example.
 */
export const indexModel: Model = {
  defaults: { rows: 10_000_000, rowsPerPage: 100, fanout: 100, pageMs: 0.1, matches: 1000, secondary: 1, treeUs: 50 },
  run(i) {
    const rows = Math.max(1, i.rows ?? 10_000_000);
    const rowsPerPage = Math.max(1, i.rowsPerPage ?? 100);
    const fanout = Math.max(2, i.fanout ?? 100);
    const pageMs = Math.max(0, i.pageMs ?? 0.1);
    const matches = Math.max(1, Math.round(i.matches ?? 1000));
    const secondary = Math.max(0, Math.round(i.secondary ?? 1));
    const treeUs = Math.max(1, i.treeUs ?? 50);

    const scanPages = Math.ceil(rows / rowsPerPage);
    const depth = Math.max(1, Math.ceil(Math.log(rows) / Math.log(fanout) - 1e-9));
    const indexPages = depth + 1;
    const rangeLeaves = Math.ceil(matches / fanout);
    const coverPages = depth + rangeLeaves;
    const rangePages = coverPages + matches;
    const trees = 1 + secondary;
    const baseRate = 1e6 / treeUs;
    const insertRate = 1e6 / (treeUs * trees);
    return {
      rows,
      fanout,
      matches,
      secondary,
      treeUs,
      trees,
      scanPages,
      scanSec: (scanPages * pageMs) / 1000,
      depth,
      indexPages,
      indexMs: indexPages * pageMs,
      speedup: scanPages / indexPages,
      rangeLeaves,
      rangePages,
      rangeMs: rangePages * pageMs,
      coverMs: coverPages * pageMs,
      baseRate,
      insertRate,
      insertsDropPct: 100 * (1 - insertRate / baseRate),
    };
  },
};
