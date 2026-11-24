import type { Lesson } from "@tintelix/schema";

export const searchCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "The numbers",
    text: ["{docsB} billion documents, {indexRate} indexed a second ({indexPeak} at peak), {queryRate} searches a second ({queryPeak} at peak), about {totalTb} TB of text plus index."],
  },
  {
    heading: "The index",
    text: ["LIKE '%term%' scans every row (about {scanSec} a query here). An inverted index maps words to postings; a query is lookups plus an intersection. Shard it by document ({shards} shards), fan each query out, merge each shard's top results."],
  },
  {
    heading: "Lag, hot terms, ranking",
    text: ["Index asynchronously (202 queued) into in-memory segments refreshed every {refreshSec}: searchable in about {lagSec}. Cache top results for trending queries with a short TTL. Rank with TF-IDF, then freshness and popularity; backfill new signals across old documents."],
  },
];
