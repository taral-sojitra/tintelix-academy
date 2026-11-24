import type { Model } from "@tintelix/schema";

const fin = (v: number | undefined, d: number) => (v !== undefined && Number.isFinite(v) ? v : d);

/**
 * Design cloud storage and file sync, with the numbers from Vintelix System Design 101, Chapter 132:
 * 40 million daily accounts with 3 devices each; 30 changes an account a day, peaking at 3× the average;
 * a 20 MB average changed file; 4 MB chunks; an edit touching about 2 chunks; 5 GB stored per account.
 * The lesson's own: an upload tier taking 300 GB a second; 0.5% of peak at launch; an edit inserting bytes
 * halfway through on average (so fixed chunks resend the second half); 30% of new chunks already stored;
 * 1 in 10 offline catch-ups finding the file changed elsewhere.
 * Modes: 0 the ask, 1 whole files at launch, 2 the same at peak, 3 fixed-size chunks, 4 content-defined
 * chunks with a change feed, 5 two devices editing offline.
 */
export const syncModel: Model = {
  defaults: {
    accounts: 40e6, devicesPer: 3, eventsPerDay: 30, peakFactor: 3, fileMb: 20, chunkMb: 4, changedChunks: 2, storageGbPer: 5,
    uploadCapGBs: 300, launchPct: 0.5, editAtPct: 50, dedupPct: 30, offlineConflictPct: 10, mode: 0,
  },
  run(i) {
    const accounts = Math.max(0, fin(i.accounts, 40e6));
    const devicesPer = Math.max(0, fin(i.devicesPer, 3));
    const eventsPerDay = Math.max(0, fin(i.eventsPerDay, 30));
    const peakFactor = Math.max(1, fin(i.peakFactor, 3));
    const fileMb = Math.max(0.1, fin(i.fileMb, 20));
    const chunkMb = Math.max(0.1, fin(i.chunkMb, 4));
    const changedChunks = Math.max(1, fin(i.changedChunks, 2));
    const storageGbPer = Math.max(0, fin(i.storageGbPer, 5));
    const uploadCapGBs = Math.max(1, fin(i.uploadCapGBs, 300));
    const launchPct = Math.min(100, Math.max(0, fin(i.launchPct, 0.5)));
    const editAtPct = Math.min(100, Math.max(0, fin(i.editAtPct, 50)));
    const dedupPct = Math.min(100, Math.max(0, fin(i.dedupPct, 30)));
    const offlineConflictPct = Math.min(100, Math.max(0, fin(i.offlineConflictPct, 10)));
    const mode = Math.min(5, Math.max(0, Math.round(fin(i.mode, 0))));

    const avgRate = (accounts * eventsPerDay) / 86_400;
    const peakRate = avgRate * peakFactor;
    const wholeGBs = (peakRate * fileMb) / 1000;
    /** Fixed chunks: an insert shifts every boundary after it, so the rest of the file looks new. */
    const fixedMovedMb = (fileMb * (100 - editAtPct)) / 100;
    /** Content-defined chunks: only the chunks around the edit change. */
    const blockMovedMb = Math.min(fileMb, changedChunks * chunkMb);
    const sentMb = (blockMovedMb * (100 - dedupPct)) / 100;
    const perEditMb = mode === 1 || mode === 2 ? fileMb : mode === 3 ? fixedMovedMb : mode >= 4 ? sentMb : 0;
    const ingressGBs = ((peakRate * perEditMb) / 1000) * (mode === 1 ? launchPct / 100 : 1);
    const uploadBusyPct = (ingressGBs / uploadCapGBs) * 100;

    return {
      accounts, devicesPer, eventsPerDay, peakFactor, fileMb, chunkMb, changedChunks, storageGbPer, uploadCapGBs, launchPct, editAtPct,
      dedupPct, offlineConflictPct, mode,
      accountsM: accounts / 1e6,
      devicesM: (accounts * devicesPer) / 1e6,
      avgRate,
      peakRate,
      storagePb: (accounts * storageGbPer) / 1e6,
      wholeGBs,
      fixedMovedMb,
      blockMovedMb,
      sentMb,
      fileChunks: Math.ceil(fileMb / chunkMb),
      movedSharePct: (blockMovedMb / fileMb) * 100,
      ingressGBs,
      uploadBusyPct,
      uploadFailPct: uploadBusyPct > 100 ? (1 - 100 / uploadBusyPct) * 100 : 0,
      conflictPct: mode === 5 ? offlineConflictPct : 0,
      chunked: mode >= 3 ? 1 : 0,
      contentDefined: mode >= 4 ? 1 : 0,
    };
  },
};
