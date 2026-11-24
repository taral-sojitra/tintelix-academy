import type { Lesson } from "@tintelix/schema";

export const nearbyCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "The trap",
    text: ["Separate latitude and longitude indexes each match a band around the world ({rowsPerQuery} rows a search here). Two one-dimensional indexes can't answer a two-dimensional question."],
  },
  {
    heading: "Geohash",
    text: ["Interleave latitude and longitude bits into a string; a shared prefix means the same cell. Read the cells covering the circle plus neighbours (edges break prefixes). Pick the length: at {geoLen}, {cellsRead} cells and {candidates} candidates, about {geoMs}."],
  },
  {
    heading: "Serving",
    text: ["The index is small ({indexGb} GB): keep a copy in memory on each search server ({searchServers} here), rebuild it in the background, cache busy cells. Quadtrees adapt to density; S2 covers circles precisely on the sphere."],
  },
];
