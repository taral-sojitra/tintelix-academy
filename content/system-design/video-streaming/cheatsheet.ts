import type { Lesson } from "@tintelix/schema";

export const videoCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "The numbers",
    text: ["{streamsM} million streams × {mbps} Mbps = {peakTbps} Tbps at peak. {libraryHours} hours of library at every quality: {libraryPb} PB."],
  },
  {
    heading: "Encode once",
    text: ["A ladder of {renditions} qualities, cut into {segmentSec} segments with a manifest (HLS, MPEG-DASH). The player picks each segment's quality from its speed and buffer. Segments go on a queue to a pool of encoders: playable in {parallelSec}, not {serialMin} minutes."],
  },
  {
    heading: "Serve from the edge",
    text: ["Caches inside providers' networks, filled overnight. Hit ratio is the cost lever: {liveHitPct} leaves {originTbps} Tbps for the origin (70% would leave 7.5). Push new releases before they go live; the long tail stays at the origin."],
  },
];
