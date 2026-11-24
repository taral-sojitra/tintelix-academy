import type { Lesson } from "@tintelix/schema";

export const objectStoreCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "The numbers",
    text: ["{objectsT} trillion objects × {avgKb} KB = {rawPb} PB. Disks fail at {afrPct} a year: on {disks} disks that's {failuresPerDay} a day, every day."],
  },
  {
    heading: "Survive failures",
    text: ["Three copies in three racks survive 2 failures at 3× the disk. Erasure coding {dataPieces} + {parity}: any {dataPieces} pieces rebuild the object; survives {tolerance} failures at {overheadX}× ({storedPb} PB). Repair must outrun failures; a rebuild reads {dataPieces} pieces."],
  },
  {
    heading: "Names and files",
    text: ["Metadata maps bucket + key to piece locations: {metaTb} TB on {metaShards} shards by key hash, plus an ordered index for listing. Pack small objects into {packGb} GB append-only files ({packedFilesM} million files); deletes mark, compaction reclaims."],
  },
];
