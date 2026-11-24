import type { Lesson } from "@tintelix/schema";

export const mapsCheatsheet: Lesson["cheatsheet"] = [
  {
    heading: "The numbers",
    text: ["{mapUsersM} million maps open at the busiest hour, {tilesPerMin} tiles a minute each: {tileRate} tile requests a second ({tileGBs} GB/s). {routeRate} route requests a second."],
  },
  {
    heading: "Tiles: files at the edge",
    text: ["Draw every tile ahead, name it zoom/x/y, redraw only changed areas. Zoom {zoom}: {tilesB} billion tiles, {tileKm} km across; at most {storageTb} TB to that zoom. A CDN serves {cdnHitPct}; the store sees {originRate} a second."],
  },
  {
    heading: "Routing: a prepared graph",
    text: ["A plain search on a {tripKm} km trip touches {naiveExplored} intersections ({coresNaive} cores). Shortcut edges (contraction hierarchies) cut it to about {hierExplored} ({coresHier} cores). Weight roads by live speeds from {pingRate} pings a second; reroute when the road ahead slows."],
  },
];
