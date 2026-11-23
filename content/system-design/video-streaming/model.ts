import type { Model } from "@tintelix/schema";

const fin = (v: number | undefined, d: number) => (v !== undefined && Number.isFinite(v) ? v : d);

/**
 * Design video streaming, with the numbers from Vintelix System Design 101, Chapter 128: a 100,000-hour
 * library at about 30 GB per hour across the quality ladder (3 PB); 5 million streams at peak averaging
 * 5 Mbps (25 Tbps); 98% served from the edge leaves 0.5 Tbps for the origin, 70% leaves 7.5. The lesson's
 * own: an origin that can send 2 Tbps; 0.2% of peak at launch; a 60-minute episode, encoding the whole
 * ladder at 1.5× the video's length on one machine, 4-second segments, 300 encoders per video and 20 s to
 * split and stitch; on release night 40% of viewers start the new title.
 * Modes: 0 the ask, 1 stream from the store at launch, 2 the same at peak, 3 the encoding pipeline (viewers
 * still on the store), 4 a CDN with titles pushed ahead, 5 release night with the new title not pushed.
 */
export const videoModel: Model = {
  defaults: {
    libraryHours: 100_000, gbPerHour: 30, streams: 5e6, mbps: 5, originCapTbps: 2, launchPct: 0.2, edgeHitPct: 98,
    videoMin: 60, encodeRatio: 1.5, segmentSec: 4, workers: 300, stitchSec: 20, renditions: 6, newTitlePct: 40, mode: 0,
  },
  run(i) {
    const libraryHours = Math.max(0, fin(i.libraryHours, 100_000));
    const gbPerHour = Math.max(0, fin(i.gbPerHour, 30));
    const streams = Math.max(0, fin(i.streams, 5e6));
    const mbps = Math.max(0, fin(i.mbps, 5));
    const originCapTbps = Math.max(0.001, fin(i.originCapTbps, 2));
    const launchPct = Math.min(100, Math.max(0, fin(i.launchPct, 0.2)));
    const edgeHitPct = Math.min(100, Math.max(0, fin(i.edgeHitPct, 98)));
    const videoMin = Math.max(1, fin(i.videoMin, 60));
    const encodeRatio = Math.max(0.1, fin(i.encodeRatio, 1.5));
    const segmentSec = Math.max(1, fin(i.segmentSec, 4));
    const workers = Math.max(1, Math.round(fin(i.workers, 300)));
    const stitchSec = Math.max(0, fin(i.stitchSec, 20));
    const renditions = Math.max(1, Math.round(fin(i.renditions, 6)));
    const newTitlePct = Math.min(100, Math.max(0, fin(i.newTitlePct, 40)));
    const mode = Math.min(5, Math.max(0, Math.round(fin(i.mode, 0))));

    const peakTbps = (streams * mbps) / 1e6;
    /** Release night: the edge has no copy of the new title, so only the rest of the traffic hits. */
    const liveHitPct = mode === 5 ? edgeHitPct * (1 - newTitlePct / 100) : mode === 4 ? edgeHitPct : 0;
    const originTbps =
      mode === 0 ? 0 : mode === 1 ? (peakTbps * launchPct) / 100 : mode <= 3 ? peakTbps : (peakTbps * (100 - liveHitPct)) / 100;
    const originBusyPct = (originTbps / originCapTbps) * 100;
    const segments = Math.ceil((videoMin * 60) / segmentSec);

    return {
      libraryHours, gbPerHour, streams, mbps, originCapTbps, launchPct, edgeHitPct, videoMin, encodeRatio, segmentSec, workers,
      stitchSec, renditions, newTitlePct, mode,
      streamsM: streams / 1e6,
      launchStreams: (streams * launchPct) / 100,
      peakTbps,
      libraryPb: (libraryHours * gbPerHour) / 1e6,
      liveHitPct,
      edgeMissPct: 100 - liveHitPct,
      originTbps,
      originBusyPct,
      originFailPct: originBusyPct > 100 ? (1 - 100 / originBusyPct) * 100 : 0,
      serialMin: videoMin * encodeRatio,
      segments,
      parallelSec: segmentSec * encodeRatio * Math.ceil(segments / workers) + stitchSec,
    };
  },
};
