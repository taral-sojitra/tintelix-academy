import type { Model } from "@tintelix/schema";

/**
 * Photo and video uploads (Vintelix System Design 101, §30.4). Through the app, every upload holds a
 * worker for the whole transfer at the phone's speed (Little's law: busy workers = uploads a second ×
 * transfer time), and all the bytes cross the app's network. With a signed URL the app only checks the
 * user and signs a short-lived URL for one object; the phone PUTs straight to object storage. A large
 * file sent as one request starts over when it fails; a multipart upload retries only the failed part.
 * Traffic, file sizes, link speed and server sizes are this lesson's own example.
 */
export const uploadModel: Model = {
  defaults: { uploadsPerSec: 200, fileMb: 5, clientMbps: 5, workersPerServer: 100, nicMbps: 1000, signMs: 5, direct: 0, bigFileMb: 2000, failAtPct: 90, partMb: 100, multipart: 0 },
  run(i) {
    const uploadsPerSec = Math.max(0, i.uploadsPerSec ?? 200);
    const fileMb = Math.max(0, i.fileMb ?? 5);
    const clientMbps = Math.max(0.1, i.clientMbps ?? 5);
    const workersPerServer = Math.max(1, i.workersPerServer ?? 100);
    const nicMbps = Math.max(1, i.nicMbps ?? 1000);
    const signMs = Math.max(0, i.signMs ?? 5);
    const direct = (i.direct ?? 0) >= 0.5;
    const bigFileMb = Math.max(1, i.bigFileMb ?? 2000);
    const failAt = Math.max(0, Math.min(100, i.failAtPct ?? 90)) / 100;
    const partMb = Math.max(1, i.partMb ?? 100);
    const multipart = (i.multipart ?? 0) >= 0.5;

    const secFor = (mb: number) => (mb * 8) / clientMbps;
    const uploadSec = secFor(fileMb);
    const trafficMbps = uploadsPerSec * fileMb * 8;
    const busyWorkers = direct ? (uploadsPerSec * signMs) / 1000 : uploadsPerSec * uploadSec;
    const appMbps = direct ? 0 : trafficMbps;
    const serversNeeded = Math.max(1, Math.ceil(busyWorkers / workersPerServer - 1e-9), Math.ceil(appMbps / nicMbps - 1e-9));
    const redoMb = multipart ? Math.min(partMb, bigFileMb) : bigFileMb * failAt;
    return {
      uploadsPerSec,
      fileMb,
      clientMbps,
      workersPerServer,
      signMs,
      direct: direct ? 1 : 0,
      uploadSec,
      busyWorkers,
      serversNeeded,
      appGbps: appMbps / 1000,
      storeGbps: trafficMbps / 1000,
      bigFileMb,
      failAtPct: failAt * 100,
      partMb,
      multipart: multipart ? 1 : 0,
      parts: Math.ceil(bigFileMb / partMb),
      bigSec: secFor(bigFileMb),
      redoMb,
      redoSec: secFor(redoMb),
    };
  },
};
