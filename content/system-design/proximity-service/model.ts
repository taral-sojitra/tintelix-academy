import type { Model } from "@tintelix/schema";

const fin = (v: number | undefined, d: number) => (v !== undefined && Number.isFinite(v) ? v : d);
/** Approximate geohash cell width and height in km near the equator, by string length. */
const CELL_KM: Record<number, [number, number]> = { 4: [39.1, 19.5], 5: [4.89, 4.89], 6: [1.22, 0.61], 7: [0.153, 0.153] };
const POLE_TO_POLE_KM = 20_000;

/** Cells across one axis needed to cover a span: the cell and its neighbours, or enough small cells. */
const across = (cell: number, span: number) => (cell >= span ? 3 : Math.ceil(span / cell) + 1);

/**
 * Design a proximity service. Geohash mechanics (prefixes, neighbour cells at boundaries, quadtrees and
 * S2 for uneven density) from Vintelix System Design 101, Chapter 41; cell sizes are geohash's standard
 * approximate dimensions. The lesson's own assumptions: 200 million places; 100 million people a day
 * searching 5 times, 3× at peak; a 2 km radius; 300 places per km² in a city; a database scanning 5
 * million rows a second on 32 cores; 1% of peak at launch; 0.05 ms per cell read and 1 µs per candidate
 * checked; 16 bytes per place in the index; 16 cores per search server; 60% of searches answered from a
 * results cache. Modes: 0 the ask, 1 lat/lon indexes at launch, 2 at full traffic, 3 geohash cells, 4
 * served from memory, 5 plus a cache.
 */
export const nearbyModel: Model = {
  defaults: {
    places: 200e6, dau: 100e6, searchesEach: 5, peakFactor: 3, radiusKm: 2, cityDensity: 300, dbCores: 32, scanRate: 5e6, launchPct: 1,
    geoLen: 6, indexBytes: 16, serverCores: 16, cachePct: 60, mode: 0,
  },
  run(i) {
    const places = Math.max(0, fin(i.places, 200e6));
    const dau = Math.max(0, fin(i.dau, 100e6));
    const searchesEach = Math.max(0, fin(i.searchesEach, 5));
    const peakFactor = Math.max(1, fin(i.peakFactor, 3));
    const radiusKm = Math.max(0.1, fin(i.radiusKm, 2));
    const cityDensity = Math.max(0, fin(i.cityDensity, 300));
    const dbCores = Math.max(1, fin(i.dbCores, 32));
    const scanRate = Math.max(1, fin(i.scanRate, 5e6));
    const launchPct = Math.min(100, Math.max(0, fin(i.launchPct, 1)));
    const geoLen = Math.min(7, Math.max(4, Math.round(fin(i.geoLen, 6))));
    const indexBytes = Math.max(0, fin(i.indexBytes, 16));
    const serverCores = Math.max(1, fin(i.serverCores, 16));
    const cachePct = Math.min(100, Math.max(0, fin(i.cachePct, 60)));
    const mode = Math.min(5, Math.max(0, Math.round(fin(i.mode, 0))));

    const searchRate = (dau * searchesEach) / 86_400;
    const searchPeak = searchRate * peakFactor;
    const rate = mode === 1 ? (searchPeak * launchPct) / 100 : searchPeak;
    const rowsPerQuery = 2 * places * ((2 * radiusKm) / POLE_TO_POLE_KM);
    const latlonMs = (rowsPerQuery / scanRate) * 1000;
    const dbBusyPct = mode === 1 || mode === 2 ? ((rate * latlonMs) / (dbCores * 1000)) * 100 : 0;
    const [cellW, cellH] = CELL_KM[geoLen]!;
    const cellsX = across(cellW, 2 * radiusKm);
    const cellsY = across(cellH, 2 * radiusKm);
    const cellsRead = cellsX * cellsY;
    const candidates = cellsRead * cellW * cellH * cityDensity;
    const geoMs = cellsRead * 0.05 + candidates / 1000;
    const cacheHitPct = mode === 5 ? cachePct : 0;

    return {
      places, dau, searchesEach, peakFactor, radiusKm, cityDensity, dbCores, scanRate, launchPct, geoLen, indexBytes, serverCores, cachePct, mode,
      placesM: places / 1e6,
      searchRate,
      searchPeak,
      rate,
      rowsPerQuery,
      latlonMs,
      dbBusyPct,
      dbFailPct: dbBusyPct > 100 ? (1 - 100 / dbBusyPct) * 100 : 0,
      cellW,
      cellH,
      cellsX,
      cellsY,
      cellsRead,
      candidates,
      inCircle: Math.PI * radiusKm * radiusKm * cityDensity,
      geoMs,
      indexGb: (places * indexBytes) / 1e9,
      cacheHitPct,
      searchServers: Math.ceil((searchPeak * (1 - cacheHitPct / 100) * geoMs) / (serverCores * 1000)),
    };
  },
};
