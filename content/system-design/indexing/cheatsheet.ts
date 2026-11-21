import type { Lesson } from "@tintelix/schema";

export const indexCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "Full scan",
    text: ["No usable index: read every page. {rows} rows in {scanPages} pages take about {scanSec}, growing with the table."],
  },
  {
    heading: "B+ tree",
    text: ["Levels = ⌈log(rows) ÷ log(fanout)⌉: {depth} levels for {rows} rows at {fanout} keys a page. A lookup reads {indexPages} pages ({indexMs}). Leaves are linked, so a range descends once and walks along."],
  },
  {
    heading: "Covering and composite",
    text: ["A covering index holds every column the query needs, so the table is never touched: {coverMs} instead of {rangeMs} for {matches} rows. In a composite index, column order decides which queries it serves."],
  },
  {
    heading: "The write tax",
    text: ["Inserts a second ≈ 1,000,000 ÷ (µs per tree × trees): {baseRate} with no extra index, {insertRate} with {secondary}. Hash indexes do equality only; GIN and GiST serve containment and geometry."],
  },
];
