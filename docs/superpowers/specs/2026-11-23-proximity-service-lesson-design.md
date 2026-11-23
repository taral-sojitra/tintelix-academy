# Lesson 42: Design a proximity service — design note

**Hook title:** Places within two kilometres. **Scene kind:** `board`. **Builds on:** caching (10),
indexing (13), replication (14). **Sources:** Vintelix System Design 101, Chapter 41 (geohash
interleaving and prefixes, the cell-boundary problem and neighbour cells, quadtrees, S2), paraphrased;
geohash cell sizes are the standard approximate dimensions. All numbers are the lesson's own.

## Assumptions (model defaults)

200 million places; 100 million people a day searching 5 times, 3× at peak; a 2 km radius; 300 places
per km² in a city; a database scanning 5 million rows a second on 32 cores; 1% of peak at launch; 0.05 ms
per cell read and 1 µs per candidate checked; 16 bytes per place in the index; 16 cores per search server;
60% of searches from a results cache.

## What the numbers come to

5,787 searches a second, 17,361 at peak. Latitude and longitude indexes: 80,000 rows a search, 16 ms;
8.7% busy at launch, 868% at full traffic (88% too slow). Geohash: length 5 reads 9 cells with 64,563
candidates (65 ms); length 6 reads 40 cells with 8,930 (11 ms); length 7 reads 784 cells (45 ms); 3,770
places are really within 2 km. The index is 3.2 GB: 12 servers, 5 with the cache.

## Steps

1 the ask · 2 latitude and longitude indexes at launch · 3 two bands around the world · 4 geohash cells
(Try it: length) · 5 the index in memory, many copies · 6 a results cache; quadtrees and S2 for uneven
density · 7 wrap-up.

## Engine changes in this PR

- `geogrid` custom widget (with a test): an 8 km square with the geohash cells at the chosen length, the
  block of cells read, and the search circle, all to scale.
