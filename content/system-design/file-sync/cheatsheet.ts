import type { Lesson } from "@tintelix/schema";

export const syncCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "The numbers",
    text: ["{accountsM} million accounts × {devicesPer} devices = {devicesM} million. {peakRate} changes a second at peak. Whole-file uploads of {fileMb} MB: {wholeGBs} GB/s. Stored: {storagePb} PB."],
  },
  {
    heading: "Send only what changed",
    text: ["Chunks named by hash; a version is a list of hashes; ask which are missing, upload those, commit. Cut by content (rolling hash), not fixed offsets: an edit resends about {changedChunks} chunks ({sentMb} MB after duplicates), not {fixedMovedMb} MB."],
  },
  {
    heading: "Feed and conflicts",
    text: ["Devices follow a change feed from a cursor and fetch only new chunks. Commits carry their base version; a mismatch is a 409 and the late edit is kept as a conflicted copy. Batch bursts of small changes."],
  },
];
