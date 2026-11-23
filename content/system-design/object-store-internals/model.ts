import type { Model } from "@tintelix/schema";

const fin = (v: number | undefined, d: number) => (v !== undefined && Number.isFinite(v) ? v : d);

/**
 * Design S3-like object storage, with the lesson's own numbers (general public knowledge, not a textbook's):
 * a trillion objects averaging 250 KB; 20 TB disks failing at 2% a year; 0.1% of the objects at launch;
 * erasure coding with 10 data pieces and 4 parity pieces; 300 bytes of metadata an object on 2 TB shards;
 * small objects packed into 1 GB files.
 * Modes: 0 the ask, 1 one copy at launch, 2 one copy at full size after a year, 3 three copies,
 * 4 erasure coding, 5 metadata and packing (still erasure coded).
 */
export const objectStoreModel: Model = {
  defaults: {
    objects: 1e12, avgKb: 250, diskTb: 20, afrPct: 2, launchPct: 0.1, dataPieces: 10, parity: 4, metaBytes: 300, shardTb: 2, packGb: 1,
    mode: 0,
  },
  run(i) {
    const objects = Math.max(0, fin(i.objects, 1e12));
    const avgKb = Math.max(0, fin(i.avgKb, 250));
    const diskTb = Math.max(0.1, fin(i.diskTb, 20));
    const afrPct = Math.min(100, Math.max(0, fin(i.afrPct, 2)));
    const launchPct = Math.min(100, Math.max(0, fin(i.launchPct, 0.1)));
    const dataPieces = Math.min(20, Math.max(1, Math.round(fin(i.dataPieces, 10))));
    const parity = Math.min(8, Math.max(1, Math.round(fin(i.parity, 4))));
    const metaBytes = Math.max(0, fin(i.metaBytes, 300));
    const shardTb = Math.max(0.1, fin(i.shardTb, 2));
    const packGb = Math.max(0.001, fin(i.packGb, 1));
    const mode = Math.min(5, Math.max(0, Math.round(fin(i.mode, 0))));

    const live = mode === 1 ? (objects * launchPct) / 100 : objects;
    const rawPb = (objects * avgKb) / 1e12;
    const liveRawPb = (live * avgKb) / 1e12;
    const erasure = mode >= 4;
    const overheadX = erasure ? (dataPieces + parity) / dataPieces : mode === 3 ? 3 : 1;
    const storedPb = liveRawPb * overheadX;
    const disks = (storedPb * 1000) / diskTb;
    const failuresPerYear = (disks * afrPct) / 100;
    const objectsPerDisk = disks > 0 ? (live * overheadX) / disks : 0;
    /** One copy: every failed disk's objects are simply gone. Shown after a year at full size. */
    const lostPct = mode === 2 && live > 0 ? Math.min(100, ((failuresPerYear * objectsPerDisk) / live) * 100) : 0;
    const metaTb = (objects * metaBytes) / 1e12;

    return {
      objects, avgKb, diskTb, afrPct, launchPct, dataPieces, parity, metaBytes, shardTb, packGb, mode,
      objectsT: objects / 1e12,
      launchObjectsB: (objects * launchPct) / 100 / 1e9,
      rawPb,
      overheadX,
      storedPb,
      savedPb: erasure ? rawPb * 3 - storedPb : 0,
      disks,
      failuresPerDay: failuresPerYear / 365,
      objectsPerDiskM: objectsPerDisk / 1e6,
      lostPct,
      copies: mode === 3 ? 3 : 1,
      pieces: erasure ? dataPieces + parity : mode === 3 ? 3 : 1,
      tolerance: erasure ? parity : mode === 3 ? 2 : 0,
      erasure: erasure ? 1 : 0,
      metaTb,
      metaShards: Math.ceil(metaTb / shardTb),
      packedFilesM: (rawPb * 1e6) / packGb / 1e6,
    };
  },
};
