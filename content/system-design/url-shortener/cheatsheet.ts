import type { Lesson } from "@tintelix/schema";

export const urlCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "The numbers",
    text: ["30 million new links a day is {writeRate} writes a second; at {readRatio} clicks per link that is {readRate} reads a second. Five years at 400 bytes a row: {linksB} billion rows, {storageTb} TB. Reads, not storage, shape the design."],
  },
  {
    heading: "Short codes",
    text: ["Base 62 (0-9, a-z, A-Z): 7 characters give {codeSpaceT} trillion codes, and 5 years use {codesUsedPct} of them. A counter written in base 62 never clashes; random or hashed codes need a check on every insert. Give each app server a block of numbers so the counter isn't asked on every write."],
  },
  {
    heading: "Serving clicks",
    text: ["Cache popular codes in memory: links don't change, so cached answers stay right until they expire. With {cacheHitPct} answered by the cache, the database sees {dbReadRate} reads a second ({dbBusyPct} busy). Split the table by code when one database can't hold it."],
  },
  {
    heading: "301 vs 302",
    text: ["301 (permanent): browsers remember it, so repeat clicks ({repeatReadRate} a second here) skip you; less load, but no click counts. 302 (temporary): every click reaches you, so you can count, edit and expire links."],
  },
];
