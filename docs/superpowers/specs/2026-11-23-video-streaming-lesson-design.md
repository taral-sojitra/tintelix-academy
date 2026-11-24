# Lesson 46: Design video streaming — design note

**Hook title:** Upload once, play anywhere. **Scene kind:** `board`. **Builds on:** CDN (11), object
storage (18), message queues (22). **Sources:** Vintelix System Design 101, Chapter 128 (paraphrased: two
systems in one, the quality ladder and segments, the player choosing quality per segment, caches inside
providers filled ahead, hit ratio as the cost lever, release-night spikes and the long tail). General
public knowledge for HLS and MPEG-DASH and parallel segment encoding. Nothing from the excluded notes or
books.

## Assumptions (model defaults)

From the book: a 100,000-hour library at about 30 GB per hour across the ladder; 5 million peak streams at
5 Mbps; edge hit 98% (and 70% for comparison). The lesson's own: an origin sending 2 Tbps; 0.2% of peak at
launch; a 60-minute episode, encoding the ladder at 1.5× its length on one machine, 4 s segments, 300
encoders per title, 20 s to split and stitch, 6 qualities; 40% of viewers starting a new release.

## What the numbers come to

25 Tbps at peak, a 3 PB library. From the store alone: 2.5% busy at launch (10,000 streams), 1,250% at
peak (92% stall). Encoding: 90 minutes on one machine; 900 segments in parallel, playable in 38 s (900
encoders: 26 s). Edge at 98%: 0.5 Tbps to the origin, 25% busy (70%: 7.5 Tbps, 375%). Release night
without pushing ahead: 59% served at the edge, origin 515% busy.

## Steps

1 the ask · 2 stream straight from storage · 3 one place, one quality · 4 encode once into a ladder
(Try it: encoders per title) · 5 copies inside viewers' providers (Try it: served at the edge) · 6 release
night and the long tail · 7 wrap-up.

## Engine changes in this PR

- `transcode` custom widget (with a test): 12 segments by 4 qualities, each finishing at its own moment
  in a 2.5 s burst, then "ready to play in …".
