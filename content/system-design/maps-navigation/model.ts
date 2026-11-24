import type { Model } from "@tintelix/schema";

const fin = (v: number | undefined, d: number) => (v !== undefined && Number.isFinite(v) ? v : d);

/** Earth's circumference at the equator, km: the width of the single zoom-0 tile. */
const EARTH_KM = 40_075;

/**
 * Design maps and navigation, with the lesson's own numbers (general public knowledge, not a textbook's):
 * 60 million people with the map open at the busiest hour, each loading about 12 tiles a minute at 20 KB;
 * a renderer fleet drawing 50,000 tiles a second; 0.2% of traffic at launch; a CDN serving 98% of tiles;
 * tiles drawn to zoom 16. Routing: 80,000 route requests a second, a 40 km trip, 500 intersections per km²,
 * a core searching 2 million intersections a second, about 1,000 with shortcuts, a 2,000-core fleet.
 * Live traffic: 8 million phones navigating, a ping every 10 s.
 * Modes: 0 the ask, 1 tiles drawn on request at launch, 2 the same at scale, 3 pre-drawn tiles behind a CDN,
 * 4 routing by searching every road, 5 shortcuts and live speeds.
 */
export const mapsModel: Model = {
  defaults: {
    mapUsers: 60e6, tilesPerMin: 12, tileKb: 20, renderCapacity: 50_000, launchPct: 0.2, cdnHitPct: 98, zoom: 16,
    routeRate: 80_000, tripKm: 40, junctionsPerKm2: 500, exploreRate: 2e6, hierExplored: 1_000, routeCores: 2_000,
    navigating: 8e6, pingEvery: 10, mode: 0,
  },
  run(i) {
    const mapUsers = Math.max(0, fin(i.mapUsers, 60e6));
    const tilesPerMin = Math.max(0, fin(i.tilesPerMin, 12));
    const tileKb = Math.max(0, fin(i.tileKb, 20));
    const renderCapacity = Math.max(1, fin(i.renderCapacity, 50_000));
    const launchPct = Math.min(100, Math.max(0, fin(i.launchPct, 0.2)));
    const cdnHitPct = Math.min(100, Math.max(0, fin(i.cdnHitPct, 98)));
    const zoom = Math.min(22, Math.max(0, Math.round(fin(i.zoom, 16))));
    const routeRate = Math.max(0, fin(i.routeRate, 80_000));
    const tripKm = Math.min(1_000, Math.max(1, fin(i.tripKm, 40)));
    const junctionsPerKm2 = Math.max(0, fin(i.junctionsPerKm2, 500));
    const exploreRate = Math.max(1, fin(i.exploreRate, 2e6));
    const hierExplored = Math.max(1, fin(i.hierExplored, 1_000));
    const routeCores = Math.max(1, fin(i.routeCores, 2_000));
    const navigating = Math.max(0, fin(i.navigating, 8e6));
    const pingEvery = Math.max(1, fin(i.pingEvery, 10));
    const mode = Math.min(5, Math.max(0, Math.round(fin(i.mode, 0))));

    const tileRate = (mapUsers * tilesPerMin) / 60;
    const renderRate = mode === 1 ? (tileRate * launchPct) / 100 : mode === 2 ? tileRate : 0;
    const renderBusyPct = (renderRate / renderCapacity) * 100;
    const tilesAll = (4 ** (zoom + 1) - 1) / 3;

    /** A plain shortest-path search spreads in a circle until it reaches the far end of the trip. */
    const naiveExplored = Math.PI * (tripKm / 2) ** 2 * junctionsPerKm2;
    const naiveMs = (naiveExplored / exploreRate) * 1000;
    const hierMs = (hierExplored / exploreRate) * 1000;
    const coresNaive = (routeRate * naiveMs) / 1000;
    const coresHier = (routeRate * hierMs) / 1000;
    const routeBusyPct = mode === 4 ? (coresNaive / routeCores) * 100 : mode === 5 ? (coresHier / routeCores) * 100 : 0;

    return {
      mapUsers, tilesPerMin, tileKb, renderCapacity, launchPct, cdnHitPct, zoom, routeRate, tripKm, junctionsPerKm2, exploreRate,
      hierExplored, routeCores, navigating, pingEvery, mode,
      mapUsersM: mapUsers / 1e6,
      tileRate,
      tileGBs: (tileRate * tileKb) / 1e6,
      renderRate,
      renderBusyPct,
      renderFailPct: renderBusyPct > 100 ? (1 - 100 / renderBusyPct) * 100 : 0,
      cdnMissPct: 100 - cdnHitPct,
      originRate: (tileRate * (100 - cdnHitPct)) / 100,
      tilesB: 4 ** zoom / 1e9,
      tileKm: EARTH_KM / 2 ** zoom,
      storageTb: (tilesAll * tileKb) / 1e9,
      naiveExplored,
      naiveMs,
      hierMs,
      coresNaive,
      coresHier,
      exploredRatio: naiveExplored / hierExplored,
      explored: mode >= 5 ? hierExplored : naiveExplored,
      shortcuts: mode >= 5 ? 1 : 0,
      routeBusyPct,
      routeFailPct: routeBusyPct > 100 ? (1 - 100 / routeBusyPct) * 100 : 0,
      navigatingM: navigating / 1e6,
      pingRate: navigating / pingEvery,
    };
  },
};
