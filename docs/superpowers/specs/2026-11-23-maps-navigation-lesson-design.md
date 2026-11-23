# Lesson 45: Design maps and navigation — design note

**Hook title:** The fastest way home. **Scene kind:** `board`. **Builds on:** CDN (11), proximity service
(42). **Sources:** general public knowledge (square map tiles where each zoom level splits every tile into
four, tiles named zoom/x/y and served from a CDN, Dijkstra's search, shortcut edges as in contraction
hierarchies, live speeds from navigating phones). All numbers are the lesson's own and deliberately
differ from the well-known textbook example.

## Assumptions (model defaults)

60 million maps open at the busiest hour, 12 tiles a minute each at 20 KB; a renderer fleet drawing 50,000
tiles a second; 0.2% of peak at launch; a CDN serving 98%; tiles to zoom 16. Routing: 80,000 route
requests a second, a 40 km trip, 500 intersections per km², a core searching 2 million intersections a
second, about 1,000 with shortcuts, a 2,000-core fleet. Traffic: 8 million navigating, a ping every 10 s.

## What the numbers come to

12 million tile requests a second (240 GB/s). Drawing on request: 48% busy at launch, 24,000% at peak.
Pre-drawn: 4.3 billion tiles at zoom 16, 0.6 km across, at most 115 TB to that zoom; the store sees
240,000 a second. A plain search on a 40 km trip touches 628,319 intersections (314 ms, 25,133 cores,
1,257% busy; 80 km: 2,513,274). With shortcuts: 1,000 intersections, 0.5 ms, 40 cores. 800,000 traffic
pings a second.

## Steps

1 the ask · 2 draw each tile when asked · 3 drawing the same tile again · 4 draw once, serve from the edge
(Try it: CDN share) · 5 searching every road (Try it: trip length) · 6 shortcuts and today's speeds ·
7 wrap-up.

## Engine changes in this PR

- `roadgraph` custom widget (with a test): a 14 × 5 grid of intersections; without shortcuts the search
  spreads in a circle from home, with them it lights only local streets at each end and every third
  highway intersection.
- Map tiles use the existing meter (CDN share) rather than a new widget.
