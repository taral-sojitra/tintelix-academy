# Lesson 43: Design nearby friends — design note

**Hook title:** Which friends are close right now? **Scene kind:** `board`. **Builds on:** fan-out (25),
chat app (41), proximity service (42). **Sources:** general public knowledge (WebSocket servers, a pub/sub
channel per person, a distance filter before sending, an expiring location cache, channels sharded by
consistent hashing with the map in a coordination service). All numbers are the lesson's own and
deliberately differ from the well-known textbook example.

## Assumptions (model defaults)

40 million people sharing at peak, an update every 20 s; 150 friends, 20% sharing at the moment; a 5 km
radius that 10% of them fall inside; a database answering a million reads a second; 0.1% of peak at
launch; a pub/sub node moving a million messages a second; 64 bytes per location.

## What the numbers come to

2 million updates a second. Polling: 300,000 reads a second at launch (30% busy), 300 million at peak
(30,000%). Pub/sub: 30 subscribers per update, 60 million messages a second, 6 million sent after the
distance filter, on 60 nodes (10 s updates: 120 million). Latest locations: 2.6 GB.

## Steps

1 the ask · 2 store and poll at launch · 3 everyone asking about everyone · 4 publish to a channel (Try it:
update interval) · 5 shard the channels · 6 quiet phones, batteries, privacy · 7 wrap-up.

## Engine changes in this PR

- `pubsub` custom widget (with a test): your channel's update count and each subscriber's distance, sent
  or too far.
